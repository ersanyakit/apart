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
	catalog := &application.Catalog{Properties: repo, Media: repo, Features: repo, Layout: repo, Bookings: repo}
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
		if _, err := reserve(apartment.RoomID, 3, start, end); !errors.Is(err, constants.ErrCapacity) {
			t.Fatalf("capacity rejection: %v", err)
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
		if _, err := service.Transition(ctx, admin, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "cancel"}); err != nil {
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
		if _, err := catalog.SaveState(ctx, admin, property.Room{RoomID: room.RoomID, Status: "Tadilat"}); !errors.Is(err, constants.ErrStructureInUse) {
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
	t.Run("swap atomic capacity checks", func(t *testing.T) {
		small := unit("S", "room", nil, 1)
		large := unit("L", "room", nil, 4)
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
