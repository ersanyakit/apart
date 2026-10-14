package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/booking"
	"otel/internal/domain/guest"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence/models"
	"strings"
	"time"
)

func syncGuests(tx *gorm.DB, b *booking.Booking) error {
	var branch models.Branch
	if err := tx.First(&branch, "branch_id = ?", b.BranchID).Error; err != nil {
		return err
	}
	if len(b.Guests) == 0 {
		b.Guests = []property.Guest{{Name: b.GuestName}}
	}
	seen := map[uuid.UUID]bool{}
	for i, g := range b.Guests {
		var profile models.GuestProfile
		var matches []models.GuestProfile
		if g.ID != "" {
			id, err := uuid.Parse(g.ID)
			if err != nil {
				return constants.ErrGuestIdentity
			}
			if err := tx.Unscoped().Where("guest_id = ?", id).Find(&matches).Error; err != nil {
				return err
			}
			if len(matches) > 0 && (matches[0].HotelID != branch.HotelID || matches[0].DeletedAt.Valid) {
				return constants.ErrForbidden
			}
		}
		if len(matches) == 0 && strings.TrimSpace(g.TCNo) != "" {
			if err := tx.Where("hotel_id = ? AND national_id = ?", branch.HotelID, strings.TrimSpace(g.TCNo)).Find(&matches).Error; err != nil {
				return err
			}
		}
		if len(matches) > 0 {
			profile = matches[0]
		} else {
			profile = models.GuestProfile{GuestID: uuid.New(), HotelID: branch.HotelID, Name: strings.TrimSpace(g.Name), TCNo: strings.TrimSpace(g.TCNo), Phone: g.Phone, Address: g.Address, Nationality: strings.ToUpper(strings.TrimSpace(g.Nationality))}
			if err := tx.Create(&profile).Error; err != nil {
				return err
			}
		}
		if nat := strings.ToUpper(strings.TrimSpace(g.Nationality)); nat != "" && nat != profile.Nationality {
			if err := tx.Model(&models.GuestProfile{}).Where("guest_id = ?", profile.GuestID).Select("Nationality").Updates(&models.GuestProfile{Nationality: nat}).Error; err != nil {
				return err
			}
			profile.Nationality = nat
		}
		if seen[profile.GuestID] {
			return constants.ErrGuestIdentity
		}
		seen[profile.GuestID] = true
		b.Guests[i].ID = profile.GuestID.String()
		joined := b.CheckIn
		if b.Status == booking.CheckedIn {
			joined = time.Now().UTC()
		}
		var previous []models.BookingGuest
		if err := tx.Where("booking_id = ? AND guest_id = ?", b.BookingID, profile.GuestID).Find(&previous).Error; err != nil {
			return err
		}
		membership := models.BookingGuest{BookingID: b.BookingID, GuestID: profile.GuestID, HotelID: branch.HotelID, Name: g.Name, TCNo: g.TCNo, Phone: g.Phone, Relationship: g.Relationship, Nationality: strings.ToUpper(strings.TrimSpace(g.Nationality)), JoinedAt: joined}
		if len(previous) > 0 {
			// Re-adding someone who left would overwrite their stay interval; use a new booking.
			if previous[0].LeftAt != nil && b.Status == booking.CheckedIn {
				return constants.ErrGuestRejoin
			}
			membership.JoinedAt = previous[0].JoinedAt
			if b.Status == booking.Confirmed {
				membership.JoinedAt = b.CheckIn
			}
			if err := tx.Model(&models.BookingGuest{}).Where("booking_id = ? AND guest_id = ?", b.BookingID, profile.GuestID).Select("Name", "TCNo", "Phone", "Relationship", "Nationality", "JoinedAt", "LeftAt").Updates(&membership).Error; err != nil {
				return err
			}
		} else if err := tx.Create(&membership).Error; err != nil {
			return err
		}
	}
	ids := []uuid.UUID{}
	for id := range seen {
		ids = append(ids, id)
	}
	if b.Status == booking.Confirmed {
		if err := tx.Where("booking_id = ? AND guest_id NOT IN ?", b.BookingID, ids).Delete(&models.BookingGuest{}).Error; err != nil {
			return err
		}
	} else {
		if err := tx.Model(&models.BookingGuest{}).Where("booking_id = ? AND guest_id NOT IN ? AND left_at IS NULL", b.BookingID, ids).Update("left_at", time.Now().UTC()).Error; err != nil {
			return err
		}
	}
	row := toBooking(*b)
	return tx.Model(&models.Booking{}).Where("booking_id = ?", b.BookingID).Select("GuestDetails", "GuestCount").Updates(&row).Error
}

