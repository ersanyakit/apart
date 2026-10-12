package application

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/accommodation"
	"otel/internal/domain/identity"
)

type Beds struct {
	Catalog    *Catalog
	Repository accommodation.Repository
}

func (s *Beds) List(ctx context.Context, u identity.User, branchID uuid.UUID) ([]accommodation.Bed, error) {
	if _, err := s.Catalog.Branch(ctx, u, branchID); err != nil {
		return nil, err
	}
	return s.Repository.ListBeds(ctx, branchID)
}
func (s *Beds) Save(ctx context.Context, u identity.User, b accommodation.Bed, create bool) (accommodation.Bed, error) {
	if !u.IsManager() {
		return b, constants.ErrForbidden
	}
	if _, err := s.Catalog.Branch(ctx, u, b.BranchID); err != nil {
		return b, err
	}
	if create {
		b.BedID = uuid.New()
		for i := range b.Places {
			b.Places[i].UnitID = uuid.New()
		}
	} else {
		old, err := s.Repository.FindBed(ctx, b.BedID)
		if err != nil {
			return b, err
		}
		if old.BranchID != b.BranchID {
			return b, constants.ErrForbidden
		}
		for i := range b.Places {
			if b.Places[i].UnitID == uuid.Nil {
				b.Places[i].UnitID = uuid.New()
			}
		}
	}
	if err := b.Validate(); err != nil {
		return b, err
	}
	return b, s.Repository.SaveBeds(ctx, []accommodation.Bed{b}, create)
}
func (s *Beds) Delete(ctx context.Context, u identity.User, id uuid.UUID) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	b, err := s.Repository.FindBed(ctx, id)
	if err != nil {
		return err
	}
	if _, err := s.Catalog.Branch(ctx, u, b.BranchID); err != nil {
		return err
	}
	return s.Repository.DeleteBed(ctx, id)
}
