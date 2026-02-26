package api

import (
	"errors"
	"net/http"
	"time"

	"tdp-lite/backend/internal/store"
)

type upsertProfileSnapshotRequest struct {
	Github       map[string]any `json:"github"`
	Music        map[string]any `json:"music"`
	Derived      map[string]any `json:"derived"`
	SourceStatus map[string]any `json:"sourceStatus"`
	SyncedAt     *time.Time     `json:"syncedAt"`
}

func profileSnapshotPayload(item store.ProfileSnapshot) map[string]any {
	return map[string]any{
		"github":       item.Github,
		"music":        item.Music,
		"derived":      item.Derived,
		"sourceStatus": item.SourceStatus,
		"syncedAt":     item.SyncedAt,
		"updatedAt":    item.UpdatedAt,
		"createdAt":    item.CreatedAt,
	}
}

func (s *Server) handlePublicProfileSnapshot(w http.ResponseWriter, r *http.Request) {
	item, err := s.store.GetProfileSnapshot(r.Context())
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSON(w, http.StatusOK, map[string]any{
				"item": map[string]any{
					"github":       nil,
					"music":        nil,
					"derived":      nil,
					"sourceStatus": nil,
					"syncedAt":     nil,
					"updatedAt":    nil,
					"createdAt":    nil,
				},
			})
			return
		}
		writeStoreError(w, r, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"item": profileSnapshotPayload(item)})
}

func (s *Server) handleUpsertProfileSnapshot(w http.ResponseWriter, r *http.Request) {
	var req upsertProfileSnapshotRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid profile snapshot payload", false, requestIDFromContext(r.Context()))
		return
	}

	hasData := req.Github != nil || req.Music != nil || req.Derived != nil || req.SourceStatus != nil || req.SyncedAt != nil
	if !hasData {
		writeError(w, http.StatusBadRequest, "invalid_payload", "at least one snapshot field is required", false, requestIDFromContext(r.Context()))
		return
	}

	input := store.UpsertProfileSnapshotInput{SyncedAt: req.SyncedAt}
	if req.Github != nil {
		input.Github = &req.Github
	}
	if req.Music != nil {
		input.Music = &req.Music
	}
	if req.Derived != nil {
		input.Derived = &req.Derived
	}
	if req.SourceStatus != nil {
		input.SourceStatus = &req.SourceStatus
	}

	item, err := s.store.UpsertProfileSnapshot(r.Context(), input)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "profile_snapshot.sync", "profile_snapshot", "singleton", map[string]any{
		"hasGithub":   req.Github != nil,
		"hasMusic":    req.Music != nil,
		"hasDerived":  req.Derived != nil,
		"hasSyncedAt": req.SyncedAt != nil,
	})

	writeJSON(w, http.StatusOK, map[string]any{"item": profileSnapshotPayload(item)})
}
