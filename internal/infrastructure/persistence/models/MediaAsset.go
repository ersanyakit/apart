package models

import (
	"gorm.io/gorm"
	"otel/utils"
	"time"

	"github.com/google/uuid"
)

// Asset is a reusable image record. Models attach assets through GORM
// many-to-many associations; removing an attachment does not delete the media.
// URL references the image in storage, not image data stored in the database.
type Asset struct {
	DeletedAt    gorm.DeletedAt        `gorm:"index" json:"-"`
	Kind         string                `gorm:"not null" json:"kind"`
	MIMEType     string                `json:"mime_type"`
	Size         int64                 `json:"size"`
	OriginalName string                `json:"original_name"`
	MediaID      uuid.UUID             `gorm:"type:uuid;primaryKey" json:"media_id"`
	HotelID      uuid.UUID             `gorm:"type:uuid;not null;index" json:"hotel_id"`
	StorageKey   string                `json:"-"`
	URL          string                `gorm:"not null" json:"url"`
	Title        utils.LocalizedString `json:"title"`
	Description  utils.LocalizedString `json:"description"`
	AltText      utils.LocalizedString `json:"alt_text"`
	SortOrder    int                   `gorm:"not null;default:0" json:"sort_order"` // Default order shared across usages.
	CreatedAt    time.Time             `json:"created_at"`
	UpdatedAt    time.Time             `json:"updated_at"`
}
