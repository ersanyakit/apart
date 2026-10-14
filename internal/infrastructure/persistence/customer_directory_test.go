package persistence_test

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/guest"
	"otel/internal/domain/identity"
	"otel/internal/domain/reporting"
	fileexport "otel/internal/infrastructure/export"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/internal/testdb"
	"otel/migrations"
	"testing"
	"time"
)

func TestCustomerDirectoryUniquePaginationAndIsolation(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	hotel, other, branch := uuid.New(), uuid.New(), uuid.New()
	for _, v := range []any{&models.Hotel{HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Customer hotel"}}, &models.Hotel{HotelID: other, FacilityInfo: models.FacilityInfo{Name: "Other hotel"}}, &models.Branch{BranchID: branch, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Branch"}}} {
		if err := db.Create(v).Error; err != nil {
			t.Fatal(err)
		}
	}
	now := time.Now()
	profiles := []models.GuestProfile{}
	for i := 0; i < 103; i++ {
		profiles = append(profiles, models.GuestProfile{GuestID: uuid.New(), HotelID: hotel, Name: fmt.Sprintf("Müşteri %03d", i), TCNo: fmt.Sprintf("ID-%03d", i), Nationality: "TR", UpdatedAt: now})
	}
	// Same identity twice, anonymous namesakes, foreign nationality with the same
	// document number, deleted customer, and another tenant must stay distinguishable.
	profiles = append(profiles,
		models.GuestProfile{GuestID: uuid.New(), HotelID: hotel, Name: "Eski isim", TCNo: " id-000 ", Nationality: "tr", UpdatedAt: now.Add(-time.Hour)},
		models.GuestProfile{GuestID: uuid.New(), HotelID: hotel, Name: "Aynı isim"},
		models.GuestProfile{GuestID: uuid.New(), HotelID: hotel, Name: "Aynı isim"},
		models.GuestProfile{GuestID: uuid.New(), HotelID: hotel, Name: "Yabancı", TCNo: "id-000", Nationality: "DE"},
		models.GuestProfile{GuestID: uuid.New(), HotelID: other, Name: "Başka otel"},
	)
	if err := db.Create(&profiles).Error; err != nil {
		t.Fatal(err)
	}
	deleted := models.GuestProfile{GuestID: uuid.New(), HotelID: hotel, Name: "Silinmiş"}
	if err := db.Create(&deleted).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Delete(&deleted).Error; err != nil {
		t.Fatal(err)
	}
	repo := persistence.New(db)
	service := application.Guests{Catalog: &application.Catalog{Properties: repo}, Repository: repo}
	manager := identity.User{UserID: uuid.New(), HotelID: hotel, Role: constants.UserRoleManagement}
	query := guest.Query{HotelID: hotel, Unique: true, PageSize: 25}
	seen := map[uuid.UUID]bool{}
	for page := 1; page <= 5; page++ {
		query.Page = page
		result, err := service.Search(context.Background(), manager, query)
		if err != nil {
			t.Fatal(err)
		}
		if result.Total != 106 {
			t.Fatalf("unique total=%d", result.Total)
		}
		for _, p := range result.Items {
			if seen[p.GuestID] {
				t.Fatal("customer repeated between pages")
			}
			seen[p.GuestID] = true
			if p.Name == "Eski isim" || p.Name == "Başka otel" || p.Name == "Silinmiş" {
				t.Fatalf("unexpected profile: %s", p.Name)
			}
		}
	}
	if len(seen) != 106 {
		t.Fatalf("only %d customers returned", len(seen))
	}
	// Exports must ignore the current directory page and reuse deduplication.
	reports := application.Reports{Guests: &service, Exporter: fileexport.Renderer{}}
	exportQuery := query
	exportQuery.Format = "xlsx"
	exported, err := reports.ExportCustomers(context.Background(), manager, exportQuery)
	if err != nil {
		t.Fatal(err)
	}
	workbook, err := excelize.OpenReader(bytes.NewReader(exported.Data))
	if err != nil {
		t.Fatal(err)
	}
	exportedRows, err := workbook.GetRows("Müşteriler")
	workbook.Close()
	if err != nil || len(exportedRows) != 107 {
		t.Fatalf("export incorrectly used current page: %d %v", len(exportedRows), err)
	}
	exportQuery.Search = "ID-000"
	exportQuery.Format = "pdf"
	exported, err = reports.ExportCustomers(context.Background(), manager, exportQuery)
	if err != nil || !bytes.HasPrefix(exported.Data, []byte("%PDF-")) {
		t.Fatalf("filtered PDF: %v", err)
	}
	exportQuery.Format = "xlsx"
	exported, err = reports.ExportCustomers(context.Background(), manager, exportQuery)
	if err != nil {
		t.Fatal(err)
	}
	workbook, err = excelize.OpenReader(bytes.NewReader(exported.Data))
	if err != nil {
		t.Fatal(err)
	}
	exportedRows, err = workbook.GetRows("Müşteriler")
	workbook.Close()
	if err != nil || len(exportedRows) != 3 {
		t.Fatalf("export filter lost: %d %v", len(exportedRows), err)
	}
	exportQuery.HotelID = other
	if _, err = reports.ExportCustomers(context.Background(), manager, exportQuery); !errors.Is(err, constants.ErrForbidden) {
		t.Fatalf("foreign export: %v", err)
	}
	query.Page = 1
	query.Search = "ID-000"
	result, err := service.Search(context.Background(), manager, query)
	if err != nil || result.Total != 2 {
		t.Fatalf("identity search: %+v %v", result, err)
	}
	query.Search = "Aynı isim"
	result, err = service.Search(context.Background(), manager, query)
	if err != nil || result.Total != 2 {
		t.Fatalf("namesakes: %+v %v", result, err)
	}
	query.Search = ""
	query.BranchID = branch
	result, err = service.Search(context.Background(), manager, query)
	if err != nil || result.Total != 0 {
		t.Fatalf("unlinked customers in branch: %+v %v", result, err)
	}
	query.BranchID = uuid.Nil
	query.HotelID = other
	if _, err = service.Search(context.Background(), manager, query); !errors.Is(err, constants.ErrForbidden) {
		t.Fatalf("cross-hotel access: %v", err)
	}
}

