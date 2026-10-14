package persistence_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/identity"
	"otel/internal/domain/reporting"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"testing"
	"time"
)

func TestFolioServiceTransactions(t *testing.T) {
	db := testdb.Open(t)
	if e := migrations.Up(db); e != nil {
		t.Fatal(e)
	}
	hotel, branch, room, booking, actor := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	now := time.Now().UTC()
	for _, v := range []any{&models.Hotel{HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Test"}}, &models.Branch{BranchID: branch, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Merkez"}}, &models.User{UserID: actor, HotelID: hotel, UserName: "reception", Password: "unused", UserRole: constants.UserRoleReception}, &models.Room{RoomID: room, BranchID: branch, Code: "101", Kind: "room", Status: "Temiz", Capacity: 2, Rentable: true}, &models.Booking{BookingID: booking, BranchID: branch, RoomID: room, UserID: actor, GuestName: "Test", GuestCount: 1, CheckIn: now, CheckOut: now.Add(24 * time.Hour), Status: "checked_in", ActualCheckIn: &now, DailyPriceMinor: 10000}} {
		if e := db.Create(v).Error; e != nil {
			t.Fatal(e)
		}
	}
	repo := persistence.New(db)
	service := application.Folios{Catalog: &application.Catalog{Properties: repo}, Repository: repo}
	ctx := context.Background()
	user := identity.User{UserID: actor, HotelID: hotel, Role: constants.UserRoleReception, BranchIDs: []uuid.UUID{branch}, DisplayName: "Resepsiyon"}
	before, e := service.Get(ctx, user, branch, booking)
	if e != nil {
		t.Fatal(e)
	}
	in := reporting.FolioServiceInput{ID: uuid.New(), BranchID: branch, BookingID: booking, Label: "Kahvaltı", Category: "food", Quantity: 3, UnitPriceMinor: 15000, Currency: "TRY", Notes: "Üç kişi"}
	item, e := service.Service(ctx, user, in)
	if e != nil || item.AmountMinor != 45000 || item.ActorID != actor {
		t.Fatalf("%+v %v", item, e)
	}
	if _, e = service.Service(ctx, user, in); e != nil {
		t.Fatal("retry", e)
	}
	after, e := service.Get(ctx, user, branch, booking)
	if e != nil || len(after.Lines) != 2 || after.Totals[0].Charges != 55000 || after.Totals[0].Paid != 0 || after.Token == before.Token {
		t.Fatalf("folio %+v %v", after, e)
	}
	changed := in
	changed.Quantity = 2
	if _, e = service.Service(ctx, user, changed); !errors.Is(e, constants.ErrConflict) {
		t.Fatalf("reused id accepted: %v", e)
	}
	outsider := user
	outsider.HotelID = uuid.New()
	outsider.BranchIDs = nil
	if _, e = service.Service(ctx, outsider, in); e == nil {
		t.Fatal("foreign write accepted")
	}
	cleaner := user
	cleaner.Role = constants.UserRoleHousekeeping
	if _, e = service.Service(ctx, cleaner, in); !errors.Is(e, constants.ErrForbidden) {
		t.Fatal("housekeeping may charge")
	}
	void := reporting.FolioServiceVoid{ID: in.ID, BranchID: branch, BookingID: booking, Reason: ""}
	if e = service.VoidService(ctx, user, void); e == nil {
		t.Fatal("missing void reason")
	}
	void.Reason = "Yanlış oda seçildi"
	if e = service.VoidService(ctx, user, void); e != nil {
		t.Fatal(e)
	}
	final, e := service.Get(ctx, user, branch, booking)
	if e != nil || final.Totals[0].Charges != 10000 || len(final.Lines) != 1 {
		t.Fatal("void did not remove charge", e)
	}
	var stored reporting.Record
	if e := db.First(&stored, "id=?", in.ID).Error; e != nil || stored.VoidedAt == nil || stored.VoidReason != void.Reason {
		t.Fatal("void history missing")
	}
	db.Model(&models.Booking{}).Where("booking_id=?", booking).Update("status", "completed")
	in.ID = uuid.New()
	if _, e = service.Service(ctx, user, in); !errors.Is(e, constants.ErrBookingState) {
		t.Fatal("closed booking charged", e)
	}
}
