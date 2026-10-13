package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{Version: "20261012_011_booking_price", Up: func(db *gorm.DB) error {
		return db.AutoMigrate(&models.Booking{})
	}, Down: func(db *gorm.DB) error {
		return db.Migrator().DropColumn(&models.Booking{}, "DailyPriceMinor")
	}})
}
