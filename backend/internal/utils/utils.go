package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"sort"
	"strings"
)

var slugRegex = regexp.MustCompile(`[^a-z0-9\p{Han}]+`)

func Slugify(input string) string {
	slug := strings.ToLower(strings.TrimSpace(input))
	slug = slugRegex.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if len(slug) > 100 {
		slug = slug[:100]
	}
	if slug == "" {
		return "untitled"
	}
	return slug
}

func SHA256Hex(raw []byte) string {
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func RandomHex(byteLen int) (string, error) {
	if byteLen <= 0 {
		byteLen = 16
	}
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func CanonicalQuery(raw string) string {
	if raw == "" {
		return ""
	}
	parts := strings.Split(raw, "&")
	if len(parts) <= 1 {
		return raw
	}
	sort.Strings(parts)
	return strings.Join(parts, "&")
}
