package persistence_test

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/booking"
	"otel/internal/domain/identity"
	"otel/internal/domain/reporting"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"testing"
	"time"
)

func TestBookingActors(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	hotel := models.Hotel{HotelID: uuid.New(), FacilityInfo: models.FacilityInfo{Name: "Actors"}}
	if err := db.Create(&hotel).Error; err != nil {
		t.Fatal(err)
	}
	branch := models.Branch{BranchID: uuid.New(), HotelID: hotel.HotelID, FacilityInfo: models.FacilityInfo{Name: "Main"}}
	if err := db.Create(&branch).Error; err != nil {
		t.Fatal(err)
	}
	room := models.Room{RoomID: uuid.New(), BranchID: branch.BranchID, Code: "101", Kind: "room", Capacity: 2, Rentable: true, Status: "Temiz"}
	if err := db.Create(&room).Error; err != nil {
		t.Fatal(err)
	}
	creator := models.User{UserID: uuid.New(), HotelID: hotel.HotelID, UserName: "creator", DisplayName: "Ayşe Yılmaz", UserRole: constants.UserRoleManagement}
	departing := models.User{UserID: uuid.New(), HotelID: hotel.HotelID, UserName: "departure", DisplayName: "Ali Demir", UserRole: constants.UserRoleManagement}
	if err := db.Create(&[]models.User{creator, departing}).Error; err != nil {
		t.Fatal(err)
	}
	repo := persistence.New(db)
	service := application.Accommodation{Catalog: &application.Catalog{Properties: repo}, Bookings: repo}
	actor := func(u models.User) identity.User {
		return identity.User{UserID: u.UserID, HotelID: u.HotelID, Role: u.UserRole}
	}
	b, err := service.SaveBooking(ctx, actor(creator), booking.Booking{BranchID: branch.BranchID, RoomID: room.RoomID, GuestName: "Test", GuestCount: 1, CheckIn: time.Now().Add(-time.Hour), CheckOut: time.Now().Add(time.Hour)}, true)
	if err != nil {
		t.Fatal(err)
	}
	if b.CreatedByName != creator.DisplayName || b.CheckedOutByName != "" {
		t.Fatalf("creation attribution: %+v", b)
	}
	if b.Currency != "TRY" {
		t.Fatalf("legacy currency: %s", b.Currency)
	}
	currencyRecord := reporting.Record{ID: uuid.New(), HotelID: hotel.HotelID, BranchID: branch.BranchID, BookingID: &b.BookingID, ActorID: creator.UserID, Kind: "booking_details", Currency: "EUR", OccurredAt: time.Now()}
	if err := db.Create(&currencyRecord).Error; err != nil {
		t.Fatal(err)
	}

	b.Notes = "Edited by another person"
	b, err = service.SaveBooking(ctx, actor(departing), b, false)
	if err != nil {
		t.Fatal(err)
	}
	if b.Currency != "EUR" {
		t.Fatalf("recorded currency: %s", b.Currency)
	}
	if b.CreatedByName != creator.DisplayName {
		t.Fatal("editor replaced creator")
	}
	for _, action := range []string{"check_in", "check_out"} {
		b, err = service.Transition(ctx, actor(departing), booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: action})
		if err != nil {
			t.Fatal(err)
		}
	}
	if b.CheckedInByName != departing.DisplayName || b.CheckedInByID == nil || *b.CheckedInByID != departing.UserID {
		t.Fatalf("checkin attribution: %+v", b)
	}
	if b.CheckedOutByName != departing.DisplayName || b.CheckedOutByID == nil || *b.CheckedOutByID != departing.UserID {
		t.Fatalf("checkout attribution: %+v", b)
	}
	if err := db.Delete(&departing).Error; err != nil {
		t.Fatal(err)
	}
	// A later, unrelated hotel's audit event cannot replace the checkout actor.
	wrong := models.AuditLog{ID: uuid.New(), HotelID: uuid.New(), ActorID: creator.UserID, Entity: "bookings", EntityID: b.BookingID, Action: "check_out", CreatedAt: time.Now().Add(time.Hour)}
	if err := db.Create(&wrong).Error; err != nil {
		t.Fatal(err)
	}
	rows, err := repo.ListBookings(ctx, booking.Query{BranchID: branch.BranchID})
	if err != nil || len(rows) != 1 {
		t.Fatalf("list: %v", err)
	}
	if rows[0].CreatedByName != creator.DisplayName || rows[0].CheckedOutByName != departing.DisplayName || rows[0].CheckedInByName != departing.DisplayName {
		t.Fatalf("historical attribution lost: %+v", rows[0])
	}
	// Historical records with no actor data stay unknown.
	db.Model(&models.Booking{}).Where("booking_id = ?", b.BookingID).Update("user_id", uuid.Nil)
	db.Where("entity_id = ?", b.BookingID).Delete(&models.AuditLog{})
	rows, err = repo.ListBookings(ctx, booking.Query{BranchID: branch.BranchID})
	if err != nil || rows[0].CreatedByName != "" || rows[0].CheckedOutByName != "" || rows[0].CheckedInByName != "" {
		t.Fatalf("invented attribution: %+v %v", rows, err)
	}
	cancelled, err := service.SaveBooking(ctx, actor(creator), booking.Booking{BranchID: branch.BranchID, RoomID: room.RoomID, GuestName: "Cancelled", GuestCount: 1, CheckIn: time.Now().Add(24 * time.Hour), CheckOut: time.Now().Add(48 * time.Hour)}, true)
	if err != nil {
		t.Fatal(err)
	}
	cancelled, err = service.Transition(ctx, actor(creator), booking.Transition{BranchID: branch.BranchID, BookingID: cancelled.BookingID, Action: "cancel", Reason: "Misafirin isteği üzerine iptal"})
	if err != nil {
		t.Fatal(err)
	}
	if cancelled.CancelledByName != creator.DisplayName || cancelled.CancelledByID == nil || *cancelled.CancelledByID != creator.UserID || cancelled.CheckedInByName != "" {
		t.Fatalf("cancellation attribution: %+v", cancelled)
	}
}
