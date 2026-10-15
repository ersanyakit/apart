package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/document"
	"otel/internal/domain/shared"
	"otel/internal/infrastructure/persistence/models"
	"otel/utils"
)

func (r *Repository) Templates(ctx context.Context, hotelID uuid.UUID) ([]document.Template, error) {
	var rows []models.DocumentTemplate
	err := r.db.WithContext(ctx).Where("hotel_id = ?", hotelID).Order("kind").Find(&rows).Error
	out := []document.Template{}
	for _, row := range rows {
		out = append(out, document.Template{TemplateID: row.TemplateID, HotelID: row.HotelID, Kind: row.Kind, Format: row.Format, Title: shared.LocalizedString(row.Title), Body: shared.LocalizedString(row.Body)})
	}
	return out, translate(err)
}
func (r *Repository) SaveTemplate(ctx context.Context, t document.Template) (document.Template, error) {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,9))", t.HotelID.String()).Error; err != nil {
			return err
		}
		var existing []models.DocumentTemplate
		if err := tx.Where("hotel_id = ? AND kind = ?", t.HotelID, t.Kind).Find(&existing).Error; err != nil {
			return err
		}
		row := models.DocumentTemplate{TemplateID: uuid.New(), HotelID: t.HotelID, Kind: t.Kind, Format: t.Format, Title: utils.LocalizedString(t.Title), Body: utils.LocalizedString(t.Body)}
		if len(existing) > 0 {
			row.TemplateID = existing[0].TemplateID
			t.TemplateID = row.TemplateID
			return tx.Model(&existing[0]).Select("Title", "Body", "Format").Updates(&row).Error
		}
		t.TemplateID = row.TemplateID
		return tx.Create(&row).Error
	})
	return t, translate(err)
}
func (r *Repository) ListDocuments(ctx context.Context, q document.Query) ([]document.Document, error) {
	db := r.db.WithContext(ctx).Where("hotel_id = ?", q.HotelID)
	if q.BranchID != uuid.Nil {
		db = db.Where("branch_id = ?", q.BranchID)
	}
	if q.BookingID != uuid.Nil {
		db = db.Where("booking_id = ?", q.BookingID)
	}
	var rows []models.Document
	err := db.Order("created_at DESC").Limit(500).Find(&rows).Error
	out := []document.Document{}
	for _, row := range rows {
		out = append(out, row.Snapshot)
	}
	return out, translate(err)
}
func (r *Repository) FindDocument(ctx context.Context, id uuid.UUID) (document.Document, error) {
	var row models.Document
	err := r.db.WithContext(ctx).First(&row, "document_id = ?", id).Error
	return row.Snapshot, translate(err)
}
func (r *Repository) SaveDocument(ctx context.Context, d document.Document) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBranch(tx, d.BranchID); err != nil {
			return err
		}
		var b models.Booking
		if err := tx.First(&b, "booking_id = ? AND branch_id = ?", d.BookingID, d.BranchID).Error; err != nil {
			return err
		}
		if (d.Kind == "cancellation_receipt" && b.Status != constants.BookingCancelled) || (d.Kind != "cancellation_receipt" && b.Status == constants.BookingCancelled) {
			return constants.ErrBookingState
		}
		return tx.Create(&models.Document{DocumentID: d.DocumentID, HotelID: d.HotelID, BranchID: d.BranchID, BookingID: d.BookingID, TemplateID: d.TemplateID, Snapshot: d, CreatedAt: d.CreatedAt}).Error
	}))
}

func (r *Repository) HistoricalRoomCode(ctx context.Context, branchID, roomID uuid.UUID) (string, error) {
	var room models.Room
	err := r.db.WithContext(ctx).Unscoped().Select("code").First(&room, "branch_id = ? AND room_id = ?", branchID, roomID).Error
	return room.Code, translate(err)
}
