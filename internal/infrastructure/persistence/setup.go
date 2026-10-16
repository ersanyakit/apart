package persistence

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/application"
	"otel/internal/domain/identity"
)

func (r *Repository) Setup(ctx context.Context, u identity.User, in application.SetupInput) (application.SetupResult, error) {
	out := application.SetupResult{}
	if !u.IsManager() || in.RequestID == uuid.Nil {
		return out, constants.ErrForbidden
	}
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?, 17))", in.RequestID.String()).Error; err != nil {
			return err
		}
		var cached struct {
			UserID uuid.UUID
			Result []byte
		}
		found := tx.Table("setup_runs").Select("user_id, result").Where("request_id = ?", in.RequestID).Take(&cached)
		if found.Error == nil {
			if cached.UserID != u.UserID {
				return constants.ErrForbidden
			}
			if err := json.Unmarshal(cached.Result, &out); err != nil {
				return err
			}
			if !u.CanAccessHotel(out.HotelID) {
				return constants.ErrForbidden
			}
			return nil
		}
		if found.Error != gorm.ErrRecordNotFound {
			return found.Error
		}
		if in.Facility.BranchID != uuid.Nil {
			if err := lockBranch(tx, in.Facility.BranchID); err != nil {
				return err
			}
		}
		repo := New(tx)
		catalog := &application.Catalog{Properties: repo, Staff: repo, Media: repo, Features: repo, Layout: repo, Bookings: repo}
		accommodation := &application.Accommodation{Catalog: catalog, Layout: repo, Bookings: repo}
		staff := &application.Staff{Catalog: catalog, Repository: repo, Users: repo, Passwords: Bcrypt{}}
		var err error
		out, err = application.ApplySetup(ctx, u, in, catalog, accommodation, staff)
		if err != nil {
			return err
		}
		result, err := json.Marshal(out)
		if err != nil {
			return err
		}
		return tx.Exec("INSERT INTO setup_runs (request_id,user_id,result) VALUES (?,?,?::jsonb)", in.RequestID, u.UserID, string(result)).Error
	})
	return out, translate(err)
}
