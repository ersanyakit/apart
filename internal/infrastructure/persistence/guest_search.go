package persistence

import (
	"context"
	"database/sql"
	"otel/constants"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/internal/domain/guest"
)

// Search profiles independently of whether a reservation has checked in.
func (r *Repository) SearchGuests(ctx context.Context, q guest.Query) (guest.SearchPage, error) {
	return r.searchGuests(ctx, q, false)
}
func (r *Repository) ExportCustomers(ctx context.Context, q guest.Query) (guest.SearchPage, error) {
	var result guest.SearchPage
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		scoped := *r
		scoped.db = tx
		result, err = scoped.searchGuests(ctx, q, true)
		return err
	}, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	return result, err
}
func (r *Repository) searchGuests(ctx context.Context, q guest.Query, export bool) (guest.SearchPage, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	base := r.db.WithContext(ctx).Table("guest_profiles gp").
		Where("gp.hotel_id = ? AND gp.deleted_at IS NULL", q.HotelID)
	if q.BranchID != uuid.Nil {
		base = base.Where(`EXISTS (SELECT 1 FROM booking_guests bg JOIN bookings b ON b.booking_id = bg.booking_id
			WHERE bg.guest_id = gp.guest_id AND bg.hotel_id = gp.hotel_id AND b.branch_id = ?)`, q.BranchID)
	}
	if q.GuestID != uuid.Nil {
		base = base.Where("gp.guest_id = ?", q.GuestID)
	}
	if term := strings.TrimSpace(q.Search); term != "" {
		// Match Turkish I variants, and accept phone numbers without formatting.
		normalize := strings.ToLower(strings.NewReplacer("İ", "i", "I", "i", "ı", "i").Replace(term))
		pattern := "%" + strings.NewReplacer("\\", "\\\\", "%", "\\%", "_", "\\_").Replace(normalize) + "%"
		fields := []string{"name", "national_id", "phone", "address", "nationality"}
		matches := func(alias string) (string, []any) {
			var clauses []string
			var args []any
			for _, field := range fields {
				if alias == "bg" && field == "address" {
					continue
				}
				clauses = append(clauses, "lower(translate("+alias+"."+field+", 'İIı', 'iii')) LIKE ?")
				args = append(args, pattern)
			}
			digits := strings.Map(func(c rune) rune {
				if c >= '0' && c <= '9' {
					return c
				}
				return -1
			}, term)
			if digits != "" && strings.IndexFunc(term, unicode.IsLetter) == -1 {
				clauses = append(clauses, "regexp_replace("+alias+".phone, '[^0-9]', '', 'g') LIKE ?")
				args = append(args, "%"+digits+"%")
			}
			return "(" + strings.Join(clauses, " OR ") + ")", args
		}
		profileSQL, args := matches("gp")
		historySQL, historyArgs := matches("bg")
		history := `EXISTS (SELECT 1 FROM booking_guests bg JOIN bookings b ON b.booking_id = bg.booking_id
			WHERE bg.guest_id = gp.guest_id AND bg.hotel_id = gp.hotel_id AND ` + historySQL
		args = append(args, historyArgs...)
		if q.BranchID != uuid.Nil {
			history += " AND b.branch_id = ?"
			args = append(args, q.BranchID)
		}
		base = base.Where("("+profileSQL+" OR "+history+"))", args...)
	}
	if q.Unique {
		// Never merge people by name or shared phone number. Prefer the latest
		// profile for the same non-empty identity and country; unidentified
		// customers remain distinct by guest_id. Deduplicate before pagination.
		identity := "CASE WHEN btrim(gp.national_id) <> '' THEN 'identity:' || upper(btrim(gp.nationality)) || ':' || upper(btrim(gp.national_id)) ELSE 'guest:' || gp.guest_id::text END"
		unique := base.Select("DISTINCT ON (" + identity + ") gp.*").Order(identity + ", gp.updated_at DESC, gp.guest_id")
		base = r.db.WithContext(ctx).Table("(?) AS gp", unique)
	}
	out := guest.SearchPage{Items: []guest.Profile{}, Page: q.Page}
	if err := base.Count(&out.Total).Error; err != nil {
		return out, err
	}
	if export && out.Total > 10000 {
		return out, constants.ErrExportLimit
	}
	// Son konaklamanın gecelik fiyatı (şube seçiliyse o şubedeki son kayıt).
	lastPrice := `COALESCE((SELECT b2.daily_price_minor FROM booking_guests bg2
		JOIN bookings b2 ON b2.booking_id = bg2.booking_id
		WHERE bg2.guest_id = gp.guest_id AND bg2.hotel_id = gp.hotel_id`
	var lastArgs []any
	if q.BranchID != uuid.Nil {
		lastPrice += ` AND b2.branch_id = ?`
		lastArgs = append(lastArgs, q.BranchID)
	}
	lastPrice += ` ORDER BY b2.check_in DESC LIMIT 1), 0)`
	column := map[string]string{"name": "gp.name", "national_id": "gp.national_id", "phone": "gp.phone", "nationality": "gp.nationality", "address": "gp.address"}[q.Sort]
	if column == "" {
		column = "gp.name"
	}
	direction := " ASC"
	if q.Desc {
		direction = " DESC"
	}
	query := base.Select("gp.guest_id,gp.name,gp.national_id,gp.phone,gp.address,gp.nationality,"+lastPrice+" AS last_daily_price_minor", lastArgs...).Order(column + direction + ",gp.guest_id")
	if export {
		query = query.Limit(10000)
	} else {
		query = query.Limit(guest.PageSize(q.PageSize)).Offset((q.Page - 1) * guest.PageSize(q.PageSize))
	}
	err := query.Scan(&out.Items).Error
	return out, err
}

// Match the same identity used by the customer directory, always within one
// hotel. Anonymous namesakes remain separate. This is also used for history so
// older profile cards do not disappear when the directory combines them.
func customerProfileIDs(db *gorm.DB, hotel, id uuid.UUID, unique bool) *gorm.DB {
	base := db.Table("guest_profiles candidate").Select("candidate.guest_id").Where("candidate.hotel_id = ?", hotel)
	if !unique {
		return base.Where("candidate.guest_id = ?", id)
	}
	return base.Where(`EXISTS (SELECT 1 FROM guest_profiles selected
 WHERE selected.guest_id = ? AND selected.hotel_id = candidate.hotel_id AND selected.deleted_at IS NULL
 AND (candidate.guest_id = selected.guest_id OR (btrim(selected.national_id) <> ''
 AND upper(btrim(candidate.national_id)) = upper(btrim(selected.national_id))
 AND upper(btrim(candidate.nationality)) = upper(btrim(selected.nationality)))))`, id)
}
