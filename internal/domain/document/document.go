package document

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/shared"
	"strings"
	"time"
)

type Template struct {
	TemplateID uuid.UUID              `json:"template_id"`
	HotelID    uuid.UUID              `json:"hotel_id"`
	Kind       string                 `json:"kind"`
	Title      shared.LocalizedString `json:"title"`
	Body       shared.LocalizedString `json:"body"`
}

func (t Template) Validate() error {
	if t.HotelID == uuid.Nil {
		return constants.ErrHotelRequired
	}
	switch t.Kind {
	case "rental_contract", "sale_contract", "reservation_receipt", "sale_receipt", "cancellation_receipt":
	default:
		return constants.ErrDocumentKind
	}
	if err := t.Title.Validate(); err != nil {
		return err
	}
	if err := t.Body.Validate(); err != nil {
		return err
	}
	if len(t.Title) == 0 || len(t.Body) == 0 {
		return constants.ErrDocumentTemplate
	}
	for language, body := range t.Body {
		if strings.TrimSpace(body) == "" || strings.TrimSpace(t.Title[language]) == "" {
			return constants.ErrDocumentTemplate
		}
	}
	return nil
}

type Issue struct {
	HotelID       uuid.UUID          `json:"hotel_id"`
	BranchID      uuid.UUID          `json:"branch_id"`
	BookingID     uuid.UUID          `json:"booking_id"`
	Kind          string             `json:"kind"`
	Language      constants.Language `json:"language"`
	AmountMinor   int64              `json:"amount_minor"`
	Currency      string             `json:"currency"`
	PaymentMethod string             `json:"payment_method"`
	Reference     string             `json:"reference"`
	PaidAt        *time.Time         `json:"paid_at"`
}
type Document struct {
	DocumentID    uuid.UUID          `json:"document_id"`
	HotelID       uuid.UUID          `json:"hotel_id"`
	BranchID      uuid.UUID          `json:"branch_id"`
	BookingID     uuid.UUID          `json:"booking_id"`
	TemplateID    uuid.UUID          `json:"template_id"`
	AuthorID      uuid.UUID          `json:"author_id"`
	Kind          string             `json:"kind"`
	Language      constants.Language `json:"language"`
	Title         string             `json:"title"`
	Body          string             `json:"body"`
	AmountMinor   int64              `json:"amount_minor"`
	Currency      string             `json:"currency"`
	PaymentMethod string             `json:"payment_method"`
	Reference     string             `json:"reference"`
	PaidAt        *time.Time         `json:"paid_at"`
	CreatedAt     time.Time          `json:"created_at"`
}
type Query struct {
	HotelID   uuid.UUID `json:"hotel_id"`
	BranchID  uuid.UUID `json:"branch_id"`
	BookingID uuid.UUID `json:"booking_id"`
}
type Repository interface {
	HistoricalRoomCode(context.Context, uuid.UUID, uuid.UUID) (string, error)
	Templates(context.Context, uuid.UUID) ([]Template, error)
	SaveTemplate(context.Context, Template) (Template, error)
	ListDocuments(context.Context, Query) ([]Document, error)
	FindDocument(context.Context, uuid.UUID) (Document, error)
	SaveDocument(context.Context, Document) error
}
