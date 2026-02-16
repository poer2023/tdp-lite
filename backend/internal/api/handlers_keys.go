package api

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"tdp-lite/backend/internal/utils"
)

type createKeyRequest struct {
	Name   string   `json:"name"`
	Scopes []string `json:"scopes"`
}

type rotateKeyRequest struct {
	Reason string `json:"reason"`
}

func normalizeScopes(input []string) []string {
	if len(input) == 0 {
		return []string{"content:read"}
	}
	result := make([]string, 0, len(input))
	seen := make(map[string]struct{})
	for _, scope := range input {
		scope = strings.TrimSpace(scope)
		if scope == "" {
			continue
		}
		if _, exists := seen[scope]; exists {
			continue
		}
		seen[scope] = struct{}{}
		result = append(result, scope)
	}
	if len(result) == 0 {
		result = []string{"content:read"}
	}
	return result
}

func sha256Text(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func (s *Server) handleCreateKey(w http.ResponseWriter, r *http.Request) {
	var req createKeyRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid key payload", false, requestIDFromContext(r.Context()))
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		req.Name = "tdp-key"
	}
	keySuffix, err := utils.RandomHex(6)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	secret, err := utils.RandomHex(24)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	keyID := "k_" + keySuffix
	record, err := s.store.CreateAPIKey(
		r.Context(),
		req.Name,
		keyID,
		secret,
		sha256Text(secret),
		normalizeScopes(req.Scopes),
	)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "key.create", "api_key", record.KeyID, map[string]any{"name": record.Name})

	writeJSON(w, http.StatusOK, map[string]any{
		"item": map[string]any{
			"id":        record.ID,
			"keyId":     record.KeyID,
			"name":      record.Name,
			"scopes":    record.Scopes,
			"createdAt": record.CreatedAt,
		},
		"secret": secret,
	})
}

func (s *Server) handleListKeys(w http.ResponseWriter, r *http.Request) {
	items, err := s.store.ListAPIKeys(r.Context())
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		result = append(result, map[string]any{
			"id":         item.ID,
			"keyId":      item.KeyID,
			"name":       item.Name,
			"scopes":     item.Scopes,
			"createdAt":  item.CreatedAt,
			"revokedAt":  item.RevokedAt,
			"lastUsedAt": item.LastUsedAt,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{"items": result})
}

func (s *Server) handleRotateKey(w http.ResponseWriter, r *http.Request) {
	keyID := chi.URLParam(r, "id")
	var req rotateKeyRequest
	_ = decodeJSON(r, &req)

	secret, err := utils.RandomHex(24)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	if err := s.store.RotateAPIKey(r.Context(), keyID, secret, sha256Text(secret)); err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "key.rotate", "api_key", keyID, map[string]any{"reason": req.Reason})
	writeJSON(w, http.StatusOK, map[string]any{"keyId": keyID, "secret": secret})
}

func (s *Server) handleRevokeKey(w http.ResponseWriter, r *http.Request) {
	keyID := chi.URLParam(r, "id")
	if err := s.store.RevokeAPIKey(r.Context(), keyID); err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "key.revoke", "api_key", keyID, nil)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "keyId": keyID})
}
