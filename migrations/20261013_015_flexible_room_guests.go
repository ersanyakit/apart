package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261013_015_flexible_room_guests", Up: func(tx *gorm.DB) error {
		if err := tx.Exec("ALTER TABLE rooms DROP CONSTRAINT chk_unit_capacity").Error; err != nil {
			return err
		}
		return tx.Exec("ALTER TABLE rooms ADD CONSTRAINT chk_unit_capacity CHECK (capacity >= 0 AND capacity <= 100000 AND (kind <> 'bed' OR capacity > 0))").Error
	}, Down: func(tx *gorm.DB) error {
		// Zero means unspecified and cannot be mapped back without inventing a limit.
		// PostgreSQL rejects rollback if such rows exist, preserving their data.
		if err := tx.Exec("ALTER TABLE rooms DROP CONSTRAINT chk_unit_capacity").Error; err != nil {
			return err
		}
		return tx.Exec("ALTER TABLE rooms ADD CONSTRAINT chk_unit_capacity CHECK (capacity > 0 AND capacity <= 100000)").Error
	}})
}
