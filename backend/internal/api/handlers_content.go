package api

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"tdp-lite/backend/internal/store"
	"tdp-lite/backend/internal/utils"
)

type createPostRequest struct {
	TranslationKey *string    `json:"translationKey"`
	Locale         string     `json:"locale"`
	Title          string     `json:"title"`
	Slug           string     `json:"slug"`
	Excerpt        *string    `json:"excerpt"`
	Content        string     `json:"content"`
	CoverURL       *string    `json:"coverUrl"`
	Tags           []string   `json:"tags"`
	Status         string     `json:"status"`
	CardSpan       *string    `json:"cardSpan"`
	PublishedAt    *time.Time `json:"publishedAt"`
}

type updatePostRequest struct {
	Locale      *string    `json:"locale"`
	Title       *string    `json:"title"`
	Slug        *string    `json:"slug"`
	Excerpt     *string    `json:"excerpt"`
	Content     *string    `json:"content"`
	CoverURL    *string    `json:"coverUrl"`
	Tags        *[]string  `json:"tags"`
	Status      *string    `json:"status"`
	CardSpan    *string    `json:"cardSpan"`
	PublishedAt *time.Time `json:"publishedAt"`
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

func normalizeOptionalCardSpan(input *string) (*string, bool) {
	if input == nil {
		return nil, true
	}

	value := strings.TrimSpace(*input)
	if value == "" || value == "auto" {
		return nil, true
	}

	switch value {
	case "1x1", "1x2", "2x1", "2x2":
		return &value, true
	default:
		return nil, false
	}
}

func normalizedListStatus(input string) (string, bool) {
	switch strings.TrimSpace(input) {
	case "", "all":
		return "all", true
	case "draft", "published", "archived":
		return input, true
	default:
		return "", false
	}
}

func trimPtr(input *string) *string {
	if input == nil {
		return nil
	}
	value := strings.TrimSpace(*input)
	return &value
}

func trimOptionalStringPtr(input *string) *string {
	value := trimPtr(input)
	if value == nil || *value == "" {
		return nil
	}
	return value
}

func (s *Server) requestSearchSnapshotRefresh(r *http.Request, reason string) {
	if _, err := s.store.RequestSearchSnapshotRefresh(r.Context()); err != nil {
		log.Printf("search snapshot refresh request failed reason=%s err=%v", reason, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "search_snapshot.request", "search_snapshot", "singleton", map[string]any{
		"reason": reason,
	})
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
	cardSpan, ok := normalizeOptionalCardSpan(req.CardSpan)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_payload", "cardSpan must be one of auto|1x1|1x2|2x1|2x2", false, requestIDFromContext(r.Context()))
		return
	}

	if _, err := s.runWithIdempotency(w, r, req, func() (any, error) {
		item, err := s.store.CreatePost(r.Context(), store.CreatePostInput{
			TranslationKey: trimOptionalStringPtr(req.TranslationKey),
			Locale:         req.Locale,
			Title:          req.Title,
			Slug:           req.Slug,
			Excerpt:        trimPtr(req.Excerpt),
			Content:        req.Content,
			CoverURL:       trimPtr(req.CoverURL),
			Tags:           req.Tags,
			Status:         req.Status,
			CardSpan:       cardSpan,
			PublishedAt:    req.PublishedAt,
			UpdatedBy:      ptr(actorKeyID(r)),
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "post.create", "post", item.ID, map[string]any{"status": item.Status})
		s.requestSearchSnapshotRefresh(r, "post.create")
		return map[string]any{"item": item}, nil
	}); err != nil {
		writeStoreError(w, r, err)
	}
}

func (s *Server) handleListPosts(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r, 50, 200)
	locale := normalizedLocale(strings.TrimSpace(r.URL.Query().Get("locale")))
	status, ok := normalizedListStatus(r.URL.Query().Get("status"))
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_filters", "status must be one of all|draft|published|archived", false, requestIDFromContext(r.Context()))
		return
	}

	storeStatus := ""
	if status != "all" {
		storeStatus = status
	}

	items, err := s.store.ListPostsForAdmin(r.Context(), locale, storeStatus, limit, offset)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"limit":  limit,
		"offset": offset,
		"locale": locale,
		"status": status,
	})
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
	cardSpan, ok := normalizeOptionalCardSpan(req.CardSpan)
	if req.CardSpan != nil && !ok {
		writeError(w, http.StatusBadRequest, "invalid_payload", "cardSpan must be one of auto|1x1|1x2|2x1|2x2", false, requestIDFromContext(r.Context()))
		return
	}

	if _, err := s.runWithIdempotency(w, r, map[string]any{"id": id, "payload": req}, func() (any, error) {
		item, err := s.store.UpdatePost(r.Context(), id, store.UpdatePostInput{
			Locale:         req.Locale,
			Title:          req.Title,
			Slug:           req.Slug,
			Excerpt:        trimPtr(req.Excerpt),
			Content:        req.Content,
			CoverURL:       trimPtr(req.CoverURL),
			Tags:           req.Tags,
			Status:         req.Status,
			CardSpan:       cardSpan,
			CardSpanSet:    req.CardSpan != nil,
			PublishedAt:    req.PublishedAt,
			PublishedAtSet: req.PublishedAt != nil,
			UpdatedBy:      ptr(actorKeyID(r)),
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "post.update", "post", item.ID, nil)
		s.requestSearchSnapshotRefresh(r, "post.update")
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
	s.requestSearchSnapshotRefresh(r, "post.publish")
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
	s.requestSearchSnapshotRefresh(r, "post.unpublish")
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handleDeletePost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.SoftDeletePost(r.Context(), id); err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "post.delete", "post", id, nil)
	s.requestSearchSnapshotRefresh(r, "post.delete")
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type createMomentRequest struct {
	TranslationKey *string                 `json:"translationKey"`
	Content        string                  `json:"content"`
	Locale         string                  `json:"locale"`
	Visibility     string                  `json:"visibility"`
	Location       *store.MomentLocation   `json:"location"`
	Media          []store.MomentMediaItem `json:"media"`
	Status         string                  `json:"status"`
	CardSpan       *string                 `json:"cardSpan"`
	PublishedAt    *time.Time              `json:"publishedAt"`
}

type updateMomentRequest struct {
	Content     *string                  `json:"content"`
	Locale      *string                  `json:"locale"`
	Visibility  *string                  `json:"visibility"`
	Location    *store.MomentLocation    `json:"location"`
	Media       *[]store.MomentMediaItem `json:"media"`
	Status      *string                  `json:"status"`
	CardSpan    *string                  `json:"cardSpan"`
	PublishedAt *time.Time               `json:"publishedAt"`
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
	cardSpan, ok := normalizeOptionalCardSpan(req.CardSpan)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_payload", "cardSpan must be one of auto|1x1|1x2|2x1|2x2", false, requestIDFromContext(r.Context()))
		return
	}

	if _, err := s.runWithIdempotency(w, r, req, func() (any, error) {
		item, err := s.store.CreateMoment(r.Context(), store.CreateMomentInput{
			TranslationKey: trimOptionalStringPtr(req.TranslationKey),
			Content:        req.Content,
			Locale:         req.Locale,
			Visibility:     req.Visibility,
			Location:       req.Location,
			Media:          req.Media,
			Status:         req.Status,
			CardSpan:       cardSpan,
			PublishedAt:    req.PublishedAt,
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "moment.create", "moment", item.ID, map[string]any{"status": item.Status})
		s.requestSearchSnapshotRefresh(r, "moment.create")
		return map[string]any{"item": item}, nil
	}); err != nil {
		writeStoreError(w, r, err)
	}
}

func (s *Server) handleListMoments(w http.ResponseWriter, r *http.Request) {
	limit, offset := parsePagination(r, 50, 200)
	locale := normalizedLocale(strings.TrimSpace(r.URL.Query().Get("locale")))
	status, ok := normalizedListStatus(r.URL.Query().Get("status"))
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid_filters", "status must be one of all|draft|published|archived", false, requestIDFromContext(r.Context()))
		return
	}

	storeStatus := ""
	if status != "all" {
		storeStatus = status
	}

	items, err := s.store.ListMomentsForAdmin(r.Context(), locale, storeStatus, limit, offset)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"limit":  limit,
		"offset": offset,
		"locale": locale,
		"status": status,
	})
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
	cardSpan, ok := normalizeOptionalCardSpan(req.CardSpan)
	if req.CardSpan != nil && !ok {
		writeError(w, http.StatusBadRequest, "invalid_payload", "cardSpan must be one of auto|1x1|1x2|2x1|2x2", false, requestIDFromContext(r.Context()))
		return
	}

	if _, err := s.runWithIdempotency(w, r, map[string]any{"id": id, "payload": req}, func() (any, error) {
		item, err := s.store.UpdateMoment(r.Context(), id, store.UpdateMomentInput{
			Content:        req.Content,
			Locale:         req.Locale,
			Visibility:     req.Visibility,
			Location:       req.Location,
			Media:          req.Media,
			Status:         req.Status,
			CardSpan:       cardSpan,
			CardSpanSet:    req.CardSpan != nil,
			PublishedAt:    req.PublishedAt,
			PublishedAtSet: req.PublishedAt != nil,
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "moment.update", "moment", item.ID, nil)
		s.requestSearchSnapshotRefresh(r, "moment.update")
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
	s.requestSearchSnapshotRefresh(r, "moment.publish")
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
	s.requestSearchSnapshotRefresh(r, "moment.unpublish")
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handleDeleteMoment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.SoftDeleteMoment(r.Context(), id); err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "moment.delete", "moment", id, nil)
	s.requestSearchSnapshotRefresh(r, "moment.delete")
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
	PublishedAt *time.Time `json:"publishedAt"`
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
			PublishedAt: req.PublishedAt,
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "gallery.create", "gallery", item.ID, map[string]any{"status": item.Status})
		s.requestSearchSnapshotRefresh(r, "gallery.create")
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
		s.requestSearchSnapshotRefresh(r, "gallery.update")
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
	s.requestSearchSnapshotRefresh(r, "gallery.publish")
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
	s.requestSearchSnapshotRefresh(r, "gallery.unpublish")
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handleDeleteGalleryItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.SoftDeleteGallery(r.Context(), id); err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "gallery.delete", "gallery", id, nil)
	s.requestSearchSnapshotRefresh(r, "gallery.delete")
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func ptr[T any](value T) *T {
	return &value
}
