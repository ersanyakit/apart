package persistence

import (
	"context"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"otel/internal/domain/guest"
)

// Search profiles independently of whether a reservation has checked in.
func (r *Repository) SearchGuests(ctx context.Context, q guest.Query) (guest.SearchPage, error) {
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
	out := guest.SearchPage{Items: []guest.Profile{}, Page: q.Page}
	if err := base.Count(&out.Total).Error; err != nil {
		return out, err
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
	err := base.Select("gp.guest_id,gp.name,gp.national_id,gp.phone,gp.address,gp.nationality,"+lastPrice+" AS last_daily_price_minor", lastArgs...).
		Order("gp.name,gp.guest_id").Limit(100).Offset((q.Page - 1) * 100).Scan(&out.Items).Error
	return out, err
}
