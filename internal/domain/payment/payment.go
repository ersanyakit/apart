package payment

import (
	"context"
	"otel/constants"
	"otel/internal/domain/shared"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

var validCode = regexp.MustCompile(`^[a-z0-9][a-z0-9_]{0,31}$`)

// Channel is a hotel-level payment channel (cash, card, transfer…).
// Labels follow the shared i18n pattern (TR required, others optional).
type Channel struct {
	ChannelID uuid.UUID              `json:"channel_id"`
	HotelID   uuid.UUID              `json:"hotel_id"`
	Code      string                 `json:"code"`
	Labels    shared.LocalizedString `json:"labels"`
	Active    bool                   `json:"active"`
	SortOrder int                    `json:"sort_order"`
}

func (c Channel) Validate() error {
	if c.HotelID == uuid.Nil {
		return constants.ErrBranchRequired
	}
	if !validCode.MatchString(strings.ToLower(strings.TrimSpace(c.Code))) {
		return constants.ErrPayload
	}
	if strings.TrimSpace(c.Labels[constants.LanguageTR]) == "" {
		return constants.ErrPayload
	}
	for _, text := range c.Labels {
		if len(text) > 100 {
			return constants.ErrPayload
		}
	}
	return nil
}

// Label returns the channel name in the requested language,
// falling back to Turkish and then any available translation.
func (c Channel) Label(language constants.Language) string {
	if text := strings.TrimSpace(c.Labels[language]); text != "" {
		return text
	}
	if text := strings.TrimSpace(c.Labels[constants.LanguageTR]); text != "" {
		return text
	}
	for _, text := range c.Labels {
		if strings.TrimSpace(text) != "" {
			return text
		}
	}
	return c.Code
}

// DefaultChannels seeds every hotel with the standard five channels.
func DefaultChannels(hotelID uuid.UUID) []Channel {
	defs := []struct {
		code  string
		tr    string
		en    string
		order int
	}{
		{"cash", "Nakit", "Cash", 1},
		{"bank_transfer", "Havale", "Wire Transfer", 2},
		{"eft", "EFT", "EFT", 3},
		{"credit_card", "Kredi Kartı", "Credit Card", 4},
		{"crypto", "Kripto", "Crypto", 5},
	}
	out := make([]Channel, 0, len(defs))
	for _, d := range defs {
		out = append(out, Channel{
			ChannelID: uuid.New(),
			HotelID:   hotelID,
			Code:      d.code,
			Labels: shared.LocalizedString{
				constants.LanguageTR: d.tr,
				constants.LanguageEN: d.en,
			},
			Active:    true,
			SortOrder: d.order,
		})
	}
	return out
}

type Repository interface {
	ListPaymentChannels(context.Context, uuid.UUID) ([]Channel, error)
	SavePaymentChannel(context.Context, Channel, bool) (Channel, error)
	DeletePaymentChannel(context.Context, uuid.UUID, uuid.UUID) error
	EnsurePaymentChannels(context.Context, uuid.UUID) error
}
