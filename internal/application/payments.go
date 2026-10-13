package application

import (
	"context"
	"otel/constants"
	"otel/internal/domain/identity"
	"otel/internal/domain/payment"
	"strings"

	"github.com/google/uuid"
)

type Payments struct {
	Repository payment.Repository
}

func (s *Payments) List(ctx context.Context, u identity.User, hotelID uuid.UUID) ([]payment.Channel, error) {
	if !u.CanAccessHotel(hotelID) {
		return nil, constants.ErrForbidden
	}
	if err := s.Repository.EnsurePaymentChannels(ctx, hotelID); err != nil {
		return nil, err
	}
	return s.Repository.ListPaymentChannels(ctx, hotelID)
}

func (s *Payments) Save(ctx context.Context, u identity.User, in payment.Channel, create bool) (payment.Channel, error) {
	in.Code = strings.ToLower(strings.TrimSpace(in.Code))
	if !u.IsManager() || !u.CanAccessHotel(in.HotelID) {
		return in, constants.ErrForbidden
	}
	if err := in.Validate(); err != nil {
		return in, err
	}
	if !create && in.ChannelID == uuid.Nil {
		return in, constants.ErrPayload
	}
	return s.Repository.SavePaymentChannel(ctx, in, create)
}

func (s *Payments) Delete(ctx context.Context, u identity.User, hotelID, id uuid.UUID) error {
	if !u.IsManager() || !u.CanAccessHotel(hotelID) {
		return constants.ErrForbidden
	}
	if id == uuid.Nil {
		return constants.ErrPayload
	}
	return s.Repository.DeletePaymentChannel(ctx, hotelID, id)
}
