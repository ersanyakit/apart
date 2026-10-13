package migrations

import (
	"otel/constants"
	"otel/internal/domain/payment"
	"otel/internal/domain/shared"
	"otel/internal/infrastructure/persistence/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func init() {
	Register(Migration{Version: "20261013_014_payment_channels", Up: func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(&models.PaymentChannel{}); err != nil {
			return err
		}
		// Existing hotels start with the standard five channels.
		var hotelIDs []uuid.UUID
		if err := tx.Table("hotels").Pluck("hotel_id", &hotelIDs).Error; err != nil {
			return err
		}
		for _, hotelID := range hotelIDs {
			var count int64
			if err := tx.Model(&models.PaymentChannel{}).Where("hotel_id = ?", hotelID).Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				continue
			}
			rows := make([]models.PaymentChannel, 0)
			for _, c := range payment.DefaultChannels(hotelID) {
				rows = append(rows, models.PaymentChannel{
					ChannelID: c.ChannelID,
					HotelID:   c.HotelID,
					Code:      c.Code,
					Labels: shared.LocalizedString{
						constants.LanguageTR: c.Labels[constants.LanguageTR],
						constants.LanguageEN: c.Labels[constants.LanguageEN],
					},
					Active:    c.Active,
					SortOrder: c.SortOrder,
				})
			}
			if err := tx.Create(&rows).Error; err != nil {
				return err
			}
		}
		return nil
	}, Down: func(tx *gorm.DB) error {
		return tx.Migrator().DropTable(&models.PaymentChannel{})
	}})
}
