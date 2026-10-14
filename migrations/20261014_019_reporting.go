package migrations

import (
	"gorm.io/gorm"
	"otel/internal/domain/reporting"
)

func init() {
	Register(Migration{Version: "20261014_019_reporting", Up: func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(&reporting.Record{}); err != nil {
			return err
		}
		return tx.Exec(`CREATE INDEX idx_report_scope_date ON report_records(hotel_id,branch_id,occurred_at) WHERE voided_at IS NULL;
 ALTER TABLE report_records ADD CONSTRAINT report_branch_fk FOREIGN KEY(branch_id) REFERENCES branches(branch_id) ON DELETE RESTRICT;
 ALTER TABLE report_records ADD CONSTRAINT report_hotel_fk FOREIGN KEY(hotel_id) REFERENCES hotels(hotel_id) ON DELETE RESTRICT;
 ALTER TABLE report_records ADD CONSTRAINT report_booking_fk FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT;
 ALTER TABLE report_records ADD CONSTRAINT report_room_fk FOREIGN KEY(room_id) REFERENCES rooms(room_id) ON DELETE RESTRICT;
 CREATE UNIQUE INDEX idx_report_booking_details ON report_records(booking_id) WHERE kind='booking_details' AND voided_at IS NULL;
 CREATE UNIQUE INDEX idx_report_account_ref ON report_records(branch_id,kind,reference,currency) WHERE kind IN ('receivable','payable') AND voided_at IS NULL;
 CREATE UNIQUE INDEX idx_report_shift ON report_records(branch_id,kind,reference) WHERE kind IN ('cash_open','cash_close') AND voided_at IS NULL;`).Error
	}, Down: func(tx *gorm.DB) error { return tx.Migrator().DropTable(&reporting.Record{}) }})
}
