package migrations

import "gorm.io/gorm"

func init() {
	Register(Migration{Version: "20261015_029_booking_origin", Up: func(tx *gorm.DB) error {
		return tx.Exec(`ALTER TABLE bookings
   ADD COLUMN IF NOT EXISTS source varchar(64) NOT NULL DEFAULT 'unknown',
   ADD COLUMN IF NOT EXISTS external_property_id varchar(255) NOT NULL DEFAULT '',
   ADD COLUMN IF NOT EXISTS external_reservation_id varchar(255) NOT NULL DEFAULT '';
   ALTER TABLE bookings ALTER COLUMN source SET DEFAULT 'manual';
   ALTER TABLE bookings ADD CONSTRAINT booking_origin_valid CHECK (
    source ~ '^[a-z][a-z0-9_]{0,63}$' AND
    ((external_property_id = '' AND external_reservation_id = '') OR
     (source <> 'manual' AND external_property_id <> '' AND external_reservation_id <> '')));
   CREATE UNIQUE INDEX bookings_external_identity ON bookings
    (branch_id, source, external_property_id, external_reservation_id)
    WHERE external_reservation_id <> '';
   CREATE INDEX bookings_branch_source ON bookings(branch_id, source);`).Error
	}, Down: func(tx *gorm.DB) error {
		return tx.Exec(`DROP INDEX IF EXISTS bookings_external_identity; DROP INDEX IF EXISTS bookings_branch_source;
   ALTER TABLE bookings DROP CONSTRAINT IF EXISTS booking_origin_valid,
   DROP COLUMN external_reservation_id, DROP COLUMN external_property_id, DROP COLUMN source;`).Error
	}})
}
