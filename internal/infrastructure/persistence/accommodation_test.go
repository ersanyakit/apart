package persistence_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/booking"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"otel/internal/domain/shared"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestAccommodation(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	repo := persistence.New(db)
	catalog := &application.Catalog{Staff: repo, Properties: repo, Media: repo, Features: repo, Layout: repo, Bookings: repo}
	service := &application.Accommodation{Catalog: catalog, Layout: repo, Bookings: repo}
	admin := identity.User{UserID: uuid.New(), Role: constants.UserRoleAdmin}
	hotel := models.Hotel{HotelID: uuid.New(), FacilityInfo: models.FacilityInfo{Name: "Test"}}
	if err := db.Create(&hotel).Error; err != nil {
		t.Fatal(err)
	}
	branch := models.Branch{BranchID: uuid.New(), HotelID: hotel.HotelID, FacilityInfo: models.FacilityInfo{Name: "Test"}}
	if err := db.Create(&branch).Error; err != nil {
		t.Fatal(err)
	}
	floor, err := service.SaveFloor(ctx, admin, property.Floor{BranchID: branch.BranchID, Code: "3", Label: shared.LocalizedString{constants.LanguageTR: "3. Kat"}, Width: 2400, Height: 1600}, true)
	if err != nil {
		t.Fatal(err)
	}
	unit := func(code, kind string, parent *uuid.UUID, capacity int) property.Room {
		t.Helper()
		level := 0
		if kind == "bed" {
			level = 1
		}
		r, err := catalog.SaveRoom(ctx, admin, property.Room{BranchID: branch.BranchID, FloorID: &floor.FloorID, ParentID: parent, Code: code, Kind: kind, Capacity: capacity, Rentable: true, Status: "Temiz", BedLevel: level, Position: property.Position{X: 20, Y: 20, Width: 140, Height: 100}}, true)
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	apartment := unit("A", "apartment", nil, 1)
	room := unit("A-1", "room", &apartment.RoomID, 1)
	bed1 := unit("A-1-1", "bed", &room.RoomID, 1)
	bed2 := unit("A-1-2", "bed", &room.RoomID, 1)
	other := unit("B", "room", nil, 4)
	now := time.Now().UTC()
	start := now.Add(-time.Hour)
	end := now.Add(48 * time.Hour)
	reserve := func(roomID uuid.UUID, count int, in, out time.Time) (booking.Booking, error) {
		return service.SaveBooking(ctx, admin, booking.Booking{BranchID: branch.BranchID, RoomID: roomID, GuestName: "Misafir", GuestCount: count, CheckIn: in, CheckOut: out}, true)
	}
	t.Run("cleaning records persist with server attribution and propagate only to cleaned units", func(t *testing.T) {
		parent := unit("CLEAN-RECORD", "room", nil, 2)
		child := unit("CLEAN-RECORD-BED", "bed", &parent.RoomID, 1)
		closed := unit("CLEAN-RECORD-CLOSED", "bed", &parent.RoomID, 1)
		if err := repo.SaveOperationalState(ctx, closed.RoomID, "Arizali", "Bakım devam ediyor."); err != nil {
			t.Fatal(err)
		}
		for _, input := range []*property.CleaningRecord{{Cleaner: " "}, {Cleaner: "Temizlik", Note: strings.Repeat("x", 2001)}} {
			if _, err := catalog.SaveState(ctx, admin, property.Room{RoomID: parent.RoomID, Status: "Temiz", LastCleaning: input}); !errors.Is(err, constants.ErrCleaningInvalid) {
				t.Fatalf("invalid cleaning accepted: %v", err)
			}
		}
		cleanerID := uuid.New()
		if err := repo.SaveStaff(ctx, identity.Staff{UserID: cleanerID, HotelID: hotel.HotelID, Username: "cleaner-record", FirstName: "Ayşe", LastName: "Yılmaz", Role: constants.UserRoleHousekeeping, BranchIDs: []uuid.UUID{branch.BranchID}}, "test-hash", true); err != nil {
			t.Fatal(err)
		}
		people, err := catalog.CleaningStaff(ctx, admin, parent.RoomID)
		if err != nil || len(people) != 1 || people[0].UserID != cleanerID {
			t.Fatalf("cleaners: %+v %v", people, err)
		}
		if _, err := catalog.SaveState(ctx, admin, property.Room{RoomID: parent.RoomID, Status: "Temiz", LastCleaning: &property.CleaningRecord{CleanerID: uuid.New()}}); !errors.Is(err, constants.ErrCleaningInvalid) {
			t.Fatalf("unknown staff accepted: %v", err)
		}
		actor := admin
		actor.DisplayName = "Resepsiyon görevlisi"
		saved, err := catalog.SaveState(ctx, actor, property.Room{RoomID: parent.RoomID, Status: "Temiz", LastCleaning: &property.CleaningRecord{CleanerID: cleanerID, Cleaner: "Spoofed name", Note: "  Çarşaflar değiştirildi.  ", RecordedBy: uuid.New(), CompletedAt: time.Unix(0, 0)}})
		if err != nil {
			t.Fatal(err)
		}
		c := saved.LastCleaning
		if c == nil || c.CleanerID != cleanerID || c.Cleaner != "Ayşe Yılmaz" || c.Note != "Çarşaflar değiştirildi." || c.RecordedBy != actor.UserID || c.RecordedByName != actor.DisplayName || c.CompletedAt.Before(now) {
			t.Fatalf("wrong cleaning metadata: %+v", c)
		}
		got, err := repo.FindRoom(ctx, child.RoomID)
		if err != nil || got.LastCleaning == nil || got.LastCleaning.Cleaner != c.Cleaner {
			t.Fatalf("child record missing: %+v %v", got, err)
		}
		blocked, err := repo.FindRoom(ctx, closed.RoomID)
		if err != nil || blocked.LastCleaning != nil || blocked.Status != "Arizali" {
			t.Fatalf("maintenance unit changed: %+v %v", blocked, err)
		}
		if _, err := catalog.SaveState(ctx, actor, property.Room{RoomID: parent.RoomID, Status: "Kirli"}); err != nil {
			t.Fatal(err)
		}
		dirty, _ := repo.FindRoom(ctx, parent.RoomID)
		if dirty.LastCleaning == nil || dirty.LastCleaning.Cleaner != c.Cleaner {
			t.Fatal("last cleaning lost when marked dirty")
		}
		denied := identity.User{UserID: uuid.New(), HotelID: uuid.New(), Role: constants.UserRoleHousekeeping}
		if _, err := catalog.SaveState(ctx, denied, property.Room{RoomID: parent.RoomID, Status: "Temiz", LastCleaning: c}); !errors.Is(err, constants.ErrForbidden) {
			t.Fatalf("cross-tenant write accepted: %v", err)
		}
	})
	t.Run("whole room cleaning clears nested beds before early check-in", func(t *testing.T) {
		parent := unit("CLEAN-APART", "apartment", nil, 1)
		selected := unit("301-CLEAN", "room", &parent.RoomID, 1)
		child := unit("301-Y67873EA2-1-1", "bed", &selected.RoomID, 1)
		second := unit("301-CLEAN-2", "bed", &selected.RoomID, 1)
		sibling := unit("302-CLEAN", "room", &parent.RoomID, 1)
		setState := func(id uuid.UUID, status constants.RoomStatus) {
			t.Helper()
			if _, err := catalog.SaveState(ctx, admin, property.Room{RoomID: id, Status: status, StatusReason: "Test temizlik ve bakım açıklaması"}); err != nil {
				t.Fatal(err)
			}
		}
		assertState := func(id uuid.UUID, status constants.RoomStatus) {
			t.Helper()
			r, err := repo.FindRoom(ctx, id)
			if err != nil || r.Status != status {
				t.Fatalf("unit %s: want %s, got %s (%v)", id, status, r.Status, err)
			}
		}
		setState(child.RoomID, "Kirli")
		setState(sibling.RoomID, "Kirli")
		planned := now.Add(24 * time.Hour)
		b, err := reserve(selected.RoomID, 2, planned, planned.Add(48*time.Hour))
		if err != nil {
			t.Fatal(err)
		}
		input := booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "check_in"}
		if _, err := service.Transition(ctx, admin, input); !errors.Is(err, constants.ErrRoomDirty) {
			t.Fatalf("dirty child must prevent early check-in: %v", err)
		}
		// Selecting Temiz on an already-clean parent must also clean its dirty bed.
		setState(selected.RoomID, "Temiz")
		assertState(child.RoomID, "Temiz")
		assertState(second.RoomID, "Temiz")
		assertState(parent.RoomID, "Temiz")
		assertState(sibling.RoomID, "Kirli")
		arrived, err := service.Transition(ctx, admin, input)
		if err != nil || arrived.Status != booking.CheckedIn || arrived.ActualCheckIn == nil || !arrived.ActualCheckIn.Before(planned) || !arrived.CheckIn.Equal(planned) {
			t.Fatalf("early check-in after room cleaning: %+v (%v)", arrived, err)
		}
		setState(selected.RoomID, "Kirli")
		assertState(child.RoomID, "Kirli")
		assertState(second.RoomID, "Kirli")
		// A leaf cleaning action must not clean its parent or sibling bed.
		setState(child.RoomID, "Temiz")
		assertState(selected.RoomID, "Kirli")
		assertState(second.RoomID, "Kirli")
	})
	t.Run("whole unit cleaning preserves maintenance closures", func(t *testing.T) {
		parent := unit("MAINT-CLEAN", "apartment", nil, 1)
		child := unit("MAINT-ROOM", "room", &parent.RoomID, 1)
		bed := unit("MAINT-BED", "bed", &child.RoomID, 1)
		for _, status := range []constants.RoomStatus{constants.RoomOutOfOrder, constants.RoomMaintenance} {
			if err := repo.SaveOperationalState(ctx, child.RoomID, status, "Bakım kaydı korunmalıdır."); err != nil {
				t.Fatal(err)
			}
			if err := repo.SaveOperationalState(ctx, bed.RoomID, "Kirli", ""); err != nil {
				t.Fatal(err)
			}
			if err := repo.SaveOperationalState(ctx, parent.RoomID, "Temiz", ""); err != nil {
				t.Fatal(err)
			}
			got, err := repo.FindRoom(ctx, child.RoomID)
			if err != nil || got.Status != status || got.StatusReason != "Bakım kaydı korunmalıdır." {
				t.Fatalf("maintenance closure was cleared: %+v %v", got, err)
			}
			cleaned, err := repo.FindRoom(ctx, bed.RoomID)
			if err != nil || cleaned.Status != "Temiz" {
				t.Fatalf("nested bed was not cleaned: %+v %v", cleaned, err)
			}
		}
	})
	t.Run("capacity and tree validation", func(t *testing.T) {
		rooms, err := repo.ListRooms(ctx, branch.BranchID)
		if err != nil {
			t.Fatal(err)
		}
		if n := property.EffectiveCapacity(rooms, apartment.RoomID); n != 2 {
			t.Fatalf("capacity=%d", n)
		}
		apartment.ParentID = &bed1.RoomID
		if _, err := catalog.SaveRoom(ctx, admin, apartment, false); !errors.Is(err, constants.ErrHierarchy) {
			t.Fatalf("expected hierarchy rejection: %v", err)
		}
		apartment.ParentID = nil
		b, err := reserve(apartment.RoomID, 10, start, end)
		if err != nil {
			t.Fatalf("apartment guest count must be flexible: %v", err)
		}
		if _, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "cancel", Reason: "Misafir rezervasyonunu iptal etti."}); err != nil {
			t.Fatal(err)
		}
	})
	t.Run("whole apartment blocks descendants; cancellation frees them", func(t *testing.T) {
		b, err := reserve(apartment.RoomID, 2, start, end)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := reserve(bed1.RoomID, 1, start, end); !errors.Is(err, constants.ErrUnavailable) {
			t.Fatalf("child conflict: %v", err)
		}
		if _, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "cancel", Reason: "Misafir rezervasyonunu iptal etti."}); err != nil {
			t.Fatal(err)
		}
	})
	t.Run("parallel requests cannot double book; siblings independent", func(t *testing.T) {
		var success atomic.Int32
		var wg sync.WaitGroup
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				_, err := reserve(bed1.RoomID, 1, start, end)
				if err == nil {
					success.Add(1)
				} else if !errors.Is(err, constants.ErrUnavailable) {
					t.Error(err)
				}
			}()
		}
		wg.Wait()
		if success.Load() != 1 {
			t.Fatalf("accepted %d reservations", success.Load())
		}
		if _, err := reserve(bed2.RoomID, 1, start, end); err != nil {
			t.Fatal(err)
		}
		if _, err := reserve(room.RoomID, 1, start, end); !errors.Is(err, constants.ErrUnavailable) {
			t.Fatalf("parent conflict: %v", err)
		}
		if _, err := reserve(bed1.RoomID, 1, end, end.Add(time.Hour)); err != nil {
			t.Fatalf("adjacent reservation: %v", err)
		}
	})
	t.Run("in use structure and maintenance protected", func(t *testing.T) {
		bed1.Capacity = 2
		if _, err := catalog.SaveRoom(ctx, admin, bed1, false); !errors.Is(err, constants.ErrStructureInUse) {
			t.Fatalf("structure change: %v", err)
		}
		bed1.Capacity = 1
		if _, err := catalog.SaveState(ctx, admin, property.Room{RoomID: room.RoomID, Status: "Tadilat", StatusReason: "Planlanan oda tadilatı"}); !errors.Is(err, constants.ErrStructureInUse) {
			t.Fatalf("maintenance: %v", err)
		}
	})
	t.Run("check-in move history checkout", func(t *testing.T) {
		b, err := reserve(other.RoomID, 2, start, end)
		if err != nil {
			t.Fatal(err)
		}
		b, err = service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "check_in"})
		if err != nil {
			t.Fatal(err)
		}
		target := unit("C", "room", nil, 4)
		b, err = service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "move", TargetID: target.RoomID})
		if err != nil {
			t.Fatal(err)
		}
		if len(b.Allocations) != 2 || b.Allocations[0].RoomID != other.RoomID || b.RoomID != target.RoomID || !b.Allocations[0].End.Equal(b.Allocations[1].Start) {
			t.Fatalf("invalid movement history: %+v", b)
		}
		b, err = service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "check_out"})
		if err != nil {
			t.Fatal(err)
		}
		if b.Status != booking.Completed || b.ActualCheckOut == nil {
			t.Fatal("checkout not persisted")
		}
		dirty, err := repo.FindRoom(ctx, target.RoomID)
		if err != nil || dirty.Status != "Kirli" {
			t.Fatalf("checkout cleaning: %+v %v", dirty, err)
		}
		if _, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "check_in"}); !errors.Is(err, constants.ErrBookingState) {
			t.Fatalf("invalid transition accepted: %v", err)
		}
	})
	t.Run("early arrival checks availability and preserves planned dates", func(t *testing.T) {
		suite := unit("FUTURE-SUITE", "room", nil, 0)
		upcoming, err := reserve(suite.RoomID, 2, time.Now().Add(24*time.Hour), time.Now().Add(48*time.Hour))
		if err != nil {
			t.Fatal(err)
		}
		blocker, err := reserve(suite.RoomID, 1, time.Now().Add(-time.Hour), upcoming.CheckIn)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: upcoming.BookingID, Action: "check_in"}); !errors.Is(err, constants.ErrUnavailable) {
			t.Fatalf("early arrival must respect bookings before planned arrival: %v", err)
		}
		var unchanged models.Booking
		if err := db.First(&unchanged, "booking_id = ?", upcoming.BookingID).Error; err != nil {
			t.Fatal(err)
		}
		if unchanged.Status != booking.Confirmed || unchanged.ActualCheckIn != nil {
			t.Fatal("failed early check-in changed the booking")
		}
		if _, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: blocker.BookingID, Action: "cancel", Reason: "Misafir rezervasyonunu iptal etti."}); err != nil {
			t.Fatal(err)
		}
		arrived, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: upcoming.BookingID, Action: "check_in"})
		if err != nil {
			t.Fatalf("early arrival in available suite: %v", err)
		}
		if arrived.Status != booking.CheckedIn || arrived.ActualCheckIn == nil || !arrived.ActualCheckIn.Before(arrived.CheckIn) || !arrived.CheckIn.Equal(upcoming.CheckIn) {
			t.Fatalf("early arrival did not preserve planned dates: %+v", arrived)
		}
		if len(arrived.Allocations) != 1 || !arrived.Allocations[0].Start.Equal(*arrived.ActualCheckIn) {
			t.Fatal("room must be allocated from the actual arrival")
		}
		if _, err := reserve(suite.RoomID, 1, time.Now(), upcoming.CheckIn); !errors.Is(err, constants.ErrUnavailable) {
			t.Fatalf("early arrival must block the room now: %v", err)
		}
		target := unit("EARLY-MOVE-TARGET", "room", nil, 0)
		moved, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: upcoming.BookingID, Action: "move", TargetID: target.RoomID})
		if err != nil {
			t.Fatalf("early guest can move before planned check-in: %v", err)
		}
		if len(moved.Allocations) != 2 || !moved.Allocations[0].End.Equal(moved.Allocations[1].Start) {
			t.Fatal("early arrival movement history is incomplete")
		}
		originalStart, originalMove := moved.Allocations[0].Start, moved.Allocations[0].End
		originalArrival := *moved.ActualCheckIn
		for i := 1; i <= 2; i++ {
			moved.CheckIn = time.Now().Add(-time.Duration(i) * time.Hour)
			planned := moved.CheckIn
			moved, err = service.SaveBooking(ctx, admin, moved, false)
			if err != nil {
				t.Fatalf("amend checked-in dates: %v", err)
			}
			if !moved.CheckIn.Equal(planned) || moved.Status != booking.CheckedIn || !moved.ActualCheckIn.Equal(originalArrival) {
				t.Fatal("date amendment lost planned date, status or actual arrival")
			}
			if len(moved.Allocations) != 2 || !moved.Allocations[0].Start.Equal(originalStart) || !moved.Allocations[0].End.Equal(originalMove) {
				t.Fatal("date amendment rewrote movement history")
			}
			loaded, err := service.ListBookings(ctx, admin, booking.Query{BranchID: branch.BranchID, BookingID: moved.BookingID})
			if err != nil || len(loaded) != 1 || !loaded[0].CheckIn.Equal(planned) {
				t.Fatalf("updated date did not survive reload: %v", err)
			}
		}
		next, err := reserve(target.RoomID, 1, moved.CheckOut, moved.CheckOut.Add(24*time.Hour))
		if err != nil {
			t.Fatal(err)
		}
		conflicting := moved
		conflicting.CheckOut = next.CheckOut
		if _, err := service.SaveBooking(ctx, admin, conflicting, false); !errors.Is(err, constants.ErrUnavailable) {
			t.Fatalf("extension conflict was accepted: %v", err)
		}
		loaded, err := service.ListBookings(ctx, admin, booking.Query{BranchID: branch.BranchID, BookingID: moved.BookingID})
		if err != nil || len(loaded) != 1 || !loaded[0].CheckOut.Equal(moved.CheckOut) {
			t.Fatal("failed extension changed checkout")
		}
		if _, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: upcoming.BookingID, Action: "check_out"}); err != nil {
			t.Fatalf("early checkout: %v", err)
		}
		expiredRoom := unit("EXPIRED-SUITE", "room", nil, 0)
		expired, err := reserve(expiredRoom.RoomID, 1, time.Now().Add(-48*time.Hour), time.Now().Add(-24*time.Hour))
		if err != nil {
			t.Fatal(err)
		}
		if _, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: expired.BookingID, Action: "check_in"}); !errors.Is(err, constants.ErrCheckInExpired) {
			t.Fatalf("expected clear expired check-in error, got %v", err)
		}
	})
	t.Run("swap atomic capacity checks", func(t *testing.T) {
		small := unit("S", "bed", nil, 1)
		large := unit("L", "bed", nil, 4)
		a, err := reserve(small.RoomID, 1, end.Add(2*time.Hour), end.Add(4*time.Hour))
		if err != nil {
			t.Fatal(err)
		}
		b, err := reserve(large.RoomID, 4, a.CheckIn, a.CheckOut)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: a.BookingID, OtherBookingID: b.BookingID, Action: "swap"}); !errors.Is(err, constants.ErrCapacity) {
			t.Fatalf("swap should fail: %v", err)
		}
		rows, err := repo.ListBookings(ctx, booking.Query{BranchID: branch.BranchID})
		if err != nil {
			t.Fatal(err)
		}
		for _, row := range rows {
			if row.BookingID == a.BookingID && row.RoomID != small.RoomID {
				t.Fatal("failed swap changed source")
			}
		}
		b.GuestCount = 1
		b, err = service.SaveBooking(ctx, admin, b, false)
		if err != nil {
			t.Fatal(err)
		}
		a, err = service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: a.BookingID, OtherBookingID: b.BookingID, Action: "swap"})
		if err != nil {
			t.Fatal(err)
		}
		if a.RoomID != large.RoomID {
			t.Fatal("swap did not apply")
		}
	})
	t.Run("100 beds in 50 bunks and persisted floor plan", func(t *testing.T) {
		beds, err := service.Bulk(ctx, admin, property.BulkUnits{BranchID: branch.BranchID, FloorID: &floor.FloorID, Kind: "bed", Prefix: "Y", Count: 100, Levels: 2, Capacity: 1, Rentable: true})
		if err != nil {
			t.Fatal(err)
		}
		if len(beds) != 100 || beds[0].BedGroup != beds[1].BedGroup || beds[0].BedLevel != 1 || beds[1].BedLevel != 2 {
			t.Fatal("invalid bunk generation")
		}
		p := property.Placement{RoomID: beds[0].RoomID, Position: property.Position{X: 100, Y: 120, Width: 140, Height: 100}}
		if err := service.SavePlan(ctx, admin, floor.FloorID, []property.Placement{p}); err != nil {
			t.Fatal(err)
		}
		plan, err := service.Plan(ctx, admin, floor.FloorID)
		if err != nil {
			t.Fatal(err)
		}
		found := false
		for _, r := range plan.Rooms {
			if r.RoomID == p.RoomID {
				found = true
				if r.Position != p.Position {
					t.Fatal("position was not persisted")
				}
			}
		}
		if !found {
			t.Fatal("bed absent from plan")
		}
		if _, err := service.Bulk(ctx, admin, property.BulkUnits{BranchID: branch.BranchID, FloorID: &floor.FloorID, Kind: "bed", Prefix: "Y", Count: 3, Levels: 2, Capacity: 1, Rentable: true}); err == nil {
			t.Fatal("duplicate batch accepted")
		}
		var count int64
		db.Model(&models.Room{}).Where("code LIKE 'Y-%'").Count(&count)
		if count != 100 {
			t.Fatalf("partial batch created: %d", count)
		}
	})
	t.Run("tenant access and floor boundaries", func(t *testing.T) {
		foreign := identity.User{HotelID: uuid.New(), Role: constants.UserRoleManagement}
		if _, err := service.Floors(ctx, foreign, branch.BranchID); !errors.Is(err, constants.ErrForbidden) {
			t.Fatalf("tenant breach: %v", err)
		}
		if err := service.SavePlan(ctx, admin, floor.FloorID, []property.Placement{{RoomID: other.RoomID, Position: property.Position{X: 2390, Y: 0, Width: 140, Height: 100}}}); !errors.Is(err, constants.ErrLayout) {
			t.Fatalf("out of bounds plan: %v", err)
		}
	})
}

