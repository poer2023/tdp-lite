package store

import "time"

type APIKeyRecord struct {
	ID         string
	KeyID      string
	Name       string
	Secret     string
	Scopes     []string
	RevokedAt  *time.Time
	CreatedAt  time.Time
	LastUsedAt *time.Time
}

type Post struct {
	ID          string     `json:"id"`
	Slug        string     `json:"slug"`
	Locale      string     `json:"locale"`
	Title       string     `json:"title"`
	Excerpt     *string    `json:"excerpt,omitempty"`
	Content     string     `json:"content"`
	CoverURL    *string    `json:"coverUrl,omitempty"`
	Tags        []string   `json:"tags"`
	Status      string     `json:"status"`
	PublishedAt *time.Time `json:"publishedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	Revision    int        `json:"revision"`
}

type MomentMediaItem struct {
	Type         string     `json:"type"`
	URL          string     `json:"url"`
	Width        *int       `json:"width,omitempty"`
	Height       *int       `json:"height,omitempty"`
	ThumbnailURL *string    `json:"thumbnailUrl,omitempty"`
	CapturedAt   *time.Time `json:"capturedAt,omitempty"`
	Camera       *string    `json:"camera,omitempty"`
	Lens         *string    `json:"lens,omitempty"`
	FocalLength  *string    `json:"focalLength,omitempty"`
	Aperture     *string    `json:"aperture,omitempty"`
	ISO          *int       `json:"iso,omitempty"`
	Latitude     *float64   `json:"latitude,omitempty"`
	Longitude    *float64   `json:"longitude,omitempty"`
}

type MomentLocation struct {
	Name string   `json:"name"`
	Lat  *float64 `json:"lat,omitempty"`
	Lng  *float64 `json:"lng,omitempty"`
}

type Moment struct {
	ID          string            `json:"id"`
	Content     string            `json:"content"`
	Media       []MomentMediaItem `json:"media"`
	Locale      string            `json:"locale"`
	Visibility  string            `json:"visibility"`
	Location    *MomentLocation   `json:"location,omitempty"`
	Status      string            `json:"status"`
	PublishedAt *time.Time        `json:"publishedAt,omitempty"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
}

type GalleryItem struct {
	ID          string     `json:"id"`
	Locale      string     `json:"locale"`
	FileURL     string     `json:"fileUrl"`
	ThumbURL    *string    `json:"thumbUrl,omitempty"`
	Title       *string    `json:"title,omitempty"`
	Width       *int       `json:"width,omitempty"`
	Height      *int       `json:"height,omitempty"`
	CapturedAt  *time.Time `json:"capturedAt,omitempty"`
	Camera      *string    `json:"camera,omitempty"`
	Lens        *string    `json:"lens,omitempty"`
	FocalLength *string    `json:"focalLength,omitempty"`
	Aperture    *string    `json:"aperture,omitempty"`
	ISO         *int       `json:"iso,omitempty"`
	Latitude    *float64   `json:"latitude,omitempty"`
	Longitude   *float64   `json:"longitude,omitempty"`
	IsLivePhoto bool       `json:"isLivePhoto"`
	VideoURL    *string    `json:"videoUrl,omitempty"`
	Status      string     `json:"status"`
	PublishedAt *time.Time `json:"publishedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

type FeedItem struct {
	Type    string       `json:"type"`
	SortAt  time.Time    `json:"sortAt"`
	Post    *Post        `json:"post,omitempty"`
	Moment  *Moment      `json:"moment,omitempty"`
	Gallery *GalleryItem `json:"gallery,omitempty"`
}

type MediaAsset struct {
	ID        string    `json:"id"`
	ObjectKey string    `json:"objectKey"`
	URL       string    `json:"url"`
	Mime      string    `json:"mime"`
	Size      int64     `json:"size"`
	SHA256    string    `json:"sha256"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type PreviewSession struct {
	ID        string    `json:"id"`
	Payload   []byte    `json:"payload"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type AIJob struct {
	ID           string          `json:"id"`
	Kind         string          `json:"kind"`
	ContentID    string          `json:"contentId"`
	Provider     string          `json:"provider"`
	Model        string          `json:"model"`
	Prompt       string          `json:"prompt"`
	Status       string          `json:"status"`
	ErrorMessage *string         `json:"errorMessage,omitempty"`
	CreatedAt    time.Time       `json:"createdAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
	CompletedAt  *time.Time      `json:"completedAt,omitempty"`
	Result       *map[string]any `json:"result,omitempty"`
}

type PresenceStatus struct {
	City            string    `json:"city"`
	Region          *string   `json:"region,omitempty"`
	Country         *string   `json:"country,omitempty"`
	CountryCode     *string   `json:"countryCode,omitempty"`
	Timezone        *string   `json:"timezone,omitempty"`
	Source          *string   `json:"source,omitempty"`
	LastHeartbeatAt time.Time `json:"lastHeartbeatAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	CreatedAt       time.Time `json:"createdAt"`
}

type UpsertPresenceInput struct {
	City        string
	Region      *string
	Country     *string
	CountryCode *string
	Timezone    *string
	Source      *string
	HeartbeatAt time.Time
}

type ProfileSnapshot struct {
	Github       map[string]any `json:"github,omitempty"`
	Music        map[string]any `json:"music,omitempty"`
	Derived      map[string]any `json:"derived,omitempty"`
	SourceStatus map[string]any `json:"sourceStatus,omitempty"`
	SyncedAt     *time.Time     `json:"syncedAt,omitempty"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	CreatedAt    time.Time      `json:"createdAt"`
}

type UpsertProfileSnapshotInput struct {
	Github       *map[string]any
	Music        *map[string]any
	Derived      *map[string]any
	SourceStatus *map[string]any
	SyncedAt     *time.Time
}
