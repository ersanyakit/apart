package guest

import (
	"context"
	"github.com/google/uuid"
	"otel/internal/domain/booking"
	"otel/internal/domain/property"
	"time"
)

type Query struct {
	HotelID  uuid.UUID  `json:"hotel_id"`
	BranchID uuid.UUID  `json:"branch_id"`
	GuestID  uuid.UUID  `json:"guest_id"`
	Search   string     `json:"search"`
	From     *time.Time `json:"from"`
	To       *time.Time `json:"to"`
	Status   string     `json:"status"`
	Sort     string     `json:"sort"`
	Desc     bool       `json:"desc"`
	Page     int        `json:"page"`
	Format   string     `json:"format"`
}
type Companion struct {
	GuestID uuid.UUID `json:"guest_id"`
	Name    string    `json:"name"`
}
type Stay struct {
	GuestID     uuid.UUID   `json:"guest_id"`
	Name        string      `json:"name"`
	TCNo        string      `json:"tc_no"`
	Phone       string      `json:"phone"`
	Nationality string      `json:"nationality"`
	BookingID   uuid.UUID   `json:"booking_id"`
	BranchID    uuid.UUID   `json:"branch_id"`
	BranchName  string      `json:"branch_name"`
	RoomID      uuid.UUID   `json:"room_id"`
	RoomCode    string      `json:"room_code"`
	Start       time.Time   `json:"start"`
	End         time.Time   `json:"end"`
	Status      string      `json:"status"`
	Companions  []Companion `json:"companions"`
}
type Page struct {
	Items []Stay `json:"items"`
	Total int64  `json:"total"`
	Page  int    `json:"page"`
}
type Profile struct {
	GuestID     uuid.UUID `json:"guest_id"`
	Name        string    `json:"name"`
	NationalID  string    `json:"national_id"`
	Phone       string    `json:"phone"`
	Address     string    `json:"address"`
	Nationality string    `json:"nationality"`
}
type SearchPage struct {
	Items []Profile `json:"items"`
	Total int64     `json:"total"`
	Page  int       `json:"page"`
}
type Update struct {
	BranchID   uuid.UUID        `json:"branch_id"`
	BookingID  uuid.UUID        `json:"booking_id"`
	Guests     []property.Guest `json:"guests"`
	GuestCount int              `json:"guest_count"`
}
type Repository interface {
	SearchGuests(context.Context, Query) (SearchPage, error)
	GuestStays(context.Context, Query, bool) (Page, error)
	UpdateBookingGuests(context.Context, Update) (booking.Booking, error)
}
