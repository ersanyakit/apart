package persistence_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/audit"
	"otel/internal/domain/booking"
	"otel/internal/domain/features"
	"otel/internal/domain/guest"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/infrastructure/seeding"
	"otel/internal/testdb"
	"otel/migrations"
)

func TestAuditOperations(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	if err := seeding.Run(context.Background(), db, "demo", seeding.Options{DemoPassword: "audit-test-password"}); err != nil {
		t.Fatal(err)
	}
	repo := persistence.New(db)
	var user models.User
	if err := db.First(&user, "user_name = ?", "demo").Error; err != nil {
		t.Fatal(err)
	}
	var branch models.Branch
	if err := db.First(&branch, "hotel_id = ?", user.HotelID).Error; err != nil {
		t.Fatal(err)
	}
	actor := audit.Actor{UserID: user.UserID, Command: constants.CMD_BOOKING_TRANSITION, RequestID: "audit-test-request"}
	ctx := audit.WithActor(context.Background(), actor)
	manager := identity.User{UserID: user.UserID, HotelID: user.HotelID, Role: constants.UserRoleManagement}
	catalog := &application.Catalog{Properties: repo, Media: repo, Features: repo, Layout: repo, Bookings: repo}
	service := &application.Accommodation{Catalog: catalog, Layout: repo, Bookings: repo}
	room := func(code string) property.Room {
		t.Helper()
		r, err := catalog.SaveRoom(ctx, manager, property.Room{BranchID: branch.BranchID, Code: code, Kind: "room", Capacity: 2, Rentable: true, Status: "Temiz", Position: property.Position{Width: 140, Height: 100}}, true)
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	r1, r2 := room("AUDIT-1"), room("AUDIT-2")
	newBooking := func(roomID uuid.UUID) booking.Booking {
		t.Helper()
		b, err := service.SaveBooking(ctx, manager, booking.Booking{BranchID: branch.BranchID, RoomID: roomID, GuestName: "Audit Guest", GuestCount: 10, DailyPriceMinor: 12345, CheckIn: time.Now().Add(-time.Hour), CheckOut: time.Now().Add(48 * time.Hour)}, true)
		if err != nil {
			t.Fatal(err)
		}
		return b
	}
	b := newBooking(r1.RoomID)
	transition := func(action string, target uuid.UUID) {
		t.Helper()
		if _, err := service.Transition(ctx, manager, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: action, TargetID: target}); err != nil {
			t.Fatal(err)
		}
		var logs []models.AuditLog
		if err := db.Where("entity_id = ? AND action = ?", b.BookingID, action).Find(&logs).Error; err != nil {
			t.Fatal(err)
		}
		if len(logs) != 1 {
			t.Fatalf("%s: expected one booking event, got %d", action, len(logs))
		}
		log := logs[0]
		if log.ActorID != user.UserID || log.RequestID != actor.RequestID || log.Command != actor.Command || log.HotelID != user.HotelID {
			t.Fatalf("missing actor context: %+v", log)
		}
		if log.Details["before"] == nil || log.Details["after"] == nil {
			t.Fatalf("missing before/after: %+v", log.Details)
		}
		previous := log.Details["before_location"].(map[string]any)
		next := log.Details["after_location"].(map[string]any)
		code := "AUDIT-1"
		if action == "move" || action == "check_out" {
			code = "AUDIT-2"
		}
		if next["code"] != code || next["branch_name"] != branch.Name || next["source"] != "event" {
			t.Fatalf("missing room identity for %s: %+v", action, log.Details)
		}
		if action == "move" && previous["code"] != "AUDIT-1" {
			t.Fatalf("move lost original room: %+v", previous)
		}
	}
	transition("check_in", uuid.Nil)
	if _, err := repo.UpdateBookingGuests(ctx, guest.Update{BranchID: branch.BranchID, BookingID: b.BookingID, GuestCount: 20, Guests: b.Guests}); err != nil {
		t.Fatalf("room guest count must remain flexible after check-in: %v", err)
	}
	transition("move", r2.RoomID)
	transition("check_out", uuid.Nil)
	b = newBooking(r1.RoomID)
	transition("cancel", uuid.Nil)
	var before int64
	db.Model(&models.AuditLog{}).Count(&before)
	if _, err := service.Transition(ctx, manager, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "check_out"}); err == nil {
		t.Fatal("invalid transition succeeded")
	}
	var after int64
	db.Model(&models.AuditLog{}).Count(&after)
	if after != before {
		t.Fatal("failed transition wrote a success log")
	}

	assignmentActor := actor
	assignmentActor.RequestID = "feature-test"
	if err := repo.Assign(audit.WithActor(ctx, assignmentActor), features.Target{HotelID: user.HotelID, BranchID: branch.BranchID, Scope: features.ScopeRoom, ID: r1.RoomID}, nil); err != nil {
		t.Fatal(err)
	}
	var assignments int64
	db.Model(&models.AuditLog{}).Where("entity_id = ? AND action = ? AND request_id = ?", r1.RoomID, "assign", "feature-test").Count(&assignments)
	if assignments != 1 {
		t.Fatal("feature assignment not logged")
	}

	auth := application.Auth{Properties: repo, Users: repo, Tokens: persistence.JWT{Secret: []byte("audit-test-jwt-secret-at-least-32-bytes")}, Passwords: persistence.Bcrypt{}, TTL: time.Hour}
	login, err := auth.Login(ctx, "demo", "audit-test-password", application.Selection{})
	if err != nil {
		t.Fatal(err)
	}
	loggedIn, err := auth.Authenticate(ctx, login.Token)
	if err != nil {
		t.Fatal(err)
	}
	if err := auth.Logout(ctx, loggedIn); err != nil {
		t.Fatal(err)
	}
	for _, action := range []string{"login", "logout"} {
		var entry models.AuditLog
		if err := db.First(&entry, "action = ? AND actor_id = ?", action, user.UserID).Error; err != nil {
			t.Fatal(err)
		}
		if entry.Command != "auth."+action || entry.RequestID != actor.RequestID {
			t.Fatalf("bad auth audit: %+v", entry)
		}
		payload, _ := json.Marshal(entry.Details)
		if string(payload) != "null" {
			t.Fatalf("auth details should not include credentials: %s", payload)
		}
	}

	// Audit failure must roll back the business change, not merely return an error.
	b = newBooking(r1.RoomID)
	if err := db.Exec(`CREATE FUNCTION reject_cancel_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'cancel' THEN RAISE EXCEPTION 'audit write rejected'; END IF; RETURN NEW; END $$`).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`CREATE TRIGGER reject_cancel_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_cancel_audit()`).Error; err != nil {
		t.Fatal(err)
	}
	if _, err := service.Transition(ctx, manager, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "cancel"}); err == nil {
		t.Fatal("operation committed despite audit failure")
	}
	var persisted models.Booking
	if err := db.First(&persisted, "booking_id = ?", b.BookingID).Error; err != nil {
		t.Fatal(err)
	}
	if persisted.Status != booking.Confirmed {
		t.Fatal("booking change not rolled back")
	}

	// Historical event labels survive a later room rename and soft deletion.
	if err := db.Model(&models.Room{}).Where("room_id = ?", r2.RoomID).Update("code", "AUDIT-RENAMED").Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Delete(&models.Room{}, "room_id = ?", r2.RoomID).Error; err != nil {
		t.Fatal(err)
	}
	legacy := models.AuditLog{ID: uuid.New(), HotelID: user.HotelID, Entity: "rooms", EntityID: r2.RoomID, Action: "update", CreatedAt: time.Now()}
	if err := db.Create(&legacy).Error; err != nil {
		t.Fatal(err)
	}
	page, err := repo.AuditLogs(ctx, audit.Query{HotelID: user.HotelID, Action: "move"})
	if err != nil || len(page.Items) != 1 {
		t.Fatalf("move audit page: %+v %v", page, err)
	}
	if page.Items[0].Details["after_location"].(map[string]any)["code"] != "AUDIT-2" {
		t.Fatal("historical room code changed after rename")
	}
	page, err = repo.AuditLogs(ctx, audit.Query{HotelID: user.HotelID, Action: "update"})
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, entry := range page.Items {
		if entry.ID != legacy.ID {
			continue
		}
		payload, _ := json.Marshal(entry.Details["location"])
		var location map[string]any
		if err := json.Unmarshal(payload, &location); err != nil {
			t.Fatal(err)
		}
		if location["code"] != "AUDIT-RENAMED" || location["source"] != "current_record" {
			t.Fatalf("legacy room fallback: %+v", location)
		}
		found = true
	}
	if !found {
		t.Fatal("legacy log missing")
	}
	var unchanged models.AuditLog
	if err := db.First(&unchanged, "id = ?", legacy.ID).Error; err != nil {
		t.Fatal(err)
	}
	if unchanged.Details != nil {
		t.Fatal("reading logs must not rewrite history")
	}
}
