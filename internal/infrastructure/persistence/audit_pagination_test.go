package persistence_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/audit"
	"otel/internal/domain/identity"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
)

func TestAuditPagination(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	hotelID, otherID := uuid.New(), uuid.New()
	// Timestamps deliberately tie, exercising deterministic ID ordering.
	now := time.Now().UTC()
	var rows []models.AuditLog
	for i := 0; i < 113; i++ {
		rows = append(rows, models.AuditLog{ID: uuid.New(), HotelID: hotelID, CreatedAt: now, Action: "update", Entity: "test"})
	}
	rows = append(rows, models.AuditLog{ID: uuid.New(), HotelID: otherID, CreatedAt: now, Action: "update", Entity: "test"}, models.AuditLog{ID: uuid.New(), HotelID: hotelID, CreatedAt: now, Action: "create", Entity: "test"})
	if err := db.Create(&rows).Error; err != nil {
		t.Fatal(err)
	}
	repo := persistence.New(db)
	seen := map[uuid.UUID]bool{}
	for p := 1; p <= 5; p++ {
		result, err := repo.AuditLogs(ctx, audit.Query{HotelID: hotelID, Page: p, PageSize: 25, Action: "update"})
		if err != nil {
			t.Fatal(err)
		}
		want := 25
		if p == 5 {
			want = 13
		}
		if result.Total != 113 || result.Page != p || result.PageSize != 25 || len(result.Items) != want {
			t.Fatalf("invalid page: %+v", result)
		}
		for _, row := range result.Items {
			if seen[row.ID] || row.HotelID != hotelID {
				t.Fatal("duplicate or foreign hotel entry")
			}
			seen[row.ID] = true
		}
	}
	result, err := repo.AuditLogs(ctx, audit.Query{HotelID: hotelID, Page: 999, PageSize: 50, Action: "update"})
	if err != nil || result.Page != 3 || len(result.Items) != 13 {
		t.Fatalf("last page clamp: %+v %v", result, err)
	}
	result, err = repo.AuditLogs(ctx, audit.Query{HotelID: hotelID})
	if err != nil || result.PageSize != 100 || len(result.Items) != 100 {
		t.Fatalf("legacy default changed: %+v %v", result, err)
	}
	result, err = repo.AuditLogs(ctx, audit.Query{HotelID: hotelID, Page: 5, PageSize: 25, Action: "absent"})
	if err != nil || result.Page != 1 || result.Total != 0 || len(result.Items) != 0 {
		t.Fatalf("empty page: %+v %v", result, err)
	}
	service := application.Audit{Repository: repo}
	manager := identity.User{HotelID: hotelID, Role: constants.UserRoleManagement}
	if _, err = service.List(ctx, manager, audit.Query{HotelID: hotelID, PageSize: 10000}); !errors.Is(err, constants.ErrPayload) {
		t.Fatalf("unbounded page accepted: %v", err)
	}
	if _, err = service.List(ctx, manager, audit.Query{HotelID: otherID, PageSize: 25}); !errors.Is(err, constants.ErrForbidden) {
		t.Fatalf("foreign hotel accepted: %v", err)
	}
}
