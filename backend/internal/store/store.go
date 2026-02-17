package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
)

var (
	ErrNotFound                     = errors.New("not found")
	ErrNonceUsed                    = errors.New("nonce already used")
	ErrIdempotencyConflict          = errors.New("idempotency key conflict")
	ErrIdempotencyInProgress        = errors.New("idempotency request in progress")
	ErrMomentContentOrMediaRequired = errors.New("moment content or media is required")
)

type Store struct {
	db *sql.DB
}

func New(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

func toJSONRaw(value any) ([]byte, error) {
	if value == nil {
		return []byte("null"), nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func parseJSONArray(raw []byte) ([]string, error) {
	if len(raw) == 0 {
		return []string{}, nil
	}
	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, err
	}
	if values == nil {
		return []string{}, nil
	}
	return values, nil
}

func parseMomentMedia(raw []byte) ([]MomentMediaItem, error) {
	if len(raw) == 0 {
		return []MomentMediaItem{}, nil
	}
	var values []MomentMediaItem
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, err
	}
	if values == nil {
		return []MomentMediaItem{}, nil
	}
	return values, nil
}

func parseMomentLocation(raw []byte) (*MomentLocation, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return nil, nil
	}
	var loc MomentLocation
	if err := json.Unmarshal(raw, &loc); err != nil {
		return nil, err
	}
	if loc.Name == "" {
		return nil, nil
	}
	return &loc, nil
}

func nullableTime(input sql.NullTime) *time.Time {
	if !input.Valid {
		return nil
	}
	value := input.Time
	return &value
}

func nullableString(input sql.NullString) *string {
	if !input.Valid {
		return nil
	}
	value := input.String
	return &value
}

func nullableInt(input sql.NullInt32) *int {
	if !input.Valid {
		return nil
	}
	value := int(input.Int32)
	return &value
}

func nullableFloat(input sql.NullFloat64) *float64 {
	if !input.Valid {
		return nil
	}
	value := input.Float64
	return &value
}

func (s *Store) GetAPIKeyByKeyID(ctx context.Context, keyID string) (APIKeyRecord, error) {
	var record APIKeyRecord
	var scopesRaw []byte
	var revokedAt sql.NullTime
	var lastUsedAt sql.NullTime

	err := s.db.QueryRowContext(
		ctx,
		`SELECT id::text, key_id, name, secret_ciphertext, scopes, revoked_at, created_at, last_used_at
		 FROM api_keys
		 WHERE key_id = $1
		 LIMIT 1`,
		keyID,
	).Scan(
		&record.ID,
		&record.KeyID,
		&record.Name,
		&record.Secret,
		&scopesRaw,
		&revokedAt,
		&record.CreatedAt,
		&lastUsedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return APIKeyRecord{}, ErrNotFound
		}
		return APIKeyRecord{}, err
	}

	scopes, err := parseJSONArray(scopesRaw)
	if err != nil {
		return APIKeyRecord{}, err
	}
	record.Scopes = scopes
	record.RevokedAt = nullableTime(revokedAt)
	record.LastUsedAt = nullableTime(lastUsedAt)
	return record, nil
}

