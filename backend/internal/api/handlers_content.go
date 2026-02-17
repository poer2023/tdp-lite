package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"tdp-lite/backend/internal/store"
	"tdp-lite/backend/internal/utils"
)

type createPostRequest struct {
	Locale   string   `json:"locale"`
	Title    string   `json:"title"`
	Slug     string   `json:"slug"`
	Excerpt  *string  `json:"excerpt"`
	Content  string   `json:"content"`
	CoverURL *string  `json:"coverUrl"`
	Tags     []string `json:"tags"`
	Status   string   `json:"status"`
}

type updatePostRequest struct {
	Locale   *string   `json:"locale"`
	Title    *string   `json:"title"`
	Slug     *string   `json:"slug"`
	Excerpt  *string   `json:"excerpt"`
	Content  *string   `json:"content"`
	CoverURL *string   `json:"coverUrl"`
	Tags     *[]string `json:"tags"`
	Status   *string   `json:"status"`
}

func normalizedLocale(input string) string {
	if input == "zh" {
		return "zh"
	}
	return "en"
}

func normalizedStatus(input string) string {
	switch input {
	case "draft", "published", "archived":
		return input
	default:
		return "draft"
	}
}

func normalizeVisibility(input string) string {
	if input == "private" {
		return "private"
	}
	return "public"
}

func trimPtr(input *string) *string {
	if input == nil {
		return nil
	}
	value := strings.TrimSpace(*input)
	return &value
}

func (s *Server) handleCreatePost(w http.ResponseWriter, r *http.Request) {
	var req createPostRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid post payload", false, requestIDFromContext(r.Context()))
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Content = strings.TrimSpace(req.Content)
	if req.Title == "" || req.Content == "" {
		writeError(w, http.StatusBadRequest, "invalid_payload", "title and content are required", false, requestIDFromContext(r.Context()))
		return
	}

	if strings.TrimSpace(req.Slug) == "" {
		req.Slug = utils.Slugify(req.Title)
	}
	req.Locale = normalizedLocale(strings.TrimSpace(req.Locale))
	req.Status = normalizedStatus(strings.TrimSpace(req.Status))

	if _, err := s.runWithIdempotency(w, r, req, func() (any, error) {
		item, err := s.store.CreatePost(r.Context(), store.CreatePostInput{
			Locale:    req.Locale,
			Title:     req.Title,
			Slug:      req.Slug,
			Excerpt:   trimPtr(req.Excerpt),
			Content:   req.Content,
			CoverURL:  trimPtr(req.CoverURL),
			Tags:      req.Tags,
			Status:    req.Status,
			UpdatedBy: ptr(actorKeyID(r)),
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "post.create", "post", item.ID, map[string]any{"status": item.Status})
		return map[string]any{"item": item}, nil
	}); err != nil {
		writeStoreError(w, r, err)
	}
}

func (s *Server) handleUpdatePost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req updatePostRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid post patch payload", false, requestIDFromContext(r.Context()))
		return
	}

	if req.Locale != nil {
		value := normalizedLocale(strings.TrimSpace(*req.Locale))
		req.Locale = &value
	}
	if req.Status != nil {
		value := normalizedStatus(strings.TrimSpace(*req.Status))
		req.Status = &value
	}
	if req.Title != nil {
		value := strings.TrimSpace(*req.Title)
		req.Title = &value
		if req.Slug == nil && value != "" {
			slug := utils.Slugify(value)
			req.Slug = &slug
		}
	}
	if req.Content != nil {
		value := strings.TrimSpace(*req.Content)
		req.Content = &value
	}

	if _, err := s.runWithIdempotency(w, r, map[string]any{"id": id, "payload": req}, func() (any, error) {
		item, err := s.store.UpdatePost(r.Context(), id, store.UpdatePostInput{
			Locale:    req.Locale,
			Title:     req.Title,
			Slug:      req.Slug,
			Excerpt:   trimPtr(req.Excerpt),
			Content:   req.Content,
			CoverURL:  trimPtr(req.CoverURL),
			Tags:      req.Tags,
			Status:    req.Status,
			UpdatedBy: ptr(actorKeyID(r)),
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "post.update", "post", item.ID, nil)
		return map[string]any{"item": item}, nil
	}); err != nil {
		writeStoreError(w, r, err)
	}
}

