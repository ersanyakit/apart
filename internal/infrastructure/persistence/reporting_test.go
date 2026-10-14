package persistence_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/audit"
	"otel/internal/domain/identity"
	"otel/internal/domain/reporting"
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
}
