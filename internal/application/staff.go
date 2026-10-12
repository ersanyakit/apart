package application

import (
	"context"
	"github.com/google/uuid"
	"net/mail"
	"otel/constants"
	"otel/internal/domain/identity"
	"regexp"
	"strings"
)

type Staff struct {
	Catalog    *Catalog
	Repository identity.StaffRepository
	Users      identity.Repository
	Passwords  identity.PasswordHasher
}

func (s *Staff) List(ctx context.Context, u identity.User, hotelID uuid.UUID) ([]identity.Staff, error) {
	if !u.IsManager() || !u.CanAccessHotel(hotelID) {
		return nil, constants.ErrForbidden
	}
	return s.Repository.ListStaff(ctx, hotelID)
}
func (s *Staff) Save(ctx context.Context, u identity.User, in identity.StaffInput, create bool) (identity.Staff, error) {
	p := in.Staff
	if !u.IsManager() || !u.CanAccessHotel(p.HotelID) {
		return p, constants.ErrForbidden
	}
	p.FirstName, p.LastName, p.Username, p.Email = strings.TrimSpace(p.FirstName), strings.TrimSpace(p.LastName), strings.ToLower(strings.TrimSpace(p.Username)), strings.ToLower(strings.TrimSpace(p.Email))
	if !regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{2,99}$`).MatchString(p.Username) || p.FirstName == "" || p.LastName == "" || len(p.FirstName) > 100 || len(p.LastName) > 100 || len(p.Username) < 3 || len(p.Username) > 100 || strings.ContainsAny(p.Username, " \t\r\n") || len(p.Email) > 254 {
		return p, constants.ErrStaff
	}
	if p.Email != "" {
		if address, err := mail.ParseAddress(p.Email); err != nil || address.Address != p.Email {
			return p, constants.ErrStaff
		}
	}
	if !identity.StaffRole(p.Role) && !(u.IsAdmin() && p.Role == constants.UserRoleAdmin) {
		return p, constants.ErrRole
	}
	if create {
		p.UserID = uuid.New()
	} else {
		old, err := s.Users.FindByID(ctx, p.UserID)
		if err != nil {
			return p, err
		}
		if old.HotelID != p.HotelID || (!u.IsAdmin() && old.IsAdmin()) {
			return p, constants.ErrForbidden
		}
	}
	if !(identity.User{Role: p.Role}).IsManager() && len(p.BranchIDs) == 0 {
		return p, constants.ErrBranchRequired
	}
	seen := map[uuid.UUID]bool{}
	for _, id := range p.BranchIDs {
		if seen[id] {
			return p, constants.ErrStaff
		}
		seen[id] = true
		b, err := s.Catalog.Branch(ctx, u, id)
		if err != nil {
			return p, err
		}
		if b.HotelID != p.HotelID {
			return p, constants.ErrForbidden
		}
	}
	hash := ""
	if create || in.Password != "" {
		if len(in.Password) < 12 || len(in.Password) > 72 {
			return p, constants.ErrPassword
		}
		var err error
		hash, err = s.Passwords.Hash(in.Password)
		if err != nil {
			return p, err
		}
	}
	return p, s.Repository.SaveStaff(ctx, p, hash, create)
}
func (s *Staff) Delete(ctx context.Context, u identity.User, hotelID, id uuid.UUID) error {
	if !u.IsManager() || !u.CanAccessHotel(hotelID) || u.UserID == id {
		return constants.ErrForbidden
	}
	target, err := s.Users.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if target.HotelID != hotelID || (!u.IsAdmin() && target.IsAdmin()) {
		return constants.ErrForbidden
	}
	return s.Repository.DeleteStaff(ctx, hotelID, id)
}
