package migrations

import (
	"otel/internal/infrastructure/persistence/models"

	"gorm.io/gorm"
)

func init() {
	Register(Migration{Version: "20261013_015_booking_deposit", Up: func(tx *gorm.DB) error {
		// Fresh installs already carry the deposit columns through the model.
		return tx.AutoMigrate(&models.Booking{})
	}, Down: func(tx *gorm.DB) error {
		if tx.Migrator().HasColumn(&models.Booking{}, "deposit_minor") {
			if err := tx.Migrator().DropColumn(&models.Booking{}, "deposit_minor"); err != nil {
				return err
			}
		}
		if tx.Migrator().HasColumn(&models.Booking{}, "deposit_channel") {
			if err := tx.Migrator().DropColumn(&models.Booking{}, "deposit_channel"); err != nil {
				return err
			}
		}
		return nil
	}})
}
