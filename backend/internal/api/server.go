package api

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awscredentials "github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"tdp-lite/backend/internal/auth"
	"tdp-lite/backend/internal/config"
	"tdp-lite/backend/internal/store"
)

type Server struct {
	cfg           config.Config
	store         *store.Store
	authenticator *auth.Authenticator
	db            *sql.DB
	s3Presigner   *s3.PresignClient
}

func New(cfg config.Config, db *sql.DB, st *store.Store) (*Server, error) {
	authenticator := auth.NewAuthenticator(st, cfg.TimestampSkew, cfg.NonceTTL)

	var presigner *s3.PresignClient
	if cfg.S3Endpoint != "" && cfg.S3AccessKeyID != "" && cfg.S3SecretAccessKey != "" {
		client := s3.New(s3.Options{
			Region:       cfg.S3Region,
			Credentials:  awscredentials.NewStaticCredentialsProvider(cfg.S3AccessKeyID, cfg.S3SecretAccessKey, ""),
			BaseEndpoint: aws.String(cfg.S3Endpoint),
			UsePathStyle: true,
		})
		presigner = s3.NewPresignClient(client)
	}

	return &Server{
		cfg:           cfg,
		store:         st,
		authenticator: authenticator,
		db:            db,
		s3Presigner:   presigner,
	}, nil
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(chimiddleware.Recoverer)
	r.Use(RequestID)
	r.Use(AccessLog)

	r.Get("/", s.handleRoot)
	r.Get("/healthz", s.handleHealthz)
	r.Get("/readyz", s.handleReadyz)

	r.Route("/v1/public", func(r chi.Router) {
		r.Get("/feed", s.handlePublicFeed)
		r.Get("/posts", s.handlePublicPosts)
		r.Get("/posts/{slug}", s.handlePublicPostBySlug)
		r.Get("/moments", s.handlePublicMoments)
		r.Get("/moments/{id}", s.handlePublicMomentByID)
		r.Get("/gallery", s.handlePublicGallery)
		r.Get("/gallery/{id}", s.handlePublicGalleryByID)
		r.Post("/search", s.handlePublicSearch)
	})

	// Token-signed preview payload read endpoint (no API key required).
	r.Get("/v1/previews/sessions/{id}/payload", s.handleGetPreviewPayload)

	r.Route("/v1", func(r chi.Router) {
		r.Use(s.authenticator.Authenticate)

		r.Group(func(r chi.Router) {
			r.Post("/media/uploads", auth.RequireScope("media:write", s.handleCreateMediaUpload))
			r.Post("/media/uploads/{uploadId}/complete", auth.RequireScope("media:write", s.handleCompleteMediaUpload))
		})

		r.Group(func(r chi.Router) {
			r.Post("/previews/sessions", auth.RequireScope("preview:write", s.handleUpsertPreviewSession))
		})

		r.Group(func(r chi.Router) {
			r.Post("/posts", auth.RequireScope("content:write", s.handleCreatePost))
			r.Patch("/posts/{id}", auth.RequireScope("content:write", s.handleUpdatePost))
			r.Post("/posts/{id}/publish", auth.RequireScope("content:write", s.handlePublishPost))
			r.Post("/posts/{id}/unpublish", auth.RequireScope("content:write", s.handleUnpublishPost))
			r.Delete("/posts/{id}", auth.RequireScope("content:write", s.handleDeletePost))
		})

		r.Group(func(r chi.Router) {
			r.Post("/moments", auth.RequireScope("content:write", s.handleCreateMoment))
			r.Patch("/moments/{id}", auth.RequireScope("content:write", s.handleUpdateMoment))
			r.Post("/moments/{id}/publish", auth.RequireScope("content:write", s.handlePublishMoment))
			r.Post("/moments/{id}/unpublish", auth.RequireScope("content:write", s.handleUnpublishMoment))
			r.Delete("/moments/{id}", auth.RequireScope("content:write", s.handleDeleteMoment))
		})

		r.Group(func(r chi.Router) {
			r.Post("/gallery-items", auth.RequireScope("content:write", s.handleCreateGalleryItem))
			r.Patch("/gallery-items/{id}", auth.RequireScope("content:write", s.handleUpdateGalleryItem))
			r.Post("/gallery-items/{id}/publish", auth.RequireScope("content:write", s.handlePublishGalleryItem))
			r.Post("/gallery-items/{id}/unpublish", auth.RequireScope("content:write", s.handleUnpublishGalleryItem))
			r.Delete("/gallery-items/{id}", auth.RequireScope("content:write", s.handleDeleteGalleryItem))
		})

		r.Group(func(r chi.Router) {
			r.Post("/ai/jobs", auth.RequireScope("ai:run", s.handleCreateAIJob))
			r.Get("/ai/jobs/{jobId}", auth.RequireScope("jobs:read", s.handleGetAIJob))
			r.Post("/ai/jobs/{jobId}/apply", auth.RequireScope("ai:run", s.handleApplyAIJob))
			r.Get("/ai/models", auth.RequireScope("ai:run", s.handleGetAIModels))
		})

		r.Group(func(r chi.Router) {
			r.Post("/keys", auth.RequireScope("keys:admin", s.handleCreateKey))
			r.Get("/keys", auth.RequireScope("keys:admin", s.handleListKeys))
			r.Post("/keys/{id}/rotate", auth.RequireScope("keys:admin", s.handleRotateKey))
			r.Post("/keys/{id}/revoke", auth.RequireScope("keys:admin", s.handleRevokeKey))
		})

		r.Get("/jobs/{id}", auth.RequireScope("jobs:read", s.handleGetGenericJob))
	})

	return r
}

func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"service": "tdp-api",
		"routes": map[string]string{
			"healthz": "/healthz",
			"readyz":  "/readyz",
			"public":  "/v1/public",
		},
	})
}

func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "service": "tdp-api"})
}

func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "db_unavailable", "database not ready", true, requestIDFromContext(r.Context()))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "ready": true})
}

func parsePagination(r *http.Request, defaultLimit, maxLimit int) (int, int) {
	query := r.URL.Query()
	limit := defaultLimit
	offset := 0

	if rawLimit := query.Get("limit"); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if limit > maxLimit {
		limit = maxLimit
	}

	if rawOffset := query.Get("offset"); rawOffset != "" {
		if parsed, err := strconv.Atoi(rawOffset); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	return limit, offset
}

func localeFromQuery(r *http.Request) string {
	locale := strings.TrimSpace(r.URL.Query().Get("locale"))
	if locale == "zh" {
		return "zh"
	}
	return "en"
}

func actorKeyID(r *http.Request) string {
	authCtx, ok := auth.GetAuthContext(r.Context())
	if !ok {
		return ""
	}
	return authCtx.KeyID
}

func writeStoreError(w http.ResponseWriter, r *http.Request, err error) {
	reqID := requestIDFromContext(r.Context())
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, "not_found", "resource not found", false, reqID)
	case errors.Is(err, store.ErrMomentContentOrMediaRequired):
		writeError(w, http.StatusBadRequest, "invalid_payload", "moment content or media is required", false, reqID)
	case errors.Is(err, store.ErrIdempotencyConflict):
		writeError(w, http.StatusConflict, "idempotency_conflict", "idempotency key already used with another payload", false, reqID)
	case errors.Is(err, store.ErrIdempotencyInProgress):
		writeError(w, http.StatusConflict, "idempotency_in_progress", "request is already in progress", true, reqID)
	default:
		writeError(w, http.StatusInternalServerError, "internal_error", fmt.Sprintf("internal error: %v", err), true, reqID)
	}
}
