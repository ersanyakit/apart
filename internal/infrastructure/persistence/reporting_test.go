package persistence_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/audit"
	"otel/internal/domain/booking"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"otel/internal/domain/reporting"
	"otel/internal/domain/shared"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"testing"
	"time"
)

func TestReportingIsolationIdempotencyAndAudit(t *testing.T) {
	db := testdb.Open(t)
	if e := migrations.Up(db); e != nil {
		t.Fatal(e)
	}
	hotel, branch, foreignHotel, foreignBranch, user := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	for _, v := range []any{&models.Hotel{HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "A"}}, &models.Hotel{HotelID: foreignHotel, FacilityInfo: models.FacilityInfo{Name: "B"}}, &models.Branch{BranchID: branch, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "A1"}}, &models.Branch{BranchID: foreignBranch, HotelID: foreignHotel, FacilityInfo: models.FacilityInfo{Name: "B1"}}, &models.User{UserID: user, HotelID: hotel, UserName: "report-manager", Password: "unused", UserRole: constants.UserRoleManagement}} {
		if e := db.Create(v).Error; e != nil {
			t.Fatal(e)
		}
	}
	repo := persistence.New(db)
	service := application.Reporting{Repository: repo}
	u := identity.User{UserID: user, HotelID: hotel, Role: constants.UserRoleManagement, DisplayName: "Yönetici"}
	ctx := audit.WithActor(context.Background(), audit.Actor{UserID: user, Command: "report.record"})
	at := time.Date(2026, 10, 14, 12, 0, 0, 0, reporting.Zone)
	record := reporting.Record{ID: uuid.New(), HotelID: hotel, BranchID: branch, Kind: "receipt", Label: "Tahsilat", AmountMinor: 10000, Currency: "TRY", Channel: "cash", Status: "completed", OccurredAt: at}
	for i := 0; i < 2; i++ {
		if _, e := service.Record(ctx, u, record); e != nil {
			t.Fatal(e)
		}
	}
	var count int64
	db.Model(&reporting.Record{}).Count(&count)
	if count != 1 {
		t.Fatalf("retry duplicated money: %d", count)
	}
	f := reporting.Filter{HotelID: hotel, BranchID: branch, Key: "finance.daily_revenue", StartDate: "2026-10-14", EndDate: "2026-10-14", Currency: "TRY", Unit: "room", GroupBy: "day"}
	result, e := service.Generate(ctx, u, f)
	if e != nil {
		t.Fatal(e)
	}
	check := func(r reporting.Result, want float64) {
		t.Helper()
		for _, m := range r.Metrics {
			if m.Key == "receipts" {
				if m.Value != want {
					t.Fatalf("receipts=%v want %v", m.Value, want)
				}
				return
			}
		}
		t.Fatal("missing metric")
	}
	check(result, 10000)
	reception := u
	reception.Role = constants.UserRoleReception
	if _, e = service.Generate(ctx, reception, f); !errors.Is(e, constants.ErrForbidden) {
		t.Fatalf("role bypass %v", e)
	}
	f.HotelID = foreignHotel
	if _, e = service.Generate(ctx, u, f); !errors.Is(e, constants.ErrForbidden) {
		t.Fatalf("hotel bypass %v", e)
	}
	f.HotelID = hotel
	f.BranchID = foreignBranch
	if _, e = service.Generate(ctx, u, f); !errors.Is(e, constants.ErrForbidden) {
		t.Fatalf("branch bypass %v", e)
	}
	f.BranchID = branch
	bad := record
	bad.ID = uuid.New()
	bad.BranchID = foreignBranch
	if _, e = service.Record(ctx, u, bad); !errors.Is(e, constants.ErrForbidden) {
		t.Fatalf("cross tenant write %v", e)
	}
	if e = service.Void(ctx, u, hotel, record.ID, "Yanlış tutar"); e != nil {
		t.Fatal(e)
	}
	result, e = service.Generate(ctx, u, f)
	if e != nil {
		t.Fatal(e)
	}
	check(result, 0)
	var saved reporting.Record
	if e = db.First(&saved, "id = ?", record.ID).Error; e != nil {
		t.Fatal(e)
	}
	if saved.VoidedAt == nil || saved.VoidReason != "Yanlış tutar" || saved.ActorID != user {
		t.Fatal("audit provenance lost")
	}
	db.Model(&models.AuditLog{}).Where("entity = ? AND entity_id = ?", "report_records", record.ID).Count(&count)
	if count < 2 {
		t.Fatal("creation/void audit missing")
	}
	t.Run("salary and rent expense entry requires accountable context", func(t *testing.T) {
		salary := reporting.Record{ID: uuid.New(), HotelID: hotel, BranchID: branch, Kind: "expense", Category: "payroll", Label: "Ekim maaşı", AmountMinor: 50000, Currency: "TRY", Status: "completed", OccurredAt: at}
		if _, e := service.Record(ctx, u, salary); e == nil {
			t.Fatal("salary without staff accepted")
		}
		salary.ResponsibleID = &user
		if _, e := service.Record(ctx, u, salary); e != nil {
			t.Fatal(e)
		}
		rental := salary
		rental.ID = uuid.New()
		rental.Category = "rent"
		rental.ResponsibleID = nil
		if _, e := service.Record(ctx, u, rental); e == nil {
			t.Fatal("rent without payee accepted")
		}
		rental.Party = "Mal sahibi"
		if _, e := service.Record(ctx, u, rental); e != nil {
			t.Fatal(e)
		}
		f.Key = "finance.expenses"
		result, e := service.Generate(ctx, u, f)
		if e != nil {
			t.Fatal(e)
		}
		found := false
		for _, m := range result.Metrics {
			if m.Key == "expenses" {
				found = true
				if m.Value != 100000 {
					t.Fatalf("expense sum %v", m.Value)
				}
			}
		}
		if !found {
			t.Fatal("expense metric missing")
		}
	})

}

