package persistence_test

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/accommodation"
	"otel/internal/domain/audit"
	"otel/internal/domain/booking"
	"otel/internal/domain/document"
	"otel/internal/domain/guest"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/infrastructure/seeding"
	"otel/internal/testdb"
	"otel/migrations"
	"strings"
	"testing"
	"time"
)

func TestEnterpriseWorkflows(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	repo := persistence.New(db)
	if err := seeding.Run(ctx, db, "demo", seeding.Options{DemoPassword: "demo-test-password"}); err != nil {
		t.Fatal(err)
	}
	var user models.User
	if err := db.First(&user, "user_name = ?", "demo").Error; err != nil {
		t.Fatal(err)
	}
	originalHash := user.Password
	var branch models.Branch
	if err := db.First(&branch, "hotel_id = ?", user.HotelID).Error; err != nil {
		t.Fatal(err)
	}
	manager := identity.User{UserID: user.UserID, HotelID: user.HotelID, Role: constants.UserRoleManagement}
	ctx = audit.WithActor(ctx, audit.Actor{UserID: user.UserID, Command: "integration", RequestID: "test-request"})
	catalog := &application.Catalog{Properties: repo, Media: repo, Features: repo, Layout: repo, Bookings: repo}
	service := &application.Accommodation{Catalog: catalog, Layout: repo, Bookings: repo}
	beds := &application.Beds{Catalog: catalog, Repository: repo}
	guests := &application.Guests{Catalog: catalog, Repository: repo}
	staff := &application.Staff{Catalog: catalog, Repository: repo, Users: repo, Passwords: persistence.Bcrypt{}}
	docs := &application.Documents{Catalog: catalog, Repository: repo}
	createRoom := func(code string, capacity int) property.Room {
		t.Helper()
		r, err := catalog.SaveRoom(ctx, manager, property.Room{BranchID: branch.BranchID, Code: code, Kind: "room", Capacity: capacity, Rentable: true, Status: "Temiz", Position: property.Position{X: 20, Y: 20, Width: 140, Height: 100}}, true)
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	t.Run("seed repeated without overwriting credentials", func(t *testing.T) {
		var before int64
		db.Model(&models.Room{}).Count(&before)
		if err := seeding.Run(ctx, db, "demo", seeding.Options{DemoPassword: "different-password"}); err != nil {
			t.Fatal(err)
		}
		var after int64
		db.Model(&models.Room{}).Count(&after)
		if before != after {
			t.Fatalf("rooms duplicated %d -> %d", before, after)
		}
		var current models.User
		db.First(&current, "user_id = ?", user.UserID)
		if current.Password != originalHash {
			t.Fatal("seed overwrote password")
		}
		people, err := repo.LoginPeople(ctx, branch.BranchID)
		if err != nil {
			t.Fatal(err)
		}
		if len(people) != 1 || people[0].Name != "Demo" {
			t.Fatalf("public names: %+v", people)
		}
	})
	t.Run("independent sleeping places and capacities", func(t *testing.T) {
		room := createRoom("MIXED", 4)
		b, err := beds.Save(ctx, manager, accommodation.Bed{BranchID: branch.BranchID, RoomID: &room.RoomID, Code: "MIXED-B", Type: accommodation.Bunk, Structure: accommodation.BunkStructure, WidthCM: 140, LengthCM: 200, Levels: 3, Places: []accommodation.SleepingPlace{{Code: "MIXED-1", Level: 1, Position: "lower", Capacity: 2, IsActive: true, Rentable: true}, {Code: "MIXED-2", Level: 2, Position: "middle", Capacity: 1, IsActive: true, Rentable: true}, {Code: "MIXED-3", Level: 3, Position: "upper", Capacity: 2, IsActive: false, Rentable: true}}}, true)
		if err != nil {
			t.Fatal(err)
		}
		if b.SleepingCapacity() != 3 {
			t.Fatal("capacity derived from levels instead of active places")
		}
		rooms, err := repo.ListRooms(ctx, branch.BranchID)
		if err != nil {
			t.Fatal(err)
		}
		if property.EffectiveCapacity(rooms, room.RoomID) != 3 {
			t.Fatal("room capacity did not follow beds")
		}
		if err := booking.ValidateAvailability(rooms, branch.BranchID, b.Places[2].UnitID, 1, map[uuid.UUID]bool{}, false); !errors.Is(err, constants.ErrUnavailable) {
			t.Fatalf("inactive place is bookable: %v", err)
		}
		bad := b
		bad.Type = "twin"
		if _, err := beds.Save(ctx, manager, bad, false); !errors.Is(err, constants.ErrBedType) {
			t.Fatalf("twin physical type: %v", err)
		}
		// Retained places keep their identities when dimensions and capacities change.
		b.Places[0].WidthCM = 160
		b.Places[0].LengthCM = 200
		b.Places[1].Capacity = 2
		b, err = beds.Save(ctx, manager, b, false)
		if err != nil {
			t.Fatal(err)
		}
		loaded, err := repo.FindBed(ctx, b.BedID)
		if err != nil || len(loaded.Places) != 3 {
			t.Fatalf("updated places: %+v %v", loaded, err)
		}
		// Two independently booked hostel places share the same physical room.
		for i := 0; i < 2; i++ {
			stay, err := service.SaveBooking(ctx, manager, booking.Booking{BranchID: branch.BranchID, RoomID: b.Places[i].UnitID, GuestName: []string{"Hostel Bir", "Hostel İki"}[i], GuestCount: 1, CheckIn: time.Now().Add(-time.Hour), CheckOut: time.Now().Add(24 * time.Hour)}, true)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := service.Transition(ctx, manager, booking.Transition{BranchID: branch.BranchID, BookingID: stay.BookingID, Action: "check_in"}); err != nil {
				t.Fatal(err)
			}
		}
		hostel, err := guests.List(ctx, manager, guest.Query{HotelID: user.HotelID, Search: "Hostel Bir"}, false)
		if err != nil || len(hostel.Items) != 1 || len(hostel.Items[0].Companions) != 1 || hostel.Items[0].Companions[0].Name != "Hostel İki" {
			t.Fatalf("hostel companions: %+v %v", hostel, err)
		}
		all, err := guests.List(ctx, manager, guest.Query{HotelID: user.HotelID, Search: "Hostel"}, false)
		if err != nil {
			t.Fatal(err)
		}
		for _, stay := range all.Items {
			if _, err := service.Transition(ctx, manager, booking.Transition{BranchID: branch.BranchID, BookingID: stay.BookingID, Action: "check_out"}); err != nil {
				t.Fatal(err)
			}
		}
		if err := beds.Delete(ctx, manager, b.BedID); err != nil {
			t.Fatal(err)
		}
		var archivedPlaces []models.SleepingPlace
		if err := db.Unscoped().Where("bed_id = ?", b.BedID).Find(&archivedPlaces).Error; err != nil {
			t.Fatal(err)
		}
		if len(archivedPlaces) != 3 {
			t.Fatal("sleeping places physically deleted")
		}
		for _, place := range archivedPlaces {
			if !place.DeletedAt.Valid {
				t.Fatal("sleeping place not archived")
			}
		}
	})
	t.Run("staff CRUD, tenant access and first name roster", func(t *testing.T) {
		p, err := staff.Save(ctx, manager, identity.StaffInput{Staff: identity.Staff{HotelID: user.HotelID, Username: "ayse-test", FirstName: "Ayşe", LastName: "GizliSoyad", Role: constants.UserRoleReception, BranchIDs: []uuid.UUID{branch.BranchID}}, Password: "staff-test-password"}, true)
		if err != nil {
			t.Fatal(err)
		}
		people, err := repo.LoginPeople(ctx, branch.BranchID)
		if err != nil {
			t.Fatal(err)
		}
		found := false
		for _, person := range people {
			if person.UserID == p.UserID {
				found = true
				if person.Name != "Ayşe" {
					t.Fatalf("surname leaked: %+v", person)
				}
			}
		}
		if !found {
			t.Fatal("staff absent from login")
		}
		outsider := manager
		outsider.HotelID = uuid.New()
		if _, err := staff.List(ctx, outsider, user.HotelID); !errors.Is(err, constants.ErrForbidden) {
			t.Fatal("cross tenant staff access")
		}
		auth := &application.Auth{Properties: repo, Users: repo, Tokens: persistence.JWT{Secret: []byte("integration-jwt-secret-at-least-32-bytes")}, Passwords: persistence.Bcrypt{}, TTL: time.Hour}
		login, err := auth.Login(ctx, "", "staff-test-password", application.Selection{BranchID: branch.BranchID}, p.UserID)
		if err != nil {
			t.Fatal(err)
		}
		if err := staff.Delete(ctx, manager, user.HotelID, p.UserID); err != nil {
			t.Fatal(err)
		}
		if _, err := auth.Authenticate(ctx, login.Token); !errors.Is(err, constants.ErrUnauthorized) {
			t.Fatal("deleted staff session remains live")
		}
	})
	t.Run("guest search includes reservations and companions before check-in", func(t *testing.T) {
		r := createRoom("SEARCH", 2)
		b, err := service.SaveBooking(ctx, manager, booking.Booking{
			BranchID: branch.BranchID, RoomID: r.RoomID, GuestName: "İlker Arama", GuestCount: 2,
			CheckIn: time.Now().Add(48 * time.Hour), CheckOut: time.Now().Add(72 * time.Hour),
			Guests: []property.Guest{
				{Name: "İlker Arama", TCNo: "SEARCH-OWNER", Phone: "0532 123 45 67", Address: "Arama adresi", Nationality: "TR"},
				{Name: "Işık Arama", Phone: "0544 765 43 21"},
			},
		}, true)
		if err != nil {
			t.Fatal(err)
		}
		q := guest.Query{HotelID: user.HotelID, BranchID: branch.BranchID, Search: "Arama"}
		history, err := guests.List(ctx, manager, q, false)
		if err != nil || history.Total != 0 {
			t.Fatalf("unstarted reservation must not become a stay: %+v %v", history, err)
		}
		for _, term := range []string{"İLKER", "ilker", "SEARCH-OWNER", "05321234567", "Arama adresi", "IŞIK", "05447654321"} {
			q.Search = term
			found, err := guests.Search(ctx, manager, q)
			if err != nil || found.Total != 1 || len(found.Items) != 1 {
				t.Fatalf("search %q: %+v %v", term, found, err)
			}
		}
		q.Search = "Arama"
		found, err := guests.Search(ctx, manager, q)
		if err != nil || found.Total != 2 {
			t.Fatalf("both guests must be searchable: %+v %v", found, err)
		}
		// Reusing a selected guest without an identity number must preserve their profile.
		b.Guests[1].ID = found.Items[0].GuestID.String()
		for _, profile := range found.Items {
			if profile.Name == "Işık Arama" {
				b.Guests[1].ID = profile.GuestID.String()
			}
		}
		if _, err := guests.Update(ctx, manager, guest.Update{BranchID: branch.BranchID, BookingID: b.BookingID, Guests: b.Guests, GuestCount: 2}); err != nil {
			t.Fatal(err)
		}
		if _, err := service.Transition(ctx, manager, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "cancel"}); err != nil {
			t.Fatal(err)
		}
		found, err = guests.Search(ctx, manager, q)
		if err != nil || found.Total != 2 {
			t.Fatalf("cancelled reservation guests must remain searchable without duplicates: %+v %v", found, err)
		}
		q.Search = "%"
		found, err = guests.Search(ctx, manager, q)
		if err != nil || found.Total != 0 {
			t.Fatalf("wildcard must be literal: %+v %v", found, err)
		}
		outsider := manager
		outsider.HotelID = uuid.New()
		if _, err := guests.Search(ctx, outsider, q); !errors.Is(err, constants.ErrForbidden) {
			t.Fatalf("cross-hotel search: %v", err)
		}
	})
	t.Run("multiple guests, individual history, documents and soft deletion", func(t *testing.T) {
		r := createRoom("GUESTS", 4)
		target := createRoom("TARGET", 4)
		b, err := service.SaveBooking(ctx, manager, booking.Booking{BranchID: branch.BranchID, RoomID: r.RoomID, GuestName: "Ali", GuestCount: 2, CheckIn: time.Now().Add(-time.Hour), CheckOut: time.Now().Add(24 * time.Hour), Guests: []property.Guest{{Name: "Ali", TCNo: "TEST-1"}, {Name: "Ayşe", TCNo: "TEST-2"}}}, true)
		if err != nil {
			t.Fatal(err)
		}
		b, err = service.Transition(ctx, manager, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "check_in"})
		if err != nil {
			t.Fatal(err)
		}
		b, err = guests.Update(ctx, manager, guest.Update{BranchID: branch.BranchID, BookingID: b.BookingID, GuestCount: 3, Guests: append(b.Guests, property.Guest{Name: "Üçüncü Misafir"})})
		if err != nil {
			t.Fatal(err)
		}
		if len(b.Guests) != 3 {
			t.Fatal("third guest missing")
		}
		if err := service.DeleteRooms(ctx, manager, branch.BranchID, []uuid.UUID{r.RoomID, target.RoomID}); !errors.Is(err, constants.ErrStructureInUse) {
			t.Fatalf("occupied batch deletion: %v", err)
		}
		if _, err := repo.FindRoom(ctx, target.RoomID); err != nil {
			t.Fatal("failed batch partially deleted")
		}
		b, err = service.Transition(ctx, manager, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "move", TargetID: target.RoomID})
		if err != nil {
			t.Fatal(err)
		}
		history, err := guests.List(ctx, manager, guest.Query{HotelID: user.HotelID, BranchID: branch.BranchID, Search: "Ayşe"}, false)
		if err != nil {
			t.Fatal(err)
		}
		if len(history.Items) != 2 || len(history.Items[0].Companions) != 2 {
			t.Fatalf("history: %+v", history)
		}
		prepared, err := docs.Prepare(ctx, manager, document.Issue{HotelID: user.HotelID, BranchID: branch.BranchID, BookingID: b.BookingID, Kind: "reservation_receipt", Language: constants.LanguageTR}, true)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(prepared.Body, "Üçüncü Misafir") {
			t.Fatal("document omitted guests")
		}
		templates, err := docs.Templates(ctx, manager, user.HotelID)
		if err != nil {
			t.Fatal(err)
		}
		for _, template := range templates {
			if template.Kind == "reservation_receipt" {
				template.Body[constants.LanguageTR] = "Yeni metin"
				if _, err := docs.SaveTemplate(ctx, manager, template); err != nil {
					t.Fatal(err)
				}
			}
		}
		saved, err := repo.FindDocument(ctx, prepared.DocumentID)
		if err != nil || saved.Body != prepared.Body {
			t.Fatal("issued document mutated with template")
		}
		if _, err := service.Transition(ctx, manager, booking.Transition{BranchID: branch.BranchID, BookingID: b.BookingID, Action: "check_out"}); err != nil {
			t.Fatal(err)
		}
		if err := service.DeleteRooms(ctx, manager, branch.BranchID, []uuid.UUID{r.RoomID, target.RoomID}); err != nil {
			t.Fatal(err)
		}
		if _, err := repo.FindRoom(ctx, r.RoomID); !errors.Is(err, constants.ErrNotFound) {
			t.Fatal("soft deleted room visible")
		}
		var archived models.Room
		if err := db.Unscoped().First(&archived, "room_id = ?", r.RoomID).Error; err != nil || !archived.DeletedAt.Valid {
			t.Fatal("room was not archived")
		}
		history, err = guests.List(ctx, manager, guest.Query{HotelID: user.HotelID, BranchID: branch.BranchID, Search: "Ayşe"}, false)
		if err != nil || len(history.Items) != 2 {
			t.Fatalf("history lost after deletion: %+v %v", history, err)
		}
		auditService := application.Audit{Repository: repo}
		logs, err := auditService.List(ctx, manager, audit.Query{HotelID: user.HotelID, Action: "delete"})
		if err != nil {
			t.Fatal(err)
		}
		found := false
		for _, entry := range logs.Items {
			if entry.EntityID == r.RoomID && entry.ActorID == manager.UserID {
				found = true
			}
		}
		if !found {
			t.Fatal("missing hotel audit entry")
		}
		outsider := manager
		outsider.HotelID = uuid.New()
		if _, err := auditService.List(ctx, outsider, audit.Query{HotelID: user.HotelID}); !errors.Is(err, constants.ErrForbidden) {
			t.Fatal("cross tenant audit leak")
		}
	})
}