func TestBookingsOrderedByCreationTime(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	hotel := models.Hotel{HotelID: uuid.New(), FacilityInfo: models.FacilityInfo{Name: "Ordering"}}
	branch := models.Branch{BranchID: uuid.New(), HotelID: hotel.HotelID, FacilityInfo: models.FacilityInfo{Name: "Main"}}
	room := models.Room{RoomID: uuid.New(), BranchID: branch.BranchID, Code: "101", Kind: "room", Capacity: 2}
	for _, row := range []any{&hotel, &branch, &room} {
		if err := db.Create(row).Error; err != nil {
			t.Fatal(err)
		}
	}
	base := time.Date(2026, 10, 14, 10, 0, 0, 0, time.UTC)
	ids := []uuid.UUID{
		uuid.MustParse("00000000-0000-4000-8000-000000000001"),
		uuid.MustParse("00000000-0000-4000-8000-000000000002"),
		uuid.MustParse("00000000-0000-4000-8000-000000000003"),
	}
	// Older reservations may have later arrival dates or more recent edits.
	// The last two share a creation timestamp and require a deterministic tie-break.
	for _, i := range []int{2, 0, 1} {
		created := base
		if i > 0 {
			created = base.Add(time.Hour)
		}
		arrival := base.Add(time.Duration(30-i) * 24 * time.Hour)
		row := models.Booking{BookingID: ids[i], BranchID: branch.BranchID, RoomID: room.RoomID, GuestName: "Order test", GuestCount: 1, Status: booking.Confirmed, CheckIn: arrival, CheckOut: arrival.Add(24 * time.Hour), CreatedAt: created, UpdatedAt: base.Add(time.Duration(5-i) * time.Hour)}
		if err := db.Omit("Guests", "Allocations").Create(&row).Error; err != nil {
			t.Fatal(err)
		}
	}
	repo := persistence.New(db)
	for _, q := range []booking.Query{
		{BranchID: branch.BranchID},
		{BranchID: branch.BranchID, Status: booking.Confirmed, From: &base},
	} {
		rows, err := repo.ListBookings(ctx, q)
		if err != nil {
			t.Fatal(err)
		}
		if len(rows) != 3 {
			t.Fatalf("got %d bookings", len(rows))
		}
		for i, want := range []uuid.UUID{ids[2], ids[1], ids[0]} {
			if rows[i].BookingID != want {
				t.Fatalf("position %d: got %s, want %s", i, rows[i].BookingID, want)
			}
		}
	}
}
