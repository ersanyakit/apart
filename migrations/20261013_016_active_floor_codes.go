package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261013_016_active_floor_codes", Up: func(tx *gorm.DB) error {
		if err := tx.Exec("DROP INDEX idx_floor_code").Error; err != nil {
			return err
		}
		return tx.Exec("CREATE UNIQUE INDEX idx_floor_code ON floors (branch_id, code) WHERE deleted_at IS NULL").Error
	}, Down: func(tx *gorm.DB) error {
		// Refuse rollback if reused codes cannot satisfy the old constraint.
		// The migration transaction preserves all records and the current index.
		if err := tx.Exec("DROP INDEX idx_floor_code").Error; err != nil {
			return err
		}
		return tx.Exec("CREATE UNIQUE INDEX idx_floor_code ON floors (branch_id, code)").Error
	}})
}
