package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261014_018_user_preferences", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE users DROP COLUMN preferences`).Error
	}})
}
