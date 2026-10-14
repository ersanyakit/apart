package persistence_test

import (
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/audit"
	"otel/internal/domain/identity"
	"otel/internal/domain/notes"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"strings"
	"testing"
)

func TestReceptionNotesSharedBoard(t *testing.T) {
	db := testdb.Open(t)
	if e := migrations.Up(db); e != nil {
		t.Fatal(e)
	}
	hotel, other, branch, otherBranch, restricted := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	first, second := uuid.New(), uuid.New()
	for _, row := range []any{
		&models.Hotel{HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Notes hotel"}}, &models.Hotel{HotelID: other, FacilityInfo: models.FacilityInfo{Name: "Other hotel"}},
		&models.Branch{BranchID: branch, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Main"}}, &models.Branch{BranchID: restricted, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Restricted"}}, &models.Branch{BranchID: otherBranch, HotelID: other, FacilityInfo: models.FacilityInfo{Name: "Other"}},
		&models.User{UserID: first, HotelID: hotel, UserName: "notes-first", Password: "unused", UserRole: constants.UserRoleReception}, &models.User{UserID: second, HotelID: hotel, UserName: "notes-second", Password: "unused", UserRole: constants.UserRoleReception},
	} {
		if e := db.Create(row).Error; e != nil {
			t.Fatal(e)
		}
	}
	repo := persistence.New(db)
	service := application.Notes{Catalog: &application.Catalog{Properties: repo}, Repository: repo}
	u := identity.User{UserID: first, HotelID: hotel, Role: constants.UserRoleReception, BranchIDs: []uuid.UUID{branch}, DisplayName: "Ayşe"}
	v := u
	v.UserID = second
	v.DisplayName = "Can"
	ctx := audit.WithActor(context.Background(), audit.Actor{UserID: first, Command: "note.save"})
	in := notes.Input{ID: uuid.New(), HotelID: hotel, BranchID: branch, Title: "  Geç çıkış  ", Body: "204 numaralı oda", Status: "todo", Priority: "urgent"}
	saved, e := service.Save(ctx, u, in)
	if e != nil {
		t.Fatal(e)
	}
	if saved.Version != 1 || saved.Title != "Geç çıkış" || saved.CreatedByName != "Ayşe" {
		t.Fatalf("create: %+v", saved)
	}
	retry, e := service.Save(ctx, u, in)
	if e != nil || retry.ID != saved.ID || retry.Version != 1 {
		t.Fatalf("create retry: %+v %v", retry, e)
	}
	in.Title = saved.Title
	in.Version = 1
	in.Status = "doing"
	moved, e := service.Save(ctx, v, in)
	if e != nil || moved.CreatedBy != first || moved.UpdatedBy != second || moved.Version != 2 {
		t.Fatalf("team move: %+v %v", moved, e)
	}
	repeated, e := service.Save(ctx, v, in)
	if e != nil || repeated.Version != 2 {
		t.Fatalf("move retry: %+v %v", repeated, e)
	}
	in.Body = "stale overwrite"
	if _, e = service.Save(ctx, u, in); !errors.Is(e, constants.ErrNoteChanged) {
		t.Fatalf("stale edit: %v", e)
	}
	in.Body = moved.Body
	in.Version = 2
	in.Status = "done"
	in.Archived = true
	archived, e := service.Save(ctx, u, in)
	if e != nil || !archived.Archived {
		t.Fatalf("archive: %+v %v", archived, e)
	}
	q := notes.Query{HotelID: hotel, BranchID: branch, Status: "done"}
	page, e := service.List(ctx, u, q)
	if e != nil || page.Total != 0 {
		t.Fatalf("active: %+v %v", page, e)
	}
	q.Archived = true
	page, e = service.List(ctx, u, q)
	if e != nil || page.Total != 1 {
		t.Fatalf("archive list: %+v %v", page, e)
	}
	in.Version = 3
	in.Archived = false
	if _, e = service.Save(ctx, u, in); e != nil {
		t.Fatal(e)
	}
	// Never permit crossing tenant or branch scopes, even with a known note ID.
	for _, bad := range []notes.Query{{HotelID: other, BranchID: otherBranch, Status: "todo"}, {HotelID: hotel, BranchID: restricted, Status: "todo"}, {HotelID: hotel, BranchID: otherBranch, Status: "todo"}} {
		if _, e = service.List(ctx, u, bad); !errors.Is(e, constants.ErrForbidden) {
			t.Fatalf("scope: %v", e)
		}
	}
	denied := u
	denied.Role = constants.UserRoleHousekeeping
	if _, e = service.List(ctx, denied, q); !errors.Is(e, constants.ErrForbidden) {
		t.Fatalf("role: %v", e)
	}
	manager := u
	manager.Role = constants.UserRoleManagement
	foreign := in
	foreign.BranchID = restricted
	if _, e = service.Save(ctx, manager, foreign); !errors.Is(e, constants.ErrNotFound) {
		t.Fatalf("known ID wrong branch: %v", e)
	}
	invalid := in
	invalid.Title = strings.Repeat("ş", 161)
	if _, e = service.Save(ctx, u, invalid); !errors.Is(e, constants.ErrPayload) {
		t.Fatalf("length: %v", e)
	}
	invalid = in
	invalid.Status = "bad"
	if _, e = service.Save(ctx, u, invalid); !errors.Is(e, constants.ErrPayload) {
		t.Fatalf("status: %v", e)
	}
	for i := 0; i < 28; i++ {
		row := notes.Input{ID: uuid.New(), HotelID: hotel, BranchID: branch, Title: fmt.Sprintf("Test %02d", i), Body: "100% takip", Status: "todo", Priority: "normal"}
		if _, e = service.Save(ctx, u, row); e != nil {
			t.Fatal(e)
		}
	}
	q = notes.Query{HotelID: hotel, BranchID: branch, Status: "todo", Search: "100%", Page: 1}
	page, e = service.List(ctx, u, q)
	if e != nil || page.Total != 28 || len(page.Items) != 25 {
		t.Fatalf("page 1: %+v %v", page, e)
	}
	ids := map[uuid.UUID]bool{}
	for _, n := range page.Items {
		ids[n.ID] = true
	}
	q.Page = 2
	page, e = service.List(ctx, u, q)
	if e != nil || len(page.Items) != 3 {
		t.Fatalf("page 2: %+v %v", page, e)
	}
	for _, n := range page.Items {
		if ids[n.ID] {
			t.Fatal("duplicate page item")
		}
	}
	q.Search = "100_"
	q.Page = 1
	page, e = service.List(ctx, u, q)
	if e != nil || page.Total != 0 {
		t.Fatalf("search escaping: %+v %v", page, e)
	}
	var count int64
	if e = db.Model(&models.AuditLog{}).Where("entity = ? AND entity_id = ?", "reception_notes", saved.ID).Count(&count).Error; e != nil {
		t.Fatal(e)
	}
	if count != 4 {
		t.Fatalf("audit mutations, excluding retries: %d", count)
	}
	if e := (identity.Preferences{"header.kanban": true}).Validate(); e != nil {
		t.Fatalf("header preference: %v", e)
	}
}
