package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/audit"
	"otel/internal/domain/booking"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence/models"
	"strings"
	"time"
)

var _ booking.Repository = (*Repository)(nil)

func fromBooking(v models.Booking) booking.Booking {
	b := booking.Booking{CancellationReason: v.CancellationReason, CancelledAt: v.CancelledAt, BookingID: v.BookingID, BranchID: v.BranchID, RoomID: v.RoomID, UserID: v.UserID, GuestName: v.GuestName, GuestCount: v.GuestCount, DailyPriceMinor: v.DailyPriceMinor, DepositMinor: v.DepositMinor, DepositChannel: v.DepositChannel, Notes: v.Notes, CheckIn: v.CheckIn, CheckOut: v.CheckOut, ActualCheckIn: v.ActualCheckIn, ActualCheckOut: v.ActualCheckOut, Status: v.Status, CreatedAt: v.CreatedAt, UpdatedAt: v.UpdatedAt, Guests: []property.Guest{}, Allocations: []booking.Allocation{}}
	for _, g := range v.GuestDetails {
		b.Guests = append(b.Guests, property.Guest(g))
	}
	for _, a := range v.Allocations {
		b.Allocations = append(b.Allocations, booking.Allocation{AllocationID: a.AllocationID, BookingID: a.BookingID, BranchID: a.BranchID, RoomID: a.RoomID, Start: a.Start, End: a.End})
	}
	return b
}
func toBooking(b booking.Booking) models.Booking {
	v := models.Booking{CancellationReason: b.CancellationReason, CancelledAt: b.CancelledAt, BookingID: b.BookingID, BranchID: b.BranchID, RoomID: b.RoomID, UserID: b.UserID, GuestName: b.GuestName, GuestCount: b.GuestCount, DailyPriceMinor: b.DailyPriceMinor, DepositMinor: b.DepositMinor, DepositChannel: b.DepositChannel, Notes: b.Notes, CheckIn: b.CheckIn, CheckOut: b.CheckOut, ActualCheckIn: b.ActualCheckIn, ActualCheckOut: b.ActualCheckOut, Status: b.Status, CreatedAt: b.CreatedAt, UpdatedAt: b.UpdatedAt}
	for _, g := range b.Guests {
		v.GuestDetails = append(v.GuestDetails, models.RoomGuest(g))
	}
	return v
}
func (r *Repository) ListBookings(ctx context.Context, q booking.Query) ([]booking.Booking, error) {
	db := r.db.WithContext(ctx).Where("branch_id = ?", q.BranchID).Preload("Allocations", func(tx *gorm.DB) *gorm.DB { return tx.Order("start") }).Order("created_at DESC NULLS LAST, booking_id DESC")
	if q.BookingID != uuid.Nil {
		db = db.Where("booking_id = ?", q.BookingID)
	}
	if q.From != nil {
		db = db.Where("check_out > ?", *q.From)
	}
	if q.To != nil {
		db = db.Where("check_in < ?", *q.To)
	}
	if q.Status != "" {
		db = db.Where("status = ?", q.Status)
	}
	var rows []models.Booking
	if err := db.Find(&rows).Error; err != nil {
		return nil, translate(err)
	}
	out := []booking.Booking{}
	for _, row := range rows {
		out = append(out, fromBooking(row))
	}
	return out, translate(enrichBookingActors(r.db.WithContext(ctx), out))
}
func inventory(tx *gorm.DB, branchID uuid.UUID) ([]property.Room, error) {
	var rows []models.Room
	if err := tx.Where("branch_id = ?", branchID).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := []property.Room{}
	for _, row := range rows {
		out = append(out, fromRoom(row))
	}
	return out, nil
}
func blockedRooms(tx *gorm.DB, branchID uuid.UUID, start, end time.Time, exclude []uuid.UUID) (map[uuid.UUID]bool, error) {
	q := tx.Table("booking_allocations a").Joins("JOIN bookings b ON b.booking_id = a.booking_id").Where(`a.branch_id = ? AND b.status IN ? AND ((a.start < ? AND a."end" > ?) OR (b.status = ? AND b.check_out <= ? AND b.room_id = a.room_id))`, branchID, []string{booking.Confirmed, booking.CheckedIn}, end, start, booking.CheckedIn, time.Now().UTC())
	if len(exclude) > 0 {
		q = q.Where("b.booking_id NOT IN ?", exclude)
	}
	var ids []uuid.UUID
	if err := q.Distinct("a.room_id").Pluck("a.room_id", &ids).Error; err != nil {
		return nil, err
	}
	out := map[uuid.UUID]bool{}
	for _, id := range ids {
		out[id] = true
	}
	return out, nil
}
func checkAvailable(tx *gorm.DB, rooms []property.Room, branchID, roomID uuid.UUID, start, end time.Time, count int, exclude []uuid.UUID, checkIn bool) error {
	blocked, err := blockedRooms(tx, branchID, start, end, exclude)
	if err != nil {
		return err
	}
	return booking.ValidateAvailability(rooms, branchID, roomID, count, blocked, checkIn)
}
func (r *Repository) AvailableRooms(ctx context.Context, q booking.Availability) ([]property.Room, error) {
	out := []property.Room{}
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBranch(tx, q.BranchID); err != nil {
			return err
		}
		rooms, err := New(tx).ListRooms(ctx, q.BranchID)
		if err != nil {
			return err
		}
		blocked, err := blockedRooms(tx, q.BranchID, q.CheckIn, q.CheckOut, []uuid.UUID{q.ExcludeBookingID})
		if err != nil {
			return err
		}
		for _, room := range rooms {
			err := booking.ValidateAvailability(rooms, q.BranchID, room.RoomID, q.GuestCount, blocked, false)
			if err == constants.ErrUnavailable || err == constants.ErrCapacity {
				continue
			}
			if err != nil {
				return err
			}
			room.EffectiveCapacity = property.EffectiveCapacity(rooms, room.RoomID)
			out = append(out, room)
		}
		return nil
	})
	return out, translate(err)
}
func allocation(b booking.Booking, roomID uuid.UUID, start, end time.Time) models.BookingAllocation {
	return models.BookingAllocation{AllocationID: uuid.New(), BookingID: b.BookingID, BranchID: b.BranchID, RoomID: roomID, Start: start, End: end}
}
func (r *Repository) SaveBooking(ctx context.Context, b booking.Booking, create bool) (booking.Booking, error) {
	var out booking.Booking
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBranch(tx, b.BranchID); err != nil {
			return err
		}
		if !create {
			old, err := loadBooking(tx, b.BranchID, b.BookingID)
			if err != nil {
				return err
			}
			if old.Status == booking.CheckedIn {
				out, err = updateCurrentStay(tx, b, old)
				return err
			}
			if old.Status != booking.Confirmed {
				return constants.ErrBookingState
			}
			b.UserID = old.UserID
			b.CreatedAt = old.CreatedAt
		}
		rooms, err := inventory(tx, b.BranchID)
		if err != nil {
			return err
		}
		if err := checkAvailable(tx, rooms, b.BranchID, b.RoomID, b.CheckIn, b.CheckOut, b.GuestCount, []uuid.UUID{b.BookingID}, false); err != nil {
			return err
		}
		b.Status = booking.Confirmed
		b.ActualCheckIn = nil
		b.ActualCheckOut = nil
		b.CancellationReason = ""
		b.CancelledAt = nil
		row := toBooking(b)
		if create {
			err = tx.Omit("Guests", "Allocations").Create(&row).Error
		} else {
			err = tx.Omit("Guests", "Allocations").Save(&row).Error
		}
		if err != nil {
			return err
		}
		if err := tx.Delete(&models.BookingAllocation{}, "booking_id = ?", b.BookingID).Error; err != nil {
			return err
		}
		a := allocation(b, b.RoomID, b.CheckIn, b.CheckOut)
		if err := tx.Omit("Room").Create(&a).Error; err != nil {
			return err
		}
		if err := syncGuests(tx, &b); err != nil {
			return err
		}
		row.GuestDetails = toBooking(b).GuestDetails
		row.Allocations = []models.BookingAllocation{a}
		out, err = loadBooking(tx, b.BranchID, b.BookingID)
		return err
	})
	return out, translate(err)
}

