package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{Version: "20261012_009_documents", Up: func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(&models.DocumentTemplate{}, &models.Document{}); err != nil {
			return err
		}
		for _, sql := range []string{
			`ALTER TABLE document_templates ADD CONSTRAINT fk_template_hotel FOREIGN KEY(hotel_id) REFERENCES hotels(hotel_id) ON DELETE RESTRICT`,
			`ALTER TABLE documents ADD CONSTRAINT fk_document_branch FOREIGN KEY(branch_id,hotel_id) REFERENCES branches(branch_id,hotel_id) ON DELETE RESTRICT`,
			`ALTER TABLE documents ADD CONSTRAINT fk_document_template FOREIGN KEY(template_id) REFERENCES document_templates(template_id) ON DELETE RESTRICT`,
			`ALTER TABLE documents ADD CONSTRAINT fk_document_booking FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT`,
		} {
			if err := tx.Exec(sql).Error; err != nil {
				return err
			}
		}
		return nil
	}, Down: func(tx *gorm.DB) error {
		return tx.Migrator().DropTable(&models.Document{}, &models.DocumentTemplate{})
	}})
}
