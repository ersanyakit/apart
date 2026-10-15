package persistence_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
)

func TestFloorCodeReuseAfterDeletion(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	repo := persistence.New(db)
	service := &application.Accommodation{Catalog: &application.Catalog{Properties: repo}, Layout: repo}
	ctx := context.Background()
	admin := identity.User{UserID: uuid.New(), Role: constants.UserRoleAdmin}
	hotel := models.Hotel{HotelID: uuid.New(), FacilityInfo: models.FacilityInfo{Name: "Test"}}
	if err := db.Create(&hotel).Error; err != nil {
		t.Fatal(err)
	}
	branch := models.Branch{BranchID: uuid.New(), HotelID: hotel.HotelID, FacilityInfo: models.FacilityInfo{Name: "Test"}}
	if err := db.Create(&branch).Error; err != nil {
		t.Fatal(err)
	}
	draft := property.Floor{BranchID: branch.BranchID, Code: "KAT 2", Width: 2400, Height: 1600}
	first, err := service.SaveFloor(ctx, admin, draft, true)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := service.SaveFloor(ctx, admin, draft, true); !errors.Is(err, constants.ErrFloorCodeExists) {
		t.Fatalf("active duplicate should return a specific error: %v", err)
	}
	if err := repo.DeleteFloor(ctx, first.FloorID); err != nil {
		t.Fatal(err)
	}
	second, err := service.SaveFloor(ctx, admin, draft, true)
	if err != nil {
		t.Fatalf("recreate deleted KAT 2: %v", err)
	}
	if second.FloorID == first.FloorID {
		t.Fatal("new floor must not reuse the historical identity")
	}
	second.SortOrder = 0.5
	if _, err := service.SaveFloor(ctx, admin, second, false); err != nil {
		t.Fatal(err)
	}
	visible, err := repo.ListFloors(ctx, branch.BranchID)
	if err != nil || len(visible) != 1 || visible[0].FloorID != second.FloorID || visible[0].SortOrder != 0.5 {
		t.Fatalf("visible floors: %v, %v", visible, err)
	}
	var historical models.Floor
	if err := db.Unscoped().First(&historical, "floor_id = ?", first.FloorID).Error; err != nil {
		t.Fatal(err)
	}
	if !historical.DeletedAt.Valid {
		t.Fatal("deleted floor history must be retained")
	}
	// The database must enforce the same rule even outside the service.
	duplicate := models.Floor{FloorID: uuid.New(), BranchID: branch.BranchID, Code: draft.Code, Width: 2400, Height: 1600}
	if err := db.Omit("Branch").Create(&duplicate).Error; err == nil {
		t.Fatal("database accepted duplicate active code")
	}
	otherDraft := draft
	otherDraft.Code = "KAT 3"
	third, err := service.SaveFloor(ctx, admin, otherDraft, true)
	if err != nil {
		t.Fatal(err)
	}
	third.Code = draft.Code
	if _, err := service.SaveFloor(ctx, admin, third, false); !errors.Is(err, constants.ErrFloorCodeExists) {
		t.Fatalf("rename collision: %v", err)
	}
}
