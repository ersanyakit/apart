package application

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/booking"
	"otel/internal/domain/document"
	"otel/internal/domain/identity"
	"strings"
	"time"
)

type Documents struct {
	Catalog    *Catalog
	Repository document.Repository
	Exporter   Exporter
}

func (s *Documents) Templates(ctx context.Context, u identity.User, hotelID uuid.UUID) ([]document.Template, error) {
	if !canBook(u) || !u.CanAccessHotel(hotelID) {
		return nil, constants.ErrForbidden
	}
	return s.Repository.Templates(ctx, hotelID)
}
func (s *Documents) SaveTemplate(ctx context.Context, u identity.User, t document.Template) (document.Template, error) {
	if !u.IsManager() || !u.CanAccessHotel(t.HotelID) {
		return t, constants.ErrForbidden
	}
	if err := t.Validate(); err != nil {
		return t, err
	}
	return s.Repository.SaveTemplate(ctx, t)
}
func (s *Documents) List(ctx context.Context, u identity.User, q document.Query) ([]document.Document, error) {
	if !canBook(u) || !u.CanAccessHotel(q.HotelID) {
		return nil, constants.ErrForbidden
	}
	if q.BranchID == uuid.Nil && !u.IsManager() {
		return nil, constants.ErrBranchRequired
	}
	if q.BranchID != uuid.Nil {
		b, err := s.Catalog.Branch(ctx, u, q.BranchID)
		if err != nil {
			return nil, err
		}
		if b.HotelID != q.HotelID {
			return nil, constants.ErrForbidden
		}
	}
	return s.Repository.ListDocuments(ctx, q)
}
func (s *Documents) Prepare(ctx context.Context, u identity.User, in document.Issue, save bool) (document.Document, error) {
	empty := document.Document{}
	if !canBook(u) || !u.CanAccessHotel(in.HotelID) {
		return empty, constants.ErrForbidden
	}
	branch, err := s.Catalog.Branch(ctx, u, in.BranchID)
	if err != nil {
		return empty, err
	}
	if branch.HotelID != in.HotelID {
		return empty, constants.ErrForbidden
	}
	if !in.Language.IsValid() {
		return empty, constants.ErrLanguage
	}
	templates, err := s.Repository.Templates(ctx, in.HotelID)
	if err != nil {
		return empty, err
	}
	var template document.Template
	for _, t := range templates {
		if t.Kind == in.Kind {
			template = t
			break
		}
	}
	if template.TemplateID == uuid.Nil || template.Title[in.Language] == "" || template.Body[in.Language] == "" {
		return empty, constants.ErrDocumentTranslation
	}
	rows, err := s.Catalog.Bookings.ListBookings(ctx, booking.Query{BranchID: in.BranchID, BookingID: in.BookingID})
	if err != nil {
		return empty, err
	}
	if len(rows) != 1 {
		return empty, constants.ErrNotFound
	}
	b := rows[0]
	if (in.Kind == "cancellation_receipt" && b.Status != booking.Cancelled) || (in.Kind != "cancellation_receipt" && b.Status == booking.Cancelled) {
		return empty, constants.ErrBookingState
	}
	if in.AmountMinor < 0 || in.AmountMinor > 100000000000 || len(in.Reference) > 200 {
		return empty, constants.ErrDocumentPayment
	}
	if in.Kind == "sale_receipt" {
		if in.AmountMinor < 1 || in.PaidAt == nil || in.PaidAt.After(time.Now().Add(time.Minute)) {
			return empty, constants.ErrDocumentPayment
		}
		switch in.PaymentMethod {
		case "cash", "card", "bank_transfer":
		default:
			return empty, constants.ErrDocumentPayment
		}
		switch in.Currency {
		case "TRY", "EUR", "USD", "GBP":
		default:
			return empty, constants.ErrDocumentPayment
		}
	}
	hotel, err := s.Catalog.Properties.FindHotel(ctx, in.HotelID)
	if err != nil {
		return empty, err
	}
	roomCode, err := s.Repository.HistoricalRoomCode(ctx, b.BranchID, b.RoomID)
	if err != nil {
		return empty, err
	}
	zone, _ := time.LoadLocation("Europe/Istanbul")
	names := []string{}
	identities := []string{}
	phones := []string{}
	relations := []string{}
	for _, g := range b.Guests {
		names = append(names, g.Name)
		identities = append(identities, g.TCNo)
		phones = append(phones, g.Phone)
		relations = append(relations, g.Relationship)
	}
	inventory := []string{}
	for _, item := range hotel.Inventory {
		inventory = append(inventory, item.Name)
	}
	paidAt := ""
	if in.PaidAt != nil {
		paidAt = in.PaidAt.In(zone).Format("02.01.2006 15:04")
	}
	values := map[string]string{"hotel_name": hotel.Name, "branch_name": branch.Name, "room_code": roomCode, "guest_name": b.GuestName, "guest_names": strings.Join(names, ", "), "id_numbers": strings.Join(identities, ", "), "phones": strings.Join(phones, ", "), "relationships": strings.Join(relations, ", "), "check_in": b.CheckIn.In(zone).Format("02.01.2006 15:04"), "check_out": b.CheckOut.In(zone).Format("02.01.2006 15:04"), "inventory": strings.Join(inventory, ", "), "amount": fmt.Sprintf("%d.%02d", in.AmountMinor/100, in.AmountMinor%100), "currency": in.Currency, "payment_method": in.PaymentMethod, "payment_reference": in.Reference, "paid_at": paidAt, "booking_id": b.BookingID.String()}
	render := func(text string) (string, error) {
		for key, value := range values {
			text = strings.ReplaceAll(text, "{{"+key+"}}", value)
		}
		if strings.Contains(text, "{{") || strings.Contains(text, "}}") {
			return "", constants.ErrDocumentPlaceholder
		}
		return text, nil
	}
	title, err := render(template.Title[in.Language])
	if err != nil {
		return empty, err
	}
	body, err := render(template.Body[in.Language])
	if err != nil {
		return empty, err
	}
	d := document.Document{DocumentID: uuid.New(), HotelID: in.HotelID, BranchID: in.BranchID, BookingID: b.BookingID, TemplateID: template.TemplateID, AuthorID: u.UserID, Kind: in.Kind, Language: in.Language, Title: title, Body: body, AmountMinor: in.AmountMinor, Currency: in.Currency, PaymentMethod: in.PaymentMethod, Reference: in.Reference, PaidAt: in.PaidAt, CreatedAt: time.Now().UTC()}
	if save {
		err = s.Repository.SaveDocument(ctx, d)
	}
	return d, err
}
func (s *Documents) Download(ctx context.Context, u identity.User, id uuid.UUID) (File, error) {
	d, err := s.Repository.FindDocument(ctx, id)
	if err != nil {
		return File{}, err
	}
	if !canBook(u) || !u.CanAccessBranch(d.HotelID, d.BranchID) {
		return File{}, constants.ErrForbidden
	}
	bytes, err := s.Exporter.PDF(ctx, d.Title, d.Body, string(d.Language))
	return File{Name: "belge-" + d.DocumentID.String() + ".pdf", MIME: "application/pdf", Data: bytes}, err
}
