package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261014_022_operation_reasons", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS cancelled_at timestamptz; ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status_reason text NOT NULL DEFAULT '';`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE bookings DROP COLUMN cancellation_reason,DROP COLUMN cancelled_at; ALTER TABLE rooms DROP COLUMN status_reason;`).Error
	}})
}
