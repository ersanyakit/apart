package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261014_026_room_rental_mode", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS rental_mode text NOT NULL DEFAULT ''; ALTER TABLE rooms ADD CONSTRAINT room_rental_mode_valid CHECK (rental_mode IN ('','room','beds'))`).Error
	}, Down: func(tx *gorm.DB) error { return tx.Exec(`ALTER TABLE rooms DROP COLUMN rental_mode`).Error }})
}
