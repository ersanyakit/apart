package persistence_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/catalog"
	"otel/internal/domain/features"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/infrastructure/seeding"
	"otel/internal/testdb"
	"otel/migrations"
)

func TestMandatoryCatalog(t *testing.T) {
	db := testdb.Open(t)
	ctx := context.Background()
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	if err := seeding.Run(ctx, db, "", seeding.Options{}); err != nil {
		t.Fatal(err)
	}
	count := func(table string) int64 {
		t.Helper()
		var n int64
		if err := db.Table(table).Count(&n).Error; err != nil {
			t.Fatal(err)
		}
		return n
	}
	if count("hotels") != 0 || count("users") != 0 || count("rooms") != 0 {
		t.Fatal("default seed created demo data")
	}
	if count("amenities")+count("inventory_items") != 682 {
		t.Fatal("global catalog incomplete")
	}
	// An existing hotel gets backfilled; a newly created hotel gets the same
	// vocabulary without an operator remembering to rerun a seed.
	existing := models.Hotel{HotelID: uuid.New(), FacilityInfo: models.FacilityInfo{Name: "Existing"}}
	if err := db.Create(&existing).Error; err != nil {
		t.Fatal(err)
	}
	if err := persistence.EnsureDefaultCatalog(ctx, db); err != nil {
		t.Fatal(err)
	}
	repo := persistence.New(db)
	newHotel := property.Hotel{HotelID: uuid.New(), FacilityInfo: property.FacilityInfo{Name: "New"}}
	if err := repo.SaveHotel(ctx, newHotel, true); err != nil {
		t.Fatal(err)
	}
	var standard features.Definition
	for _, hotelID := range []uuid.UUID{existing.HotelID, newHotel.HotelID} {
		r, err := repo.Registry(ctx, hotelID)
		if err != nil {
			t.Fatal(err)
		}
		if len(r.Definitions) != len(catalog.Entries()) || len(r.Categories) != 20 {
			t.Fatal("missing mandatory hotel defaults")
		}
		for _, d := range r.Definitions {
			if d.HotelID != hotelID || d.IconKey == "" || d.Required {
				t.Fatalf("invalid default: %+v", d)
			}
			if d.Code == "catalog.bathroom.linen.bath_towel" && hotelID == newHotel.HotelID {
				standard = d
			}
		}
	}
	for _, table := range []string{"property_amenities", "room_amenities", "room_inventory", "inventory_assets", "inventory_movements"} {
		if count(table) != 0 {
			t.Fatalf("seed auto-assigned %s", table)
		}
	}
	if err := repo.DeleteDefinition(ctx, standard.FeatureID, newHotel.HotelID); !errors.Is(err, constants.ErrFeatureInUse) {
		t.Fatalf("deleted standard definition: %v", err)
	}
	if err := repo.DeleteCategory(ctx, standard.CategoryID, newHotel.HotelID); !errors.Is(err, constants.ErrFeatureInUse) {
		t.Fatalf("deleted standard category: %v", err)
	}
	standard.Code = "renamed"
	if err := repo.SaveDefinition(ctx, standard, false); !errors.Is(err, constants.ErrFeatureInUse) {
		t.Fatalf("renamed standard definition: %v", err)
	}
	branch := models.Branch{BranchID: uuid.New(), HotelID: newHotel.HotelID, FacilityInfo: models.FacilityInfo{Name: "Main"}}
	if err := db.Create(&branch).Error; err != nil {
		t.Fatal(err)
	}
	room := models.Room{RoomID: uuid.New(), BranchID: branch.BranchID, Code: "101", Kind: "room", Capacity: 2}
	if err := db.Create(&room).Error; err != nil {
		t.Fatal(err)
	}
	target := features.Target{Scope: features.ScopeRoom, ID: room.RoomID, BranchID: branch.BranchID, HotelID: newHotel.HotelID}
	towel, wifi := "catalog.bathroom.linen.bath_towel", "catalog.facilities.connectivity.free_wifi"
	items := []features.Assignment{{Code: towel, Value: json.RawMessage(`4`)}, {Code: wifi, Value: json.RawMessage(`true`)}}
	if err := repo.Assign(ctx, target, items); err != nil {
		t.Fatal(err)
	}
	if count("room_inventory") != 1 || count("room_amenities") != 1 || count("inventory_movements") != 1 {
		t.Fatal("room selection projection failed")
	}
	auditCount := count("audit_logs")
	if err := seeding.Run(ctx, db, "defaults", seeding.Options{}); err != nil {
		t.Fatal(err)
	}
	if count("audit_logs") != auditCount {
		t.Fatal("unchanged catalog produced audit noise")
	}
	if count("inventory_movements") != 1 {
		t.Fatal("seed changed stock")
	}
	items[0].Value = json.RawMessage(`3`)
	if err := repo.Assign(ctx, target, items); err != nil {
		t.Fatal(err)
	}
	if err := repo.Assign(ctx, target, items); err != nil {
		t.Fatal(err)
	}
	if count("inventory_movements") != 2 {
		t.Fatal("unchanged room assignment duplicated movement")
	}
	var qty int64
	if err := db.Table("room_inventory").Where("room_id = ?", room.RoomID).Pluck("quantity", &qty).Error; err != nil || qty != 3 {
		t.Fatalf("quantity %d: %v", qty, err)
	}
	for _, invalid := range []features.Assignment{
		{Code: "catalog.safety.equipment.security_camera", Value: json.RawMessage(`1`)},
		{Code: towel, Value: json.RawMessage(`-1`)},
		{Code: towel, Value: json.RawMessage(`1.5`)},
		{Code: wifi, Value: json.RawMessage(`2`)},
	} {
		if err := repo.Assign(ctx, target, []features.Assignment{invalid}); err == nil {
			t.Fatalf("invalid selection accepted: %+v", invalid)
		}
	}
	if count("inventory_movements") != 2 || count("room_amenities") != 1 {
		t.Fatal("invalid selections changed stored state")
	}
	if err := repo.Assign(ctx, target, nil); err != nil {
		t.Fatal(err)
	}
	if count("room_inventory") != 0 || count("room_amenities") != 0 || count("inventory_movements") != 3 {
		t.Fatal("removal not reflected atomically")
	}
}
