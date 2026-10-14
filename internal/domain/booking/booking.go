package booking

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/property"
	"strings"
	"time"
)

const (
	Confirmed = "confirmed"
	CheckedIn = "checked_in"
	Completed = "completed"
	Cancelled = "cancelled"
)

type Allocation struct {
	AllocationID uuid.UUID `json:"allocation_id"`
	BookingID    uuid.UUID `json:"booking_id"`
	BranchID     uuid.UUID `json:"branch_id"`
	RoomID       uuid.UUID `json:"room_id"`
	Start        time.Time `json:"start"`
	End          time.Time `json:"end"`
}
type Booking struct {
	CancellationReason string           `json:"cancellation_reason"`
	CancelledAt        *time.Time       `json:"cancelled_at"`
	CreatedByName      string           `json:"created_by_name"`
	CheckedOutByName   string           `json:"checked_out_by_name"`
	CheckedOutByID     *uuid.UUID       `json:"checked_out_by_id,omitempty"`
	BookingID          uuid.UUID        `json:"booking_id"`
	BranchID           uuid.UUID        `json:"branch_id"`
	RoomID             uuid.UUID        `json:"room_id"`
	UserID             uuid.UUID        `json:"user_id"`
	GuestName          string           `json:"guest_name"`
	GuestCount         int              `json:"guest_count"`
	DailyPriceMinor    int64            `json:"daily_price_minor"`
	DepositMinor       int64            `json:"deposit_minor"`
	DepositChannel     string           `json:"deposit_channel"`
	Guests             []property.Guest `json:"guests"`
	Notes              string           `json:"notes"`
	CheckIn            time.Time        `json:"check_in"`
	CheckOut           time.Time        `json:"check_out"`
	ActualCheckIn      *time.Time       `json:"actual_check_in"`
	ActualCheckOut     *time.Time       `json:"actual_check_out"`
	Status             string           `json:"status"`
	Allocations        []Allocation     `json:"allocations"`
	CreatedAt          time.Time        `json:"created_at"`
	UpdatedAt          time.Time        `json:"updated_at"`
}

func (b Booking) Validate() error {
	if b.BranchID == uuid.Nil || b.RoomID == uuid.Nil {
		return constants.ErrRoomRequired
	}
	if strings.TrimSpace(b.GuestName) == "" || len(b.GuestName) > 200 {
		return constants.ErrGuestRequired
	}
	if b.GuestCount < 1 || b.GuestCount > 100000 || len(b.Guests) > b.GuestCount {
		return constants.ErrCapacity
	}
	if b.DailyPriceMinor < 0 || b.DailyPriceMinor > 999999999999 {
		return constants.ErrPayload
	}
	if b.DepositMinor < 0 || b.DepositMinor > 999999999999 || len(strings.TrimSpace(b.DepositChannel)) > 64 {
		return constants.ErrPayload
	}
	if b.CheckIn.IsZero() || !b.CheckOut.After(b.CheckIn) {
		return constants.ErrDates
	}
	if len(b.Notes) > 16000 {
		return constants.ErrPayload
	}
	for _, g := range b.Guests {
		if g.Gender != "" && g.Gender != "female" && g.Gender != "male" && g.Gender != "unspecified" {
			return constants.ErrPayload
		}
		if strings.TrimSpace(g.Name) == "" || len(g.Name) > 200 || len(g.TCNo) > 64 || len(g.Phone) > 64 || len(g.Relationship) > 100 || len(strings.TrimSpace(g.Nationality)) > 2 || len(g.Address) > 2000 {
			return constants.ErrGuestRequired
		}
	}
	return nil
}
func Overlaps(a, b, c, d time.Time) bool { return a.Before(d) && c.Before(b) }

type Query struct {
	BookingID uuid.UUID  `json:"booking_id"`
	BranchID  uuid.UUID  `json:"branch_id"`
	From      *time.Time `json:"from"`
	To        *time.Time `json:"to"`
	Status    string     `json:"status"`
}
type Transition struct {
	Reason         string     `json:"reason"`
	FolioToken     string     `json:"folio_token"`
	AcceptBalance  bool       `json:"accept_balance"`
	BookingID      uuid.UUID  `json:"booking_id"`
	BranchID       uuid.UUID  `json:"branch_id"`
	Action         string     `json:"action"`
	TargetID       uuid.UUID  `json:"target_id"`
	OtherBookingID uuid.UUID  `json:"other_booking_id"`
	EffectiveAt    *time.Time `json:"effective_at"`
}
type Availability struct {
	BranchID         uuid.UUID `json:"branch_id"`
	CheckIn          time.Time `json:"check_in"`
	CheckOut         time.Time `json:"check_out"`
	GuestCount       int       `json:"guest_count"`
	ExcludeBookingID uuid.UUID `json:"exclude_booking_id"`
}
type Repository interface {
	ListBookings(context.Context, Query) ([]Booking, error)
	SaveBooking(context.Context, Booking, bool) (Booking, error)
	TransitionBooking(context.Context, Transition) (Booking, error)
	AvailableRooms(context.Context, Availability) ([]property.Room, error)
}

// ValidateAvailability is shared by listing, reservation writes and movements.
func ValidateAvailability(rooms []property.Room, branchID, roomID uuid.UUID, count int, blocked map[uuid.UUID]bool, checkIn bool) error {
	var target *property.Room
	for i := range rooms {
		if rooms[i].RoomID == roomID {
			target = &rooms[i]
			break
		}
	}
	if target == nil || target.BranchID != branchID {
		return constants.ErrNotFound
	}
	if target.Inactive || !target.Rentable {
		return constants.ErrUnavailable
	}
	limit := property.GuestLimit(rooms, roomID)
	if count < 1 || count > 100000 || (limit > 0 && count > limit) {
		return constants.ErrCapacity
	}
	related := property.Related(rooms, roomID)
	for _, r := range rooms {
		if !related[r.RoomID] {
			continue
		}
		if checkIn && r.Status == "Kirli" {
			return &constants.Error{
				Code:    constants.ErrRoomDirty.Code,
				Message: fmt.Sprintf("%s birimi kirli olduğu için giriş yapılamaz. Önce oda durumunu Temiz olarak güncelleyin.", r.Code),
				Kind:    constants.Conflict,
			}
		}
		if blocked[r.RoomID] || r.Status == "Arizali" || r.Status == "Tadilat" {
			return constants.ErrUnavailable
		}
	}
	return nil
}