func (r *Repository) UpdateBookingGuests(ctx context.Context, in guest.Update) (booking.Booking, error) {
	var out booking.Booking
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBranch(tx, in.BranchID); err != nil {
			return err
		}
		b, err := loadBooking(tx, in.BranchID, in.BookingID)
		if err != nil {
			return err
		}
		if b.Status != booking.Confirmed && b.Status != booking.CheckedIn {
			return constants.ErrBookingState
		}
		b.Guests, b.GuestCount = in.Guests, in.GuestCount
		if len(b.Guests) == 0 {
			return constants.ErrGuestRequired
		}
		if err := b.Validate(); err != nil {
			return err
		}
		rooms, err := inventory(tx, in.BranchID)
		if err != nil {
			return err
		}
		if limit := property.GuestLimit(rooms, b.RoomID); limit > 0 && b.GuestCount > limit {
			return constants.ErrCapacity
		}
		if err := syncGuests(tx, &b); err != nil {
			return err
		}
		out = b
		return nil
	})
	return out, translate(err)
}

func (r *Repository) GuestStays(ctx context.Context, q guest.Query, export bool) (guest.Page, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	start := `GREATEST(a.start,COALESCE(b.actual_check_in,a.start),bg.joined_at)`
	end := `LEAST(CASE WHEN b.status='checked_in' AND b.room_id=a.room_id THEN GREATEST(a."end",NOW()) ELSE a."end" END,COALESCE(b.actual_check_out,'infinity'::timestamptz),COALESCE(bg.left_at,'infinity'::timestamptz))`
	base := r.db.WithContext(ctx).Table("booking_guests bg").Joins("JOIN bookings b ON b.booking_id=bg.booking_id").Joins("JOIN branches br ON br.branch_id=b.branch_id AND br.hotel_id=bg.hotel_id").Joins("JOIN booking_allocations a ON a.booking_id=b.booking_id").Joins("JOIN rooms r ON r.room_id=a.room_id AND r.branch_id=b.branch_id").Where("bg.hotel_id = ?", q.HotelID).Where(start + " < " + end)
	if q.BranchID != uuid.Nil {
		base = base.Where("b.branch_id = ?", q.BranchID)
	}
	if q.GuestID != uuid.Nil {
		base = base.Where("bg.guest_id = ?", q.GuestID)
	}
	if q.Search != "" {
		search := "%" + strings.NewReplacer("\\", "\\\\", "%", "\\%", "_", "\\_").Replace(q.Search) + "%"
		base = base.Where("bg.name ILIKE ? OR bg.national_id ILIKE ? OR bg.phone ILIKE ?", search, search, search)
	}
	if q.Status != "" {
		base = base.Where("b.status = ?", q.Status)
	} else {
		base = base.Where("b.actual_check_in IS NOT NULL AND b.status IN ?", []string{booking.CheckedIn, booking.Completed})
	}
	if q.From != nil {
		base = base.Where(end+" > ?", q.From)
	}
	if q.To != nil {
		base = base.Where(start+" < ?", q.To)
	}
	out := guest.Page{Items: []guest.Stay{}, Page: q.Page}
	if err := base.Count(&out.Total).Error; err != nil {
		return out, err
	}
	if export && out.Total > 10000 {
		return out, constants.ErrExportLimit
	}
	column := map[string]string{"name": "bg.name", "start": start, "end": end, "room": "r.code"}[q.Sort]
	if column == "" {
		column = start
	}
	direction := " ASC"
	if q.Desc {
		direction = " DESC"
	}
	selectSQL := `bg.guest_id,bg.name,bg.national_id,bg.phone,bg.nationality,b.booking_id,b.branch_id,br.name AS branch_name,a.room_id,r.code AS room_code,` + start + ` AS start,` + end + ` AS end,b.status,b.daily_price_minor`
	query := base.Select(selectSQL).Order(column + direction + ",b.booking_id,bg.guest_id,a.allocation_id")
	if export {
		query = query.Limit(10000)
	} else {
		query = query.Limit(guest.PageSize(q.PageSize)).Offset((q.Page - 1) * guest.PageSize(q.PageSize))
	}
	rows, err := query.Rows()
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var row guest.Stay
		if err := rows.Scan(&row.GuestID, &row.Name, &row.TCNo, &row.Phone, &row.Nationality, &row.BookingID, &row.BranchID, &row.BranchName, &row.RoomID, &row.RoomCode, &row.Start, &row.End, &row.Status, &row.DailyPriceMinor); err != nil {
			return out, err
		}
		out.Items = append(out.Items, row)
	}
	if err := rows.Err(); err != nil {
		return out, err
	}
	if err := rows.Close(); err != nil {
		return out, err
	}
	if len(out.Items) == 0 {
		return out, nil
	}
	// Rezervasyon ve kişi notlarını tek sorguda iliştir.
	bookingIDs := map[uuid.UUID]bool{}
	for _, row := range out.Items {
		bookingIDs[row.BookingID] = true
	}
	bookingList := make([]uuid.UUID, 0, len(bookingIDs))
	for id := range bookingIDs {
		bookingList = append(bookingList, id)
	}
	var bookings []models.Booking
	if err := r.db.WithContext(ctx).Where("booking_id IN ?", bookingList).Find(&bookings).Error; err != nil {
		return out, err
	}
	byBooking := map[uuid.UUID]models.Booking{}
	for _, b := range bookings {
		byBooking[b.BookingID] = b
	}
	for i, row := range out.Items {
		if b, ok := byBooking[row.BookingID]; ok {
			out.Items[i].BookingNotes = b.Notes
			for _, gd := range b.GuestDetails {
				if gd.ID == row.GuestID.String() && strings.TrimSpace(gd.Note) != "" {
					out.Items[i].GuestNote = gd.Note
					break
				}
			}
		}
	}
	branchIDs := []uuid.UUID{}
	first, last := out.Items[0].Start, out.Items[0].End
	for _, row := range out.Items {
		branchIDs = append(branchIDs, row.BranchID)
		if row.Start.Before(first) {
			first = row.Start
		}
		if row.End.After(last) {
			last = row.End
		}
	}
	// Include archived inventory so historical companions survive soft deletion.
	var units []models.Room
	if err := r.db.WithContext(ctx).Unscoped().Where("branch_id IN ?", branchIDs).Find(&units).Error; err != nil {
		return out, err
	}
	byID := map[uuid.UUID]models.Room{}
	for _, unit := range units {
		byID[unit.RoomID] = unit
	}
	physicalRoom := func(id uuid.UUID) uuid.UUID {
		seen := map[uuid.UUID]bool{}
		for !seen[id] {
			seen[id] = true
			unit, ok := byID[id]
			if !ok || unit.Kind != "bed" || unit.ParentID == nil {
				break
			}
			id = *unit.ParentID
		}
		return id
	}
	type companionStay struct {
		GuestID   uuid.UUID
		Name      string
		BookingID uuid.UUID
		RoomID    uuid.UUID
		Start     time.Time
		End       time.Time
		Status    string
	}
	var companions []companionStay
	candidate := r.db.WithContext(ctx).Table("booking_guests bg").
		Joins("JOIN bookings b ON b.booking_id=bg.booking_id").
		Joins("JOIN branches br ON br.branch_id=b.branch_id AND br.hotel_id=bg.hotel_id").
		Joins("JOIN booking_allocations a ON a.booking_id=b.booking_id").
		Where("bg.hotel_id = ? AND b.branch_id IN ?", q.HotelID, branchIDs).
		Where(start+" < ? AND "+end+" > ? AND "+start+" < "+end, last, first).
		Select("bg.guest_id,bg.name,b.booking_id,a.room_id," + start + " AS start," + end + " AS end,b.status").
		Order("bg.name,bg.guest_id")
	if err := candidate.Scan(&companions).Error; err != nil {
		return out, err
	}
	for i, row := range out.Items {
		out.Items[i].Companions = []guest.Companion{}
		seen := map[uuid.UUID]bool{}
		for _, p := range companions {
			actual := (row.Status == booking.CheckedIn || row.Status == booking.Completed) && (p.Status == booking.CheckedIn || p.Status == booking.Completed)
			if p.GuestID != row.GuestID && !seen[p.GuestID] && (p.BookingID == row.BookingID || actual) && physicalRoom(p.RoomID) == physicalRoom(row.RoomID) && p.Start.Before(row.End) && p.End.After(row.Start) {
				seen[p.GuestID] = true
				out.Items[i].Companions = append(out.Items[i].Companions, guest.Companion{GuestID: p.GuestID, Name: p.Name})
			}
		}
	}
	return out, nil
}