func (s *Store) TouchAPIKeyUsage(ctx context.Context, keyID string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE api_keys SET last_used_at = NOW() WHERE key_id = $1`, keyID)
	return err
}

func (s *Store) RegisterNonce(ctx context.Context, keyID string, nonce string, ttl time.Duration) error {
	expiresAt := time.Now().Add(ttl)
	result, err := s.db.ExecContext(
		ctx,
		`INSERT INTO request_nonces (key_id, nonce, expires_at)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (key_id, nonce) DO NOTHING`,
		keyID,
		nonce,
		expiresAt,
	)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNonceUsed
	}

	_, _ = s.db.ExecContext(ctx, `DELETE FROM request_nonces WHERE expires_at < NOW()`)
	return nil
}

type IdempotencyResult struct {
	Owned       bool
	Response    *map[string]any
	RequestHash string
}

func (s *Store) BeginIdempotency(ctx context.Context, key string, requestHash string) (IdempotencyResult, error) {
	result, err := s.db.ExecContext(
		ctx,
		`INSERT INTO idempotency_keys (key, request_hash, status, created_at, updated_at)
		 VALUES ($1, $2, 'in_progress', NOW(), NOW())
		 ON CONFLICT (key) DO NOTHING`,
		key,
		requestHash,
	)
	if err != nil {
		return IdempotencyResult{}, err
	}
	rows, _ := result.RowsAffected()
	if rows > 0 {
		return IdempotencyResult{Owned: true, RequestHash: requestHash}, nil
	}

	var storedHash string
	var status string
	var responseRaw []byte
	err = s.db.QueryRowContext(
		ctx,
		`SELECT request_hash, status, COALESCE(response::text, '{}')
		 FROM idempotency_keys
		 WHERE key = $1`,
		key,
	).Scan(&storedHash, &status, &responseRaw)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return IdempotencyResult{}, ErrIdempotencyInProgress
		}
		return IdempotencyResult{}, err
	}

	if storedHash != requestHash {
		return IdempotencyResult{}, ErrIdempotencyConflict
	}

	if status == "completed" {
		var payload map[string]any
		if err := json.Unmarshal(responseRaw, &payload); err != nil {
			return IdempotencyResult{}, err
		}
		return IdempotencyResult{Owned: false, RequestHash: storedHash, Response: &payload}, nil
	}

	return IdempotencyResult{}, ErrIdempotencyInProgress
}

func (s *Store) FinalizeIdempotency(ctx context.Context, key string, requestHash string, response any) error {
	responseRaw, err := json.Marshal(response)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(
		ctx,
		`UPDATE idempotency_keys
		 SET status = 'completed', response = $3::jsonb, updated_at = NOW()
		 WHERE key = $1 AND request_hash = $2`,
		key,
		requestHash,
		string(responseRaw),
	)
	return err
}

func (s *Store) ListAPIKeys(ctx context.Context) ([]APIKeyRecord, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id::text, key_id, name, secret_ciphertext, scopes, revoked_at, created_at, last_used_at
		 FROM api_keys
		 ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := make([]APIKeyRecord, 0)
	for rows.Next() {
		var row APIKeyRecord
		var scopesRaw []byte
		var revokedAt sql.NullTime
		var lastUsedAt sql.NullTime
		if err := rows.Scan(
			&row.ID,
			&row.KeyID,
			&row.Name,
			&row.Secret,
			&scopesRaw,
			&revokedAt,
			&row.CreatedAt,
			&lastUsedAt,
		); err != nil {
			return nil, err
		}
		scopes, err := parseJSONArray(scopesRaw)
		if err != nil {
			return nil, err
		}
		row.Scopes = scopes
		row.RevokedAt = nullableTime(revokedAt)
		row.LastUsedAt = nullableTime(lastUsedAt)
		keys = append(keys, row)
	}
	return keys, rows.Err()
}

func (s *Store) CreateAPIKey(ctx context.Context, name, keyID, secret, keyHash string, scopes []string) (APIKeyRecord, error) {
	scopesRaw, err := json.Marshal(scopes)
	if err != nil {
		return APIKeyRecord{}, err
	}

	var record APIKeyRecord
	var storedScopes []byte
	err = s.db.QueryRowContext(
		ctx,
		`INSERT INTO api_keys (name, key_hash, permissions, key_id, secret_ciphertext, scopes)
		 VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb)
		 RETURNING id::text, key_id, name, secret_ciphertext, scopes, created_at`,
		name,
		keyHash,
		string(scopesRaw),
		keyID,
		secret,
		string(scopesRaw),
	).Scan(
		&record.ID,
		&record.KeyID,
		&record.Name,
		&record.Secret,
		&storedScopes,
		&record.CreatedAt,
	)
	if err != nil {
		return APIKeyRecord{}, err
	}

	record.Scopes, err = parseJSONArray(storedScopes)
	if err != nil {
		return APIKeyRecord{}, err
	}
	return record, nil
}

func (s *Store) RotateAPIKey(ctx context.Context, keyID string, newSecret string, newHash string) error {
	_, err := s.db.ExecContext(
		ctx,
		`UPDATE api_keys
		 SET secret_ciphertext = $2,
		     key_hash = $3,
		     revoked_at = NULL,
		     updated_at = NOW()
		 WHERE key_id = $1`,
		keyID,
		newSecret,
		newHash,
	)
	return err
}

func (s *Store) RevokeAPIKey(ctx context.Context, keyID string) error {
	_, err := s.db.ExecContext(ctx, `UPDATE api_keys SET revoked_at = NOW(), updated_at = NOW() WHERE key_id = $1`, keyID)
	return err
}

func (s *Store) InsertAuditLog(ctx context.Context, actorKeyID, action, resourceType, resourceID string, metadata any) error {
	metaRaw, err := toJSONRaw(metadata)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(
		ctx,
		`INSERT INTO audit_logs (actor_key_id, action, resource_type, resource_id, metadata)
		 VALUES ($1, $2, $3, $4, $5::jsonb)`,
		actorKeyID,
		action,
		resourceType,
		resourceID,
		string(metaRaw),
	)
	return err
}

func scanPost(scanner interface{ Scan(dest ...any) error }) (Post, error) {
	var post Post
	var tagsRaw []byte
	var excerpt sql.NullString
	var coverURL sql.NullString
	var publishedAt sql.NullTime
	if err := scanner.Scan(
		&post.ID,
		&post.Slug,
		&post.Locale,
		&post.Title,
		&excerpt,
		&post.Content,
		&coverURL,
		&tagsRaw,
		&post.Status,
		&publishedAt,
		&post.CreatedAt,
		&post.UpdatedAt,
		&post.Revision,
	); err != nil {
		return Post{}, err
	}
	tags, err := parseJSONArray(tagsRaw)
	if err != nil {
		return Post{}, err
	}
	post.Tags = tags
	post.Excerpt = nullableString(excerpt)
	post.CoverURL = nullableString(coverURL)
	post.PublishedAt = nullableTime(publishedAt)
	return post, nil
}

func (s *Store) ListPublicPosts(ctx context.Context, locale string, limit, offset int) ([]Post, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id::text, slug, locale, title, excerpt, content, cover_url, tags, status,
		        published_at, created_at, updated_at, COALESCE(revision, 1)
		 FROM posts
		 WHERE status = 'published' AND deleted_at IS NULL AND locale = $1
		 ORDER BY COALESCE(published_at, created_at) DESC
		 LIMIT $2 OFFSET $3`,
		locale,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Post, 0)
	for rows.Next() {
		item, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) GetPublicPostBySlug(ctx context.Context, locale, slug string) (Post, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT id::text, slug, locale, title, excerpt, content, cover_url, tags, status,
		        published_at, created_at, updated_at, COALESCE(revision, 1)
		 FROM posts
		 WHERE status = 'published' AND deleted_at IS NULL AND locale = $1 AND slug = $2
		 LIMIT 1`,
		locale,
		slug,
	)
	item, err := scanPost(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Post{}, ErrNotFound
		}
		return Post{}, err
	}
	return item, nil
}

func (s *Store) GetPostByID(ctx context.Context, id string) (Post, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT id::text, slug, locale, title, excerpt, content, cover_url, tags, status,
		        published_at, created_at, updated_at, COALESCE(revision, 1)
		 FROM posts
		 WHERE id = $1 AND deleted_at IS NULL
		 LIMIT 1`,
		id,
	)
	item, err := scanPost(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Post{}, ErrNotFound
		}
		return Post{}, err
	}
	return item, nil
}

