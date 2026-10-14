package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/reporting"
	"otel/internal/infrastructure/persistence/models"
	"strings"
	"time"
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

func (r *Repository) SaveFolioService(ctx context.Context, in reporting.FolioServiceInput, actor uuid.UUID, actorName string) (reporting.Record, error) {
	var out reporting.Record
	e := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := lockBranch(tx, in.BranchID); e != nil {
			return e
		}
		b, e := loadBooking(tx, in.BranchID, in.BookingID)
		if e != nil {
			return e
		}
		var old reporting.Record
		found := tx.Where("id=?", in.ID).Limit(1).Find(&old)
		if found.Error != nil {
			return found.Error
		}
		if found.RowsAffected > 0 {
			if old.BranchID != in.BranchID || old.BookingID == nil || *old.BookingID != in.BookingID || old.ActorID != actor {
				return constants.ErrForbidden
			}
			if old.Kind != "income" || old.Label != strings.TrimSpace(in.Label) || old.Category != in.Category || old.Quantity != float64(in.Quantity) || old.UnitPriceMinor != in.UnitPriceMinor || old.Currency != in.Currency || old.Notes != strings.TrimSpace(in.Notes) || old.VoidedAt != nil {
				return constants.ErrConflict
			}
			out = old
			return nil
		}
		if b.Status != "confirmed" && b.Status != "checked_in" {
			return constants.ErrBookingState
		}
		var branch models.Branch
		if e := tx.First(&branch, "branch_id=?", in.BranchID).Error; e != nil {
			return e
		}
		now := time.Now().UTC()
		out = reporting.Record{ID: in.ID, HotelID: branch.HotelID, BranchID: in.BranchID, RoomID: &b.RoomID, BookingID: &b.BookingID, ActorID: actor, ActorName: actorName, Kind: "income", Category: in.Category, Label: strings.TrimSpace(in.Label), Quantity: float64(in.Quantity), UnitPriceMinor: in.UnitPriceMinor, AmountMinor: in.Quantity * in.UnitPriceMinor, Currency: in.Currency, Notes: strings.TrimSpace(in.Notes), Status: "completed", Priority: "normal", Measure: "piece", OccurredAt: now, CreatedAt: now}
		if e := out.Validate(); e != nil {
			return e
		}
		if e := tx.Create(&out).Error; e != nil {
			return e
		}
		return recordAudit(tx, out.HotelID, "create", "report_records", out.ID, map[string]any{"after": map[string]any{"name": out.Label, "kind": out.Kind, "quantity": out.Quantity, "unit_price_minor": out.UnitPriceMinor, "amount_minor": out.AmountMinor, "currency": out.Currency, "branch_id": out.BranchID, "room_id": out.RoomID, "booking_id": out.BookingID, "notes": out.Notes}})
	})
	return out, translate(e)
}
func (r *Repository) VoidFolioService(ctx context.Context, in reporting.FolioServiceVoid, actor uuid.UUID) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := lockBranch(tx, in.BranchID); e != nil {
			return e
		}
		b, e := loadBooking(tx, in.BranchID, in.BookingID)
		if e != nil {
			return e
		}
		if b.Status != "confirmed" && b.Status != "checked_in" {
			return constants.ErrBookingState
		}
		var item reporting.Record
		if e := tx.First(&item, "id=? AND branch_id=? AND booking_id=? AND kind='income' AND unit_price_minor>0", in.ID, in.BranchID, in.BookingID).Error; e != nil {
			return e
		}
		if item.VoidedAt != nil {
			return nil
		}
		now := time.Now().UTC()
		if e := tx.Model(&item).Updates(map[string]any{"voided_at": now, "void_reason": strings.TrimSpace(in.Reason)}).Error; e != nil {
			return e
		}
		return recordAudit(tx, item.HotelID, "delete", "report_records", item.ID, map[string]any{"before": map[string]any{"name": item.Label, "amount_minor": item.AmountMinor, "currency": item.Currency, "branch_id": item.BranchID, "room_id": item.RoomID}, "reason": strings.TrimSpace(in.Reason), "actor_id": actor})
	}))
}
