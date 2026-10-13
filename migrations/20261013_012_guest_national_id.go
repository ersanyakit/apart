package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261013_012_guest_national_id", Up: func(tx *gorm.DB) error {
		for _, table := range []string{"guest_profiles", "booking_guests"} {
			// Fresh installs already use national_id through the current models.
			if tx.Migrator().HasColumn(table, "tc_no") {
				if err := tx.Migrator().RenameColumn(table, "tc_no", "national_id"); err != nil {
					return err
				}
			}
		}
		return nil
	}, Down: func(tx *gorm.DB) error {
		for _, table := range []string{"guest_profiles", "booking_guests"} {
			if err := tx.Migrator().RenameColumn(table, "national_id", "tc_no"); err != nil {
				return err
			}
		}
		return nil
	}})
}
