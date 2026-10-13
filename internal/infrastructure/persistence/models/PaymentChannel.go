package models

import (
	"github.com/google/uuid"
	"otel/internal/domain/shared"
	"time"
)

type PaymentChannel struct {
	ChannelID uuid.UUID              `gorm:"type:uuid;primaryKey"`
	HotelID   uuid.UUID              `gorm:"type:uuid;not null;index;uniqueIndex:idx_channel_hotel_code,priority:1"`
	Code      string                 `gorm:"not null;uniqueIndex:idx_channel_hotel_code,priority:2"`
	Labels    shared.LocalizedString `gorm:"serializer:json;type:jsonb;not null"`
	Active    bool                   `gorm:"not null;default:true"`
	SortOrder int                    `gorm:"not null;default:0"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