func (s *Server) handlePublishPost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := s.store.SetPostStatus(r.Context(), id, "published", ptr(actorKeyID(r)))
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "post.publish", "post", item.ID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handleUnpublishPost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := s.store.SetPostStatus(r.Context(), id, "draft", ptr(actorKeyID(r)))
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "post.unpublish", "post", item.ID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handleDeletePost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.SoftDeletePost(r.Context(), id); err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "post.delete", "post", id, nil)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type createMomentRequest struct {
	Content    string                  `json:"content"`
	Locale     string                  `json:"locale"`
	Visibility string                  `json:"visibility"`
	Location   *store.MomentLocation   `json:"location"`
	Media      []store.MomentMediaItem `json:"media"`
	Status     string                  `json:"status"`
}

type updateMomentRequest struct {
	Content    *string                  `json:"content"`
	Locale     *string                  `json:"locale"`
	Visibility *string                  `json:"visibility"`
	Location   *store.MomentLocation    `json:"location"`
	Media      *[]store.MomentMediaItem `json:"media"`
	Status     *string                  `json:"status"`
}

func (s *Server) handleCreateMoment(w http.ResponseWriter, r *http.Request) {
	var req createMomentRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid moment payload", false, requestIDFromContext(r.Context()))
		return
	}
	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" && len(req.Media) == 0 {
		writeError(w, http.StatusBadRequest, "invalid_payload", "content or media is required", false, requestIDFromContext(r.Context()))
		return
	}
	req.Locale = normalizedLocale(req.Locale)
	req.Visibility = normalizeVisibility(req.Visibility)
	req.Status = normalizedStatus(req.Status)

	if _, err := s.runWithIdempotency(w, r, req, func() (any, error) {
		item, err := s.store.CreateMoment(r.Context(), store.CreateMomentInput{
			Content:    req.Content,
			Locale:     req.Locale,
			Visibility: req.Visibility,
			Location:   req.Location,
			Media:      req.Media,
			Status:     req.Status,
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "moment.create", "moment", item.ID, map[string]any{"status": item.Status})
		return map[string]any{"item": item}, nil
	}); err != nil {
		writeStoreError(w, r, err)
	}
}

func (s *Server) handleUpdateMoment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req updateMomentRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid moment patch payload", false, requestIDFromContext(r.Context()))
		return
	}
	if req.Locale != nil {
		value := normalizedLocale(*req.Locale)
		req.Locale = &value
	}
	if req.Visibility != nil {
		value := normalizeVisibility(*req.Visibility)
		req.Visibility = &value
	}
	if req.Content != nil {
		value := strings.TrimSpace(*req.Content)
		req.Content = &value
	}
	if req.Status != nil {
		value := normalizedStatus(*req.Status)
		req.Status = &value
	}

	if _, err := s.runWithIdempotency(w, r, map[string]any{"id": id, "payload": req}, func() (any, error) {
		item, err := s.store.UpdateMoment(r.Context(), id, store.UpdateMomentInput{
			Content:    req.Content,
			Locale:     req.Locale,
			Visibility: req.Visibility,
			Location:   req.Location,
			Media:      req.Media,
			Status:     req.Status,
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "moment.update", "moment", item.ID, nil)
		return map[string]any{"item": item}, nil
	}); err != nil {
		writeStoreError(w, r, err)
	}
}

func (s *Server) handlePublishMoment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := s.store.SetMomentStatus(r.Context(), id, "published")
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "moment.publish", "moment", item.ID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handleUnpublishMoment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := s.store.SetMomentStatus(r.Context(), id, "draft")
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "moment.unpublish", "moment", item.ID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handleDeleteMoment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.SoftDeleteMoment(r.Context(), id); err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "moment.delete", "moment", id, nil)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type createGalleryRequest struct {
	Locale      string     `json:"locale"`
	FileURL     string     `json:"fileUrl"`
	ThumbURL    *string    `json:"thumbUrl"`
	Title       *string    `json:"title"`
	Width       *int       `json:"width"`
	Height      *int       `json:"height"`
	CapturedAt  *time.Time `json:"capturedAt"`
	Camera      *string    `json:"camera"`
	Lens        *string    `json:"lens"`
	FocalLength *string    `json:"focalLength"`
	Aperture    *string    `json:"aperture"`
	ISO         *int       `json:"iso"`
	Latitude    *float64   `json:"latitude"`
	Longitude   *float64   `json:"longitude"`
	IsLivePhoto bool       `json:"isLivePhoto"`
	VideoURL    *string    `json:"videoUrl"`
	Status      string     `json:"status"`
}

