package persistence

import (
	"context"
	"errors"
	apperrors "otel/constants"
	"otel/internal/domain/shared"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(ctx context.Context, dsn string) (*gorm.DB, error) {
	if dsn == "" {
		return nil, apperrors.ErrDatabaseURL
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{TranslateError: true, Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		return nil, err
	}
	pool, err := db.DB()
	if err != nil {
		return nil, err
	}
	pool.SetMaxOpenConns(20)
	pool.SetMaxIdleConns(5)
	pool.SetConnMaxLifetime(30 * time.Minute)
	if err := pool.PingContext(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return db, nil
}
func translate(err error) error {
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return shared.ErrNotFound
	case errors.Is(err, gorm.ErrDuplicatedKey), errors.Is(err, gorm.ErrForeignKeyViolated):
		return shared.ErrConflict
	default:
		return err
	}
}
