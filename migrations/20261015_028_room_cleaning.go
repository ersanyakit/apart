package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261015_028_room_cleaning", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS last_cleaning jsonb;`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE rooms DROP COLUMN IF EXISTS last_cleaning;`).Error
	}})
}
