package persistence_test

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/features"
	"otel/internal/domain/identity"
	"otel/internal/domain/shared"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"testing"
)

func TestCustomFeatureDeletion(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	hotel := models.Hotel{HotelID: uuid.New(), FacilityInfo: models.FacilityInfo{Name: "Feature test"}}
	if err := db.Create(&hotel).Error; err != nil {
		t.Fatal(err)
	}
	branch := models.Branch{BranchID: uuid.New(), HotelID: hotel.HotelID, FacilityInfo: models.FacilityInfo{Name: "Main"}}
	if err := db.Create(&branch).Error; err != nil {
		t.Fatal(err)
	}
	repo := persistence.New(db)
	service := application.Features{Repository: repo, Catalog: &application.Catalog{Properties: repo}}
	manager := identity.User{UserID: uuid.New(), HotelID: hotel.HotelID, Role: constants.UserRoleManagement}
	category, err := service.SaveCategory(ctx, manager, features.Category{HotelID: hotel.HotelID, Code: "CUSTOM", Label: shared.LocalizedString{constants.LanguageTR: "Özel"}}, true)
	if err != nil {
		t.Fatal(err)
	}
	def, err := service.SaveDefinition(ctx, manager, features.Definition{HotelID: hotel.HotelID, CategoryID: category.CategoryID, Code: "CUSTOM_WIFI", Label: shared.LocalizedString{constants.LanguageTR: "Özel ağ"}, ValueType: features.TypeBoolean, Scopes: []features.Scope{features.ScopeProperty}}, true)
	if err != nil {
		t.Fatal(err)
	}
	if err := repo.DeleteCategory(ctx, category.CategoryID, uuid.New()); !errors.Is(err, constants.ErrNotFound) {
		t.Fatalf("cross-hotel deletion: %v", err)
	}
	if err := repo.DeleteDefinition(ctx, def.FeatureID, uuid.New()); !errors.Is(err, constants.ErrNotFound) {
		t.Fatalf("cross-hotel definition deletion: %v", err)
	}
	if err := service.DeleteCategory(ctx, manager, hotel.HotelID, category.CategoryID); !errors.Is(err, constants.ErrCategoryInUse) {
		t.Fatalf("nonempty category: %v", err)
	}
	receptionist := manager
	receptionist.Role = constants.UserRoleReception
	if err := service.DeleteCategory(ctx, receptionist, hotel.HotelID, category.CategoryID); !errors.Is(err, constants.ErrForbidden) {
		t.Fatalf("permission: %v", err)
	}
	if err := service.DeleteDefinition(ctx, receptionist, hotel.HotelID, def.FeatureID); !errors.Is(err, constants.ErrForbidden) {
		t.Fatalf("permission: %v", err)
	}
	target := features.Target{Scope: features.ScopeProperty, ID: branch.BranchID, BranchID: branch.BranchID, HotelID: hotel.HotelID}
	if err := repo.Assign(ctx, target, []features.Assignment{{Code: def.Code, Value: json.RawMessage(`true`)}}); err != nil {
		t.Fatal(err)
	}
	if err := service.DeleteDefinition(ctx, manager, hotel.HotelID, def.FeatureID); !errors.Is(err, constants.ErrFeatureAssigned) {
		t.Fatalf("assigned deletion: %v", err)
	}
	if err := repo.Assign(ctx, target, nil); err != nil {
		t.Fatal(err)
	}
	if err := service.DeleteDefinition(ctx, manager, hotel.HotelID, def.FeatureID); err != nil {
		t.Fatal(err)
	}
	if err := service.DeleteCategory(ctx, manager, hotel.HotelID, category.CategoryID); err != nil {
		t.Fatal(err)
	}
	registry, err := repo.Registry(ctx, hotel.HotelID)
	if err != nil || len(registry.Categories) != 0 || len(registry.Definitions) != 0 {
		t.Fatalf("deleted records visible: %+v %v", registry, err)
	}
	def.FeatureID = uuid.New()
	if err := repo.SaveDefinition(ctx, def, true); !errors.Is(err, constants.ErrNotFound) {
		t.Fatalf("stale category accepted: %v", err)
	}
	var events int64
	db.Model(&models.AuditLog{}).Where("entity_id IN ? AND action = ?", []uuid.UUID{category.CategoryID, def.FeatureID}, "delete").Count(&events)
	if events != 1 {
		t.Fatalf("missing category audit: %d", events)
	}
}
