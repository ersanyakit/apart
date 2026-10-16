package persistence_test

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/accommodation"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"otel/internal/domain/shared"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/infrastructure/seeding"
	"otel/internal/testdb"
	"otel/migrations"
	"testing"
)

func TestSetupAtomicAndIdempotent(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := seeding.Run(ctx, db, "demo", seeding.Options{DemoPassword: "demo-test-password"}); err != nil {
		t.Fatal(err)
	}
	repo := persistence.New(db)
	var actor models.User
	if err := db.First(&actor, "user_name = ?", "demo").Error; err != nil {
		t.Fatal(err)
	}
	u := identity.User{UserID: actor.UserID, HotelID: actor.HotelID, Role: constants.UserRoleManagement}
	company, err := repo.FindHotel(ctx, u.HotelID)
	if err != nil {
		t.Fatal(err)
	}
	originalName := company.Name
	company.Name = "Wizard company"
	room := property.Room{Code: "101", Kind: "dormitory", RentalMode: "beds", Status: constants.RoomClean, Position: property.Position{X: 20, Y: 20, Width: 140, Height: 100}, NewBeds: []accommodation.Bed{{Code: "101-B1", Type: accommodation.Bunk, Structure: accommodation.BunkStructure, Levels: 2, WidthCM: 140, LengthCM: 200, Places: []accommodation.SleepingPlace{{Code: "101-B1-1", Level: 1, Position: "lower", Capacity: 2, WidthCM: 140, LengthCM: 200, IsActive: true}, {Code: "101-B1-2", Level: 2, Position: "upper", Capacity: 1, WidthCM: 90, LengthCM: 200, IsActive: true}}}}}
	input := application.SetupInput{RequestID: uuid.New(), Company: company, Facility: property.Branch{FacilityInfo: property.FacilityInfo{Name: "Wizard facility"}}, Floors: []application.SetupFloor{{Key: "M", Floor: property.Floor{Code: "M", Label: shared.LocalizedString{constants.LanguageTR: "Asma Kat"}, SortOrder: 0.5, Width: 2400, Height: 2400}}}, Units: []application.SetupUnit{{Key: "room", FloorKey: "M", Room: room}}, Staff: []identity.StaffInput{{Staff: identity.Staff{Username: "wizard.reception", FirstName: "Demo", LastName: "Staff", Role: constants.UserRoleReception}, Password: "short"}}}
	var before int64
	db.Model(&models.Branch{}).Count(&before)
	if _, err := repo.Setup(ctx, u, input); err == nil {
		t.Fatal("invalid final staff must roll back entire setup")
	}
	var after int64
	db.Model(&models.Branch{}).Count(&after)
	if before != after {
		t.Fatal("partial branch remained")
	}
	unchanged, _ := repo.FindHotel(ctx, u.HotelID)
	if unchanged.Name != originalName {
		t.Fatal("company update did not roll back")
	}
	input.Staff[0].Password = "wizard-test-password"
	out, err := repo.Setup(ctx, u, input)
	if err != nil {
		t.Fatal(err)
	}
	repeat, err := repo.Setup(ctx, u, input)
	if err != nil || repeat != out {
		t.Fatalf("retry: %v %v", repeat, err)
	}
	db.Model(&models.Branch{}).Count(&after)
	if after != before+1 {
		t.Fatal("duplicate setup created another branch")
	}
	floors, err := repo.ListFloors(ctx, out.BranchID)
	if err != nil || len(floors) != 1 || floors[0].SortOrder != 0.5 {
		t.Fatalf("floors: %v %v", floors, err)
	}
	rooms, err := repo.ListRooms(ctx, out.BranchID)
	if err != nil || len(rooms) != 3 {
		t.Fatalf("rooms and sleeping places: %v %v", rooms, err)
	}
	var rentable int
	for _, r := range rooms {
		if r.Rentable {
			rentable++
		}
	}
	if rentable != 2 {
		t.Fatalf("expected only two sleeping places on sale, got %d", rentable)
	}
	people, err := repo.ListStaff(ctx, u.HotelID)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, p := range people {
		if p.Username == "wizard.reception" {
			found = len(p.BranchIDs) == 1 && p.BranchIDs[0] == out.BranchID
		}
	}
	if !found {
		t.Fatal("staff branch membership missing")
	}
	receptionist := u
	receptionist.Role = constants.UserRoleReception
	if _, err := repo.Setup(ctx, receptionist, input); err == nil {
		t.Fatal("reception cannot run setup")
	}
	input.RequestID = uuid.New()
	input.Facility.BranchID = out.BranchID
	if _, err := repo.Setup(ctx, u, input); err == nil {
		t.Fatal("populated facility must not be reinitialized")
	}
}