type CreatePostInput struct {
	Locale    string
	Title     string
	Slug      string
	Excerpt   *string
	Content   string
	CoverURL  *string
	Tags      []string
	Status    string
	UpdatedBy *string
}

func (s *Store) CreatePost(ctx context.Context, input CreatePostInput) (Post, error) {
	tagsRaw, err := json.Marshal(input.Tags)
	if err != nil {
		return Post{}, err
	}

	var publishedAt any = nil
	if input.Status == "published" {
		publishedAt = time.Now().UTC()
	}

	row := s.db.QueryRowContext(
		ctx,
		`INSERT INTO posts (slug, locale, title, excerpt, content, cover_url, tags, status, published_at, revision, updated_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, 1, $10)
		 RETURNING id::text, slug, locale, title, excerpt, content, cover_url, tags, status,
		           published_at, created_at, updated_at, COALESCE(revision, 1)`,
		input.Slug,
		input.Locale,
		input.Title,
		input.Excerpt,
		input.Content,
		input.CoverURL,
		string(tagsRaw),
		input.Status,
		publishedAt,
		input.UpdatedBy,
	)
	return scanPost(row)
}

type UpdatePostInput struct {
	Title     *string
	Slug      *string
	Excerpt   *string
	Content   *string
	CoverURL  *string
	Tags      *[]string
	Locale    *string
	Status    *string
	UpdatedBy *string
}

func (s *Store) UpdatePost(ctx context.Context, id string, input UpdatePostInput) (Post, error) {
	existing, err := s.GetPostByID(ctx, id)
	if err != nil {
		return Post{}, err
	}

	if input.Title != nil {
		existing.Title = *input.Title
	}
	if input.Slug != nil {
		existing.Slug = *input.Slug
	}
	if input.Excerpt != nil {
		existing.Excerpt = input.Excerpt
	}
	if input.Content != nil {
		existing.Content = *input.Content
	}
	if input.CoverURL != nil {
		existing.CoverURL = input.CoverURL
	}
	if input.Tags != nil {
		existing.Tags = *input.Tags
	}
	if input.Locale != nil {
		existing.Locale = *input.Locale
	}
	if input.Status != nil {
		existing.Status = *input.Status
	}

	tagsRaw, err := json.Marshal(existing.Tags)
	if err != nil {
		return Post{}, err
	}

	var publishedAt any
	if existing.Status == "published" {
		if existing.PublishedAt != nil {
			publishedAt = *existing.PublishedAt
		} else {
			publishedAt = time.Now().UTC()
		}
	} else {
		publishedAt = nil
	}

	row := s.db.QueryRowContext(
		ctx,
		`UPDATE posts
		 SET slug = $2,
		     locale = $3,
		     title = $4,
		     excerpt = $5,
		     content = $6,
		     cover_url = $7,
		     tags = $8::jsonb,
		     status = $9,
		     published_at = $10,
		     revision = COALESCE(revision, 1) + 1,
		     updated_by = $11,
		     updated_at = NOW()
		 WHERE id = $1 AND deleted_at IS NULL
		 RETURNING id::text, slug, locale, title, excerpt, content, cover_url, tags, status,
		           published_at, created_at, updated_at, COALESCE(revision, 1)`,
		id,
		existing.Slug,
		existing.Locale,
		existing.Title,
		existing.Excerpt,
		existing.Content,
		existing.CoverURL,
		string(tagsRaw),
		existing.Status,
		publishedAt,
		input.UpdatedBy,
	)
	item, err := scanPost(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Post{}, ErrNotFound
		}
		return Post{}, err
	}
	return item, nil
}

func (s *Store) SetPostStatus(ctx context.Context, id, status string, updatedBy *string) (Post, error) {
	var publishedAt any
	if status == "published" {
		publishedAt = time.Now().UTC()
	} else {
		publishedAt = nil
	}

	row := s.db.QueryRowContext(
		ctx,
		`UPDATE posts
		 SET status = $2,
		     published_at = $3,
		     revision = COALESCE(revision, 1) + 1,
		     updated_by = $4,
		     updated_at = NOW()
		 WHERE id = $1 AND deleted_at IS NULL
		 RETURNING id::text, slug, locale, title, excerpt, content, cover_url, tags, status,
		           published_at, created_at, updated_at, COALESCE(revision, 1)`,
		id,
		status,
		publishedAt,
		updatedBy,
	)
	item, err := scanPost(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Post{}, ErrNotFound
		}
		return Post{}, err
	}
	return item, nil
}

func (s *Store) SoftDeletePost(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `UPDATE posts SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func scanMoment(scanner interface{ Scan(dest ...any) error }) (Moment, error) {
	var item Moment
	var mediaRaw []byte
	var locationRaw []byte
	var publishedAt sql.NullTime
	var updatedAt sql.NullTime
	if err := scanner.Scan(
		&item.ID,
		&item.Content,
		&mediaRaw,
		&item.Locale,
		&item.Visibility,
		&locationRaw,
		&item.Status,
		&publishedAt,
		&item.CreatedAt,
		&updatedAt,
	); err != nil {
		return Moment{}, err
	}
	media, err := parseMomentMedia(mediaRaw)
	if err != nil {
		return Moment{}, err
	}
	item.Media = media
	location, err := parseMomentLocation(locationRaw)
	if err != nil {
		return Moment{}, err
	}
	item.Location = location
	item.PublishedAt = nullableTime(publishedAt)
	if updatedAt.Valid {
		item.UpdatedAt = updatedAt.Time
	} else {
		item.UpdatedAt = item.CreatedAt
	}
	return item, nil
}

func (s *Store) ListPublicMoments(ctx context.Context, locale string, limit, offset int) ([]Moment, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id::text, content, media, locale, visibility, location, status, published_at, created_at, updated_at
		 FROM moments
		 WHERE status = 'published' AND visibility = 'public' AND deleted_at IS NULL AND locale = $1
		 ORDER BY COALESCE(published_at, created_at) DESC
		 LIMIT $2 OFFSET $3`,
		locale,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Moment, 0)
	for rows.Next() {
		item, err := scanMoment(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) GetPublicMomentByID(ctx context.Context, locale, id string) (Moment, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT id::text, content, media, locale, visibility, location, status, published_at, created_at, updated_at
		 FROM moments
		 WHERE id = $1 AND locale = $2 AND status = 'published' AND visibility = 'public' AND deleted_at IS NULL
		 LIMIT 1`,
		id,
		locale,
	)
	item, err := scanMoment(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Moment{}, ErrNotFound
		}
		return Moment{}, err
	}
	return item, nil
}

func (s *Store) GetMomentByID(ctx context.Context, id string) (Moment, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT id::text, content, media, locale, visibility, location, status, published_at, created_at, updated_at
		 FROM moments
		 WHERE id = $1 AND deleted_at IS NULL
		 LIMIT 1`,
		id,
	)
	item, err := scanMoment(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Moment{}, ErrNotFound
		}
		return Moment{}, err
	}
	return item, nil
}

