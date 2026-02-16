package main

import (
	"context"
	"errors"
	"log"
	"os/signal"
	"syscall"

	"tdp-lite/backend/internal/config"
	"tdp-lite/backend/internal/db"
	"tdp-lite/backend/internal/store"
	"tdp-lite/backend/internal/worker"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()
	database, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connect failed: %v", err)
	}
	defer database.Close()

	st := store.New(database)
	wk := worker.New(cfg, st)

	runCtx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	log.Printf("tdp-worker started with poll interval %s", cfg.JobPollInterval)
	if err := wk.Run(runCtx); err != nil && !errors.Is(err, context.Canceled) {
		log.Fatalf("worker stopped with error: %v", err)
	}
	log.Println("tdp-worker stopped")
}
