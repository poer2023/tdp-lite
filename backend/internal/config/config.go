package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	ServerAddr    string
	DatabaseURL   string
	AppBaseURL    string
	PreviewSecret string

	S3Endpoint        string
	S3Region          string
	S3AccessKeyID     string
	S3SecretAccessKey string
	S3Bucket          string
	S3PublicURL       string

	TimestampSkew   time.Duration
	NonceTTL        time.Duration
	PreviewTTL      time.Duration
	JobPollInterval time.Duration

	OpenAIAPIKey    string
	AnthropicAPIKey string
	GeminiAPIKey    string
}

func mustEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		panic(fmt.Sprintf("missing required env: %s", key))
	}
	return value
}

func envOrDefault(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func durationOrDefault(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		panic(fmt.Sprintf("invalid duration env %s=%s: %v", key, value, err))
	}
	return parsed
}

func Load() Config {
	previewTTL := durationOrDefault("TDP_PREVIEW_TTL", 2*time.Hour)
	if previewTTL < time.Minute {
		previewTTL = 2 * time.Hour
	}

	jobPoll := durationOrDefault("TDP_JOB_POLL_INTERVAL", 3*time.Second)
	if jobPoll < 500*time.Millisecond {
		jobPoll = 3 * time.Second
	}

	return Config{
		ServerAddr:    envOrDefault("TDP_API_ADDR", ":8080"),
		DatabaseURL:   mustEnv("DATABASE_URL"),
		AppBaseURL:    envOrDefault("TDP_APP_BASE_URL", "http://localhost:3000"),
		PreviewSecret: mustEnv("TDP_PREVIEW_SECRET"),

		S3Endpoint:        envOrDefault("S3_ENDPOINT", os.Getenv("CLOUDFLARE_R2_ENDPOINT")),
		S3Region:          envOrDefault("S3_REGION", "auto"),
		S3AccessKeyID:     envOrDefault("S3_ACCESS_KEY_ID", os.Getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")),
		S3SecretAccessKey: envOrDefault("S3_SECRET_ACCESS_KEY", os.Getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")),
		S3Bucket:          envOrDefault("S3_BUCKET", os.Getenv("CLOUDFLARE_R2_BUCKET")),
		S3PublicURL:       envOrDefault("S3_CDN_URL", os.Getenv("R2_PUBLIC_URL")),

		TimestampSkew:   durationOrDefault("TDP_TIMESTAMP_SKEW", 5*time.Minute),
		NonceTTL:        durationOrDefault("TDP_NONCE_TTL", 10*time.Minute),
		PreviewTTL:      previewTTL,
		JobPollInterval: jobPoll,

		OpenAIAPIKey:    os.Getenv("OPENAI_API_KEY"),
		AnthropicAPIKey: os.Getenv("ANTHROPIC_API_KEY"),
		GeminiAPIKey:    os.Getenv("GEMINI_API_KEY"),
	}
}

func ParseIntOrDefault(raw string, fallback int) int {
	if raw == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return parsed
}
