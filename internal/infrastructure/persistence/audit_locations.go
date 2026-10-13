package persistence

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

type auditLocation struct {
	RoomID     uuid.UUID `json:"room_id"`
	Code       string    `json:"code"`
	Kind       string    `json:"kind"`
	BranchName string    `json:"branch_name"`
	Source     string    `json:"source"`
}

// Capture human-readable room identity at write time. Legacy entries get a
// clearly marked current-record fallback, scoped to the requested hotel.
func enrichAuditLocations(db *gorm.DB, hotelID uuid.UUID, entries []models.AuditLog, capture bool) error {
	type reference struct {
		index  int
		key    string
		roomID uuid.UUID
		data   map[string]any
	}
	var refs []reference
	var bookingIDs []uuid.UUID
	legacyBookings := map[uuid.UUID][]int{}
	for i, entry := range entries {
		if entry.Entity != "rooms" && entry.Entity != "bookings" && entry.Entity != "beds" {
			continue
		}
		found := false
		for _, side := range []string{"before", "after"} {
			data, ok := entry.Details[side].(map[string]any)
			if !ok {
				continue
			}
			id := auditUUID(data["room_id"])
			if entry.Entity == "rooms" {
				id = entry.EntityID
			}
			if id == uuid.Nil {
				continue
			}
			found = true
			if entry.Details[side+"_location"] == nil {
				refs = append(refs, reference{i, side + "_location", id, data})
			}
		}
		if found || entry.Details["location"] != nil {
			continue
		}
		if entry.Entity == "rooms" {
			refs = append(refs, reference{i, "location", entry.EntityID, nil})
		}
		if entry.Entity == "bookings" {
			bookingIDs = append(bookingIDs, entry.EntityID)
			legacyBookings[entry.EntityID] = append(legacyBookings[entry.EntityID], i)
		}
	}
	if len(bookingIDs) > 0 {
		var bookings []struct {
			BookingID uuid.UUID
			RoomID    uuid.UUID
		}
		if err := db.Table("bookings AS b").Select("b.booking_id, b.room_id").Joins("JOIN branches br ON br.branch_id = b.branch_id").Where("br.hotel_id = ? AND b.booking_id IN ?", hotelID, bookingIDs).Scan(&bookings).Error; err != nil {
			return err
		}
		for _, b := range bookings {
			for _, i := range legacyBookings[b.BookingID] {
				refs = append(refs, reference{i, "location", b.RoomID, nil})
			}
		}
	}
	if len(refs) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, 0, len(refs))
	for _, ref := range refs {
		ids = append(ids, ref.roomID)
	}
	var locations []auditLocation
	// Table queries deliberately include soft-deleted rooms and branches.
	if err := db.Table("rooms AS r").Select("r.room_id, r.code, r.kind, br.name AS branch_name").Joins("JOIN branches br ON br.branch_id = r.branch_id").Where("br.hotel_id = ? AND r.room_id IN ?", hotelID, ids).Scan(&locations).Error; err != nil {
		return err
	}
	byID := map[uuid.UUID]auditLocation{}
	for _, location := range locations {
		byID[location.RoomID] = location
	}
	for _, ref := range refs {
		location, ok := byID[ref.roomID]
		if !ok {
			continue
		}
		location.Source = "current_record"
		if capture {
			location.Source = "event"
		}
		// A rename must retain both the old and the new code in its own event.
		if entries[ref.index].Entity == "rooms" {
			if code, ok := ref.data["code"].(string); ok {
				location.Code = code
			}
			if kind, ok := ref.data["kind"].(string); ok {
				location.Kind = kind
			}
		}
		if entries[ref.index].Details == nil {
			entries[ref.index].Details = map[string]any{}
		}
		entries[ref.index].Details[ref.key] = location
	}
	return nil
}