type CreateMomentInput struct {
	Content    string
	Locale     string
	Visibility string
	Location   *MomentLocation
	Media      []MomentMediaItem
	Status     string
}

func (s *Store) CreateMoment(ctx context.Context, input CreateMomentInput) (Moment, error) {
	if strings.TrimSpace(input.Content) == "" && len(input.Media) == 0 {
		return Moment{}, ErrMomentContentOrMediaRequired
	}

	mediaRaw, err := json.Marshal(input.Media)
	if err != nil {
		return Moment{}, err
	}
	locationRaw, err := toJSONRaw(input.Location)
	if err != nil {
		return Moment{}, err
	}

	var publishedAt any
	if input.Status == "published" {
		publishedAt = time.Now().UTC()
	}

	row := s.db.QueryRowContext(
		ctx,
		`INSERT INTO moments (content, media, locale, visibility, location, status, published_at, updated_at)
		 VALUES ($1, $2::jsonb, $3, $4, $5::jsonb, $6, $7, NOW())
		 RETURNING id::text, content, media, locale, visibility, location, status, published_at, created_at, updated_at`,
		input.Content,
		string(mediaRaw),
		input.Locale,
		input.Visibility,
		string(locationRaw),
		input.Status,
		publishedAt,
	)
	return scanMoment(row)
}

type UpdateMomentInput struct {
	Content    *string
	Locale     *string
	Visibility *string
	Location   *MomentLocation
	Media      *[]MomentMediaItem
	Status     *string
}

func (s *Store) UpdateMoment(ctx context.Context, id string, input UpdateMomentInput) (Moment, error) {
	existing, err := s.GetMomentByID(ctx, id)
	if err != nil {
		return Moment{}, err
	}
	if input.Content != nil {
		existing.Content = *input.Content
	}
	if input.Locale != nil {
		existing.Locale = *input.Locale
	}
	if input.Visibility != nil {
		existing.Visibility = *input.Visibility
	}
	if input.Location != nil {
		existing.Location = input.Location
	}
	if input.Media != nil {
		existing.Media = *input.Media
	}
	if input.Status != nil {
		existing.Status = *input.Status
	}

	if strings.TrimSpace(existing.Content) == "" && len(existing.Media) == 0 {
		return Moment{}, ErrMomentContentOrMediaRequired
	}

	mediaRaw, err := json.Marshal(existing.Media)
	if err != nil {
		return Moment{}, err
	}
	locationRaw, err := toJSONRaw(existing.Location)
	if err != nil {
		return Moment{}, err
	}

	var publishedAt any
	if existing.Status == "published" {
		if existing.PublishedAt != nil {
			publishedAt = *existing.PublishedAt
		} else {
			publishedAt = time.Now().UTC()
		}
	}

	row := s.db.QueryRowContext(
		ctx,
		`UPDATE moments
		 SET content = $2,
		     media = $3::jsonb,
		     locale = $4,
		     visibility = $5,
		     location = $6::jsonb,
		     status = $7,
		     published_at = $8,
		     updated_at = NOW()
		 WHERE id = $1 AND deleted_at IS NULL
		 RETURNING id::text, content, media, locale, visibility, location, status, published_at, created_at, updated_at`,
		id,
		existing.Content,
		string(mediaRaw),
		existing.Locale,
		existing.Visibility,
		string(locationRaw),
		existing.Status,
		publishedAt,
	)
	item, err := scanMoment(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Moment{}, ErrNotFound
		}
		return Moment{}, err
	}
	return item, nil
}

func (s *Store) SetMomentStatus(ctx context.Context, id, status string) (Moment, error) {
	var publishedAt any
	if status == "published" {
		publishedAt = time.Now().UTC()
	}
	row := s.db.QueryRowContext(
		ctx,
		`UPDATE moments
		 SET status = $2,
		     published_at = $3,
		     updated_at = NOW()
		 WHERE id = $1 AND deleted_at IS NULL
		 RETURNING id::text, content, media, locale, visibility, location, status, published_at, created_at, updated_at`,
		id,
		status,
		publishedAt,
	)
	item, err := scanMoment(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Moment{}, ErrNotFound
		}
		return Moment{}, err
	}
	return item, nil
}

