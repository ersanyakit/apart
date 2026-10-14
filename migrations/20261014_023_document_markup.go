package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261014_023_document_markup", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE document_templates ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'plain'`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE document_templates DROP COLUMN IF EXISTS format`).Error
	}})
}
