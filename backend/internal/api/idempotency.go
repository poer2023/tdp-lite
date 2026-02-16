package api

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"tdp-lite/backend/internal/store"
)

func payloadHash(payload any) (string, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), nil
}

func (s *Server) runWithIdempotency(w http.ResponseWriter, r *http.Request, payload any, execute func() (any, error)) (bool, error) {
	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		result, err := execute()
		if err != nil {
			return false, err
		}
		writeJSON(w, http.StatusOK, result)
		return true, nil
	}

	hash, err := payloadHash(payload)
	if err != nil {
		return false, err
	}

	beginResult, err := s.store.BeginIdempotency(r.Context(), idempotencyKey, hash)
	if err != nil {
		if err == store.ErrIdempotencyConflict || err == store.ErrIdempotencyInProgress {
			return false, err
		}
		return false, err
	}
	if beginResult.Response != nil {
		writeJSON(w, http.StatusOK, beginResult.Response)
		return true, nil
	}

	result, err := execute()
	if err != nil {
		return false, err
	}
	if err := s.store.FinalizeIdempotency(r.Context(), idempotencyKey, hash, result); err != nil {
		return false, err
	}

	writeJSON(w, http.StatusOK, result)
	return true, nil
}
