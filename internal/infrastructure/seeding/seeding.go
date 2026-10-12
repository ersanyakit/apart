// Package seeding contains explicit, repeatable data seeds, separate from schema migrations.
package seeding

import (
	"context"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/audit"
	"otel/internal/infrastructure/persistence"
)

type Options struct{ DemoPassword string }
type Seed struct {
	Name string
	Run  func(context.Context, *gorm.DB, Options) error
}

var Registry = []Seed{{Name: "demo", Run: demo}}

// Run serializes seed runs and commits all selected seeds atomically. Existing
// records are reused, never updated, including credentials and operational state.
func Run(ctx context.Context, db *gorm.DB, name string, options Options) error {
	persistence.InstallAudit(db)
	ctx = audit.WithActor(ctx, audit.Actor{Command: "db:seed"})
	selected := []Seed{}
	for _, s := range Registry {
		if name == "" || name == s.Name {
			selected = append(selected, s)
		}
	}
	if len(selected) == 0 {
		return constants.ErrSeedName
	}
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(734821603)).Error; err != nil {
			return constants.Wrap(constants.ErrSeed, err)
		}
		for _, s := range selected {
			if err := s.Run(ctx, tx, options); err != nil {
				return err
			}
		}
		return nil
	})
}
