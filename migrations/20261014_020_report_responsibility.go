package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261014_020_report_responsibility", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE report_records ADD COLUMN IF NOT EXISTS responsible_id uuid, ADD COLUMN IF NOT EXISTS responsible_name text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS shift_code text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS measure text NOT NULL DEFAULT 'piece', ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'; ALTER TABLE report_records ADD CONSTRAINT report_responsible_fk FOREIGN KEY (responsible_id) REFERENCES users(user_id) ON DELETE RESTRICT; CREATE INDEX idx_report_assignee ON report_records(hotel_id,responsible_id);`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE report_records DROP COLUMN responsible_id, DROP COLUMN responsible_name, DROP COLUMN shift_code, DROP COLUMN measure, DROP COLUMN priority`).Error
	}})
}