func TestReceptionBookingReceipt(t *testing.T) {
	db := testdb.Open(t)
	if e := migrations.Up(db); e != nil {
		t.Fatal(e)
	}
	ctx := context.Background()
	repo := persistence.New(db)
	hotel, branch, otherBranch := uuid.New(), uuid.New(), uuid.New()
	managerID, receptionID := uuid.New(), uuid.New()
	for _, row := range []any{
		&models.Hotel{HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Tahsilat"}},
		&models.Branch{BranchID: branch, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Merkez"}},
		&models.Branch{BranchID: otherBranch, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Şube"}},
		&models.User{UserID: managerID, HotelID: hotel, UserName: "tahsilat-yonetici", Password: "unused", UserRole: constants.UserRoleManagement},
		&models.User{UserID: receptionID, HotelID: hotel, UserName: "tahsilat-resepsiyon", Password: "unused", UserRole: constants.UserRoleReception},
	} {
		if e := db.Create(row).Error; e != nil {
			t.Fatal(e)
		}
	}
	if e := db.Exec("INSERT INTO user_branches (user_id, branch_id, hotel_id, role) VALUES (?, ?, ?, ?)", receptionID, branch, hotel, constants.UserRoleReception).Error; e != nil {
		t.Fatal(e)
	}
	catalog := &application.Catalog{Staff: repo, Properties: repo, Media: repo, Features: repo, Layout: repo, Bookings: repo}
	stay := &application.Accommodation{Catalog: catalog, Layout: repo, Bookings: repo, Notes: repo}
	manager := identity.User{UserID: managerID, HotelID: hotel, Role: constants.UserRoleManagement, DisplayName: "Yönetici"}
	reception := identity.User{UserID: receptionID, HotelID: hotel, Role: constants.UserRoleReception, BranchIDs: []uuid.UUID{branch}, DisplayName: "Resepsiyon"}
	floor, e := stay.SaveFloor(ctx, manager, property.Floor{BranchID: branch, Code: "1", Label: shared.LocalizedString{constants.LanguageTR: "1. Kat"}, Width: 2400, Height: 1600}, true)
	if e != nil {
		t.Fatal(e)
	}
	room, e := catalog.SaveRoom(ctx, manager, property.Room{BranchID: branch, FloorID: &floor.FloorID, Code: "101", Kind: "room", Capacity: 2, Rentable: true, Status: "Temiz", Position: property.Position{X: 20, Y: 20, Width: 140, Height: 100}}, true)
	if e != nil {
		t.Fatal(e)
	}
	now := time.Now().UTC()
	reservation, e := stay.SaveBooking(ctx, reception, booking.Booking{BranchID: branch, RoomID: room.RoomID, GuestName: "Misafir", GuestCount: 1, DailyPriceMinor: 200000, CheckIn: now.Add(24 * time.Hour), CheckOut: now.Add(72 * time.Hour)}, true)
	if e != nil {
		t.Fatal(e)
	}
	service := application.Reporting{Repository: repo}
	receipt := func() reporting.Record {
		return reporting.Record{ID: uuid.New(), HotelID: hotel, BranchID: branch, RoomID: &room.RoomID, BookingID: &reservation.BookingID, Kind: "receipt", Label: "Konaklama tahsilatı", Party: "Misafir", AmountMinor: 200000, Currency: "TRY", Channel: "cash", Status: "completed", OccurredAt: now}
	}
	saved, e := service.Record(ctx, reception, receipt())
	if e != nil {
		t.Fatalf("reception receipt rejected: %v", e)
	}
	if saved.ActorID != receptionID {
		t.Fatalf("provenance lost: %+v", saved)
	}
	folio, e := repo.BookingFolio(ctx, branch, reservation.BookingID)
	if e != nil {
		t.Fatal(e)
	}
	if len(folio.Totals) != 1 || folio.Totals[0].Paid != 200000 || folio.Totals[0].Balance != 200000 {
		t.Fatalf("folio wrong: %+v", folio.Totals)
	}
	bad := receipt()
	bad.Kind = "expense"
	bad.BookingID = nil
	if _, e = service.Record(ctx, reception, bad); !errors.Is(e, constants.ErrForbidden) {
		t.Fatalf("reception expense accepted: %v", e)
	}
	bad = receipt()
	bad.BookingID = nil
	if _, e = service.Record(ctx, reception, bad); !errors.Is(e, constants.ErrForbidden) {
		t.Fatalf("booking-free receipt accepted: %v", e)
	}
	bad = receipt()
	bad.Reference = "some-account"
	if _, e = service.Record(ctx, reception, bad); !errors.Is(e, constants.ErrPayload) {
		t.Fatalf("account matching accepted: %v", e)
	}
	bad = receipt()
	bad.AmountMinor = 0
	if _, e = service.Record(ctx, reception, bad); !errors.Is(e, constants.ErrPayload) {
		t.Fatalf("zero receipt accepted: %v", e)
	}
	bad = receipt()
	bad.BranchID = otherBranch
	if _, e = service.Record(ctx, reception, bad); !errors.Is(e, constants.ErrForbidden) {
		t.Fatalf("foreign branch accepted: %v", e)
	}
	managerFree := receipt()
	managerFree.BookingID = nil
	if _, e = service.Record(ctx, manager, managerFree); e != nil {
		t.Fatalf("manager regression: %v", e)
	}
}
