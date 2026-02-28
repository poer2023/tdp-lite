package api

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"tdp-lite/backend/internal/store"
)

func emptySearchSnapshot(locale string) map[string]any {
	return map[string]any{
		"schemaVersion": 1,
		"generatedAt":   nil,
		"locale":        locale,
		"counts": map[string]any{
			"post":    0,
			"moment":  0,
			"gallery": 0,
		},
		"items": []any{},
	}
}

func searchSnapshotPayload(item store.SearchSnapshot) map[string]any {
	if item.Snapshot == nil {
		return emptySearchSnapshot(item.Locale)
	}
	return item.Snapshot
}

func parseSearchSnapshotGeneratedAt(snapshot map[string]any) (*time.Time, error) {
	raw, ok := snapshot["generatedAt"]
	if !ok || raw == nil {
		return nil, nil
	}
	value, ok := raw.(string)
	if !ok || strings.TrimSpace(value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func parseSearchSnapshotLocale(snapshot map[string]any) string {
	raw, ok := snapshot["locale"].(string)
	if ok && strings.TrimSpace(raw) == "zh" {
		return "zh"
	}
	return "en"
}

func (s *Server) handlePublicSearchSnapshot(w http.ResponseWriter, r *http.Request) {
	locale := localeFromQuery(r)
	item, err := s.store.GetSearchSnapshot(r.Context(), locale)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSON(w, http.StatusOK, map[string]any{"item": emptySearchSnapshot(locale)})
			return
		}
		writeStoreError(w, r, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"item": searchSnapshotPayload(item)})
}

func (s *Server) handleUpsertSearchSnapshot(w http.ResponseWriter, r *http.Request) {
	var snapshot map[string]any
	if err := decodeJSON(r, &snapshot); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid search snapshot payload", false, requestIDFromContext(r.Context()))
		return
	}
	if len(snapshot) == 0 {
		writeError(w, http.StatusBadRequest, "invalid_payload", "search snapshot payload is required", false, requestIDFromContext(r.Context()))
		return
	}

	locale := parseSearchSnapshotLocale(snapshot)
	generatedAt, err := parseSearchSnapshotGeneratedAt(snapshot)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid generatedAt timestamp", false, requestIDFromContext(r.Context()))
		return
	}

	item, err := s.store.UpsertSearchSnapshot(r.Context(), store.UpsertSearchSnapshotInput{
		Locale:      locale,
		Snapshot:    snapshot,
		GeneratedAt: generatedAt,
	})
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "search_snapshot.sync", "search_snapshot", locale, map[string]any{
		"locale":      locale,
		"generatedAt": generatedAt,
		"itemCount":   len(asSlice(snapshot["items"])),
	})

	writeJSON(w, http.StatusOK, map[string]any{"item": searchSnapshotPayload(item)})
}

func asSlice(value any) []any {
	items, ok := value.([]any)
	if !ok {
		return []any{}
	}
	return items
}

func searchSnapshotRefreshStatePayload(item store.SearchSnapshotRefreshState) map[string]any {
	hasPending := item.RequestedAt != nil && (item.ProcessedAt == nil || item.RequestedAt.After(*item.ProcessedAt))
	return map[string]any{
		"requestedAt": item.RequestedAt,
		"processedAt": item.ProcessedAt,
		"updatedAt":   item.UpdatedAt,
		"createdAt":   item.CreatedAt,
		"hasPending":  hasPending,
	}
}

func (s *Server) handleGetSearchSnapshotRefreshStatus(w http.ResponseWriter, r *http.Request) {
	item, err := s.store.GetSearchSnapshotRefreshState(r.Context())
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSON(w, http.StatusOK, map[string]any{
				"item": map[string]any{
					"requestedAt": nil,
					"processedAt": nil,
					"updatedAt":   nil,
					"createdAt":   nil,
					"hasPending":  false,
				},
			})
			return
		}
		writeStoreError(w, r, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"item": searchSnapshotRefreshStatePayload(item)})
}
