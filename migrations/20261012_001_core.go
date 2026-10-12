package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{
		Version: "20261012_001_core",
		Up: func(db *gorm.DB) error {
			return db.AutoMigrate(&models.Hotel{}, &models.Branch{}, &models.User{}, &models.UserBranch{}, &models.Room{}, &models.Booking{}, &models.Person{}, &models.Asset{})
		},
		Down: func(db *gorm.DB) error {
			// Remove join and child tables before their referenced parents.
			for _, table := range []string{"hotel_media", "branch_media", "room_media", "guests", "bookings", "user_branches", "rooms", "assets", "users", "branches", "hotels", "people"} {
				if err := db.Migrator().DropTable(table); err != nil {
					return err
				}
			}
			return nil
		},
	})
}
