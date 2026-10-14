package persistence

import (
	"context"
	"database/sql"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/reporting"
	"otel/internal/infrastructure/persistence/models"
	"strings"
	"time"
)

// A repeatable-read snapshot prevents totals and detail rows from describing
// different versions of the same booking. Limits fail explicitly, never truncate.
func (r *Repository) ReportData(ctx context.Context, f reporting.Filter) (reporting.Dataset, error) {
	out := reporting.Dataset{Now: time.Now(), ArchivedRooms: map[uuid.UUID]bool{}}
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var branches []models.Branch
		q := tx.Where("hotel_id = ?", f.HotelID)
		if f.BranchID != uuid.Nil {
			q = q.Where("branch_id = ?", f.BranchID)
		}
		if e := q.Find(&branches).Error; e != nil {
			return e
		}
		if f.BranchID != uuid.Nil && len(branches) == 0 {
			return constants.ErrForbidden
		}
		ids := []uuid.UUID{}
		for _, b := range branches {
			ids = append(ids, b.BranchID)
			out.Branches = append(out.Branches, fromBranch(b))
		}
		var rooms []models.Room
		if e := tx.Unscoped().Where("branch_id IN ?", ids).Find(&rooms).Error; e != nil {
			return e
		}
		for _, v := range rooms {
			p := fromRoom(v)
			p.Inactive = p.Inactive || v.DeletedAt.Valid
			out.ArchivedRooms[v.RoomID] = v.DeletedAt.Valid
			out.Rooms = append(out.Rooms, p)
		}
		for _, id := range f.RoomIDs {
			found := false
			for _, r := range rooms {
				if r.RoomID == id {
					found = true
					break
				}
			}
			if !found {
				return constants.ErrForbidden
			}
		}
		var bookings []models.Booking
		if e := tx.Where("branch_id IN ?", ids).Preload("Allocations", func(q *gorm.DB) *gorm.DB { return q.Order("start, allocation_id") }).Order("created_at, booking_id").Limit(50001).Find(&bookings).Error; e != nil {
			return e
		}
		if len(bookings) > 50000 {
			return constants.ErrPayload
		}
		for _, v := range bookings {
			out.Bookings = append(out.Bookings, fromBooking(v))
		}
		if e := enrichBookingActors(tx, out.Bookings); e != nil {
			return e
		}
		if e := tx.Where("hotel_id = ? AND branch_id IN ? AND voided_at IS NULL", f.HotelID, ids).Order("occurred_at,created_at,id").Limit(100001).Find(&out.Records).Error; e != nil {
			return e
		}
		if len(out.Records) > 100000 {
			return constants.ErrPayload
		}
		return nil
	}, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	return out, translate(err)
}
func (r *Repository) AppendReportRecord(ctx context.Context, in reporting.Record) (reporting.Record, error) {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := lockBranch(tx, in.BranchID); e != nil {
			return e
		}
		var b models.Branch
		if e := tx.First(&b, "branch_id = ? AND hotel_id = ?", in.BranchID, in.HotelID).Error; e != nil {
			return constants.ErrForbidden
		}
		if in.RoomID != nil {
			var n int64
			if e := tx.Model(&models.Room{}).Where("room_id = ? AND branch_id = ?", *in.RoomID, in.BranchID).Count(&n).Error; e != nil {
				return e
			}
			if n != 1 {
				return constants.ErrForbidden
			}
		}
		if in.BookingID != nil {
			var n int64
			if e := tx.Model(&models.Booking{}).Where("booking_id = ? AND branch_id = ?", *in.BookingID, in.BranchID).Count(&n).Error; e != nil {
				return e
			}
			if n != 1 {
				return constants.ErrForbidden
			}
		}
		if in.ResponsibleID != nil {
			var person models.User
			if e := tx.First(&person, "user_id = ? AND hotel_id = ?", *in.ResponsibleID, in.HotelID).Error; e != nil {
				return constants.ErrForbidden
			}
			if person.UserRole != constants.UserRoleAdmin && person.UserRole != constants.UserRoleManagement {
				var membership int64
				if e := tx.Model(&models.UserBranch{}).Where("user_id = ? AND branch_id = ?", person.UserID, in.BranchID).Count(&membership).Error; e != nil {
					return e
				}
				if membership == 0 {
					return constants.ErrForbidden
				}
			}
			in.ResponsibleName = person.FirstName + " " + person.LastName
			if strings.TrimSpace(in.ResponsibleName) == "" {
				in.ResponsibleName = person.UserName
			}
		}
		// Client IDs are idempotency keys; retries never create duplicate money.
		var old reporting.Record
		res := tx.Where("id = ?", in.ID).Limit(1).Find(&old)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected > 0 {
			if old.HotelID != in.HotelID || old.ActorID != in.ActorID {
				return constants.ErrForbidden
			}
			in = old
			return nil
		}
		if e := tx.Create(&in).Error; e != nil {
			return e
		}
		return recordAudit(tx, in.HotelID, "create", "report_records", in.ID, map[string]any{"after": map[string]any{"name": in.Label, "kind": in.Kind, "amount_minor": in.AmountMinor, "currency": in.Currency, "branch_id": in.BranchID, "room_id": in.RoomID, "booking_id": in.BookingID}})
	})
	return in, translate(err)
}
func (r *Repository) VoidReportRecord(ctx context.Context, hotel, id, actor uuid.UUID, reason string) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var item reporting.Record
		if e := tx.First(&item, "id=? AND hotel_id=?", id, hotel).Error; e != nil {
			return e
		}
		if e := lockBranch(tx, item.BranchID); e != nil {
			return e
		}
		res := tx.Model(&reporting.Record{}).Where("id = ? AND hotel_id = ? AND voided_at IS NULL", id, hotel).Updates(map[string]any{"voided_at": time.Now().UTC(), "void_reason": reason})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected != 1 {
			return constants.ErrNotFound
		}
		return recordAudit(tx, hotel, "delete", "report_records", id, map[string]any{"reason": reason, "actor_id": actor})
	}))
}

func (r *Repository) RecordChoices(ctx context.Context, hotel, branch uuid.UUID) (reporting.Choices, error) {
	out := reporting.Choices{Shifts: []reporting.Choice{}, Accounts: []reporting.Choice{}}
	var b models.Branch
	if e := r.db.WithContext(ctx).First(&b, "hotel_id = ? AND branch_id = ?", hotel, branch).Error; e != nil {
		return out, constants.ErrForbidden
	}
	var rows []reporting.Record
	err := r.db.WithContext(ctx).Where("hotel_id = ? AND branch_id = ? AND voided_at IS NULL AND kind IN ?", hotel, branch, []string{"cash_open", "cash_close", "receivable", "payable"}).Order("occurred_at DESC").Limit(5000).Find(&rows).Error
	if err != nil {
		return out, translate(err)
	}
	closed := map[string]bool{}
	for _, v := range rows {
		if v.Kind == "cash_close" {
			closed[v.Reference] = true
		}
	}
	for _, v := range rows {
		if v.Kind == "cash_open" && !closed[v.Reference] {
			out.Shifts = append(out.Shifts, reporting.Choice{Kind: v.Kind, Currency: v.Currency, Value: v.Reference, Label: v.Label + " · " + v.OccurredAt.In(reporting.Zone).Format("02.01 15:04") + " · " + v.Currency})
		}
		if v.Kind == "receivable" || v.Kind == "payable" {
			out.Accounts = append(out.Accounts, reporting.Choice{Kind: v.Kind, Currency: v.Currency, Value: v.Reference, Label: v.Party + " · " + v.Label})
		}
	}
	return out, nil
}
