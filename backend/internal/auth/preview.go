package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"
)

func SignPreview(secret, sessionID string, expiresAt time.Time) string {
	payload := fmt.Sprintf("%s\n%d", sessionID, expiresAt.UnixMilli())
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

func VerifyPreview(secret, sessionID string, expiresAtMillis string, signature string, now time.Time) bool {
	expiresMillis, err := strconv.ParseInt(expiresAtMillis, 10, 64)
	if err != nil {
		return false
	}
	expiresAt := time.UnixMilli(expiresMillis)
	if expiresAt.Before(now) {
		return false
	}

	expected := SignPreview(secret, sessionID, expiresAt)
	left, leftErr := hex.DecodeString(strings.ToLower(expected))
	right, rightErr := hex.DecodeString(strings.ToLower(strings.TrimSpace(signature)))
	if leftErr != nil || rightErr != nil || len(left) != len(right) {
		return false
	}
	return subtle.ConstantTimeCompare(left, right) == 1
}
