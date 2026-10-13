package migrations

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
	"time"
)

func init() {
	Register(Migration{Version: "20261012_008_guests", Up: func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(&models.GuestProfile{}, &models.BookingGuest{}); err != nil {
			return err
		}
		for _, sql := range []string{
			`CREATE UNIQUE INDEX idx_guest_identity ON guest_profiles(hotel_id,national_id) WHERE national_id <> '' AND deleted_at IS NULL`,
			`ALTER TABLE guest_profiles ADD CONSTRAINT fk_guest_hotel FOREIGN KEY(hotel_id) REFERENCES hotels(hotel_id) ON DELETE RESTRICT`,
			`ALTER TABLE booking_guests ADD CONSTRAINT fk_booking_guest_profile FOREIGN KEY(guest_id,hotel_id) REFERENCES guest_profiles(guest_id,hotel_id) ON DELETE RESTRICT`,
			`ALTER TABLE booking_guests ADD CONSTRAINT fk_booking_guest_booking FOREIGN KEY(booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT`,
		} {
			if err := tx.Exec(sql).Error; err != nil {
				return err
			}
		}
		var bookings []models.Booking
		if err := tx.Find(&bookings).Error; err != nil {
			return err
		}
		for _, b := range bookings {
			var branch models.Branch
			if err := tx.Unscoped().First(&branch, "branch_id = ?", b.BranchID).Error; err != nil {
				return err
			}
			people := b.GuestDetails
			if len(people) == 0 {
				people = []models.RoomGuest{{Name: b.GuestName}}
			}
			for i, p := range people {
				id := uuid.NewSHA1(b.BookingID, []byte(p.ID+"/"+p.Name))
				profile := models.GuestProfile{GuestID: id, HotelID: branch.HotelID, Name: p.Name, TCNo: p.TCNo, Phone: p.Phone, Address: p.Address}
				query := tx.Where("guest_id = ?", id)
				if p.TCNo != "" {
					query = tx.Where("hotel_id = ? AND national_id = ?", branch.HotelID, p.TCNo)
				}
				defaults := profile
				profile = models.GuestProfile{}
				if err := query.Attrs(defaults).FirstOrCreate(&profile).Error; err != nil {
					return err
				}
				people[i].ID = profile.GuestID.String()
				joined := b.CheckIn
				if b.ActualCheckIn != nil {
					joined = *b.ActualCheckIn
				}
				var left *time.Time
				if b.ActualCheckOut != nil {
					left = b.ActualCheckOut
				}
				if err := tx.Where("booking_id = ? AND guest_id = ?", b.BookingID, profile.GuestID).FirstOrCreate(&models.BookingGuest{BookingID: b.BookingID, GuestID: profile.GuestID, HotelID: branch.HotelID, Name: p.Name, TCNo: p.TCNo, Phone: p.Phone, JoinedAt: joined, LeftAt: left}).Error; err != nil {
					return err
				}
			}
			if err := tx.Model(&b).Select("GuestDetails").Updates(&models.Booking{GuestDetails: people}).Error; err != nil {
				return err
			}
		}
		return nil
	}, Down: func(tx *gorm.DB) error {
		return tx.Migrator().DropTable(&models.BookingGuest{}, &models.GuestProfile{})
	}})
}
