package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261016_031_setup_runs", Up: func(tx *gorm.DB) error {
		return tx.Exec(`CREATE TABLE setup_runs (request_id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(user_id), result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`).Error
	}, Down: func(tx *gorm.DB) error { return tx.Exec("DROP TABLE setup_runs").Error }})
}
