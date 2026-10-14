package migrations

import (
	"gorm.io/gorm"
	"otel/internal/domain/notes"
)

func init() {
	Register(Migration{Version: "20261014_025_reception_notes", Up: func(tx *gorm.DB) error {
		if e := tx.AutoMigrate(&notes.Note{}); e != nil {
			return e
		}
		return tx.Exec(`ALTER TABLE reception_notes
 ADD CONSTRAINT reception_note_hotel_fk FOREIGN KEY(hotel_id) REFERENCES hotels(hotel_id) ON DELETE RESTRICT,
 ADD CONSTRAINT reception_note_branch_fk FOREIGN KEY(branch_id) REFERENCES branches(branch_id) ON DELETE RESTRICT,
 ADD CONSTRAINT reception_note_author_fk FOREIGN KEY(created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
 ADD CONSTRAINT reception_note_editor_fk FOREIGN KEY(updated_by) REFERENCES users(user_id) ON DELETE RESTRICT,
 ADD CONSTRAINT reception_note_status CHECK(status IN ('todo','doing','done')),
 ADD CONSTRAINT reception_note_priority CHECK(priority IN ('normal','urgent')),
 ADD CONSTRAINT reception_note_title CHECK(char_length(trim(title)) BETWEEN 1 AND 160),
 ADD CONSTRAINT reception_note_body CHECK(char_length(body)<=8000),
 ADD CONSTRAINT reception_note_version CHECK(version>0);
 CREATE INDEX idx_reception_note_board ON reception_notes(hotel_id,branch_id,archived,status,updated_at DESC,id);`).Error
	}, Down: func(tx *gorm.DB) error { return tx.Migrator().DropTable(&notes.Note{}) }})
}
