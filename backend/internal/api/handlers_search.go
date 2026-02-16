package api

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type searchSection string

type localeScope string

const (
	searchSectionPost    searchSection = "post"
	searchSectionMoment  searchSection = "moment"
	searchSectionGallery searchSection = "gallery"

	localeScopeAll     localeScope = "all"
	localeScopeCurrent localeScope = "current"
)

type searchFilters struct {
	LocaleScope localeScope `json:"localeScope"`
	DateFrom    *string     `json:"dateFrom"`
	DateTo      *string     `json:"dateTo"`
	Tags        []string    `json:"tags"`
	Location    *string     `json:"location"`
	Camera      *string     `json:"camera"`
	Lens        *string     `json:"lens"`
	FocalLength *string     `json:"focalLength"`
	Aperture    *string     `json:"aperture"`
	IsoMin      *int        `json:"isoMin"`
	IsoMax      *int        `json:"isoMax"`
}

type searchRequest struct {
	Section searchSection `json:"section"`
	Query   string        `json:"query"`
	Locale  string        `json:"locale"`
	Filters searchFilters `json:"filters"`
	Cursor  *string       `json:"cursor"`
	Limit   int           `json:"limit"`
}

type searchCursorPayload struct {
	SortAt string `json:"sortAt"`
	ID     string `json:"id"`
}

type decodedCursor struct {
	SortAt time.Time
	ID     string
}

type postSearchItem struct {
	ID      string        `json:"id"`
	Section searchSection `json:"section"`
	Locale  string        `json:"locale"`
	SortAt  string        `json:"sortAt"`
	Slug    string        `json:"slug"`
	Title   string        `json:"title"`
	Excerpt string        `json:"excerpt"`
	Tags    []string      `json:"tags"`
}

type momentSearchItem struct {
	ID           string        `json:"id"`
	Section      searchSection `json:"section"`
	Locale       string        `json:"locale"`
	SortAt       string        `json:"sortAt"`
	Content      string        `json:"content"`
	LocationName *string       `json:"locationName"`
}

type gallerySearchItem struct {
	ID          string        `json:"id"`
	Section     searchSection `json:"section"`
	Locale      string        `json:"locale"`
	SortAt      string        `json:"sortAt"`
	Title       *string       `json:"title"`
	Camera      *string       `json:"camera"`
	Lens        *string       `json:"lens"`
	FocalLength *string       `json:"focalLength"`
	Aperture    *string       `json:"aperture"`
	Iso         *int          `json:"iso"`
	ThumbURL    *string       `json:"thumbUrl"`
	FileURL     string        `json:"fileUrl"`
}

func normalizeSearchLocale(input string) string {
	if input == "zh" {
		return "zh"
	}
	return "en"
}

func normalizeSearchLimit(limit int) int {
	if limit <= 0 {
		return 12
	}
	if limit > 30 {
		return 30
	}
	return limit
}

func parseDayStartUTC(value string) (time.Time, error) {
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, err
	}
	return time.Date(parsed.Year(), parsed.Month(), parsed.Day(), 0, 0, 0, 0, time.UTC), nil
}

func parseDayEndExclusiveUTC(value string) (time.Time, error) {
	start, err := parseDayStartUTC(value)
	if err != nil {
		return time.Time{}, err
	}
	return start.AddDate(0, 0, 1), nil
}

func trimStringPtr(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func escapeLike(input string) string {
	value := strings.ReplaceAll(input, `\\`, `\\\\`)
	value = strings.ReplaceAll(value, `%`, `\\%`)
	value = strings.ReplaceAll(value, `_`, `\\_`)
	return value
}

func createLikePattern(input string) string {
	return "%" + escapeLike(input) + "%"
}

func shortenText(input string, maxLength int) string {
	text := strings.TrimSpace(input)
	if text == "" {
		return ""
	}
	runes := []rune(text)
	if len(runes) <= maxLength {
		return text
	}
	if maxLength <= 3 {
		return string(runes[:maxLength])
	}
	return string(runes[:maxLength-3]) + "..."
}

func encodeSearchCursor(cursor searchCursorPayload) (string, error) {
	raw, err := json.Marshal(cursor)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func decodeSearchCursor(raw string) (*decodedCursor, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}
	bytes, err := base64.RawURLEncoding.DecodeString(trimmed)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor")
	}
	var payload searchCursorPayload
	if err := json.Unmarshal(bytes, &payload); err != nil {
		return nil, fmt.Errorf("invalid cursor")
	}
	if payload.ID == "" || payload.SortAt == "" {
		return nil, fmt.Errorf("invalid cursor")
	}
	sortAt, err := time.Parse(time.RFC3339Nano, payload.SortAt)
	if err != nil {
		sortAt, err = time.Parse(time.RFC3339, payload.SortAt)
		if err != nil {
			return nil, fmt.Errorf("invalid cursor")
		}
	}
	return &decodedCursor{SortAt: sortAt, ID: payload.ID}, nil
}

