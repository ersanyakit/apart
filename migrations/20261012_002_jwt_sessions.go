package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{
		Version: "20261012_002_jwt_sessions",
		Up:      func(db *gorm.DB) error { return db.Migrator().CreateTable(&models.Session{}) },
		Down:    func(db *gorm.DB) error { return db.Migrator().DropTable(&models.Session{}) },
	})
}
