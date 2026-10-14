package persistence

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/identity"
)

func (r *Repository) UpdatePreferences(ctx context.Context, userID uuid.UUID, patch identity.Preferences) (identity.Preferences, error) {
	if err := patch.Validate(); err != nil {
		return nil, err
	}
	data, err := json.Marshal(patch)
	if err != nil {
		return nil, err
	}
	var raw []byte
	err = r.db.WithContext(ctx).Raw(`UPDATE users SET preferences = preferences || ?::jsonb
		WHERE user_id = ? AND deleted_at IS NULL RETURNING preferences`, string(data), userID).Row().Scan(&raw)
	if err != nil {
		return nil, constants.Wrap(constants.ErrInternal, err)
	}
	var result identity.Preferences
	if err = json.Unmarshal(raw, &result); err != nil {
		return nil, err
	}
	return result, nil
}
