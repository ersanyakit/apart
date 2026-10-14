package models

import (
	"time"

	"github.com/google/uuid"
)

type Booking struct {
	CancellationReason string
	CancelledAt        *time.Time
	GuestName          string
	GuestCount         int
	DailyPriceMinor    int64       `gorm:"not null;default:0" json:"daily_price_minor"`
	DepositMinor       int64       `gorm:"not null;default:0" json:"deposit_minor"`
	DepositChannel     string      `gorm:"not null;default:''" json:"deposit_channel"`
	GuestDetails       []RoomGuest `gorm:"serializer:json;type:jsonb"`
	Notes              string
	ActualCheckIn      *time.Time
	ActualCheckOut     *time.Time
	Allocations        []BookingAllocation `gorm:"foreignKey:BookingID;references:BookingID;constraint:OnDelete:RESTRICT"`

	BookingID uuid.UUID `gorm:"type:uuid;primaryKey" json:"booking_id"`

	BranchID uuid.UUID `gorm:"type:uuid;not null;index" json:"branch_id"`
	UserID   uuid.UUID `gorm:"type:uuid;index" json:"user_id"`
	RoomID   uuid.UUID `gorm:"type:uuid;not null;index" json:"room_id"`

	Guests []Person `gorm:"many2many:guests;" json:"guests,omitempty"`

	CheckIn  time.Time `json:"check_in"`
	CheckOut time.Time `json:"check_out"`

	Status string `json:"status"` // pending, confirmed, cancelled, completed

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type BookingAllocation struct {
	AllocationID uuid.UUID `gorm:"type:uuid;primaryKey"`
	BookingID    uuid.UUID `gorm:"type:uuid;not null;index"`
	BranchID     uuid.UUID `gorm:"type:uuid;not null;index"`
	RoomID       uuid.UUID `gorm:"type:uuid;not null;index"`
	Start        time.Time `gorm:"not null;index"`
	End          time.Time `gorm:"not null"`
	Room         Room      `gorm:"belongsTo:Room;foreignKey:RoomID,BranchID;references:RoomID,BranchID;constraint:OnDelete:RESTRICT"`
}
