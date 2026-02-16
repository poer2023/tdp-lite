package api

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type requestIDKey struct{}

func requestIDFromContext(ctx context.Context) string {
	value := ctx.Value(requestIDKey{})
	if value == nil {
		return ""
	}
	str, _ := value.(string)
	return str
}

func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-Id")
		if requestID == "" {
			requestID = uuid.NewString()
		}
		w.Header().Set("X-Request-Id", requestID)
		ctx := context.WithValue(r.Context(), requestIDKey{}, requestID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func AccessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s request_id=%s duration=%s", r.Method, r.URL.Path, requestIDFromContext(r.Context()), time.Since(start))
	})
}
