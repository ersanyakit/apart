package persistence_test

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/audit"
	"otel/internal/domain/booking"
	"otel/internal/domain/guest"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"otel/internal/domain/reporting"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"strings"
	"testing"
	"time"
)

func TestSharedBlacklistAndLocalRatings(t *testing.T) {
	db := testdb.Open(t)
	if e := migrations.Up(db); e != nil {
		t.Fatal(e)
	}
	type fixture struct{ hotel, branch, room, booking, guest, user uuid.UUID }
	makeHotel := func(name string) fixture {
		f := fixture{uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()}
		now := time.Now().UTC()
		for _, v := range []any{&models.Hotel{HotelID: f.hotel, FacilityInfo: models.FacilityInfo{Name: name}}, &models.Branch{BranchID: f.branch, HotelID: f.hotel, FacilityInfo: models.FacilityInfo{Name: name + " şube"}}, &models.User{UserID: f.user, HotelID: f.hotel, UserName: name, Password: "unused", UserRole: constants.UserRoleReception}, &models.UserBranch{UserID: f.user, BranchID: f.branch, HotelID: f.hotel}, &models.Room{RoomID: f.room, BranchID: f.branch, Code: "101", Status: "Temiz", Kind: "room", Capacity: 2, Rentable: true}, &models.Booking{BookingID: f.booking, BranchID: f.branch, RoomID: f.room, UserID: f.user, CheckIn: now, CheckOut: now.Add(24 * time.Hour), Status: "checked_in", ActualCheckIn: &now}, &models.GuestProfile{GuestID: f.guest, HotelID: f.hotel, Name: "Test Misafir", TCNo: "PAS-12345", Nationality: "TR"}, &models.BookingGuest{BookingID: f.booking, GuestID: f.guest, HotelID: f.hotel, Name: "Test Misafir", JoinedAt: now}} {
			if e := db.Create(v).Error; e != nil {
				t.Fatal(e)
			}
		}
		return f
	}
	a, b := makeHotel("Otel A"), makeHotel("Otel B")
	repo := persistence.New(db)
	service := application.GuestAssessments{Catalog: &application.Catalog{Properties: repo}, Repository: repo}
	user := func(f fixture) identity.User {
		return identity.User{UserID: f.user, HotelID: f.hotel, Role: constants.UserRoleReception, BranchIDs: []uuid.UUID{f.branch}, DisplayName: "Resepsiyon"}
	}
	ctx := audit.WithActor(context.Background(), audit.Actor{UserID: a.user, Command: "guest.assess"})
	input := guest.AssessmentInput{ID: uuid.New(), HotelID: a.hotel, BranchID: a.branch, BookingID: a.booking, GuestID: a.guest, Kind: "rating", Score: 4, Reason: "Konaklama kurallarına uydu."}
	rating, e := service.Save(ctx, user(a), input)
	if e != nil {
		t.Fatal(e)
	}
	input.ID = uuid.New()
	input.Score = 5
	updated, e := service.Save(ctx, user(a), input)
	if e != nil {
		t.Fatal(e)
	}
	if rating.ID != updated.ID {
		t.Fatal("rating duplicated instead of updated")
	}
	input.ID = uuid.New()
	input.Kind = "blacklist"
	input.Score = 0
	input.Reason = "Oda eşyasına verilen hasar kayıt altına alındı."
	item, e := service.Save(ctx, user(a), input)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = service.Save(ctx, user(a), input); e != nil {
		t.Fatal("idempotent retry", e)
	}
	page, e := service.List(ctx, user(b), guest.AssessmentQuery{Page: 1, PageSize: 25})
	if e != nil || page.Total != 1 || len(page.Items) != 1 {
		t.Fatalf("cross hotel visibility: %+v %v", page, e)
	}
	if page.Items[0].CanRevoke {
		t.Fatal("foreign receptionist can revoke")
	}
	raw, _ := json.Marshal(page)
	if strings.Contains(string(raw), "PAS-12345") || strings.Contains(string(raw), "identity_key") || strings.Contains(string(raw), a.guest.String()) || strings.Contains(string(raw), a.booking.String()) {
		t.Fatal("private identity or booking exposed")
	}
	reputation, e := service.Reputation(ctx, user(b), guest.AssessmentQuery{HotelID: b.hotel, BranchID: b.branch, GuestID: b.guest})
	if e != nil {
		t.Fatal(e)
	}
	if len(reputation.Blacklist) != 1 || reputation.RatingCount != 0 {
		t.Fatalf("matching/local ratings: %+v", reputation)
	}
	own, e := service.Reputation(ctx, user(a), guest.AssessmentQuery{HotelID: a.hotel, BranchID: a.branch, GuestID: a.guest})
	if e != nil || own.RatingCount != 1 || own.Average != 5 {
		t.Fatalf("score: %+v %v", own, e)
	}
	if e = service.Revoke(ctx, user(b), guest.RevokeAssessment{ID: item.ID, Reason: "Başka otelin kaydını kaldırma"}); !errors.Is(e, constants.ErrForbidden) {
		t.Fatalf("foreign revoke: %v", e)
	}
	bad := input
	bad.ID = uuid.New()
	bad.HotelID = b.hotel
	bad.BranchID = b.branch
	if _, e = service.Save(ctx, user(b), bad); e == nil {
		t.Fatal("foreign guest write accepted")
	}
	bad = input
	bad.ID = uuid.New()
	bad.Reason = "kısa"
	if _, e = service.Save(ctx, user(a), bad); !errors.Is(e, constants.ErrPayload) {
		t.Fatal("reason not required")
	}
	housekeeper := user(a)
	housekeeper.Role = constants.UserRoleHousekeeping
	if _, e = service.List(ctx, housekeeper, guest.AssessmentQuery{}); !errors.Is(e, constants.ErrForbidden) {
		t.Fatal("unauthorized role")
	}
	exact, e := service.List(ctx, user(b), guest.AssessmentQuery{NationalID: "pas-12345", Nationality: "TR"})
	if e != nil || exact.Total != 1 {
		t.Fatalf("exact identity: %+v %v", exact, e)
	}
	wrong, e := service.List(ctx, user(b), guest.AssessmentQuery{NationalID: "pas-12345", Nationality: "DE"})
	if e != nil || wrong.Total != 0 {
		t.Fatal("passport countries mixed")
	}
	if e = service.Revoke(ctx, user(a), guest.RevokeAssessment{ID: item.ID, Reason: "Hasar telafi edildi ve kayıt geri çekildi."}); e != nil {
		t.Fatal(e)
	}
	active, e := service.List(ctx, user(b), guest.AssessmentQuery{})
	if e != nil || active.Total != 0 {
		t.Fatal("revocation not shared")
	}
	history, e := service.List(ctx, user(b), guest.AssessmentQuery{IncludeRevoked: true})
	if e != nil || history.Total != 1 || history.Items[0].RevokedAt == nil {
		t.Fatal("revocation history lost")
	}
	var n int64
	db.Model(&models.AuditLog{}).Where("entity=?", "guest_assessments").Count(&n)
	if n < 4 {
		t.Fatalf("missing audits %d", n)
	}
	// A reviewed folio becomes stale if a payment changes, and no checkout is applied.
	db.Model(&models.Booking{}).Where("booking_id=?", a.booking).Update("daily_price_minor", 10000)
	folios := application.Folios{Catalog: service.Catalog, Repository: repo}
	folio, e := folios.Get(ctx, user(a), a.branch, a.booking)
	if e != nil {
		t.Fatal(e)
	}
	accommodation := application.Accommodation{Catalog: service.Catalog, Bookings: repo, Layout: repo}
	transition := booking.Transition{BranchID: a.branch, BookingID: a.booking, Action: "check_out", FolioToken: folio.Token}
	if _, e = accommodation.Transition(ctx, user(a), transition); !errors.Is(e, constants.ErrBalanceAcknowledgement) {
		t.Fatalf("balance acknowledgement: %v", e)
	}
	if _, e = repo.AppendReportRecord(ctx, reporting.Record{ID: uuid.New(), HotelID: a.hotel, BranchID: a.branch, BookingID: &a.booking, ActorID: a.user, Kind: "receipt", Label: "Tahsilat", AmountMinor: 10000, Currency: "TRY", Status: "completed", OccurredAt: time.Now(), Measure: "piece", Priority: "normal"}); e != nil {
		t.Fatal(e)
	}
	transition.AcceptBalance = true
	if _, e = accommodation.Transition(ctx, user(a), transition); !errors.Is(e, constants.ErrFolioChanged) {
		t.Fatalf("stale review accepted: %v", e)
	}
	var saved models.Booking
	db.First(&saved, "booking_id=?", a.booking)
	if saved.Status != "checked_in" {
		t.Fatal("stale review changed stay")
	}
	folio, e = folios.Get(ctx, user(a), a.branch, a.booking)
	if e != nil {
		t.Fatal(e)
	}
	transition.FolioToken = folio.Token
	transition.AcceptBalance = false
	if _, e = accommodation.Transition(ctx, user(a), transition); e != nil {
		t.Fatal(e)
	}
	// Cancellation and room closure reasons are server-enforced and persisted.
	db.Model(&models.Booking{}).Where("booking_id=?", b.booking).Updates(map[string]any{"status": "confirmed", "actual_check_in": nil})
	cancel := booking.Transition{BranchID: b.branch, BookingID: b.booking, Action: "cancel"}
	if _, e = accommodation.Transition(ctx, user(b), cancel); !errors.Is(e, constants.ErrReasonRequired) {
		t.Fatalf("missing cancel reason: %v", e)
	}
	cancel.Reason = "Misafirin seyahat planı değişti."
	canceled, e := accommodation.Transition(ctx, user(b), cancel)
	if e != nil || canceled.CancellationReason != cancel.Reason || canceled.CancelledAt == nil {
		t.Fatalf("cancel reason %+v %v", canceled, e)
	}
	state := property.Room{RoomID: a.room, Status: "Tadilat"}
	if _, e = service.Catalog.SaveState(ctx, user(a), state); !errors.Is(e, constants.ErrReasonRequired) {
		t.Fatalf("missing renovation reason %v", e)
	}
	state.StatusReason = "Banyo tesisatı yenilenecek."
	updatedRoom, e := service.Catalog.SaveState(ctx, user(a), state)
	if e != nil || updatedRoom.StatusReason != state.StatusReason {
		t.Fatalf("renovation reason %v", e)
	}
	reports := application.Reporting{Repository: repo}
	issue, e := reports.Issue(ctx, user(a), service.Catalog, application.RoomIssueInput{ID: uuid.New(), RoomID: a.room, Description: "Banyo sıcak su musluğu çalışmıyor.", Priority: "urgent"})
	if e != nil || issue.Kind != "maintenance" || issue.Status != "open" || issue.ActorID != a.user {
		t.Fatalf("fault report: %+v %v", issue, e)
	}

}
