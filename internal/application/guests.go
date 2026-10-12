package application

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/booking"
	"otel/internal/domain/guest"
	"otel/internal/domain/identity"
)

type Guests struct {
	Catalog    *Catalog
	Repository guest.Repository
}

func (s *Guests) List(ctx context.Context, u identity.User, q guest.Query, export bool) (guest.Page, error) {
	if !canBook(u) || q.HotelID == uuid.Nil || !u.CanAccessHotel(q.HotelID) {
		return guest.Page{}, constants.ErrForbidden
	}
	if q.BranchID != uuid.Nil {
		b, err := s.Catalog.Branch(ctx, u, q.BranchID)
		if err != nil {
			return guest.Page{}, err
		}
		if b.HotelID != q.HotelID {
			return guest.Page{}, constants.ErrForbidden
		}
	} else if !u.IsManager() {
		return guest.Page{}, constants.ErrBranchRequired
	}
	if len(q.Search) > 200 || q.Page < 0 || q.Page > 100000 || (q.From != nil && q.To != nil && !q.To.After(*q.From)) {
		return guest.Page{}, constants.ErrPayload
	}
	return s.Repository.GuestStays(ctx, q, export)
}
func (s *Guests) Update(ctx context.Context, u identity.User, in guest.Update) (booking.Booking, error) {
	if !canBook(u) {
		return booking.Booking{}, constants.ErrForbidden
	}
	if _, err := s.Catalog.Branch(ctx, u, in.BranchID); err != nil {
		return booking.Booking{}, err
	}
	return s.Repository.UpdateBookingGuests(ctx, in)
}
