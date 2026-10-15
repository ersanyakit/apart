package constants

import (
	"encoding/json"
	"testing"
)

func TestOperationalRoomRules(t *testing.T) {
	for _, tc := range []struct {
		status                                 RoomStatus
		reserve, checkin, reason, housekeeping bool
	}{
		{RoomVacant, false, false, false, false}, {RoomClean, false, false, false, true},
		{RoomDirty, false, true, false, true}, {RoomOutOfOrder, true, true, true, false}, {RoomMaintenance, true, true, true, false},
	} {
		if !tc.status.Valid() || tc.status.BlocksReservation() != tc.reserve || tc.status.BlocksCheckIn() != tc.checkin || tc.status.RequiresReason() != tc.reason || tc.status.IsHousekeeping() != tc.housekeeping {
			t.Errorf("wrong rules for %s", tc.status)
		}
		data, _ := json.Marshal(tc.status)
		var roundTrip RoomStatus
		if err := json.Unmarshal(data, &roundTrip); err != nil || roundTrip != tc.status {
			t.Fatalf("wire compatibility %s", data)
		}
	}
	for _, value := range []RoomStatus{"", "Dolu", "Rezervli", "unknown"} {
		if value.Valid() || !value.BlocksReservation() || !value.BlocksCheckIn() {
			t.Errorf("unsafe unknown/occupancy state: %q", value)
		}
	}
}