// Amend planned dates without replacing actual arrival or the room-move history.
// The caller holds the branch lock and transaction used by every booking write.
func updateCurrentStay(tx *gorm.DB, b, old booking.Booking) (booking.Booking, error) {
	now := time.Now().UTC()
	if old.ActualCheckIn == nil || b.RoomID != old.RoomID || !b.CheckOut.After(now) {
		return b, constants.ErrBookingState
	}
	rooms, err := inventory(tx, b.BranchID)
	if err != nil {
		return b, err
	}
	if err := checkAvailable(tx, rooms, b.BranchID, b.RoomID, now, b.CheckOut, b.GuestCount, []uuid.UUID{b.BookingID}, false); err != nil {
		return b, err
	}
	result := tx.Model(&models.BookingAllocation{}).
		Where("booking_id = ? AND room_id = ? AND \"end\" = ?", old.BookingID, old.RoomID, old.CheckOut).
		Update("end", b.CheckOut)
	if result.Error != nil {
		return b, result.Error
	}
	if result.RowsAffected != 1 {
		return b, constants.ErrBookingState
	}
	b.Status, b.ActualCheckIn, b.ActualCheckOut = old.Status, old.ActualCheckIn, old.ActualCheckOut
	b.CancellationReason, b.CancelledAt = old.CancellationReason, old.CancelledAt
	b.UserID, b.CreatedAt = old.UserID, old.CreatedAt
	if err := persistBooking(tx, b); err != nil {
		return b, err
	}
	if err := syncGuests(tx, &b); err != nil {
		return b, err
	}
	return loadBooking(tx, b.BranchID, b.BookingID)
}
func loadBooking(tx *gorm.DB, branch, id uuid.UUID) (booking.Booking, error) {
	var row models.Booking
	err := tx.Preload("Allocations", func(tx *gorm.DB) *gorm.DB { return tx.Order("start") }).First(&row, "booking_id = ? AND branch_id = ?", id, branch).Error
	if err != nil {
		return booking.Booking{}, err
	}
	items := []booking.Booking{fromBooking(row)}
	err = enrichBookingActors(tx, items)
	return items[0], err
}
func persistBooking(tx *gorm.DB, b booking.Booking) error {
	row := toBooking(b)
	return tx.Omit("Guests", "Allocations").Save(&row).Error
}
func moveBooking(tx *gorm.DB, b *booking.Booking, target uuid.UUID, at time.Time) error {
	if b.Status != booking.Confirmed && b.Status != booking.CheckedIn {
		return constants.ErrBookingState
	}
	start := b.CheckIn
	if b.ActualCheckIn != nil && b.ActualCheckIn.Before(start) {
		start = *b.ActualCheckIn
	}
	if at.Before(start) || !at.Before(b.CheckOut) || target == b.RoomID {
		return constants.ErrBookingState
	}
	// Keep completed segments and truncate the current one, retaining movement history.
	var current *booking.Allocation
	for i := range b.Allocations {
		a := &b.Allocations[i]
		if !at.Before(a.Start) && at.Before(a.End) {
			current = a
		}
	}
	if current == nil || current.RoomID != b.RoomID {
		return constants.ErrBookingState
	}
	if at.Equal(current.Start) {
		if err := tx.Delete(&models.BookingAllocation{}, "allocation_id = ?", current.AllocationID).Error; err != nil {
			return err
		}
	} else {
		if err := tx.Model(&models.BookingAllocation{}).Where("allocation_id = ?", current.AllocationID).Update("end", at).Error; err != nil {
			return err
		}
	}
	a := allocation(*b, target, at, b.CheckOut)
	if err := tx.Omit("Room").Create(&a).Error; err != nil {
		return err
	}
	if b.Status == booking.CheckedIn {
		if err := markDirty(tx, b.BranchID, b.RoomID); err != nil {
			return err
		}
	}
	b.RoomID = target
	return persistBooking(tx, *b)
}
func markDirty(tx *gorm.DB, branchID, roomID uuid.UUID) error {
	rooms, err := inventory(tx, branchID)
	if err != nil {
		return err
	}
	ids := []uuid.UUID{}
	// Checkout and housekeeping act on the same unit subtree.
	for id := range property.Descendants(rooms, roomID) {
		ids = append(ids, id)
	}
	return tx.Model(&models.Room{}).Where("room_id IN ?", ids).Update("status", "Kirli").Error
}
func (r *Repository) TransitionBooking(ctx context.Context, input booking.Transition) (booking.Booking, error) {
	ctx = audit.WithAction(ctx, "bookings", input.Action)
	var out booking.Booking
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBranch(tx, input.BranchID); err != nil {
			return err
		}
		b, err := loadBooking(tx, input.BranchID, input.BookingID)
		if err != nil {
			return err
		}
		now := time.Now().UTC()
		rooms, err := inventory(tx, input.BranchID)
		if err != nil {
			return err
		}
		switch input.Action {
		case "cancel":
			if b.Status != booking.Confirmed {
				return constants.ErrBookingState
			}
			if len(strings.TrimSpace(input.Reason)) < 10 || len(input.Reason) > 2000 {
				return constants.ErrReasonRequired
			}
			b.CancellationReason = strings.TrimSpace(input.Reason)
			b.CancelledAt = &now
			b.Status = booking.Cancelled
		case "check_in":
			if b.Status != booking.Confirmed {
				return constants.ErrBookingState
			}
			if !now.Before(b.CheckOut) {
				return constants.ErrCheckInExpired
			}
			if err := checkAvailable(tx, rooms, b.BranchID, b.RoomID, now, b.CheckOut, b.GuestCount, []uuid.UUID{b.BookingID}, true); err != nil {
				return err
			}
			if now.Before(b.CheckIn) {
				// Preserve the planned dates; reserve the room from the actual arrival
				// so cards, availability and later moves include the early stay.
				result := tx.Model(&models.BookingAllocation{}).
					Where("booking_id = ? AND room_id = ? AND start = ?", b.BookingID, b.RoomID, b.CheckIn).
					Update("start", now)
				if result.Error != nil {
					return result.Error
				}
				if result.RowsAffected != 1 {
					return constants.ErrBookingState
				}
			}
			b.Status = booking.CheckedIn
			b.ActualCheckIn = &now
		case "check_out":
			if b.Status != booking.CheckedIn || b.ActualCheckIn == nil || !now.After(*b.ActualCheckIn) {
				return constants.ErrBookingState
			}
			if input.FolioToken != "" {
				folio, e := loadFolio(tx, input.BranchID, input.BookingID)
				if e != nil {
					return e
				}
				if folio.Token != input.FolioToken {
					return constants.ErrFolioChanged
				}
				if folio.NeedsAcknowledgement && !input.AcceptBalance {
					return constants.ErrBalanceAcknowledgement
				}
			}
			b.Status = booking.Completed
			b.ActualCheckOut = &now
			if err := tx.Model(&models.BookingAllocation{}).Where("booking_id = ? AND start < ? AND \"end\" > ?", b.BookingID, now, now).Update("end", now).Error; err != nil {
				return err
			}
			if err := tx.Delete(&models.BookingAllocation{}, "booking_id = ? AND start >= ?", b.BookingID, now).Error; err != nil {
				return err
			}
			if err := markDirty(tx, b.BranchID, b.RoomID); err != nil {
				return err
			}
		case "move", "swap":
			at := b.CheckIn
			if b.Status == booking.CheckedIn {
				at = now
			}
			if input.EffectiveAt != nil {
				at = *input.EffectiveAt
			}
			// A checked-in guest moves now, never into a fabricated past/future segment.
			if b.Status == booking.CheckedIn && input.EffectiveAt != nil {
				return constants.ErrBookingState
			}
			if b.Status == booking.Confirmed && !at.Equal(b.CheckIn) {
				return constants.ErrBookingState
			}
			exclude := []uuid.UUID{b.BookingID}
			var other booking.Booking
			if input.Action == "swap" {
				other, err = loadBooking(tx, input.BranchID, input.OtherBookingID)
				if err != nil {
					return err
				}
				if other.BookingID == b.BookingID || other.Status != b.Status {
					return constants.ErrBookingState
				}
				if b.Status == booking.Confirmed && !other.CheckIn.Equal(b.CheckIn) {
					return constants.ErrBookingState
				}
				input.TargetID = other.RoomID
				exclude = append(exclude, other.BookingID)
				if property.Related(rooms, b.RoomID)[other.RoomID] {
					return constants.ErrUnavailable
				}
				if err := checkAvailable(tx, rooms, b.BranchID, b.RoomID, at, other.CheckOut, other.GuestCount, exclude, b.Status == booking.CheckedIn); err != nil {
					return err
				}
			}
			if err := checkAvailable(tx, rooms, b.BranchID, input.TargetID, at, b.CheckOut, b.GuestCount, exclude, b.Status == booking.CheckedIn); err != nil {
				return err
			}
			source := b.RoomID
			if err := moveBooking(tx, &b, input.TargetID, at); err != nil {
				return err
			}
			if input.Action == "swap" {
				if err := moveBooking(tx, &other, source, at); err != nil {
					return err
				}
			}
		default:
			return constants.ErrBookingState
		}
		// moveBooking already persisted each moved booking; do not log it twice.
		if input.Action != "move" && input.Action != "swap" {
			if err := persistBooking(tx, b); err != nil {
				return err
			}
		}
		out, err = loadBooking(tx, b.BranchID, b.BookingID)
		return err
	})
	return out, translate(err)
}

