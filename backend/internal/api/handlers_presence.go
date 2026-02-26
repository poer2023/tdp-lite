package api

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"tdp-lite/backend/internal/store"
)

type upsertPresenceRequest struct {
	City        string  `json:"city"`
	Region      *string `json:"region"`
	Country     *string `json:"country"`
	CountryCode *string `json:"countryCode"`
	Timezone    *string `json:"timezone"`
	Source      *string `json:"source"`
}

func trimOrNil(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func presenceLocationLabel(item store.PresenceStatus) string {
	city := strings.TrimSpace(item.City)
	countryCode := ""
	if item.CountryCode != nil {
		countryCode = strings.TrimSpace(*item.CountryCode)
	}
	country := ""
	if item.Country != nil {
		country = strings.TrimSpace(*item.Country)
	}

	switch {
	case city != "" && countryCode != "":
		return city + ", " + strings.ToUpper(countryCode)
	case city != "" && country != "":
		return city + ", " + country
	case city != "":
		return city
	case countryCode != "":
		return strings.ToUpper(countryCode)
	case country != "":
		return country
	default:
		return ""
	}
}

func (s *Server) handlePublicPresence(w http.ResponseWriter, r *http.Request) {
	item, err := s.store.GetPresence(r.Context())
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeJSON(w, http.StatusOK, map[string]any{
				"item": map[string]any{
					"online":          false,
					"status":          "unknown",
					"locationLabel":   "",
					"lastHeartbeatAt": nil,
					"updatedAt":       nil,
				},
			})
			return
		}
		writeStoreError(w, r, err)
		return
	}

	onlineWindow := s.cfg.PresenceOnlineWindow
	if onlineWindow <= 0 {
		onlineWindow = 3 * time.Minute
	}

	isOnline := time.Since(item.LastHeartbeatAt) <= onlineWindow
	status := "offline"
	if isOnline {
		status = "online"
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"item": map[string]any{
			"online":          isOnline,
			"status":          status,
			"city":            item.City,
			"region":          item.Region,
			"country":         item.Country,
			"countryCode":     item.CountryCode,
			"timezone":        item.Timezone,
			"source":          item.Source,
			"locationLabel":   presenceLocationLabel(item),
			"lastHeartbeatAt": item.LastHeartbeatAt,
			"updatedAt":       item.UpdatedAt,
			"staleAfterSec":   int(onlineWindow.Seconds()),
		},
	})
}

func (s *Server) handleUpsertPresence(w http.ResponseWriter, r *http.Request) {
	var req upsertPresenceRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid presence payload", false, requestIDFromContext(r.Context()))
		return
	}

	city := strings.TrimSpace(req.City)
	if city == "" {
		writeError(w, http.StatusBadRequest, "invalid_payload", "city is required", false, requestIDFromContext(r.Context()))
		return
	}

	region := trimOrNil(req.Region)
	country := trimOrNil(req.Country)
	countryCode := trimOrNil(req.CountryCode)
	timezone := trimOrNil(req.Timezone)
	source := trimOrNil(req.Source)

	item, err := s.store.UpsertPresence(r.Context(), store.UpsertPresenceInput{
		City:        city,
		Region:      region,
		Country:     country,
		CountryCode: countryCode,
		Timezone:    timezone,
		Source:      source,
		HeartbeatAt: time.Now().UTC(),
	})
	if err != nil {
		writeStoreError(w, r, err)
		return
	}

	_ = s.store.InsertAuditLog(r.Context(), actorKeyID(r), "presence.heartbeat", "presence", "singleton", map[string]any{
		"city":        item.City,
		"countryCode": item.CountryCode,
		"source":      item.Source,
	})

	writeJSON(w, http.StatusOK, map[string]any{
		"item": map[string]any{
			"online":          true,
			"status":          "online",
			"city":            item.City,
			"region":          item.Region,
			"country":         item.Country,
			"countryCode":     item.CountryCode,
			"timezone":        item.Timezone,
			"source":          item.Source,
			"locationLabel":   presenceLocationLabel(item),
			"lastHeartbeatAt": item.LastHeartbeatAt,
			"updatedAt":       item.UpdatedAt,
		},
	})
}
