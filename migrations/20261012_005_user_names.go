package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{Version: "20261012_005_user_names", Up: func(db *gorm.DB) error {
		return db.AutoMigrate(&models.User{})
	}, Down: func(db *gorm.DB) error {
		for _, field := range []string{"FirstName", "LastName"} {
			if err := db.Migrator().DropColumn(&models.User{}, field); err != nil {
				return err
			}
		}
		return nil
	}})
}
