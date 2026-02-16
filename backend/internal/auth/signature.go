package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"
)

type SignatureInput struct {
	Method    string
	Path      string
	RawQuery  string
	Timestamp string
	Nonce     string
	BodyHash  string
}

func canonicalQuery(raw string) string {
	if raw == "" {
		return ""
	}
	values, err := url.ParseQuery(raw)
	if err != nil {
		parts := strings.Split(raw, "&")
		sort.Strings(parts)
		return strings.Join(parts, "&")
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	parts := make([]string, 0)
	for _, key := range keys {
		vals := values[key]
		sort.Strings(vals)
		for _, value := range vals {
			parts = append(parts, fmt.Sprintf("%s=%s", url.QueryEscape(key), url.QueryEscape(value)))
		}
	}
	return strings.Join(parts, "&")
}

func CanonicalString(input SignatureInput) string {
	return strings.Join([]string{
		strings.ToUpper(strings.TrimSpace(input.Method)),
		input.Path,
		canonicalQuery(input.RawQuery),
		input.Timestamp,
		input.Nonce,
		strings.ToLower(strings.TrimSpace(input.BodyHash)),
	}, "\n")
}

func Sign(secret string, input SignatureInput) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(CanonicalString(input)))
	return hex.EncodeToString(mac.Sum(nil))
}

func Verify(secret string, input SignatureInput, signature string) bool {
	expected := Sign(secret, input)
	left, errLeft := hex.DecodeString(expected)
	right, errRight := hex.DecodeString(strings.ToLower(strings.TrimSpace(signature)))
	if errLeft != nil || errRight != nil || len(left) != len(right) {
		return false
	}
	return subtle.ConstantTimeCompare(left, right) == 1
}

func ValidateTimestamp(raw string, maxSkew time.Duration, now time.Time) bool {
	millis, err := time.ParseDuration(raw + "ms")
	if err != nil {
		return false
	}
	clientTime := time.Unix(0, millis.Nanoseconds())
	delta := now.Sub(clientTime)
	if delta < 0 {
		delta = -delta
	}
	return delta <= maxSkew
}

func SHA256Hex(raw []byte) string {
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}
