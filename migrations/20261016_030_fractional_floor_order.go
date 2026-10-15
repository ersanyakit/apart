package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261016_030_fractional_floor_order", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE floors ALTER COLUMN sort_order TYPE double precision USING sort_order::double precision`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM floors WHERE sort_order <> trunc(sort_order)) THEN RAISE EXCEPTION 'Fractional floor order must be resolved before rollback'; END IF; END $$;
  ALTER TABLE floors ALTER COLUMN sort_order TYPE bigint USING sort_order::bigint`).Error
	}})
}
