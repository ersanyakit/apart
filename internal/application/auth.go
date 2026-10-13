package application

import (
	"context"
	"otel/constants"
	"otel/internal/domain/audit"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Auth struct {
	Properties property.Repository
	Users      identity.Repository
	Tokens     identity.TokenProvider
	Passwords  identity.PasswordHasher
	TTL        time.Duration
}
type LoginResult struct {
	User      identity.User `json:"user"`
	Token     string        `json:"-"`
	ExpiresAt time.Time     `json:"expires_at"`
}

func (a *Auth) Login(ctx context.Context, login, password string, selection Selection, selectedIDs ...uuid.UUID) (LoginResult, error) {
	var selectedID uuid.UUID
	if len(selectedIDs) > 0 {
		selectedID = selectedIDs[0]
	}
	if len(login) > 254 || len(password) > 72 || (login == "" && selectedID == uuid.Nil) || password == "" || (selectedID != uuid.Nil && (login != "" || selection.BranchID == uuid.Nil)) {
		return LoginResult{}, constants.ErrCredentials
	}
	var user identity.User
	var err error
	if selectedID != uuid.Nil {
		user, err = a.Users.FindByID(ctx, selectedID)
	} else {
		user, err = a.Users.FindByLogin(ctx, strings.ToLower(strings.TrimSpace(login)))
	}
	// Run a password comparison even when no account exists.
	hash := user.PasswordHash
	if err != nil {
		hash = "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW"
	}
	valid := a.Passwords.Compare(hash, password)
	if err != nil || !valid || user.Role == constants.UserRoleBanned || user.Role == constants.UserRoleDeleted || user.Role == constants.UserRolePending {
		return LoginResult{}, constants.ErrCredentials
	}
	if selection.BranchID != uuid.Nil {
		branch, err := a.Properties.FindBranch(ctx, selection.BranchID)
		if err != nil || !user.CanAccessBranch(branch.HotelID, branch.BranchID) || (selection.HotelID != uuid.Nil && selection.HotelID != branch.HotelID) {
			return LoginResult{}, constants.ErrCredentials
		}
	} else if selection.HotelID != uuid.Nil && !user.CanAccessHotel(selection.HotelID) {
		return LoginResult{}, constants.ErrCredentials
	}
	expires := time.Now().UTC().Add(a.TTL)
	claims := identity.TokenClaims{UserID: user.UserID, SessionID: uuid.NewString(), ExpiresAt: expires}
	token, err := a.Tokens.Issue(claims)
	if err != nil {
		return LoginResult{}, constants.Wrap(constants.ErrAuth, err)
	}
	actor := audit.ActorFrom(ctx)
	actor.UserID, actor.Command = user.UserID, constants.CMD_AUTH_LOGIN
	ctx = audit.WithActor(ctx, actor)
	if err := a.Users.CreateSession(ctx, identity.Session{ID: claims.SessionID, UserID: user.UserID, ExpiresAt: expires}); err != nil {
		return LoginResult{}, err
	}
	return LoginResult{User: user, Token: token, ExpiresAt: expires}, nil
}
func (a *Auth) Authenticate(ctx context.Context, token string) (identity.User, error) {
	claims, err := a.Tokens.Verify(token)
	if err != nil {
		return identity.User{}, constants.ErrUnauthorized
	}
	user, err := a.Users.FindSessionUser(ctx, claims.SessionID, claims.UserID)
	if err != nil || user.Role == constants.UserRoleBanned || user.Role == constants.UserRoleDeleted {
		return identity.User{}, constants.ErrUnauthorized
	}
	return user, nil
}
func (a *Auth) Logout(ctx context.Context, user identity.User) error {
	actor := audit.ActorFrom(ctx)
	actor.UserID, actor.Command = user.UserID, constants.CMD_AUTH_LOGOUT
	ctx = audit.WithActor(ctx, actor)
	return a.Users.DeleteSession(ctx, user.SessionID)
}

func (a *Auth) LoginPeople(ctx context.Context, branchID uuid.UUID) ([]identity.LoginPerson, error) {
	if branchID == uuid.Nil {
		return nil, constants.ErrBranchRequired
	}
	return a.Users.LoginPeople(ctx, branchID)
}
