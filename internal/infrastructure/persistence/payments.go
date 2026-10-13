package persistence

import (
	"context"
	"strings"

	"otel/internal/domain/payment"
	"otel/internal/infrastructure/persistence/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func toPaymentChannel(row models.PaymentChannel) payment.Channel {
	return payment.Channel{
		ChannelID: row.ChannelID,
		HotelID:   row.HotelID,
		Code:      row.Code,
		Labels:    row.Labels,
		Active:    row.Active,
		SortOrder: row.SortOrder,
	}
}

func (r *Repository) ListPaymentChannels(ctx context.Context, hotelID uuid.UUID) ([]payment.Channel, error) {
	var rows []models.PaymentChannel
	if err := r.db.WithContext(ctx).Where("hotel_id = ?", hotelID).Order("sort_order, code").Find(&rows).Error; err != nil {
		return nil, translate(err)
	}
	out := make([]payment.Channel, 0, len(rows))
	for _, row := range rows {
		out = append(out, toPaymentChannel(row))
	}
	return out, nil
}

func (r *Repository) SavePaymentChannel(ctx context.Context, in payment.Channel, create bool) (payment.Channel, error) {
	var out payment.Channel
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if create {
			in.ChannelID = uuid.New()
			row := models.PaymentChannel{ChannelID: in.ChannelID, HotelID: in.HotelID, Code: in.Code, Labels: in.Labels, Active: in.Active, SortOrder: in.SortOrder}
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
			out = toPaymentChannel(row)
			return nil
		}
		var row models.PaymentChannel
		if err := tx.First(&row, "channel_id = ? AND hotel_id = ?", in.ChannelID, in.HotelID).Error; err != nil {
			return err
		}
		row.Code = in.Code
		row.Labels = in.Labels
		row.Active = in.Active
		row.SortOrder = in.SortOrder
		if err := tx.Save(&row).Error; err != nil {
			return err
		}
		out = toPaymentChannel(row)
		return nil
	})
	return out, translate(err)
}

func (r *Repository) DeletePaymentChannel(ctx context.Context, hotelID, id uuid.UUID) error {
	return translate(r.db.WithContext(ctx).Where("channel_id = ? AND hotel_id = ?", id, hotelID).Delete(&models.PaymentChannel{}).Error)
}

// EnsurePaymentChannels seeds the standard channels when a hotel has none yet.
func (r *Repository) EnsurePaymentChannels(ctx context.Context, hotelID uuid.UUID) error {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.PaymentChannel{}).Where("hotel_id = ?", hotelID).Count(&count).Error; err != nil {
		return translate(err)
	}
	if count > 0 {
		return nil
	}
	rows := make([]models.PaymentChannel, 0)
	for _, c := range payment.DefaultChannels(hotelID) {
		rows = append(rows, models.PaymentChannel{ChannelID: c.ChannelID, HotelID: c.HotelID, Code: strings.ToLower(strings.TrimSpace(c.Code)), Labels: c.Labels, Active: c.Active, SortOrder: c.SortOrder})
	}
	return translate(r.db.WithContext(ctx).Create(&rows).Error)
}
