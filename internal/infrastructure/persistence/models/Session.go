package models

import (
	"github.com/google/uuid"
	"time"
)

// Session makes JWT logout and revocation effective before token expiration.
type Session struct {
	ID        string    `gorm:"primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index"`
	ExpiresAt time.Time `gorm:"index"`
	CreatedAt time.Time
}
