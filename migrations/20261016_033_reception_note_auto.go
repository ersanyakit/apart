package migrations

import (
	"gorm.io/gorm"
)

func init() {
	Register(Migration{Version: "20261016_033_reception_note_auto", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE reception_notes ADD COLUMN IF NOT EXISTS booking_auto boolean NOT NULL DEFAULT false;
	CREATE INDEX IF NOT EXISTS idx_reception_note_auto ON reception_notes(hotel_id,branch_id,booking_id) WHERE booking_auto AND NOT archived;`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`DROP INDEX IF EXISTS idx_reception_note_auto;
	ALTER TABLE reception_notes DROP COLUMN IF EXISTS booking_auto;`).Error
	}})
}
