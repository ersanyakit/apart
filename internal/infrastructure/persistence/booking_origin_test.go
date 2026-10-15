package persistence_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/booking"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"testing"
	"time"
)

func TestBookingOriginPersistence(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	repo := persistence.New(db)
	h := models.Hotel{HotelID: uuid.New(), FacilityInfo: models.FacilityInfo{Name: "Origin test"}}
	if err := db.Create(&h).Error; err != nil {
		t.Fatal(err)
	}
	branch := models.Branch{BranchID: uuid.New(), HotelID: h.HotelID, FacilityInfo: models.FacilityInfo{Name: "Main"}}
	if err := db.Create(&branch).Error; err != nil {
		t.Fatal(err)
	}
	user := models.User{UserID: uuid.New(), HotelID: h.HotelID, UserName: "origin", UserRole: constants.UserRoleManagement}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal(err)
	}
	room := models.Room{RoomID: uuid.New(), BranchID: branch.BranchID, Code: "101", Kind: "room", Capacity: 2, Rentable: true, Status: "Temiz"}
	if err := db.Create(&room).Error; err != nil {
		t.Fatal(err)
	}
	start := time.Now().UTC().Add(24 * time.Hour)
	b := booking.Booking{BookingID: uuid.New(), BranchID: branch.BranchID, RoomID: room.RoomID, UserID: user.UserID, GuestName: "Origin Guest", GuestCount: 1, CheckIn: start, CheckOut: start.Add(24 * time.Hour), Source: "booking_com", ExternalPropertyID: "property-01", ExternalReservationID: "000123"}
	saved, err := repo.SaveBooking(ctx, b, true)
	if err != nil {
		t.Fatal(err)
	}
	if saved.Source != b.Source || saved.ExternalReservationID != "000123" || saved.ExternalPropertyID != b.ExternalPropertyID {
		t.Fatalf("lost origin: %+v", saved)
	}
	found, err := repo.ListBookings(ctx, booking.Query{BranchID: branch.BranchID, Source: "booking_com", ExternalPropertyID: "property-01", ExternalReservationID: "000123"})
	if err != nil || len(found) != 1 || found[0].BookingID != saved.BookingID {
		t.Fatalf("origin lookup: %+v %v", found, err)
	}
	found, err = repo.ListBookings(ctx, booking.Query{BranchID: uuid.New(), ExternalReservationID: "000123"})
	if err != nil || len(found) != 0 {
		t.Fatalf("branch isolation: %+v %v", found, err)
	}
	duplicate := b
	duplicate.BookingID = uuid.New()
	duplicate.CheckIn = start.Add(72 * time.Hour)
	duplicate.CheckOut = duplicate.CheckIn.Add(24 * time.Hour)
	if _, err = repo.SaveBooking(ctx, duplicate, true); !errors.Is(err, constants.ErrExternalBookingExists) {
		t.Fatalf("duplicate: %v", err)
	}
	edited := saved
	edited.Source = ""
	edited.ExternalPropertyID = ""
	edited.ExternalReservationID = ""
	edited.Notes = "Legacy edit"
	edited, err = repo.SaveBooking(ctx, edited, false)
	if err != nil || edited.ExternalReservationID != b.ExternalReservationID {
		t.Fatalf("legacy edit: %+v %v", edited, err)
	}
	edited.Source = "agoda"
	if _, err = repo.SaveBooking(ctx, edited, false); !errors.Is(err, constants.ErrExternalBookingIdentity) {
		t.Fatal(err)
	}
	// Same external number in a different provider is a different reservation.
	duplicate.Source = "agoda"
	if _, err = repo.SaveBooking(ctx, duplicate, true); err != nil {
		t.Fatal(err)
	}
	// DB uniqueness remains enforced even if application duplicate checks are bypassed.
	raw := models.Booking{BookingID: uuid.New(), BranchID: b.BranchID, RoomID: b.RoomID, UserID: b.UserID, Source: b.Source, ExternalPropertyID: b.ExternalPropertyID, ExternalReservationID: b.ExternalReservationID, CheckIn: start, CheckOut: start.Add(time.Hour)}
	if err = db.Create(&raw).Error; err == nil {
		t.Fatal("database allowed duplicate external identity")
	}
	// Checked-in edits through legacy clients also retain the channel identity.
	entered, err := repo.TransitionBooking(ctx, booking.Transition{BranchID: b.BranchID, BookingID: b.BookingID, Action: "check_in"})
	if err != nil {
		t.Fatal(err)
	}
	entered.Source = ""
	entered.ExternalPropertyID = ""
	entered.ExternalReservationID = ""
	entered.Notes = "Current stay edit"
	entered, err = repo.SaveBooking(ctx, entered, false)
	if err != nil || entered.ExternalReservationID != b.ExternalReservationID {
		t.Fatalf("checked-in edit: %+v %v", entered, err)
	}
	// Cancellation must not free the external identity for accidental re-import.
	if err = db.Model(&models.Booking{}).Where("booking_id = ?", b.BookingID).Update("status", "cancelled").Error; err != nil {
		t.Fatal(err)
	}
	duplicate.Source = b.Source
	duplicate.BookingID = uuid.New()
	if _, err = repo.SaveBooking(ctx, duplicate, true); !errors.Is(err, constants.ErrExternalBookingExists) {
		t.Fatal(err)
	}
}