// Resolve actors in one batch, including soft-deleted staff. Checkout attribution
// comes from the immutable checkout event, never from the last booking editor.
func enrichBookingActors(tx *gorm.DB, items []booking.Booking) error {
	if len(items) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, len(items))
	for i := range items {
		ids[i] = items[i].BookingID
	}
	type actorRow struct {
		BookingID        uuid.UUID
		CreatedByName    string
		CheckedOutByName string
		CheckedOutByID   *uuid.UUID
	}
	var rows []actorRow
	err := tx.Raw(`SELECT b.booking_id,
		COALESCE(NULLIF(TRIM(creator.display_name), ''), NULLIF(TRIM(CONCAT_WS(' ', creator.first_name, creator.last_name)), ''), creator.user_name, '') AS created_by_name,
		COALESCE(NULLIF(TRIM(departure.display_name), ''), NULLIF(TRIM(CONCAT_WS(' ', departure.first_name, departure.last_name)), ''), departure.user_name, '') AS checked_out_by_name,
		checkout.actor_id AS checked_out_by_id
		FROM bookings b JOIN branches p ON p.branch_id = b.branch_id
		LEFT JOIN users creator ON creator.user_id = b.user_id
		LEFT JOIN (
			SELECT DISTINCT ON (entity_id, hotel_id) entity_id, hotel_id, actor_id
			FROM audit_logs WHERE entity = 'bookings' AND action = 'check_out' AND entity_id IN ?
			ORDER BY entity_id, hotel_id, created_at DESC, id DESC
		) checkout ON checkout.entity_id = b.booking_id AND checkout.hotel_id = p.hotel_id AND b.status = 'completed'
		LEFT JOIN users departure ON departure.user_id = checkout.actor_id
		WHERE b.booking_id IN ?`, ids, ids).Scan(&rows).Error
	if err != nil {
		return err
	}
	actors := make(map[uuid.UUID]actorRow, len(rows))
	for _, row := range rows {
		actors[row.BookingID] = row
	}
	for i := range items {
		a := actors[items[i].BookingID]
		items[i].CreatedByName, items[i].CheckedOutByName, items[i].CheckedOutByID = a.CreatedByName, a.CheckedOutByName, a.CheckedOutByID
	}
	return nil
}
