package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{Version: "20261013_013_guest_nationality", Up: func(tx *gorm.DB) error {
		// Fresh installs already carry nationality through the current models.
		return tx.AutoMigrate(&models.GuestProfile{}, &models.BookingGuest{})
	}, Down: func(tx *gorm.DB) error {
		for _, table := range []string{"guest_profiles", "booking_guests"} {
			if tx.Migrator().HasColumn(table, "nationality") {
				if err := tx.Migrator().DropColumn(table, "nationality"); err != nil {
					return err
				}
			}
		}
		return nil
	}})
}
