package api

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"tdp-lite/backend/internal/store"
)

type createAIJobRequest struct {
	Kind      string `json:"kind"`
	ContentID string `json:"contentId"`
	Provider  string `json:"provider"`
	Model     string `json:"model"`
	Prompt    string `json:"prompt"`
}

func (s *Server) handleGetAIModels(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"items": []map[string]any{
			{"provider": "openai", "models": []string{"gpt-4.1", "gpt-4.1-mini"}},
			{"provider": "anthropic", "models": []string{"claude-sonnet-4-5", "claude-haiku-4-5"}},
			{"provider": "gemini", "models": []string{"gemini-2.0-flash", "gemini-2.0-pro"}},
		},
	})
}

func (s *Server) handleCreateAIJob(w http.ResponseWriter, r *http.Request) {
	var req createAIJobRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid ai job payload", false, requestIDFromContext(r.Context()))
		return
	}

	req.Kind = strings.TrimSpace(req.Kind)
	req.ContentID = strings.TrimSpace(req.ContentID)
	req.Provider = strings.TrimSpace(req.Provider)
	req.Model = strings.TrimSpace(req.Model)
	req.Prompt = strings.TrimSpace(req.Prompt)
	if req.Prompt == "" {
		req.Prompt = "Summarize and improve this content for better readability."
	}
	if req.Kind == "" || req.ContentID == "" || req.Provider == "" || req.Model == "" {
		writeError(w, http.StatusBadRequest, "invalid_payload", "kind/contentId/provider/model are required", false, requestIDFromContext(r.Context()))
		return
	}

	if _, err := s.runWithIdempotency(w, r, req, func() (any, error) {
		job, err := s.store.CreateAIJob(r.Context(), store.CreateAIJobInput{
			Kind:      req.Kind,
			ContentID: req.ContentID,
			Provider:  req.Provider,
			Model:     req.Model,
			Prompt:    req.Prompt,
		})
		if err != nil {
			return nil, err
		}
		_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "ai.job.create", "ai_job", job.ID, map[string]any{"provider": job.Provider, "model": job.Model})
		return map[string]any{"job": job}, nil
	}); err != nil {
		writeStoreError(w, r, err)
	}
}

func (s *Server) handleGetAIJob(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	job, err := s.store.GetAIJobByID(r.Context(), jobID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"job": job})
}

func (s *Server) handleApplyAIJob(w http.ResponseWriter, r *http.Request) {
	jobID := chi.URLParam(r, "jobId")
	job, err := s.store.GetAIJobByID(r.Context(), jobID)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	if job.Status != "succeeded" {
		writeError(w, http.StatusConflict, "job_not_ready", "job must be succeeded before apply", false, requestIDFromContext(r.Context()))
		return
	}
	if err := s.store.ApplyAIResultToContent(r.Context(), job); err != nil {
		writeStoreError(w, r, err)
		return
	}
	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "ai.job.apply", job.Kind, job.ContentID, map[string]any{"jobId": job.ID})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "jobId": job.ID})
}

func (s *Server) handleGetGenericJob(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	job, err := s.store.GetAIJobByID(r.Context(), id)
	if err != nil {
		writeStoreError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":     job.ID,
		"status": job.Status,
		"kind":   "ai",
		"job":    job,
	})
}
