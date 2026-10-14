package application

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/identity"
	"otel/internal/domain/reporting"
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
