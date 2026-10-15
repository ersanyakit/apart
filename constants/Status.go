package constants

// Wire values are stable: changing them requires a data/API migration.
// Occupancy and reservations must never be written to RoomStatus.
type RoomStatus string

const (
	RoomVacant      RoomStatus = "Bos"
	RoomClean       RoomStatus = "Temiz"
	RoomDirty       RoomStatus = "Kirli"
	RoomOutOfOrder  RoomStatus = "Arizali"
	RoomMaintenance RoomStatus = "Tadilat"
)

type RoomStatusDefinition struct {
	Key               string     `json:"key"`
	Value             RoomStatus `json:"value"`
	Label             string     `json:"label"`
	Semantic          string     `json:"semantic"`
	BlocksReservation bool       `json:"blocksReservation"`
	BlocksCheckIn     bool       `json:"blocksCheckIn"`
	RequiresReason    bool       `json:"requiresReason"`
	Housekeeping      bool       `json:"housekeeping"`
}

func RoomStatusDefinitions() []RoomStatusDefinition {
	return []RoomStatusDefinition{
		{"Vacant", RoomVacant, "Boş", "available", false, false, false, false},
		{"Clean", RoomClean, "Temiz", "clean", false, false, false, true},
		{"Dirty", RoomDirty, "Kirli", "dirty", false, true, false, true},
		{"OutOfOrder", RoomOutOfOrder, "Arızalı", "fault", true, true, true, false},
		{"Maintenance", RoomMaintenance, "Tadilatta", "maintenance", true, true, true, false},
	}
}
func (s RoomStatus) Definition() (RoomStatusDefinition, bool) {
	for _, d := range RoomStatusDefinitions() {
		if d.Value == s {
			return d, true
		}
	}
	return RoomStatusDefinition{}, false
}
func (s RoomStatus) Valid() bool { _, ok := s.Definition(); return ok }
func (s RoomStatus) BlocksReservation() bool {
	d, ok := s.Definition()
	return !ok || d.BlocksReservation
}
func (s RoomStatus) BlocksCheckIn() bool  { d, ok := s.Definition(); return !ok || d.BlocksCheckIn }
func (s RoomStatus) RequiresReason() bool { d, _ := s.Definition(); return d.RequiresReason }
func (s RoomStatus) IsHousekeeping() bool { d, _ := s.Definition(); return d.Housekeeping }
func ReservationBlockingRoomStatuses() []RoomStatus {
	out := []RoomStatus{}
	for _, d := range RoomStatusDefinitions() {
		if d.BlocksReservation {
			out = append(out, d.Value)
		}
	}
	return out
}

type BookingStatus string

const (
	BookingConfirmed BookingStatus = "confirmed"
	BookingCheckedIn BookingStatus = "checked_in"
	BookingCompleted BookingStatus = "completed"
	BookingCancelled BookingStatus = "cancelled"
)

type BookingStatusDefinition struct {
	Key      string        `json:"key"`
	Value    BookingStatus `json:"value"`
	Label    string        `json:"label"`
	Semantic string        `json:"semantic"`
}

func BookingStatusDefinitions() []BookingStatusDefinition {
	return []BookingStatusDefinition{
		{"Confirmed", BookingConfirmed, "Rezervasyon", "reserved"},
		{"CheckedIn", BookingCheckedIn, "Konaklıyor", "occupied"},
		{"Completed", BookingCompleted, "Çıkış yapıldı", "completed"},
		{"Cancelled", BookingCancelled, "İptal edildi", "cancelled"},
	}
}
func (s BookingStatus) Valid() bool {
	for _, d := range BookingStatusDefinitions() {
		if d.Value == s {
			return true
		}
	}
	return false
}
