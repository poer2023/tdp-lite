package auth

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"strings"
	"time"

	"tdp-lite/backend/internal/store"
)

type contextKey string

const (
	contextKeyAuth contextKey = "tdp-auth"
)

type AuthContext struct {
	KeyID  string
	Scopes []string
}

type Authenticator struct {
	Store    *store.Store
	MaxSkew  time.Duration
	NonceTTL time.Duration
}

func NewAuthenticator(s *store.Store, maxSkew, nonceTTL time.Duration) *Authenticator {
	return &Authenticator{
		Store:    s,
		MaxSkew:  maxSkew,
		NonceTTL: nonceTTL,
	}
}

func unauthorized(w http.ResponseWriter, code, message string) {
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"error":{"code":"` + code + `","message":"` + message + `","retryable":false}}`))
}

func (a *Authenticator) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		keyID := strings.TrimSpace(r.Header.Get("X-TDP-Key-Id"))
		timestamp := strings.TrimSpace(r.Header.Get("X-TDP-Timestamp"))
		nonce := strings.TrimSpace(r.Header.Get("X-TDP-Nonce"))
		signature := strings.TrimSpace(r.Header.Get("X-TDP-Signature"))
		if keyID == "" || timestamp == "" || nonce == "" || signature == "" {
			unauthorized(w, "missing_auth_headers", "missing required auth headers")
			return
		}

		if !ValidateTimestamp(timestamp, a.MaxSkew, time.Now().UTC()) {
			unauthorized(w, "invalid_timestamp", "timestamp is outside accepted window")
			return
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			unauthorized(w, "invalid_request", "failed to read request body")
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))
		bodyHash := SHA256Hex(body)

		record, err := a.Store.GetAPIKeyByKeyID(r.Context(), keyID)
		if err != nil {
			unauthorized(w, "invalid_key", "api key not found")
			return
		}
		if record.RevokedAt != nil {
			unauthorized(w, "revoked_key", "api key has been revoked")
			return
		}

		if !Verify(record.Secret, SignatureInput{
			Method:    r.Method,
			Path:      r.URL.Path,
			RawQuery:  r.URL.RawQuery,
			Timestamp: timestamp,
			Nonce:     nonce,
			BodyHash:  bodyHash,
		}, signature) {
			unauthorized(w, "invalid_signature", "signature verification failed")
			return
		}

		if err := a.Store.RegisterNonce(r.Context(), keyID, nonce, a.NonceTTL); err != nil {
			unauthorized(w, "nonce_reused", "nonce has already been used")
			return
		}

		_ = a.Store.TouchAPIKeyUsage(r.Context(), keyID)

		ctx := context.WithValue(r.Context(), contextKeyAuth, AuthContext{
			KeyID:  keyID,
			Scopes: record.Scopes,
		})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetAuthContext(ctx context.Context) (AuthContext, bool) {
	value := ctx.Value(contextKeyAuth)
	if value == nil {
		return AuthContext{}, false
	}
	authCtx, ok := value.(AuthContext)
	return authCtx, ok
}

func HasScope(ctx context.Context, scope string) bool {
	authCtx, ok := GetAuthContext(ctx)
	if !ok {
		return false
	}
	for _, candidate := range authCtx.Scopes {
		if candidate == scope || candidate == "*" {
			return true
		}
	}
	return false
}

func RequireScope(scope string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !HasScope(r.Context(), scope) {
			w.Header().Set("content-type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_, _ = w.Write([]byte(`{"error":{"code":"forbidden","message":"missing required scope: ` + scope + `","retryable":false}}`))
			return
		}
		next(w, r)
	}
}
