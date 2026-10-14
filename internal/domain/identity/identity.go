package identity

import (
	"context"
	"otel/constants"
	"time"

	"github.com/google/uuid"
)

type User struct {
	Preferences  Preferences        `json:"preferences"`
	UserID       uuid.UUID          `json:"user_id"`
	HotelID      uuid.UUID          `json:"hotel_id"`
	UserName     string             `json:"username"`
	FirstName    string             `json:"first_name"`
	LastName     string             `json:"last_name"`
	DisplayName  string             `json:"displayname"`
	Email        string             `json:"-"`
	PasswordHash string             `json:"-"`
	Role         constants.UserRole `json:"role"`
	BranchIDs    []uuid.UUID        `json:"branch_ids"`
	SessionID    string             `json:"-"`
}

func (u User) IsAdmin() bool                    { return u.Role == constants.UserRoleAdmin }
func (u User) IsManager() bool                  { return u.IsAdmin() || u.Role == constants.UserRoleManagement }
func (u User) CanAccessHotel(id uuid.UUID) bool { return u.IsAdmin() || u.HotelID == id }
func (u User) CanAccessBranch(hotelID, branchID uuid.UUID) bool {
	if !u.CanAccessHotel(hotelID) {
		return false
	}
	if u.IsManager() {
		return true
	}
	for _, id := range u.BranchIDs {
		if id == branchID {
			return true
		}
	}
	return false
}
func (u User) CanOperateRooms() bool {
	return u.IsManager() || u.Role == constants.UserRoleReception || u.Role == constants.UserRoleHousekeeping
}

type Session struct {
	ID        string
	UserID    uuid.UUID
	ExpiresAt time.Time
}

// LoginPerson deliberately excludes surnames, login names and email addresses.
type LoginPerson struct {
	UserID uuid.UUID `json:"user_id"`
	Name   string    `json:"name"`
}

type Repository interface {
	UpdatePreferences(context.Context, uuid.UUID, Preferences) (Preferences, error)
	FindByID(context.Context, uuid.UUID) (User, error)
	LoginPeople(context.Context, uuid.UUID) ([]LoginPerson, error)
	FindByLogin(context.Context, string) (User, error)
	FindSessionUser(context.Context, string, uuid.UUID) (User, error)
	CreateSession(context.Context, Session) error
	DeleteSession(context.Context, string) error
}

type TokenClaims struct {
	UserID    uuid.UUID
	SessionID string
	ExpiresAt time.Time
}
type TokenProvider interface {
	Issue(TokenClaims) (string, error)
	Verify(string) (TokenClaims, error)
}
type PasswordHasher interface {
	Hash(string) (string, error)
	Compare(string, string) bool
}