type updateGalleryRequest struct {
	Locale      *string    `json:"locale"`
	FileURL     *string    `json:"fileUrl"`
	ThumbURL    *string    `json:"thumbUrl"`
	Title       *string    `json:"title"`
	Width       *int       `json:"width"`
	Height      *int       `json:"height"`
	CapturedAt  *time.Time `json:"capturedAt"`
	Camera      *string    `json:"camera"`
	Lens        *string    `json:"lens"`
	FocalLength *string    `json:"focalLength"`
	Aperture    *string    `json:"aperture"`
	ISO         *int       `json:"iso"`
	Latitude    *float64   `json:"latitude"`
	Longitude   *float64   `json:"longitude"`
	IsLivePhoto *bool      `json:"isLivePhoto"`
	VideoURL    *string    `json:"videoUrl"`
	Status      *string    `json:"status"`
}

func (s *Server) handleCreateGalleryItem(w http.ResponseWriter, r *http.Request) {
	var req createGalleryRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid gallery payload", false, requestIDFromContext(r.Context()))
		return
	}
	if strings.TrimSpace(req.FileURL) == "" {
		writeError(w, http.StatusBadRequest, "invalid_payload", "fileUrl is required", false, requestIDFromContext(r.Context()))
		return
	}
	req.Locale = normalizedLocale(req.Locale)
	req.Status = normalizedStatus(req.Status)

	if _, err := s.runWithIdempotency(w, r, req, func() (any, error) {
		item, err := s.store.CreateGallery(r.Context(), store.CreateGalleryInput{
			Locale:      req.Locale,
			FileURL:     req.FileURL,
			ThumbURL:    trimPtr(req.ThumbURL),
			Title:       trimPtr(req.Title),
			Width:       req.Width,
			Height:      req.Height,
			CapturedAt:  req.CapturedAt,
			Camera:      trimPtr(req.Camera),
			Lens:        trimPtr(req.Lens),
			FocalLength: trimPtr(req.FocalLength),
			Aperture:    trimPtr(req.Aperture),
			ISO:         req.ISO,
			Latitude:    req.Latitude,
			Longitude:   req.Longitude,
			IsLivePhoto: req.IsLivePhoto,
			VideoURL:    trimPtr(req.VideoURL),
			Status:      req.Status,
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "gallery.create", "gallery", item.ID, map[string]any{"status": item.Status})
		return map[string]any{"item": item}, nil
	}); err != nil {
		writeStoreError(w, r, err)
	}
}

func (s *Server) handleUpdateGalleryItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req updateGalleryRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid gallery patch payload", false, requestIDFromContext(r.Context()))
		return
	}
	if req.Locale != nil {
		value := normalizedLocale(*req.Locale)
		req.Locale = &value
	}
	if req.Status != nil {
		value := normalizedStatus(*req.Status)
		req.Status = &value
	}

	if _, err := s.runWithIdempotency(w, r, map[string]any{"id": id, "payload": req}, func() (any, error) {
		item, err := s.store.UpdateGallery(r.Context(), id, store.UpdateGalleryInput{
			Locale:      req.Locale,
			FileURL:     trimPtr(req.FileURL),
			ThumbURL:    trimPtr(req.ThumbURL),
			Title:       trimPtr(req.Title),
			Width:       req.Width,
			Height:      req.Height,
			CapturedAt:  req.CapturedAt,
			Camera:      trimPtr(req.Camera),
			Lens:        trimPtr(req.Lens),
			FocalLength: trimPtr(req.FocalLength),
			Aperture:    trimPtr(req.Aperture),
			ISO:         req.ISO,
			Latitude:    req.Latitude,
			Longitude:   req.Longitude,
			IsLivePhoto: req.IsLivePhoto,
			VideoURL:    trimPtr(req.VideoURL),
			Status:      req.Status,
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "gallery.update", "gallery", item.ID, nil)
		return map[string]any{"item": item}, nil
	}); err != nil {
		writeStoreError(w, r, err)
	}
}

func (s *Server) handlePublishGalleryItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := s.store.SetGalleryStatus(r.Context(), id, "published")
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "gallery.publish", "gallery", item.ID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handleUnpublishGalleryItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	item, err := s.store.SetGalleryStatus(r.Context(), id, "draft")
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "gallery.unpublish", "gallery", item.ID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handleDeleteGalleryItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.SoftDeleteGallery(r.Context(), id); err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "gallery.delete", "gallery", id, nil)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func ptr[T any](value T) *T {
	return &value
}