func TestCustomerDetailsMergeHistoryAndPaginateComments(t *testing.T) {
	db := testdb.Open(t)
	if err := migrations.Up(db); err != nil {
		t.Fatal(err)
	}
	hotel, other, branch, branch2, user, customer, old, anonymous := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	create := func(v any) {
		t.Helper()
		if err := db.Create(v).Error; err != nil {
			t.Fatal(err)
		}
	}
	create(&models.Hotel{HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Our hotel"}})
	create(&models.Hotel{HotelID: other, FacilityInfo: models.FacilityInfo{Name: "Other hotel"}})
	create(&models.Branch{BranchID: branch, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "First branch"}})
	create(&models.Branch{BranchID: branch2, HotelID: hotel, FacilityInfo: models.FacilityInfo{Name: "Second branch"}})
	create(&models.User{UserID: user, HotelID: hotel, UserName: "details-manager", Password: "unused", UserRole: constants.UserRoleManagement})
	create(&models.GuestProfile{GuestID: customer, HotelID: hotel, Name: "Ayşe", TCNo: "CUSTOMER-1", Nationality: "TR"})
	create(&models.GuestProfile{GuestID: old, HotelID: hotel, Name: "Ayşe eski kart", TCNo: " customer-1 ", Nationality: "tr"})
	create(&models.GuestProfile{GuestID: anonymous, HotelID: hotel, Name: "Ayşe"})
	room, room2 := uuid.New(), uuid.New()
	create(&models.Room{RoomID: room, BranchID: branch, Code: "101", Status: "Temiz", Kind: "room", Capacity: 2, Rentable: true})
	create(&models.Room{RoomID: room2, BranchID: branch2, Code: "201", Status: "Temiz", Kind: "room", Capacity: 2, Rentable: true})
	first := time.Date(2024, 1, 1, 12, 0, 0, 0, time.UTC)
	for i := 0; i < 61; i++ {
		at := first.AddDate(0, 0, i*3)
		end := at.Add(24 * time.Hour)
		id, guestID, bid, rid := uuid.New(), customer, branch, room
		if i%2 == 1 {
			guestID = old
			bid = branch2
			rid = room2
		}
		create(&models.Booking{BookingID: id, BranchID: bid, RoomID: rid, UserID: user, Status: "completed", DailyPriceMinor: 123456, CheckIn: at, CheckOut: end.Add(48 * time.Hour), ActualCheckIn: &at, ActualCheckOut: &end, Notes: "Rezervasyon özel notu", GuestDetails: []models.RoomGuest{{ID: guestID.String(), Name: "Ayşe", Note: "Müşteri özel notu"}}})
		if i%2 == 1 {
			create(&reporting.Record{ID: uuid.New(), HotelID: hotel, BranchID: bid, BookingID: &id, Kind: "booking_details", Currency: "EUR", OccurredAt: at, CreatedAt: at})
		}
		create(&reporting.Record{ID: uuid.New(), HotelID: hotel, BranchID: bid, BookingID: &id, Kind: "booking_details", Currency: "USD", VoidedAt: &end, OccurredAt: at, CreatedAt: at})
		create(&models.BookingAllocation{AllocationID: uuid.New(), BookingID: id, BranchID: bid, RoomID: rid, Start: at, End: end})
		create(&models.BookingGuest{BookingID: id, GuestID: guestID, HotelID: hotel, Name: "Ayşe", JoinedAt: at})
		create(&guest.Assessment{ID: uuid.New(), HotelID: hotel, BranchID: bid, BookingID: id, GuestID: guestID, ActorID: user, ActorName: "Resepsiyon", Kind: "rating", Score: 4, Reason: "Sorunsuz konakladı, tekrar bekleriz.", CreatedAt: at, UpdatedAt: at})
	}
	repo := persistence.New(db)
	catalog := &application.Catalog{Properties: repo}
	guests := application.Guests{Catalog: catalog, Repository: repo}
	assessments := application.GuestAssessments{Catalog: catalog, Repository: repo}
	manager := identity.User{UserID: user, HotelID: hotel, Role: constants.UserRoleManagement}
	ctx := context.Background()
	query := guest.Query{HotelID: hotel, GuestID: customer, Unique: true, Page: 1, PageSize: 25, Sort: "start", Desc: true}
	history, err := guests.List(ctx, manager, query, false)
	if err != nil || history.Total != 61 || len(history.Items) != 25 {
		t.Fatalf("full history: %+v %v", history, err)
	}
	for _, item := range history.Items {
		wantCurrency := "TRY"
		if item.BranchID == branch2 {
			wantCurrency = "EUR"
		}
		if item.DailyPriceMinor != 123456 || item.BookingNights != 3 || item.LodgingAmountMinor != 370368 || item.Currency != wantCurrency {
			t.Fatalf("agreed lodging price/currency must survive early checkout: %+v", item)
		}
		if item.BookingNotes != "Rezervasyon özel notu" || item.GuestNote != "Müşteri özel notu" {
			t.Fatalf("missing notes: %+v", item)
		}
	}
	if !history.Items[0].Start.After(history.Items[1].Start) {
		t.Fatal("history must show newest first")
	}
	query.BranchID = branch2
	history, err = guests.List(ctx, manager, query, false)
	if err != nil || history.Total != 30 {
		t.Fatalf("old profile branch history: %+v %v", history, err)
	}
	query.BranchID = uuid.Nil
	query.GuestID = anonymous
	history, err = guests.List(ctx, manager, query, false)
	if err != nil || history.Total != 0 {
		t.Fatalf("namesake must not acquire history: %+v %v", history, err)
	}
	aq := guest.AssessmentQuery{HotelID: hotel, GuestID: customer, Unique: true, PageSize: 25}
	seen := map[uuid.UUID]bool{}
	for page := 1; page <= 3; page++ {
		aq.Page = page
		rep, err := assessments.Reputation(ctx, manager, aq)
		if err != nil || rep.RatingCount != 61 || rep.Average != 4 {
			t.Fatalf("comments: %+v %v", rep, err)
		}
		for _, comment := range rep.Ratings {
			if seen[comment.ID] {
				t.Fatal("duplicate comment between pages")
			}
			seen[comment.ID] = true
		}
	}
	if len(seen) != 61 {
		t.Fatalf("truncated comments: %d", len(seen))
	}
	aq.GuestID = anonymous
	aq.Page = 1
	rep, err := assessments.Reputation(ctx, manager, aq)
	if err != nil || rep.RatingCount != 0 {
		t.Fatalf("unlinked customer: %+v %v", rep, err)
	}
	aq.GuestID = customer
	reception := manager
	reception.Role = constants.UserRoleReception
	reception.BranchIDs = []uuid.UUID{branch}
	if _, err := assessments.Reputation(ctx, reception, aq); !errors.Is(err, constants.ErrForbidden) {
		t.Fatalf("unscoped reception read: %v", err)
	}
	aq.HotelID = other
	if _, err := assessments.Reputation(ctx, manager, aq); !errors.Is(err, constants.ErrForbidden) {
		t.Fatalf("foreign hotel read: %v", err)
	}
	aq.HotelID = hotel
	aq.GuestID = uuid.New()
	if _, err := assessments.Reputation(ctx, manager, aq); err == nil {
		t.Fatal("unknown guest must not succeed")
	}
	aq.GuestID = customer
	aq.PageSize = 1000
	if _, err := assessments.Reputation(ctx, manager, aq); !errors.Is(err, constants.ErrPayload) {
		t.Fatalf("unbounded comments request: %v", err)
	}
}
