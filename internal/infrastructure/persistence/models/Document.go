package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/internal/domain/document"
	"otel/utils"
	"time"
)

type DocumentTemplate struct {
	TemplateID uuid.UUID `gorm:"type:uuid;primaryKey"`
	HotelID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_hotel_template,priority:1"`
	Kind       string    `gorm:"not null;uniqueIndex:idx_hotel_template,priority:2"`
	Title      utils.LocalizedString
	Body       utils.LocalizedString
	CreatedAt  time.Time
	UpdatedAt  time.Time
	DeletedAt  gorm.DeletedAt `gorm:"index"`
}
type Document struct {
	DocumentID uuid.UUID         `gorm:"type:uuid;primaryKey"`
	HotelID    uuid.UUID         `gorm:"type:uuid;not null;index"`
	BranchID   uuid.UUID         `gorm:"type:uuid;not null;index"`
	BookingID  uuid.UUID         `gorm:"type:uuid;not null;index"`
	TemplateID uuid.UUID         `gorm:"type:uuid;not null"`
	Snapshot   document.Document `gorm:"serializer:json;type:jsonb;not null"`
	CreatedAt  time.Time
	DeletedAt  gorm.DeletedAt `gorm:"index"`
}
