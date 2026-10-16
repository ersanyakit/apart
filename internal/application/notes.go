package application

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/identity"
	"otel/internal/domain/notes"
	"strings"
	"unicode/utf8"
)

type Notes struct {
	Catalog    *Catalog
	Repository notes.Repository
}

func (s *Notes) scope(ctx context.Context, u identity.User, hotel, branch uuid.UUID) error {
	if !canBook(u) || hotel == uuid.Nil || branch == uuid.Nil || !u.CanAccessHotel(hotel) {
		return constants.ErrForbidden
	}
	b, e := s.Catalog.Branch(ctx, u, branch)
	if e != nil {
		return e
	}
	if b.HotelID != hotel {
		return constants.ErrForbidden
	}
	return nil
}
func (s *Notes) List(ctx context.Context, u identity.User, q notes.Query) (notes.Page, error) {
	if e := s.scope(ctx, u, q.HotelID, q.BranchID); e != nil {
		return notes.Page{}, e
	}
	q.Search = strings.TrimSpace(q.Search)
	if (q.Status != "" && !notes.ValidStatus(q.Status)) || (q.Status == "" && q.BookingID == nil) || q.Page < 0 || q.Page > 100000 || utf8.RuneCountInString(q.Search) > 200 {
		return notes.Page{}, constants.ErrPayload
	}
	if q.Page == 0 {
		q.Page = 1
	}
	return s.Repository.ListNotes(ctx, q)
}
func (s *Notes) Save(ctx context.Context, u identity.User, in notes.Input) (notes.Note, error) {
	if e := s.scope(ctx, u, in.HotelID, in.BranchID); e != nil {
		return notes.Note{}, e
	}
	in.Title = strings.TrimSpace(in.Title)
	in.Body = strings.TrimSpace(in.Body)
	if e := in.Validate(); e != nil {
		return notes.Note{}, e
	}
	return s.Repository.SaveNote(ctx, in, u.UserID, actorName(u))
}
