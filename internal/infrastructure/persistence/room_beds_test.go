package persistence_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/accommodation"
	"otel/internal/domain/booking"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"testing"
	"time"
)

func TestRoomWithBedsAtomicSave(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	hotel, branch := uuid.New(), uuid.New()
	if err := db.Create(&models.Hotel{HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Room beds"}}).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.Branch{BranchID: branch, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Main"}}).Error; err != nil {
		t.Fatal(err)
	}
	repo := persistence.New(db)
	catalog := application.Catalog{Properties: repo, Media: repo, Features: repo, Layout: repo, Bookings: repo}
	admin := identity.User{UserID: uuid.New(), Role: constants.UserRoleAdmin}
	bed := func(code string) accommodation.Bed {
		return accommodation.Bed{BranchID: uuid.New(), RoomID: &hotel, Code: code, Type: accommodation.Double, Structure: accommodation.Standard, WidthCM: 160, LengthCM: 200, Levels: 1, Places: []accommodation.SleepingPlace{{Code: code + "-1", Level: 1, Position: "single", WidthCM: 160, LengthCM: 200, Capacity: 2, IsActive: true, Rentable: false}}}
	}
	room := property.Room{BranchID: branch, Code: "101", Kind: "room", Status: "Temiz", Rentable: true, Position: property.Position{Width: 140, Height: 100}, NewBeds: []accommodation.Bed{bed("101-Y1")}}
	saved, err := catalog.SaveRoom(ctx, admin, room, true)
	if err != nil {
		t.Fatal(err)
	}
	beds, err := repo.ListBeds(ctx, branch)
	if err != nil || len(beds) != 1 {
		t.Fatalf("beds=%v err=%v", beds, err)
	}
	if beds[0].RoomID == nil || *beds[0].RoomID != saved.RoomID || beds[0].BranchID != branch || beds[0].Places[0].Capacity != 2 || beds[0].Places[0].Rentable {
		t.Fatalf("incorrect room/bed binding: %+v", beds[0])
	}
	originalID := beds[0].Places[0].UnitID
	saved.NewBeds = []accommodation.Bed{bed("101-Y2")}
	if _, err := catalog.SaveRoom(ctx, admin, saved, false); err != nil {
		t.Fatal(err)
	}
	beds, _ = repo.ListBeds(ctx, branch)
	if len(beds) != 2 || beds[0].Places[0].UnitID != originalID {
		t.Fatal("existing beds replaced")
	}
	// Fail after the room write and first bed insert: all additions must roll back.
	broken := room
	broken.Code = "ROLLBACK"
	broken.NewBeds = []accommodation.Bed{bed("ROLLBACK-Y1"), bed("CONFLICT")}
	broken.NewBeds[1].Places[0].Code = "101-Y1-1"
	if _, err := catalog.SaveRoom(ctx, admin, broken, true); err == nil {
		t.Fatal("expected duplicate unit code error")
	}
	var count int64
	db.Model(&models.Room{}).Where("branch_id = ? AND code = ?", branch, "ROLLBACK").Count(&count)
	if count != 0 {
		t.Fatal("room survived failed bed insert")
	}
	beds, _ = repo.ListBeds(ctx, branch)
	if len(beds) != 2 {
		t.Fatal("partial beds survived rollback")
	}
	t.Run("exclusive rental modes and future bed additions", func(t *testing.T) {
		current, err := repo.FindRoom(ctx, saved.RoomID)
		if err != nil {
			t.Fatal(err)
		}
		current.RentalMode = "beds"
		current, err = catalog.SaveRoom(ctx, admin, current, false)
		if err != nil {
			t.Fatal(err)
		}
		if current.Rentable || current.RentalMode != "beds" {
			t.Fatal("room still for sale")
		}
		beds, _ := repo.ListBeds(ctx, branch)
		for _, b := range beds {
			for _, p := range b.Places {
				if !p.Rentable {
					t.Fatal("bed not for sale")
				}
			}
		}
		current.RentalMode = "room"
		current, err = catalog.SaveRoom(ctx, admin, current, false)
		if err != nil {
			t.Fatal(err)
		}
		if !current.Rentable {
			t.Fatal("room not for sale")
		}
		beds, _ = repo.ListBeds(ctx, branch)
		for _, b := range beds {
			for _, p := range b.Places {
				if p.Rentable {
					t.Fatal("room bed sold separately")
				}
			}
		}
		service := application.Beds{Catalog: &catalog, Repository: repo}
		extra := bed("LATER")
		extra.BranchID = branch
		extra.RoomID = &current.RoomID
		extra.Places[0].Rentable = true
		added, err := service.Save(ctx, admin, extra, true)
		if err != nil {
			t.Fatal(err)
		}
		if added.Places[0].Rentable {
			t.Fatal("later bed bypassed room rental mode")
		}
		reservations := application.Accommodation{Catalog: &catalog, Bookings: repo}
		_, err = reservations.SaveBooking(ctx, admin, booking.Booking{BranchID: branch, RoomID: current.RoomID, GuestName: "Mode guard", GuestCount: 1, CheckIn: time.Now().Add(time.Hour), CheckOut: time.Now().Add(24 * time.Hour)}, true)
		if err != nil {
			t.Fatal(err)
		}
		current.RentalMode = "beds"
		if _, err = catalog.SaveRoom(ctx, admin, current, false); !errors.Is(err, constants.ErrStructureInUse) {
			t.Fatalf("reservation guard: %v", err)
		}
		unchanged, _ := repo.FindRoom(ctx, current.RoomID)
		if unchanged.RentalMode != "room" || !unchanged.Rentable {
			t.Fatal("failed mode change was persisted")
		}

		empty := room
		empty.Code = "EMPTY-BEDS"
		empty.NewBeds = nil
		empty.RentalMode = "beds"
		if _, err := catalog.SaveRoom(ctx, admin, empty, true); err == nil {
			t.Fatal("bed-only room without beds accepted")
		}
		db.Model(&models.Room{}).Where("branch_id = ? AND code = ?", branch, "EMPTY-BEDS").Count(&count)
		if count != 0 {
			t.Fatal("empty bed-only room not rolled back")
		}
	})

	receptionist := admin
	receptionist.Role = constants.UserRoleReception
	if _, err := catalog.SaveRoom(ctx, receptionist, room, true); err == nil {
		t.Fatal("reception must not create room inventory")
	}
}
