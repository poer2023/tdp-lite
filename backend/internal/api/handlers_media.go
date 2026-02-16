package api

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"tdp-lite/backend/internal/store"
)

const (
	imageMaxBytes = 15 * 1024 * 1024
	videoMaxBytes = 120 * 1024 * 1024
)

type createMediaUploadRequest struct {
	Filename string `json:"filename"`
	MimeType string `json:"mimeType"`
	Size     int64  `json:"size"`
	SHA256   string `json:"sha256"`
}

type completeMediaUploadRequest struct {
	Size   int64          `json:"size"`
	SHA256 string         `json:"sha256"`
	Exif   map[string]any `json:"exif"`
}

func mediaKind(mimeType string) string {
	mimeType = strings.ToLower(strings.TrimSpace(mimeType))
	if strings.HasPrefix(mimeType, "video/") {
		return "video"
	}
	if strings.HasPrefix(mimeType, "image/") {
		return "image"
	}
	return "unknown"
}

func validateMediaLimits(mimeType string, size int64) error {
	kind := mediaKind(mimeType)
	switch kind {
	case "image":
		if size > imageMaxBytes {
			return fmt.Errorf("image exceeds max size: 15MB")
		}
	case "video":
		if size > videoMaxBytes {
			return fmt.Errorf("video exceeds max size: 120MB")
		}
	default:
		return fmt.Errorf("unsupported media type")
	}
	return nil
}

func generateObjectKey(filename string) string {
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(filename), "."))
	if ext == "" {
		ext = "bin"
	}
	date := time.Now().UTC().Format("2006/01/02")
	return fmt.Sprintf("%s/%s.%s", date, uuid.NewString(), ext)
}

func (s *Server) presignUpload(ctx context.Context, objectKey string, mimeType string) (string, map[string]string, error) {
	if s.s3Presigner == nil {
		return "", map[string]string{}, nil
	}
	request, err := s.s3Presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      &s.cfg.S3Bucket,
		Key:         &objectKey,
		ContentType: &mimeType,
	}, s3.WithPresignExpires(15*time.Minute))
	if err != nil {
		return "", nil, err
	}

	headers := make(map[string]string, len(request.SignedHeader))
	for key, values := range request.SignedHeader {
		if len(values) == 0 {
			continue
		}
		headers[key] = values[0]
	}
	return request.URL, headers, nil
}

func (s *Server) handleCreateMediaUpload(w http.ResponseWriter, r *http.Request) {
	var req createMediaUploadRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid media upload payload", false, requestIDFromContext(r.Context()))
		return
	}

	req.Filename = strings.TrimSpace(req.Filename)
	req.MimeType = strings.ToLower(strings.TrimSpace(req.MimeType))
	if req.Filename == "" || req.MimeType == "" || req.Size <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_payload", "filename, mimeType and size are required", false, requestIDFromContext(r.Context()))
		return
	}
	if err := validateMediaLimits(req.MimeType, req.Size); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_media", err.Error(), false, requestIDFromContext(r.Context()))
		return
	}

	objectKey := generateObjectKey(req.Filename)
	url := strings.TrimRight(s.cfg.S3PublicURL, "/") + "/" + objectKey
	asset, err := s.store.CreateMediaAsset(r.Context(), store.CreateMediaAssetInput{
		ObjectKey: objectKey,
		URL:       url,
		Mime:      req.MimeType,
		Size:      req.Size,
		SHA256:    req.SHA256,
		Status:    "pending_upload",
	})
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	uploadURL, uploadHeaders, err := s.presignUpload(r.Context(), objectKey, req.MimeType)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "media.upload.create", "media_asset", asset.ID, map[string]any{"mimeType": req.MimeType})

	writeJSON(w, http.StatusOK, map[string]any{
		"uploadId":      asset.ID,
		"objectKey":     objectKey,
		"uploadUrl":     uploadURL,
		"uploadMethod":  "PUT",
		"uploadHeaders": uploadHeaders,
		"asset":         asset,
	})
}

func (s *Server) handleCompleteMediaUpload(w http.ResponseWriter, r *http.Request) {
	uploadID := chi.URLParam(r, "uploadId")
	var req completeMediaUploadRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid upload completion payload", false, requestIDFromContext(r.Context()))
		return
	}
	if req.Size <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_payload", "size must be positive", false, requestIDFromContext(r.Context()))
		return
	}

	asset, err := s.store.CompleteMediaAsset(r.Context(), uploadID, req.Size, strings.TrimSpace(req.SHA256), "uploaded", req.Exif)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "media.upload.complete", "media_asset", asset.ID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"asset": asset})
}
