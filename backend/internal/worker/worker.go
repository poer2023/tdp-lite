package worker

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"tdp-lite/backend/internal/config"
	"tdp-lite/backend/internal/store"
)

type Worker struct {
	cfg   config.Config
	store *store.Store
}

func New(cfg config.Config, st *store.Store) *Worker {
	return &Worker{cfg: cfg, store: st}
}

func summarize(content string) string {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return "No content provided."
	}
	if len(trimmed) <= 220 {
		return trimmed
	}
	return trimmed[:220] + "..."
}

func buildAIResult(job store.AIJob, content string) map[string]any {
	summary := summarize(content)
	rewrite := summary
	if len(summary) > 140 {
		rewrite = summary[:140] + "..."
	}
	return map[string]any{
		"provider":    job.Provider,
		"model":       job.Model,
		"prompt":      job.Prompt,
		"summary":     summary,
		"rewrite":     rewrite,
		"generatedAt": time.Now().UTC().Format(time.RFC3339),
	}
}

func (w *Worker) processOne(ctx context.Context) error {
	job, err := w.store.ClaimNextQueuedAIJob(ctx)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil
		}
		return err
	}

	content, err := w.store.GetContentBody(ctx, job.Kind, job.ContentID)
	if err != nil {
		_ = w.store.FailAIJob(ctx, job.ID, err.Error())
		return err
	}

	result := buildAIResult(job, content)
	if err := w.store.CompleteAIJob(ctx, job.ID, result); err != nil {
		_ = w.store.FailAIJob(ctx, job.ID, err.Error())
		return err
	}
	log.Printf("processed ai job id=%s provider=%s model=%s", job.ID, job.Provider, job.Model)
	return nil
}

func (w *Worker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.cfg.JobPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := w.processOne(ctx); err != nil {
				log.Printf("worker process error: %v", err)
			}
		}
	}
}
