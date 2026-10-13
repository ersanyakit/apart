package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261013_014_audit_details", Up: func(tx *gorm.DB) error {
		return tx.Exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details jsonb").Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec("ALTER TABLE audit_logs DROP COLUMN IF EXISTS details").Error
	}})
}
