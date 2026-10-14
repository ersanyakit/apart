package application

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/identity"
	"otel/internal/domain/reporting"
	"strings"
)

type Folios struct {
	Catalog    *Catalog
	Repository reporting.FolioRepository
}

func (s *Folios) Get(ctx context.Context, u identity.User, branch, id uuid.UUID) (reporting.Folio, error) {
	if !canBook(u) {
		return reporting.Folio{}, constants.ErrForbidden
	}
	if _, e := s.Catalog.Branch(ctx, u, branch); e != nil {
		return reporting.Folio{}, e
	}
	return s.Repository.BookingFolio(ctx, branch, id)
}

func (s *Folios) Service(ctx context.Context, u identity.User, in reporting.FolioServiceInput) (reporting.Record, error) {
	if !canBook(u) {
		return reporting.Record{}, constants.ErrForbidden
	}
	if _, e := s.Catalog.Branch(ctx, u, in.BranchID); e != nil {
		return reporting.Record{}, e
	}
	if e := in.Validate(); e != nil {
		return reporting.Record{}, e
	}
	return s.Repository.SaveFolioService(ctx, in, u.UserID, actorName(u))
}
func (s *Folios) VoidService(ctx context.Context, u identity.User, in reporting.FolioServiceVoid) error {
	if !canBook(u) {
		return constants.ErrForbidden
	}
	if _, e := s.Catalog.Branch(ctx, u, in.BranchID); e != nil {
		return e
	}
	if in.ID == uuid.Nil || in.BookingID == uuid.Nil || len(strings.TrimSpace(in.Reason)) < 3 || len(in.Reason) > 500 {
		return constants.ErrReasonRequired
	}
	return s.Repository.VoidFolioService(ctx, in, u.UserID)
}
