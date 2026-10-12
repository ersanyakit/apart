package application

import (
	"context"
	"otel/constants"
	"otel/internal/domain/features"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"strings"

	"github.com/google/uuid"
)

type Features struct {
	Repository features.Repository
	Catalog    *Catalog
}

func (s *Features) Registry(ctx context.Context, u identity.User, hotelID uuid.UUID) (features.Registry, error) {
	if _, err := s.Catalog.Hotel(ctx, u, hotelID); err != nil {
		return features.Registry{}, err
	}
	return s.Repository.Registry(ctx, hotelID)
}
func (s *Features) SaveCategory(ctx context.Context, u identity.User, c features.Category, create bool) (features.Category, error) {
	if !u.IsManager() {
		return c, constants.ErrForbidden
	}
	if _, err := s.Catalog.Hotel(ctx, u, c.HotelID); err != nil {
		return c, err
	}
	if !features.HasText(c.Label) || strings.TrimSpace(c.Code) == "" {
		return c, constants.ErrFeatureDefinition
	}
	if err := c.Label.Validate(); err != nil {
		return c, err
	}
	if create {
		c.CategoryID = uuid.New()
	}
	return c, s.Repository.SaveCategory(ctx, c, create)
}
func (s *Features) SaveDefinition(ctx context.Context, u identity.User, d features.Definition, create bool) (features.Definition, error) {
	if !u.IsManager() {
		return d, constants.ErrForbidden
	}
	registry, err := s.Registry(ctx, u, d.HotelID)
	if err != nil {
		return d, err
	}
	found := false
	for _, c := range registry.Categories {
		if d.CategoryID == c.CategoryID || d.CategoryID == uuid.Nil && d.Category == c.Code {
			d.CategoryID = c.CategoryID
			d.Category = c.Code
			found = true
			break
		}
	}
	if !found {
		return d, constants.ErrFeatureDefinition
	}
	if create {
		d.FeatureID = uuid.New()
	} else {
		found = false
		for _, old := range registry.Definitions {
			if old.FeatureID == d.FeatureID {
				found = true
				break
			}
		}
		if !found {
			return d, constants.ErrNotFound
		}
	}
	if err := d.Validate(); err != nil {
		return d, err
	}
	d.Assets, err = s.Catalog.resolveAssets(ctx, d.HotelID, d.Assets)
	if err != nil {
		return d, err
	}
	return d, s.Repository.SaveDefinition(ctx, d, create)
}
func (s *Features) DeleteDefinition(ctx context.Context, u identity.User, hotelID, id uuid.UUID) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	if _, err := s.Catalog.Hotel(ctx, u, hotelID); err != nil {
		return err
	}
	return s.Repository.DeleteDefinition(ctx, id, hotelID)
}
func (s *Features) Assign(ctx context.Context, u identity.User, target features.Target, items []features.Assignment) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	switch target.Scope {
	case features.ScopeProperty:
		b, err := s.Catalog.Branch(ctx, u, target.ID)
		if err != nil {
			return err
		}
		target.HotelID = b.HotelID
		target.BranchID = b.BranchID
	case features.ScopeRoom:
		r, err := s.Catalog.Room(ctx, u, target.ID)
		if err != nil {
			return err
		}
		b, err := s.Catalog.Branch(ctx, u, r.BranchID)
		if err != nil {
			return err
		}
		target.HotelID = b.HotelID
		target.BranchID = b.BranchID
	default:
		return constants.ErrFeatureScope
	}
	return s.Repository.Assign(ctx, target, items)
}
func (s *Features) FilterRooms(ctx context.Context, u identity.User, branchID uuid.UUID, filters []features.Filter) ([]property.Room, error) {
	b, err := s.Catalog.Branch(ctx, u, branchID)
	if err != nil {
		return nil, err
	}
	registry, err := s.Repository.Registry(ctx, b.HotelID)
	if err != nil {
		return nil, err
	}
	if len(filters) > 30 {
		return nil, constants.ErrFeatureFilter
	}
	definitions := map[string]features.Definition{}
	for _, d := range registry.Definitions {
		definitions[d.Code] = d
	}
	for _, filter := range filters {
		d, ok := definitions[filter.Code]
		if !ok || !d.Filterable || !d.Allows(features.ScopeRoom) {
			return nil, constants.ErrFeatureFilter
		}
		if err := features.ValidateValue(d, filter.Value); err != nil {
			return nil, err
		}
		switch filter.Operator {
		case "eq":
		case "contains":
			if d.ValueType != features.TypeMultiEnum {
				return nil, constants.ErrFeatureFilter
			}
		case "gte", "lte":
			if d.ValueType != features.TypeInteger && d.ValueType != features.TypeDecimal {
				return nil, constants.ErrFeatureFilter
			}
		default:
			return nil, constants.ErrFeatureFilter
		}
	}
	ids, err := s.Repository.FilterRooms(ctx, b.HotelID, branchID, filters)
	if err != nil {
		return nil, err
	}
	rooms, err := s.Catalog.Properties.ListRooms(ctx, branchID)
	if err != nil {
		return nil, err
	}
	allowed := map[uuid.UUID]bool{}
	for _, id := range ids {
		allowed[id] = true
	}
	out := []property.Room{}
	for _, r := range rooms {
		if allowed[r.RoomID] {
			out = append(out, r)
		}
	}
	return out, nil
}
