package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type GuestProfile struct {
	GuestID     uuid.UUID `gorm:"type:uuid;primaryKey;uniqueIndex:idx_guest_hotel,priority:1"`
	HotelID     uuid.UUID `gorm:"type:uuid;not null;index;uniqueIndex:idx_guest_hotel,priority:2"`
	Name        string
	TCNo        string `gorm:"column:national_id"`
	Phone       string
	Address     string
	Nationality string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
}
type BookingGuest struct {
	BookingID    uuid.UUID `gorm:"type:uuid;primaryKey"`
	GuestID      uuid.UUID `gorm:"type:uuid;primaryKey"`
	HotelID      uuid.UUID `gorm:"type:uuid;not null;index"`
	Name         string
	TCNo         string `gorm:"column:national_id"`
	Phone        string
	Relationship string
	Nationality  string
	JoinedAt     time.Time
	LeftAt       *time.Time
}