func (s *Store) SoftDeleteMoment(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `UPDATE moments SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func scanGallery(scanner interface{ Scan(dest ...any) error }) (GalleryItem, error) {
	var item GalleryItem
	var thumbURL sql.NullString
	var title sql.NullString
	var capturedAt sql.NullTime
	var camera sql.NullString
	var lens sql.NullString
	var focalLength sql.NullString
	var aperture sql.NullString
	var iso sql.NullInt32
	var latitude sql.NullFloat64
	var longitude sql.NullFloat64
	var videoURL sql.NullString
	var publishedAt sql.NullTime
	if err := scanner.Scan(
		&item.ID,
		&item.Locale,
		&item.FileURL,
		&thumbURL,
		&title,
		&item.Width,
		&item.Height,
		&capturedAt,
		&camera,
		&lens,
		&focalLength,
		&aperture,
		&iso,
		&latitude,
		&longitude,
		&item.IsLivePhoto,
		&videoURL,
		&item.Status,
		&publishedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return GalleryItem{}, err
	}
	item.ThumbURL = nullableString(thumbURL)
	item.Title = nullableString(title)
	item.CapturedAt = nullableTime(capturedAt)
	item.Camera = nullableString(camera)
	item.Lens = nullableString(lens)
	item.FocalLength = nullableString(focalLength)
	item.Aperture = nullableString(aperture)
	item.ISO = nullableInt(iso)
	item.Latitude = nullableFloat(latitude)
	item.Longitude = nullableFloat(longitude)
	item.VideoURL = nullableString(videoURL)
	item.PublishedAt = nullableTime(publishedAt)
	return item, nil
}

func (s *Store) ListPublicGallery(ctx context.Context, locale string, limit, offset int) ([]GalleryItem, error) {
	rows, err := s.db.QueryContext(
		ctx,
		`SELECT id::text, locale, file_url, thumb_url, title, width, height, captured_at, camera, lens,
		        focal_length, aperture, iso, latitude, longitude, COALESCE(is_live_photo, false), video_url,
		        status, published_at, created_at, updated_at
		 FROM gallery
		 WHERE status = 'published' AND deleted_at IS NULL AND locale = $1
		 ORDER BY COALESCE(published_at, created_at) DESC
		 LIMIT $2 OFFSET $3`,
		locale,
		limit,
		offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]GalleryItem, 0)
	for rows.Next() {
		item, err := scanGallery(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) GetPublicGalleryByID(ctx context.Context, locale, id string) (GalleryItem, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT id::text, locale, file_url, thumb_url, title, width, height, captured_at, camera, lens,
		        focal_length, aperture, iso, latitude, longitude, COALESCE(is_live_photo, false), video_url,
		        status, published_at, created_at, updated_at
		 FROM gallery
		 WHERE id = $1 AND locale = $2 AND status = 'published' AND deleted_at IS NULL
		 LIMIT 1`,
		id,
		locale,
	)
	item, err := scanGallery(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GalleryItem{}, ErrNotFound
		}
		return GalleryItem{}, err
	}
	return item, nil
}

