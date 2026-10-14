package application

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/guest"
	"otel/internal/domain/identity"
	"strings"
	"unicode/utf8"
)

type GuestAssessments struct {
	Catalog    *Catalog
	Repository guest.AssessmentRepository
}

func actorName(u identity.User) string {
	if strings.TrimSpace(u.DisplayName) != "" {
		return u.DisplayName
	}
	if name := strings.TrimSpace(u.FirstName + " " + u.LastName); name != "" {
		return name
	}
	return u.UserName
}
func (s *GuestAssessments) scope(ctx context.Context, u identity.User, hotel, branch uuid.UUID) error {
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
func (s *GuestAssessments) Save(ctx context.Context, u identity.User, in guest.AssessmentInput) (guest.Assessment, error) {
	if e := s.scope(ctx, u, in.HotelID, in.BranchID); e != nil {
		return guest.Assessment{}, e
	}
	in.Reason = strings.TrimSpace(in.Reason)
	if e := in.Validate(); e != nil {
		return guest.Assessment{}, e
	}
	return s.Repository.SaveGuestAssessment(ctx, in, u.UserID, actorName(u))
}
func (s *GuestAssessments) Reputation(ctx context.Context, u identity.User, q guest.AssessmentQuery) (guest.Reputation, error) {
	// Managers may read a customer's full hotel history without selecting a
	// branch. Assessment creation still requires a specific authorized booking.
	if q.BranchID == uuid.Nil {
		if !u.IsManager() || q.HotelID == uuid.Nil || !u.CanAccessHotel(q.HotelID) {
			return guest.Reputation{}, constants.ErrForbidden
		}
	} else if e := s.scope(ctx, u, q.HotelID, q.BranchID); e != nil {
		return guest.Reputation{}, e
	}
	if q.GuestID == uuid.Nil || q.Page < 0 || q.Page > 100000 || (q.PageSize != 0 && q.PageSize != 25 && q.PageSize != 50 && q.PageSize != 100) {
		return guest.Reputation{}, constants.ErrPayload
	}
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize == 0 {
		q.PageSize = 50
	}
	return s.Repository.GuestReputation(ctx, q)
}
func (s *GuestAssessments) List(ctx context.Context, u identity.User, q guest.AssessmentQuery) (guest.AssessmentPage, error) {
	if !canBook(u) {
		return guest.AssessmentPage{}, constants.ErrForbidden
	}
	if q.Page < 0 || q.Page > 100000 || len(q.Search) > 200 || len(q.NationalID) > 100 || len(q.Nationality) > 2 || (q.PageSize != 0 && q.PageSize != 25 && q.PageSize != 50 && q.PageSize != 100) {
		return guest.AssessmentPage{}, constants.ErrPayload
	}
	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize == 0 {
		q.PageSize = 25
	}
	out, e := s.Repository.SharedBlacklist(ctx, q)
	for i := range out.Items {
		r := &out.Items[i]
		r.CanRevoke = r.RevokedAt == nil && (u.IsAdmin() || r.HotelID == u.HotelID && (u.IsManager() || r.ActorID == u.UserID))
	}
	return out, e
}
func (s *GuestAssessments) Revoke(ctx context.Context, u identity.User, in guest.RevokeAssessment) error {
	if !canBook(u) {
		return constants.ErrForbidden
	}
	reason := strings.TrimSpace(in.Reason)
	if in.ID == uuid.Nil || utf8.RuneCountInString(reason) < 10 || utf8.RuneCountInString(reason) > 2000 {
		return constants.ErrPayload
	}
	return s.Repository.RevokeGuestAssessment(ctx, in.ID, u.UserID, u.HotelID, u.IsAdmin(), u.IsManager(), actorName(u), reason)
}
