package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"otel/constants"
	"otel/internal/domain/guest"
	"otel/internal/infrastructure/persistence/models"
	"strings"
	"time"
)

func (r *Repository) SaveGuestAssessment(ctx context.Context, in guest.AssessmentInput, actor uuid.UUID, actorName string) (guest.Assessment, error) {
	var out guest.Assessment
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if e := lockBranch(tx, in.BranchID); e != nil {
			return e
		}
		var profile models.GuestProfile
		if e := tx.First(&profile, "guest_id=? AND hotel_id=?", in.GuestID, in.HotelID).Error; e != nil {
			return constants.ErrNotFound
		}
		var n int64
		if e := tx.Table("booking_guests bg").Joins("JOIN bookings b ON b.booking_id=bg.booking_id").Joins("JOIN branches br ON br.branch_id=b.branch_id").Where("bg.guest_id=? AND bg.booking_id=? AND bg.hotel_id=? AND b.branch_id=? AND br.hotel_id=?", in.GuestID, in.BookingID, in.HotelID, in.BranchID, in.HotelID).Count(&n).Error; e != nil {
			return e
		}
		if n != 1 {
			return constants.ErrForbidden
		}
		var hotel models.Hotel
		if e := tx.First(&hotel, "hotel_id=?", in.HotelID).Error; e != nil {
			return e
		}
		// Idempotent retries cannot duplicate blacklist entries or overwrite another actor.
		var prior guest.Assessment
		res := tx.Where("id=?", in.ID).Limit(1).Find(&prior)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected > 0 {
			if prior.ActorID != actor || prior.HotelID != in.HotelID || prior.GuestID != in.GuestID || prior.BookingID != in.BookingID || prior.Kind != in.Kind || prior.Score != in.Score || prior.Reason != in.Reason {
				return constants.ErrPayload
			}
			out = prior
			return nil
		}
		now := time.Now().UTC()
		out = guest.Assessment{ID: in.ID, HotelID: in.HotelID, BranchID: in.BranchID, BookingID: in.BookingID, GuestID: in.GuestID, ActorID: actor, ActorName: actorName, HotelName: hotel.Name, Name: profile.Name, IdentityKey: guest.IdentityKey(profile.TCNo, profile.Nationality), IdentityHint: guest.IdentityHint(profile.TCNo, profile.Nationality), Kind: in.Kind, Score: in.Score, Reason: in.Reason, CreatedAt: now, UpdatedAt: now}
		if in.Kind == "blacklist" && out.IdentityKey == "" {
			return constants.ErrBlacklistIdentity
		}
		if in.Kind == "rating" {
			res = tx.Where("guest_id=? AND booking_id=? AND actor_id=? AND kind='rating'", in.GuestID, in.BookingID, actor).Limit(1).Find(&prior)
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected > 0 {
				before := prior
				prior.Score = in.Score
				prior.Reason = in.Reason
				prior.UpdatedAt = now
				if e := tx.Save(&prior).Error; e != nil {
					return e
				}
				out = prior
				return recordAudit(tx, in.HotelID, "update", "guest_assessments", out.ID, map[string]any{"before": before, "after": out})
			}
		}
		if e := tx.Create(&out).Error; e != nil {
			return e
		}
		return recordAudit(tx, in.HotelID, "create", "guest_assessments", out.ID, map[string]any{"after": out})
	})
	return out, translate(err)
}
func (r *Repository) GuestReputation(ctx context.Context, q guest.AssessmentQuery) (guest.Reputation, error) {
	out := guest.Reputation{Ratings: []guest.Assessment{}, Blacklist: []guest.Assessment{}}
	db := r.db.WithContext(ctx)
	var profile models.GuestProfile
	if e := db.Where(`guest_id=? AND hotel_id=? AND EXISTS (SELECT 1 FROM booking_guests bg JOIN bookings b ON b.booking_id=bg.booking_id WHERE bg.guest_id=guest_profiles.guest_id AND bg.hotel_id=guest_profiles.hotel_id AND b.branch_id=?)`, q.GuestID, q.HotelID, q.BranchID).First(&profile).Error; e != nil {
		return out, translate(e)
	}
	base := db.Model(&guest.Assessment{}).Where("hotel_id=? AND guest_id=? AND kind='rating'", q.HotelID, q.GuestID)
	var totals struct {
		Average     float64
		RatingCount int64
	}
	if e := base.Select("COALESCE(AVG(score),0) AS average,COUNT(*) AS rating_count").Scan(&totals).Error; e != nil {
		return out, e
	}
	out.Average = totals.Average
	out.RatingCount = totals.RatingCount
	if e := db.Where("hotel_id=? AND guest_id=? AND kind='rating'", q.HotelID, q.GuestID).Order("updated_at DESC,id").Limit(50).Find(&out.Ratings).Error; e != nil {
		return out, e
	}
	key := guest.IdentityKey(profile.TCNo, profile.Nationality)
	query := db.Where("kind='blacklist' AND revoked_at IS NULL")
	if key != "" {
		query = query.Where("identity_key=? OR (hotel_id=? AND guest_id=?)", key, q.HotelID, q.GuestID)
	} else {
		query = query.Where("hotel_id=? AND guest_id=?", q.HotelID, q.GuestID)
	}
	return out, query.Order("created_at DESC,id").Find(&out.Blacklist).Error
}
func (r *Repository) SharedBlacklist(ctx context.Context, q guest.AssessmentQuery) (guest.AssessmentPage, error) {
	out := guest.AssessmentPage{Items: []guest.Assessment{}, Page: q.Page, PageSize: q.PageSize}
	base := r.db.WithContext(ctx).Model(&guest.Assessment{}).Where("kind='blacklist'")
	if !q.IncludeRevoked {
		base = base.Where("revoked_at IS NULL")
	}
	if q.NationalID != "" {
		key := guest.IdentityKey(q.NationalID, q.Nationality)
		if key == "" {
			return out, constants.ErrPayload
		}
		base = base.Where("identity_key=?", key)
	}
	if term := strings.TrimSpace(q.Search); term != "" {
		pattern := "%" + strings.NewReplacer("\\", "\\\\", "%", "\\%", "_", "\\_").Replace(strings.ToLower(strings.NewReplacer("İ", "i", "I", "i", "ı", "i").Replace(term))) + "%"
		base = base.Where("lower(translate(name,'İIı','iii')) LIKE ? OR lower(translate(hotel_name,'İIı','iii')) LIKE ?", pattern, pattern)
	}
	if e := base.Count(&out.Total).Error; e != nil {
		return out, e
	}
	return out, base.Order("created_at DESC,id").Limit(q.PageSize).Offset((q.Page - 1) * q.PageSize).Find(&out.Items).Error
}
func (r *Repository) RevokeGuestAssessment(ctx context.Context, id, actor, hotel uuid.UUID, admin, manager bool, actorName, reason string) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var item guest.Assessment
		if e := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&item, "id=? AND kind='blacklist'", id).Error; e != nil {
			return e
		}
		if !admin && (item.HotelID != hotel || (!manager && item.ActorID != actor)) {
			return constants.ErrForbidden
		}
		if item.RevokedAt != nil {
			return nil
		}
		now := time.Now().UTC()
		item.RevokedAt = &now
		item.RevokedBy = &actor
		item.RevokedByName = actorName
		item.RevokeReason = reason
		if e := tx.Save(&item).Error; e != nil {
			return e
		}
		return recordAudit(tx, item.HotelID, "update", "guest_assessments", id, map[string]any{"after": item, "reason": reason})
	}))
}