func (s *Store) GetGalleryByID(ctx context.Context, id string) (GalleryItem, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT id::text, locale, file_url, thumb_url, title, width, height, captured_at, camera, lens,
		        focal_length, aperture, iso, latitude, longitude, COALESCE(is_live_photo, false), video_url,
		        status, published_at, created_at, updated_at
		 FROM gallery
		 WHERE id = $1 AND deleted_at IS NULL
		 LIMIT 1`,
		id,
	)
	item, err := scanGallery(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GalleryItem{}, ErrNotFound
		}
		return GalleryItem{}, err
	}
	return item, nil
}

type CreateGalleryInput struct {
	Locale      string
	FileURL     string
	ThumbURL    *string
	Title       *string
	Width       *int
	Height      *int
	CapturedAt  *time.Time
	Camera      *string
	Lens        *string
	FocalLength *string
	Aperture    *string
	ISO         *int
	Latitude    *float64
	Longitude   *float64
	IsLivePhoto bool
	VideoURL    *string
	Status      string
}

func (s *Store) CreateGallery(ctx context.Context, input CreateGalleryInput) (GalleryItem, error) {
	var publishedAt any
	if input.Status == "published" {
		publishedAt = time.Now().UTC()
	}

	row := s.db.QueryRowContext(
		ctx,
		`INSERT INTO gallery (locale, file_url, thumb_url, title, width, height, captured_at, camera, lens,
		                     focal_length, aperture, iso, latitude, longitude, is_live_photo, video_url,
		                     status, published_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
		         $10, $11, $12, $13, $14, $15, $16,
		         $17, $18, NOW())
		 RETURNING id::text, locale, file_url, thumb_url, title, width, height, captured_at, camera, lens,
		           focal_length, aperture, iso, latitude, longitude, COALESCE(is_live_photo, false), video_url,
		           status, published_at, created_at, updated_at`,
		input.Locale,
		input.FileURL,
		input.ThumbURL,
		input.Title,
		input.Width,
		input.Height,
		input.CapturedAt,
		input.Camera,
		input.Lens,
		input.FocalLength,
		input.Aperture,
		input.ISO,
		input.Latitude,
		input.Longitude,
		input.IsLivePhoto,
		input.VideoURL,
		input.Status,
		publishedAt,
	)
	return scanGallery(row)
}

type UpdateGalleryInput struct {
	Locale      *string
	FileURL     *string
	ThumbURL    *string
	Title       *string
	Width       *int
	Height      *int
	CapturedAt  *time.Time
	Camera      *string
	Lens        *string
	FocalLength *string
	Aperture    *string
	ISO         *int
	Latitude    *float64
	Longitude   *float64
	IsLivePhoto *bool
	VideoURL    *string
	Status      *string
}

func (s *Store) UpdateGallery(ctx context.Context, id string, input UpdateGalleryInput) (GalleryItem, error) {
	existing, err := s.GetGalleryByID(ctx, id)
	if err != nil {
		return GalleryItem{}, err
	}
	if input.Locale != nil {
		existing.Locale = *input.Locale
	}
	if input.FileURL != nil {
		existing.FileURL = *input.FileURL
	}
	if input.ThumbURL != nil {
		existing.ThumbURL = input.ThumbURL
	}
	if input.Title != nil {
		existing.Title = input.Title
	}
	if input.Width != nil {
		existing.Width = input.Width
	}
	if input.Height != nil {
		existing.Height = input.Height
	}
	if input.CapturedAt != nil {
		existing.CapturedAt = input.CapturedAt
	}
	if input.Camera != nil {
		existing.Camera = input.Camera
	}
	if input.Lens != nil {
		existing.Lens = input.Lens
	}
	if input.FocalLength != nil {
		existing.FocalLength = input.FocalLength
	}
	if input.Aperture != nil {
		existing.Aperture = input.Aperture
	}
	if input.ISO != nil {
		existing.ISO = input.ISO
	}
	if input.Latitude != nil {
		existing.Latitude = input.Latitude
	}
	if input.Longitude != nil {
		existing.Longitude = input.Longitude
	}
	if input.IsLivePhoto != nil {
		existing.IsLivePhoto = *input.IsLivePhoto
	}
	if input.VideoURL != nil {
		existing.VideoURL = input.VideoURL
	}
	if input.Status != nil {
		existing.Status = *input.Status
	}

	var publishedAt any
	if existing.Status == "published" {
		if existing.PublishedAt != nil {
			publishedAt = *existing.PublishedAt
		} else {
			publishedAt = time.Now().UTC()
		}
	}

	row := s.db.QueryRowContext(
		ctx,
		`UPDATE gallery
		 SET locale = $2,
		     file_url = $3,
		     thumb_url = $4,
		     title = $5,
		     width = $6,
		     height = $7,
		     captured_at = $8,
		     camera = $9,
		     lens = $10,
		     focal_length = $11,
		     aperture = $12,
		     iso = $13,
		     latitude = $14,
		     longitude = $15,
		     is_live_photo = $16,
		     video_url = $17,
		     status = $18,
		     published_at = $19,
		     updated_at = NOW()
		 WHERE id = $1 AND deleted_at IS NULL
		 RETURNING id::text, locale, file_url, thumb_url, title, width, height, captured_at, camera, lens,
		           focal_length, aperture, iso, latitude, longitude, COALESCE(is_live_photo, false), video_url,
		           status, published_at, created_at, updated_at`,
		id,
		existing.Locale,
		existing.FileURL,
		existing.ThumbURL,
		existing.Title,
		existing.Width,
		existing.Height,
		existing.CapturedAt,
		existing.Camera,
		existing.Lens,
		existing.FocalLength,
		existing.Aperture,
		existing.ISO,
		existing.Latitude,
		existing.Longitude,
		existing.IsLivePhoto,
		existing.VideoURL,
		existing.Status,
		publishedAt,
	)
	item, err := scanGallery(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GalleryItem{}, ErrNotFound
		}
		return GalleryItem{}, err
	}
	return item, nil
}

func (s *Store) SetGalleryStatus(ctx context.Context, id, status string) (GalleryItem, error) {
	var publishedAt any
	if status == "published" {
		publishedAt = time.Now().UTC()
	}
	row := s.db.QueryRowContext(
		ctx,
		`UPDATE gallery
		 SET status = $2,
		     published_at = $3,
		     updated_at = NOW()
		 WHERE id = $1 AND deleted_at IS NULL
		 RETURNING id::text, locale, file_url, thumb_url, title, width, height, captured_at, camera, lens,
		           focal_length, aperture, iso, latitude, longitude, COALESCE(is_live_photo, false), video_url,
		           status, published_at, created_at, updated_at`,
		id,
		status,
		publishedAt,
	)
	item, err := scanGallery(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return GalleryItem{}, ErrNotFound
		}
		return GalleryItem{}, err
	}
	return item, nil
}

func (s *Store) SoftDeleteGallery(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, `UPDATE gallery SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) ListPublicFeed(ctx context.Context, locale string, limit int) ([]FeedItem, error) {
	posts, err := s.ListPublicPosts(ctx, locale, limit, 0)
	if err != nil {
		return nil, err
	}
	moments, err := s.ListPublicMoments(ctx, locale, limit, 0)
	if err != nil {
		return nil, err
	}
	gallery, err := s.ListPublicGallery(ctx, locale, limit, 0)
	if err != nil {
		return nil, err
	}

	items := make([]FeedItem, 0, len(posts)+len(moments)+len(gallery))
	for _, item := range posts {
		sortAt := item.CreatedAt
		if item.PublishedAt != nil {
			sortAt = *item.PublishedAt
		}
		p := item
		items = append(items, FeedItem{Type: "post", SortAt: sortAt, Post: &p})
	}
	for _, item := range moments {
		sortAt := item.CreatedAt
		if item.PublishedAt != nil {
			sortAt = *item.PublishedAt
		}
		m := item
		items = append(items, FeedItem{Type: "moment", SortAt: sortAt, Moment: &m})
	}
	for _, item := range gallery {
		sortAt := item.CreatedAt
		if item.PublishedAt != nil {
			sortAt = *item.PublishedAt
		}
		g := item
		items = append(items, FeedItem{Type: "gallery", SortAt: sortAt, Gallery: &g})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].SortAt.After(items[j].SortAt)
	})
	if len(items) > limit {
		items = items[:limit]
	}
	return items, nil
}

type CreateMediaAssetInput struct {
	ObjectKey string
	URL       string
	Mime      string
	Size      int64
	SHA256    string
	Status    string
}

