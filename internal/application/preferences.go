package application

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/identity"
)

func (a *Auth) UpdatePreferences(ctx context.Context, user identity.User, patch identity.Preferences) (identity.Preferences, error) {
	if user.UserID == uuid.Nil {
		return nil, constants.ErrUnauthorized
	}
	if err := patch.Validate(); err != nil {
		return nil, err
	}
	return a.Users.UpdatePreferences(ctx, user.UserID, patch)
}
