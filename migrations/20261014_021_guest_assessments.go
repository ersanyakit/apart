package migrations

import (
	"gorm.io/gorm"
	"otel/internal/domain/guest"
)

func init() {
	Register(Migration{Version: "20261014_021_guest_assessments", Up: func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(&guest.Assessment{}); err != nil {
			return err
		}
		return tx.Exec(`ALTER TABLE guest_assessments
   ADD CONSTRAINT assessment_guest_fk FOREIGN KEY(guest_id,hotel_id) REFERENCES guest_profiles(guest_id,hotel_id) ON DELETE RESTRICT,
   ADD CONSTRAINT assessment_booking_fk FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
   ADD CONSTRAINT assessment_actor_fk FOREIGN KEY(actor_id) REFERENCES users(user_id) ON DELETE RESTRICT,
   ADD CONSTRAINT assessment_branch_fk FOREIGN KEY(branch_id) REFERENCES branches(branch_id) ON DELETE RESTRICT,
   ADD CONSTRAINT assessment_score_check CHECK ((kind='rating' AND score BETWEEN 1 AND 5) OR (kind='blacklist' AND score=0)),
   ADD CONSTRAINT assessment_reason_check CHECK (char_length(trim(reason)) BETWEEN 10 AND 2000);
   CREATE UNIQUE INDEX idx_guest_rating_author_stay ON guest_assessments(guest_id,booking_id,actor_id) WHERE kind='rating';
   CREATE UNIQUE INDEX idx_guest_active_blacklist ON guest_assessments(guest_id,hotel_id) WHERE kind='blacklist' AND revoked_at IS NULL;
   CREATE INDEX idx_shared_blacklist_date ON guest_assessments(created_at DESC,id) WHERE kind='blacklist';`).Error
	}, Down: func(tx *gorm.DB) error { return tx.Migrator().DropTable(&guest.Assessment{}) }})
}