func (s *Store) CreateMediaAsset(ctx context.Context, input CreateMediaAssetInput) (MediaAsset, error) {
	row := s.db.QueryRowContext(
		ctx,
		`INSERT INTO media_assets (object_key, url, mime, size, sha256, status)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id::text, object_key, url, mime, size, sha256, status, created_at, updated_at`,
		input.ObjectKey,
		input.URL,
		input.Mime,
		input.Size,
		input.SHA256,
		input.Status,
	)
	var asset MediaAsset
	if err := row.Scan(
		&asset.ID,
		&asset.ObjectKey,
		&asset.URL,
		&asset.Mime,
		&asset.Size,
		&asset.SHA256,
		&asset.Status,
		&asset.CreatedAt,
		&asset.UpdatedAt,
	); err != nil {
		return MediaAsset{}, err
	}
	return asset, nil
}

func (s *Store) CompleteMediaAsset(ctx context.Context, id string, size int64, sha256, status string, exif map[string]any) (MediaAsset, error) {
	exifRaw, err := toJSONRaw(exif)
	if err != nil {
		return MediaAsset{}, err
	}

	row := s.db.QueryRowContext(
		ctx,
		`UPDATE media_assets
		 SET size = $2,
		     sha256 = $3,
		     status = $4,
		     exif_json = $5::jsonb,
		     updated_at = NOW()
		 WHERE id = $1
		 RETURNING id::text, object_key, url, mime, size, sha256, status, created_at, updated_at`,
		id,
		size,
		sha256,
		status,
		string(exifRaw),
	)
	var asset MediaAsset
	if err := row.Scan(
		&asset.ID,
		&asset.ObjectKey,
		&asset.URL,
		&asset.Mime,
		&asset.Size,
		&asset.SHA256,
		&asset.Status,
		&asset.CreatedAt,
		&asset.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return MediaAsset{}, ErrNotFound
		}
		return MediaAsset{}, err
	}
	return asset, nil
}

func (s *Store) GetMediaAssetByID(ctx context.Context, id string) (MediaAsset, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT id::text, object_key, url, mime, size, sha256, status, created_at, updated_at
		 FROM media_assets
		 WHERE id = $1
		 LIMIT 1`,
		id,
	)
	var asset MediaAsset
	if err := row.Scan(
		&asset.ID,
		&asset.ObjectKey,
		&asset.URL,
		&asset.Mime,
		&asset.Size,
		&asset.SHA256,
		&asset.Status,
		&asset.CreatedAt,
		&asset.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return MediaAsset{}, ErrNotFound
		}
		return MediaAsset{}, err
	}
	return asset, nil
}

func (s *Store) UpsertPreviewSession(ctx context.Context, sessionID string, payload []byte, expiresAt time.Time) (PreviewSession, error) {
	if sessionID != "" {
		row := s.db.QueryRowContext(
			ctx,
			`UPDATE preview_sessions
			 SET payload = $2::jsonb,
			     expires_at = $3,
			     updated_at = NOW()
			 WHERE id = $1
			 RETURNING id::text, payload::text, expires_at, created_at, updated_at`,
			sessionID,
			string(payload),
			expiresAt,
		)
		var record PreviewSession
		if err := row.Scan(
			&record.ID,
			&record.Payload,
			&record.ExpiresAt,
			&record.CreatedAt,
			&record.UpdatedAt,
		); err == nil {
			return record, nil
		}
	}

	row := s.db.QueryRowContext(
		ctx,
		`INSERT INTO preview_sessions (payload, expires_at)
		 VALUES ($1::jsonb, $2)
		 RETURNING id::text, payload::text, expires_at, created_at, updated_at`,
		string(payload),
		expiresAt,
	)
	var record PreviewSession
	if err := row.Scan(
		&record.ID,
		&record.Payload,
		&record.ExpiresAt,
		&record.CreatedAt,
		&record.UpdatedAt,
	); err != nil {
		return PreviewSession{}, err
	}
	return record, nil
}

func (s *Store) GetPreviewSessionByID(ctx context.Context, id string) (PreviewSession, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT id::text, payload::text, expires_at, created_at, updated_at
		 FROM preview_sessions
		 WHERE id = $1
		 LIMIT 1`,
		id,
	)
	var record PreviewSession
	if err := row.Scan(
		&record.ID,
		&record.Payload,
		&record.ExpiresAt,
		&record.CreatedAt,
		&record.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return PreviewSession{}, ErrNotFound
		}
		return PreviewSession{}, err
	}
	return record, nil
}

type CreateAIJobInput struct {
	Kind      string
	ContentID string
	Provider  string
	Model     string
	Prompt    string
}

func (s *Store) CreateAIJob(ctx context.Context, input CreateAIJobInput) (AIJob, error) {
	row := s.db.QueryRowContext(
		ctx,
		`INSERT INTO ai_jobs (kind, content_id, provider, model, prompt, status)
		 VALUES ($1, $2, $3, $4, $5, 'queued')
		 RETURNING id::text, kind, content_id, provider, model, prompt, status, error_message, created_at, updated_at, completed_at`,
		input.Kind,
		input.ContentID,
		input.Provider,
		input.Model,
		input.Prompt,
	)
	return scanAIJob(row, nil)
}

func scanAIJob(scanner interface{ Scan(dest ...any) error }, resultRaw []byte) (AIJob, error) {
	var item AIJob
	var errMsg sql.NullString
	var completedAt sql.NullTime
	if err := scanner.Scan(
		&item.ID,
		&item.Kind,
		&item.ContentID,
		&item.Provider,
		&item.Model,
		&item.Prompt,
		&item.Status,
		&errMsg,
		&item.CreatedAt,
		&item.UpdatedAt,
		&completedAt,
	); err != nil {
		return AIJob{}, err
	}
	item.ErrorMessage = nullableString(errMsg)
	item.CompletedAt = nullableTime(completedAt)
	if len(resultRaw) > 0 && string(resultRaw) != "null" {
		var result map[string]any
		if err := json.Unmarshal(resultRaw, &result); err != nil {
			return AIJob{}, err
		}
		item.Result = &result
	}
	return item, nil
}

