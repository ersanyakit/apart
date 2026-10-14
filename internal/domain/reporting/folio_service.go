package reporting

import (
	"github.com/google/uuid"
	"otel/constants"
	"strings"
)

type FolioServiceInput struct {
	ID             uuid.UUID `json:"id"`
	BranchID       uuid.UUID `json:"branch_id"`
	BookingID      uuid.UUID `json:"booking_id"`
	Label          string    `json:"label"`
	Category       string    `json:"category"`
	Quantity       int64     `json:"quantity"`
	UnitPriceMinor int64     `json:"unit_price_minor"`
	Currency       string    `json:"currency"`
	Notes          string    `json:"notes"`
}

func (in FolioServiceInput) Validate() error {
	if in.ID == uuid.Nil || in.BranchID == uuid.Nil || in.BookingID == uuid.Nil || strings.TrimSpace(in.Label) == "" || len(in.Label) > 200 || len(in.Notes) > 2000 || in.Quantity < 1 || in.Quantity > 10000 || in.UnitPriceMinor < 1 || in.UnitPriceMinor > 1000000000 || in.UnitPriceMinor*in.Quantity > 999999999999 || !currency.MatchString(in.Currency) {
		return constants.ErrPayload
	}
	switch in.Category {
	case "extra_bed", "service", "food", "laundry", "early_late", "other":
	default:
		return constants.ErrPayload
	}
	return nil
}

type FolioServiceVoid struct {
	ID        uuid.UUID `json:"id"`
	BranchID  uuid.UUID `json:"branch_id"`
	BookingID uuid.UUID `json:"booking_id"`
	Reason    string    `json:"reason"`
}
