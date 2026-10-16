package migrations

import (
	"gorm.io/gorm"
)

func init() {
	Register(Migration{Version: "20261016_032_reception_note_booking", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE reception_notes ADD COLUMN IF NOT EXISTS booking_id uuid;
	ALTER TABLE reception_notes ADD CONSTRAINT reception_note_booking_fk FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL;
	CREATE INDEX IF NOT EXISTS idx_reception_note_booking ON reception_notes(booking_id) WHERE booking_id IS NOT NULL;`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE reception_notes DROP CONSTRAINT IF EXISTS reception_note_booking_fk;
	DROP INDEX IF EXISTS idx_reception_note_booking;
	ALTER TABLE reception_notes DROP COLUMN IF EXISTS booking_id;`).Error
	}})
}
