package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"tdp-lite/backend/internal/auth"
)

type upsertPreviewSessionRequest struct {
	SessionID *string          `json:"sessionId"`
	Payload   *json.RawMessage `json:"payload"`
	Kind      *string          `json:"kind"`
	ContentID *string          `json:"contentId"`
}

func (s *Server) buildPreviewPayloadFromContent(r *http.Request, kind, contentID string) (json.RawMessage, error) {
	kind = strings.TrimSpace(kind)
	switch kind {
	case "post":
		post, err := s.store.GetPostByID(r.Context(), contentID)
		if err != nil {
			return nil, err
		}
		payload, err := json.Marshal(map[string]any{
			"kind": "post",
			"data": map[string]any{
				"title":    post.Title,
				"content":  post.Content,
				"excerpt":  post.Excerpt,
				"locale":   post.Locale,
				"tags":     post.Tags,
				"status":   post.Status,
				"coverUrl": post.CoverURL,
			},
		})
		return payload, err
	case "moment":
		moment, err := s.store.GetMomentByID(r.Context(), contentID)
		if err != nil {
			return nil, err
		}
		locationName := ""
		if moment.Location != nil {
			locationName = moment.Location.Name
		}
		payload, err := json.Marshal(map[string]any{
			"kind": "moment",
			"data": map[string]any{
				"content":      moment.Content,
				"locale":       moment.Locale,
				"visibility":   moment.Visibility,
				"locationName": locationName,
				"media":        moment.Media,
			},
		})
		return payload, err
	case "gallery":
		gallery, err := s.store.GetGalleryByID(r.Context(), contentID)
		if err != nil {
			return nil, err
		}
		payload, err := json.Marshal(map[string]any{
			"kind": "gallery",
			"data": map[string]any{
				"locale":      gallery.Locale,
				"fileUrl":     gallery.FileURL,
				"thumbUrl":    gallery.ThumbURL,
				"title":       gallery.Title,
				"width":       gallery.Width,
				"height":      gallery.Height,
				"capturedAt":  gallery.CapturedAt,
				"camera":      gallery.Camera,
				"lens":        gallery.Lens,
				"focalLength": gallery.FocalLength,
				"aperture":    gallery.Aperture,
				"iso":         gallery.ISO,
				"latitude":    gallery.Latitude,
				"longitude":   gallery.Longitude,
				"isLivePhoto": gallery.IsLivePhoto,
				"videoUrl":    gallery.VideoURL,
			},
		})
		return payload, err
	default:
		return nil, fmt.Errorf("unsupported preview kind: %s", kind)
	}
}

func (s *Server) handleUpsertPreviewSession(w http.ResponseWriter, r *http.Request) {
	var req upsertPreviewSessionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid preview payload", false, requestIDFromContext(r.Context()))
		return
	}

	var payload []byte
	if req.Payload != nil {
		payload = []byte(*req.Payload)
	} else {
		if req.Kind == nil || req.ContentID == nil {
			writeError(w, http.StatusBadRequest, "invalid_payload", "payload or kind+contentId is required", false, requestIDFromContext(r.Context()))
			return
		}
		kind := strings.TrimSpace(*req.Kind)
		if kind != "post" && kind != "moment" && kind != "gallery" {
			writeError(w, http.StatusBadRequest, "invalid_payload", "kind must be one of post|moment|gallery", false, requestIDFromContext(r.Context()))
			return
		}
		built, err := s.buildPreviewPayloadFromContent(r, kind, *req.ContentID)
		if err != nil {
			writeStoreError(w, r, err)
			return
		}
		payload = built
	}

	sessionID := ""
	if req.SessionID != nil {
		sessionID = strings.TrimSpace(*req.SessionID)
	}
	expiresAt := time.Now().UTC().Add(s.cfg.PreviewTTL)
	record, err := s.store.UpsertPreviewSession(r.Context(), sessionID, payload, expiresAt)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	signature := auth.SignPreview(s.cfg.PreviewSecret, record.ID, record.ExpiresAt)
	query := url.Values{}
	query.Set("sid", record.ID)
	query.Set("exp", strconv.FormatInt(record.ExpiresAt.UnixMilli(), 10))
	query.Set("sig", signature)

	baseURL := strings.TrimRight(s.cfg.AppBaseURL, "/")
	cardURL := baseURL + "/preview/card?" + query.Encode()
	detailURL := baseURL + "/preview/detail?" + query.Encode()

	writeJSON(w, http.StatusOK, map[string]any{
		"sessionId":        record.ID,
		"expiresAt":        record.ExpiresAt,
		"cardPreviewUrl":   cardURL,
		"detailPreviewUrl": detailURL,
	})
}

func (s *Server) handleGetPreviewPayload(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	expiresAtMillis := strings.TrimSpace(r.URL.Query().Get("exp"))
	signature := strings.TrimSpace(r.URL.Query().Get("sig"))
	if expiresAtMillis == "" || signature == "" {
		writeError(w, http.StatusBadRequest, "invalid_preview_token", "missing exp or sig", false, requestIDFromContext(r.Context()))
		return
	}

	if !auth.VerifyPreview(s.cfg.PreviewSecret, sessionID, expiresAtMillis, signature, time.Now().UTC()) {
		writeError(w, http.StatusUnauthorized, "invalid_preview_token", "preview token expired or invalid", false, requestIDFromContext(r.Context()))
		return
	}

	record, err := s.store.GetPreviewSessionByID(r.Context(), sessionID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	if record.ExpiresAt.Before(time.Now().UTC()) {
		writeError(w, http.StatusUnauthorized, "preview_expired", "preview session expired", false, requestIDFromContext(r.Context()))
		return
	}

	var payload map[string]any
	if err := json.Unmarshal(record.Payload, &payload); err != nil {
		writeError(w, http.StatusInternalServerError, "invalid_preview_payload", "stored preview payload is invalid", true, requestIDFromContext(r.Context()))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"sessionId": record.ID,
		"expiresAt": record.ExpiresAt,
		"payload":   payload,
	})
}
