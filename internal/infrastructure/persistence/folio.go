package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/internal/domain/reporting"
	"otel/internal/infrastructure/persistence/models"
)

func loadFolio(tx *gorm.DB, branch, id uuid.UUID) (reporting.Folio, error) {
	b, e := loadBooking(tx, branch, id)
	if e != nil {
		return reporting.Folio{}, e
	}
	var records []reporting.Record
	if e = tx.Where("branch_id=? AND booking_id=?", branch, id).Order("id").Find(&records).Error; e != nil {
		return reporting.Folio{}, e
	}
	var room models.Room
	if e = tx.Unscoped().First(&room, "room_id=? AND branch_id=?", b.RoomID, branch).Error; e != nil {
		return reporting.Folio{}, e
	}
	return reporting.BuildFolio(b, room.Code, records), nil
}
func (r *Repository) BookingFolio(ctx context.Context, branch, id uuid.UUID) (reporting.Folio, error) {
	var out reporting.Folio
	e := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := lockBranch(tx, branch); e != nil {
			return e
		}
		var e error
		out, e = loadFolio(tx, branch, id)
		return e
	})
	return out, translate(e)
}
