package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261014_024_folio_services", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE report_records ADD COLUMN IF NOT EXISTS unit_price_minor bigint NOT NULL DEFAULT 0`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE report_records DROP COLUMN IF EXISTS unit_price_minor`).Error
	}})
}
