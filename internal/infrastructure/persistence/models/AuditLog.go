package models

import (
	"github.com/google/uuid"
	"time"
)

// Append-only; no API exists for changing or deleting an audit entry.
type AuditLog struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	HotelID   uuid.UUID `gorm:"type:uuid;not null;index:idx_audit_hotel_time,priority:1"`
	ActorID   uuid.UUID `gorm:"type:uuid"`
	Command   string
	Action    string
	Entity    string
	EntityID  uuid.UUID `gorm:"type:uuid"`
	RequestID string
	CreatedAt time.Time `gorm:"index:idx_audit_hotel_time,priority:2"`
}