func (s *Store) GetAIJobByID(ctx context.Context, id string) (AIJob, error) {
	row := s.db.QueryRowContext(
		ctx,
		`SELECT j.id::text, j.kind, j.content_id, j.provider, j.model, j.prompt, j.status,
		        j.error_message, j.created_at, j.updated_at, j.completed_at,
		        (SELECT result FROM ai_job_results r WHERE r.job_id = j.id ORDER BY r.created_at DESC LIMIT 1)::text
		 FROM ai_jobs j
		 WHERE j.id = $1
		 LIMIT 1`,
		id,
	)
	var resultRaw sql.NullString
	var item AIJob
	var errMsg sql.NullString
	var completedAt sql.NullTime
	if err := row.Scan(
		&item.ID,
		&item.Kind,
		&item.ContentID,
		&item.Provider,
		&item.Model,
		&item.Prompt,
		&item.Status,
		&errMsg,
		&item.CreatedAt,
		&item.UpdatedAt,
		&completedAt,
		&resultRaw,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return AIJob{}, ErrNotFound
		}
		return AIJob{}, err
	}
	item.ErrorMessage = nullableString(errMsg)
	item.CompletedAt = nullableTime(completedAt)
	if resultRaw.Valid && resultRaw.String != "" && resultRaw.String != "null" {
		var result map[string]any
		if err := json.Unmarshal([]byte(resultRaw.String), &result); err != nil {
			return AIJob{}, err
		}
		item.Result = &result
	}
	return item, nil
}

func (s *Store) ClaimNextQueuedAIJob(ctx context.Context) (AIJob, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return AIJob{}, err
	}
	defer func() {
		_ = tx.Rollback()
	}()

	row := tx.QueryRowContext(
		ctx,
		`WITH picked AS (
			SELECT id
			FROM ai_jobs
			WHERE status = 'queued'
			ORDER BY created_at ASC
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE ai_jobs AS j
		SET status = 'running',
		    updated_at = NOW()
		FROM picked
		WHERE j.id = picked.id
		RETURNING j.id::text, j.kind, j.content_id, j.provider, j.model, j.prompt,
		          j.status, j.error_message, j.created_at, j.updated_at, j.completed_at`,
	)
	job, err := scanAIJob(row, nil)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return AIJob{}, ErrNotFound
		}
		return AIJob{}, err
	}

	if err := tx.Commit(); err != nil {
		return AIJob{}, err
	}
	return job, nil
}

func (s *Store) CompleteAIJob(ctx context.Context, id string, result map[string]any) error {
	resultRaw, err := json.Marshal(result)
	if err != nil {
		return err
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO ai_job_results (job_id, provider, model, result)
		 VALUES ($1, (SELECT provider FROM ai_jobs WHERE id = $1), (SELECT model FROM ai_jobs WHERE id = $1), $2::jsonb)`,
		id,
		string(resultRaw),
	); err != nil {
		return err
	}

	if _, err := tx.ExecContext(
		ctx,
		`UPDATE ai_jobs
		 SET status = 'succeeded',
		     completed_at = NOW(),
		     updated_at = NOW(),
		     error_message = NULL
		 WHERE id = $1`,
		id,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func (s *Store) FailAIJob(ctx context.Context, id string, reason string) error {
	_, err := s.db.ExecContext(
		ctx,
		`UPDATE ai_jobs
		 SET status = 'failed',
		     error_message = $2,
		     completed_at = NOW(),
		     updated_at = NOW()
		 WHERE id = $1`,
		id,
		reason,
	)
	return err
}

func (s *Store) GetContentBody(ctx context.Context, kind, contentID string) (string, error) {
	switch kind {
	case "post":
		var content string
		err := s.db.QueryRowContext(
			ctx,
			`SELECT content FROM posts WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
			contentID,
		).Scan(&content)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return "", ErrNotFound
			}
			return "", err
		}
		return content, nil
	case "moment":
		var content string
		err := s.db.QueryRowContext(
			ctx,
			`SELECT content FROM moments WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
			contentID,
		).Scan(&content)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return "", ErrNotFound
			}
			return "", err
		}
		return content, nil
	case "gallery":
		var title sql.NullString
		err := s.db.QueryRowContext(
			ctx,
			`SELECT title FROM gallery WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
			contentID,
		).Scan(&title)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return "", ErrNotFound
			}
			return "", err
		}
		if title.Valid {
			return title.String, nil
		}
		return "", nil
	default:
		return "", fmt.Errorf("unsupported content kind: %s", kind)
	}
}

func (s *Store) ApplyAIResultToContent(ctx context.Context, job AIJob) error {
	if job.Result == nil {
		return nil
	}
	rewrite, ok := (*job.Result)["rewrite"].(string)
	if !ok || rewrite == "" {
		return nil
	}

	switch job.Kind {
	case "post":
		_, err := s.db.ExecContext(
			ctx,
			`UPDATE posts
			 SET excerpt = COALESCE(excerpt, $2),
			     updated_at = NOW(),
			     revision = COALESCE(revision, 1) + 1
			 WHERE id = $1 AND deleted_at IS NULL`,
			job.ContentID,
			rewrite,
		)
		return err
	case "moment":
		_, err := s.db.ExecContext(
			ctx,
			`UPDATE moments
			 SET content = $2,
			     updated_at = NOW()
			 WHERE id = $1 AND deleted_at IS NULL`,
			job.ContentID,
			rewrite,
		)
		return err
	case "gallery":
		_, err := s.db.ExecContext(
			ctx,
			`UPDATE gallery
			 SET title = COALESCE(title, $2),
			     updated_at = NOW()
			 WHERE id = $1 AND deleted_at IS NULL`,
			job.ContentID,
			rewrite,
		)
		return err
	default:
		return fmt.Errorf("unsupported content kind: %s", job.Kind)
	}
}
