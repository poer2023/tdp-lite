package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (s *Server) handlePublicFeed(w http.ResponseWriter, r *http.Request) {
	locale := localeFromQuery(r)
	limit, _ := parsePagination(r, 20, 100)

	items, err := s.store.ListPublicFeed(r.Context(), locale, limit)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"locale": locale,
		"limit":  limit,
	})
}

func (s *Server) handlePublicPosts(w http.ResponseWriter, r *http.Request) {
	locale := localeFromQuery(r)
	limit, offset := parsePagination(r, 20, 100)
	items, err := s.store.ListPublicPosts(r.Context(), locale, limit, offset)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"locale": locale,
		"limit":  limit,
		"offset": offset,
	})
}

func (s *Server) handlePublicPostBySlug(w http.ResponseWriter, r *http.Request) {
	locale := localeFromQuery(r)
	slug := chi.URLParam(r, "slug")
	item, err := s.store.GetPublicPostBySlug(r.Context(), locale, slug)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handlePublicMoments(w http.ResponseWriter, r *http.Request) {
	locale := localeFromQuery(r)
	limit, offset := parsePagination(r, 20, 100)
	items, err := s.store.ListPublicMoments(r.Context(), locale, limit, offset)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"locale": locale,
		"limit":  limit,
		"offset": offset,
	})
}

func (s *Server) handlePublicMomentByID(w http.ResponseWriter, r *http.Request) {
	locale := localeFromQuery(r)
	id := chi.URLParam(r, "id")
	item, err := s.store.GetPublicMomentByID(r.Context(), locale, id)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

func (s *Server) handlePublicGallery(w http.ResponseWriter, r *http.Request) {
	locale := localeFromQuery(r)
	limit, offset := parsePagination(r, 20, 100)
	items, err := s.store.ListPublicGallery(r.Context(), locale, limit, offset)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"items":  items,
		"locale": locale,
		"limit":  limit,
		"offset": offset,
	})
}

func (s *Server) handlePublicGalleryByID(w http.ResponseWriter, r *http.Request) {
	locale := localeFromQuery(r)
	id := chi.URLParam(r, "id")
	item, err := s.store.GetPublicGalleryByID(r.Context(), locale, id)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}