func parseJSONStringArray(raw string) []string {
	if raw == "" {
		return []string{}
	}
	var values []string
	if err := json.Unmarshal([]byte(raw), &values); err != nil {
		return []string{}
	}
	if values == nil {
		return []string{}
	}
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func normalizeFilters(filters searchFilters) (searchFilters, error) {
	next := filters
	if next.LocaleScope == "" {
		next.LocaleScope = localeScopeAll
	}
	if next.LocaleScope != localeScopeAll && next.LocaleScope != localeScopeCurrent {
		return next, fmt.Errorf("invalid localeScope")
	}

	next.DateFrom = trimStringPtr(next.DateFrom)
	next.DateTo = trimStringPtr(next.DateTo)
	next.Location = trimStringPtr(next.Location)
	next.Camera = trimStringPtr(next.Camera)
	next.Lens = trimStringPtr(next.Lens)
	next.FocalLength = trimStringPtr(next.FocalLength)
	next.Aperture = trimStringPtr(next.Aperture)

	cleanTags := make([]string, 0, len(next.Tags))
	for _, tag := range next.Tags {
		trimmed := strings.TrimSpace(tag)
		if trimmed != "" {
			cleanTags = append(cleanTags, trimmed)
		}
	}
	next.Tags = cleanTags

	if next.IsoMin != nil && *next.IsoMin < 0 {
		return next, fmt.Errorf("isoMin must be >= 0")
	}
	if next.IsoMax != nil && *next.IsoMax < 0 {
		return next, fmt.Errorf("isoMax must be >= 0")
	}
	if next.IsoMin != nil && next.IsoMax != nil && *next.IsoMin > *next.IsoMax {
		return next, fmt.Errorf("isoMin cannot be greater than isoMax")
	}

	if next.DateFrom != nil {
		if _, err := parseDayStartUTC(*next.DateFrom); err != nil {
			return next, fmt.Errorf("invalid dateFrom")
		}
	}
	if next.DateTo != nil {
		if _, err := parseDayStartUTC(*next.DateTo); err != nil {
			return next, fmt.Errorf("invalid dateTo")
		}
	}

	return next, nil
}

func (s *Server) handlePublicSearch(w http.ResponseWriter, r *http.Request) {
	var req searchRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_payload", "invalid search payload", false, requestIDFromContext(r.Context()))
		return
	}

	req.Query = strings.TrimSpace(req.Query)
	if len([]rune(req.Query)) < 2 {
		writeError(w, http.StatusBadRequest, "query_too_short", "query must be at least 2 characters", false, requestIDFromContext(r.Context()))
		return
	}
	if len([]rune(req.Query)) > 200 {
		writeError(w, http.StatusBadRequest, "query_too_long", "query must be <= 200 characters", false, requestIDFromContext(r.Context()))
		return
	}

	req.Locale = normalizeSearchLocale(req.Locale)
	req.Limit = normalizeSearchLimit(req.Limit)

	filters, err := normalizeFilters(req.Filters)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_filters", err.Error(), false, requestIDFromContext(r.Context()))
		return
	}
	req.Filters = filters

	cursor, err := decodeSearchCursor(valueOrEmpty(req.Cursor))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_cursor", err.Error(), false, requestIDFromContext(r.Context()))
		return
	}

	switch req.Section {
	case searchSectionPost:
		payload, err := s.searchPosts(r, req, cursor)
		if err != nil {
			writeStoreError(w, r, err)
			return
		}
		writeJSON(w, http.StatusOK, payload)
	case searchSectionMoment:
		payload, err := s.searchMoments(r, req, cursor)
		if err != nil {
			writeStoreError(w, r, err)
			return
		}
		writeJSON(w, http.StatusOK, payload)
	case searchSectionGallery:
		payload, err := s.searchGallery(r, req, cursor)
		if err != nil {
			writeStoreError(w, r, err)
			return
		}
		writeJSON(w, http.StatusOK, payload)
	default:
		writeError(w, http.StatusBadRequest, "invalid_section", "section must be one of post|moment|gallery", false, requestIDFromContext(r.Context()))
	}
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func (s *Server) searchPosts(r *http.Request, req searchRequest, cursor *decodedCursor) (map[string]any, error) {
	args := make([]any, 0)
	addArg := func(value any) string {
		args = append(args, value)
		return fmt.Sprintf("$%d", len(args))
	}

	where := []string{
		"status = 'published'",
		"deleted_at IS NULL",
		fmt.Sprintf("to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(tags::text, '')) @@ plainto_tsquery('simple', %s)", addArg(req.Query)),
	}

	if req.Filters.LocaleScope == localeScopeCurrent {
		where = append(where, fmt.Sprintf("locale = %s", addArg(req.Locale)))
	}

	if req.Filters.DateFrom != nil {
		dateFrom, err := parseDayStartUTC(*req.Filters.DateFrom)
		if err != nil {
			return nil, err
		}
		where = append(where, fmt.Sprintf("COALESCE(published_at, created_at) >= %s", addArg(dateFrom)))
	}
	if req.Filters.DateTo != nil {
		dateTo, err := parseDayEndExclusiveUTC(*req.Filters.DateTo)
		if err != nil {
			return nil, err
		}
		where = append(where, fmt.Sprintf("COALESCE(published_at, created_at) < %s", addArg(dateTo)))
	}
	for _, tag := range req.Filters.Tags {
		where = append(where, fmt.Sprintf("COALESCE(tags::text, '') ILIKE %s ESCAPE '\\\\'", addArg(createLikePattern(tag))))
	}

	if cursor != nil {
		where = append(where, fmt.Sprintf("(COALESCE(published_at, created_at) < %s OR (COALESCE(published_at, created_at) = %s AND id::text < %s))", addArg(cursor.SortAt), addArg(cursor.SortAt), addArg(cursor.ID)))
	}

	limitPlaceholder := addArg(req.Limit + 1)
	query := fmt.Sprintf(
		`SELECT id::text, locale, slug, title, excerpt, content, COALESCE(tags::text, '[]'), COALESCE(published_at, created_at) AS sort_at
		 FROM posts
		 WHERE %s
		 ORDER BY COALESCE(published_at, created_at) DESC, id DESC
		 LIMIT %s`,
		strings.Join(where, " AND "),
		limitPlaceholder,
	)

	rows, err := s.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]postSearchItem, 0)
	for rows.Next() {
		var id string
		var locale string
		var slug string
		var title string
		var excerpt sql.NullString
		var content string
		var tagsRaw string
		var sortAt time.Time

		if err := rows.Scan(&id, &locale, &slug, &title, &excerpt, &content, &tagsRaw, &sortAt); err != nil {
			return nil, err
		}

		previewSource := strings.TrimSpace(excerpt.String)
		if previewSource == "" {
			previewSource = content
		}
		items = append(items, postSearchItem{
			ID:      id,
			Section: searchSectionPost,
			Locale:  normalizeSearchLocale(locale),
			SortAt:  sortAt.UTC().Format(time.RFC3339Nano),
			Slug:    slug,
			Title:   title,
			Excerpt: shortenText(previewSource, 180),
			Tags:    parseJSONStringArray(tagsRaw),
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return buildSearchResponse(items, req.Limit, func(item postSearchItem) searchCursorPayload {
		return searchCursorPayload{SortAt: item.SortAt, ID: item.ID}
	})
}

func (s *Server) searchMoments(r *http.Request, req searchRequest, cursor *decodedCursor) (map[string]any, error) {
	args := make([]any, 0)
	addArg := func(value any) string {
		args = append(args, value)
		return fmt.Sprintf("$%d", len(args))
	}

	where := []string{
		"status = 'published'",
		"visibility = 'public'",
		"deleted_at IS NULL",
		fmt.Sprintf("to_tsvector('simple', COALESCE(content, '') || ' ' || COALESCE(location->>'name', '')) @@ plainto_tsquery('simple', %s)", addArg(req.Query)),
	}

	if req.Filters.LocaleScope == localeScopeCurrent {
		where = append(where, fmt.Sprintf("locale = %s", addArg(req.Locale)))
	}
	if req.Filters.DateFrom != nil {
		dateFrom, err := parseDayStartUTC(*req.Filters.DateFrom)
		if err != nil {
			return nil, err
		}
		where = append(where, fmt.Sprintf("created_at >= %s", addArg(dateFrom)))
	}
	if req.Filters.DateTo != nil {
		dateTo, err := parseDayEndExclusiveUTC(*req.Filters.DateTo)
		if err != nil {
			return nil, err
		}
		where = append(where, fmt.Sprintf("created_at < %s", addArg(dateTo)))
	}
	if req.Filters.Location != nil {
		where = append(where, fmt.Sprintf("COALESCE(location->>'name', '') ILIKE %s ESCAPE '\\\\'", addArg(createLikePattern(*req.Filters.Location))))
	}
	if cursor != nil {
		where = append(where, fmt.Sprintf("(created_at < %s OR (created_at = %s AND id::text < %s))", addArg(cursor.SortAt), addArg(cursor.SortAt), addArg(cursor.ID)))
	}

	limitPlaceholder := addArg(req.Limit + 1)
	query := fmt.Sprintf(
		`SELECT id::text, locale, content, NULLIF(COALESCE(location->>'name', ''), ''), created_at
		 FROM moments
		 WHERE %s
		 ORDER BY created_at DESC, id DESC
		 LIMIT %s`,
		strings.Join(where, " AND "),
		limitPlaceholder,
	)

	rows, err := s.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]momentSearchItem, 0)
	for rows.Next() {
		var id string
		var locale string
		var content string
		var locationName sql.NullString
		var sortAt time.Time
		if err := rows.Scan(&id, &locale, &content, &locationName, &sortAt); err != nil {
			return nil, err
		}

		var location *string
		if locationName.Valid && strings.TrimSpace(locationName.String) != "" {
			value := locationName.String
			location = &value
		}

		items = append(items, momentSearchItem{
			ID:           id,
			Section:      searchSectionMoment,
			Locale:       normalizeSearchLocale(locale),
			SortAt:       sortAt.UTC().Format(time.RFC3339Nano),
			Content:      shortenText(content, 220),
			LocationName: location,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return buildSearchResponse(items, req.Limit, func(item momentSearchItem) searchCursorPayload {
		return searchCursorPayload{SortAt: item.SortAt, ID: item.ID}
	})
}

func (s *Server) searchGallery(r *http.Request, req searchRequest, cursor *decodedCursor) (map[string]any, error) {
	args := make([]any, 0)
	addArg := func(value any) string {
		args = append(args, value)
		return fmt.Sprintf("$%d", len(args))
	}

	where := []string{
		"status = 'published'",
		"deleted_at IS NULL",
		fmt.Sprintf("to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(camera, '') || ' ' || COALESCE(lens, '') || ' ' || COALESCE(focal_length, '') || ' ' || COALESCE(aperture, '') || ' ' || COALESCE(iso::text, '')) @@ plainto_tsquery('simple', %s)", addArg(req.Query)),
	}

	if req.Filters.LocaleScope == localeScopeCurrent {
		where = append(where, fmt.Sprintf("locale = %s", addArg(req.Locale)))
	}
	if req.Filters.DateFrom != nil {
		dateFrom, err := parseDayStartUTC(*req.Filters.DateFrom)
		if err != nil {
			return nil, err
		}
		where = append(where, fmt.Sprintf("created_at >= %s", addArg(dateFrom)))
	}
	if req.Filters.DateTo != nil {
		dateTo, err := parseDayEndExclusiveUTC(*req.Filters.DateTo)
		if err != nil {
			return nil, err
		}
		where = append(where, fmt.Sprintf("created_at < %s", addArg(dateTo)))
	}
	if req.Filters.Camera != nil {
		where = append(where, fmt.Sprintf("COALESCE(camera, '') ILIKE %s ESCAPE '\\\\'", addArg(createLikePattern(*req.Filters.Camera))))
	}
	if req.Filters.Lens != nil {
		where = append(where, fmt.Sprintf("COALESCE(lens, '') ILIKE %s ESCAPE '\\\\'", addArg(createLikePattern(*req.Filters.Lens))))
	}
	if req.Filters.FocalLength != nil {
		where = append(where, fmt.Sprintf("COALESCE(focal_length, '') ILIKE %s ESCAPE '\\\\'", addArg(createLikePattern(*req.Filters.FocalLength))))
	}
	if req.Filters.Aperture != nil {
		where = append(where, fmt.Sprintf("COALESCE(aperture, '') ILIKE %s ESCAPE '\\\\'", addArg(createLikePattern(*req.Filters.Aperture))))
	}
	if req.Filters.IsoMin != nil {
		where = append(where, fmt.Sprintf("iso >= %s", addArg(*req.Filters.IsoMin)))
	}
	if req.Filters.IsoMax != nil {
		where = append(where, fmt.Sprintf("iso <= %s", addArg(*req.Filters.IsoMax)))
	}
	if cursor != nil {
		where = append(where, fmt.Sprintf("(created_at < %s OR (created_at = %s AND id::text < %s))", addArg(cursor.SortAt), addArg(cursor.SortAt), addArg(cursor.ID)))
	}

	limitPlaceholder := addArg(req.Limit + 1)
	query := fmt.Sprintf(
		`SELECT id::text, locale, title, camera, lens, focal_length, aperture, iso, thumb_url, file_url, created_at
		 FROM gallery
		 WHERE %s
		 ORDER BY created_at DESC, id DESC
		 LIMIT %s`,
		strings.Join(where, " AND "),
		limitPlaceholder,
	)

	rows, err := s.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]gallerySearchItem, 0)
	for rows.Next() {
		var id string
		var locale string
		var title sql.NullString
		var camera sql.NullString
		var lens sql.NullString
		var focalLength sql.NullString
		var aperture sql.NullString
		var iso sql.NullInt32
		var thumbURL sql.NullString
		var fileURL string
		var sortAt time.Time
		if err := rows.Scan(
			&id,
			&locale,
			&title,
			&camera,
			&lens,
			&focalLength,
			&aperture,
			&iso,
			&thumbURL,
			&fileURL,
			&sortAt,
		); err != nil {
			return nil, err
		}

		var titleValue *string
		if title.Valid {
			value := title.String
			titleValue = &value
		}
		var cameraValue *string
		if camera.Valid {
			value := camera.String
			cameraValue = &value
		}
		var lensValue *string
		if lens.Valid {
			value := lens.String
			lensValue = &value
		}
		var focalLengthValue *string
		if focalLength.Valid {
			value := focalLength.String
			focalLengthValue = &value
		}
		var apertureValue *string
		if aperture.Valid {
			value := aperture.String
			apertureValue = &value
		}
		var isoValue *int
		if iso.Valid {
			value := int(iso.Int32)
			isoValue = &value
		}
		var thumbValue *string
		if thumbURL.Valid {
			value := thumbURL.String
			thumbValue = &value
		}

		items = append(items, gallerySearchItem{
			ID:          id,
			Section:     searchSectionGallery,
			Locale:      normalizeSearchLocale(locale),
			SortAt:      sortAt.UTC().Format(time.RFC3339Nano),
			Title:       titleValue,
			Camera:      cameraValue,
			Lens:        lensValue,
			FocalLength: focalLengthValue,
			Aperture:    apertureValue,
			Iso:         isoValue,
			ThumbURL:    thumbValue,
			FileURL:     fileURL,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return buildSearchResponse(items, req.Limit, func(item gallerySearchItem) searchCursorPayload {
		return searchCursorPayload{SortAt: item.SortAt, ID: item.ID}
	})
}

func buildSearchResponse[T any](items []T, limit int, cursorGetter func(item T) searchCursorPayload) (map[string]any, error) {
	hasMore := len(items) > limit
	visible := items
	var nextCursor *string

	if hasMore {
		visible = items[:limit]
		lastCursorPayload := cursorGetter(visible[len(visible)-1])
		encoded, err := encodeSearchCursor(lastCursorPayload)
		if err != nil {
			return nil, err
		}
		nextCursor = &encoded
	}

	return map[string]any{
		"items":      visible,
		"nextCursor": nextCursor,
		"hasMore":    hasMore,
	}, nil
}
