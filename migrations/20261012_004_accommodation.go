package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{Version: "20261012_004_accommodation", Up: func(tx *gorm.DB) error {
		if err := tx.Exec(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS rentable boolean NOT NULL DEFAULT true`).Error; err != nil {
			return err
		}
		if err := tx.AutoMigrate(&models.Floor{}, &models.Room{}, &models.Booking{}, &models.BookingAllocation{}); err != nil {
			return err
		}
		for _, statement := range []string{
			`UPDATE rooms SET position = '{"x":20,"y":20,"width":140,"height":100}'::jsonb WHERE position IS NULL`,
			`ALTER TABLE rooms ADD CONSTRAINT fk_room_floor FOREIGN KEY (floor_id,branch_id) REFERENCES floors(floor_id,branch_id) ON DELETE RESTRICT`,
			`ALTER TABLE rooms ADD CONSTRAINT fk_room_parent FOREIGN KEY (parent_id,branch_id) REFERENCES rooms(room_id,branch_id) ON DELETE RESTRICT`,
			`ALTER TABLE rooms ADD CONSTRAINT chk_unit_capacity CHECK (capacity > 0 AND capacity <= 100000)`,
			`ALTER TABLE rooms ADD CONSTRAINT chk_unit_kind CHECK (kind IN ('apartment','room','dormitory','bed'))`,
			`ALTER TABLE rooms ADD CONSTRAINT chk_unit_parent CHECK (parent_id IS NULL OR parent_id <> room_id)`,
			`ALTER TABLE booking_allocations ADD CONSTRAINT chk_allocation_dates CHECK ("end" > start)`,
		} {
			if err := tx.Exec(statement).Error; err != nil {
				return err
			}
		}
		return nil
	}, Down: func(tx *gorm.DB) error {
		if err := tx.Migrator().DropTable(&models.BookingAllocation{}); err != nil {
			return err
		}
		for _, name := range []string{"fk_room_floor", "fk_room_parent", "chk_unit_capacity", "chk_unit_kind", "chk_unit_parent"} {
			if err := tx.Migrator().DropConstraint(&models.Room{}, name); err != nil {
				return err
			}
		}
		for _, column := range []string{"floor_id", "parent_id", "kind", "capacity", "rentable", "bed_group", "bed_level", "position"} {
			if err := tx.Migrator().DropColumn(&models.Room{}, column); err != nil {
				return err
			}
		}
		for _, column := range []string{"guest_name", "guest_count", "guest_details", "notes", "actual_check_in", "actual_check_out"} {
			if err := tx.Migrator().DropColumn(&models.Booking{}, column); err != nil {
				return err
			}
		}
		return tx.Migrator().DropTable(&models.Floor{})
	}})
}
