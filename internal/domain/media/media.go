package media

import (
	"context"
	"io"
	"net/url"
	apperrors "otel/constants"
	"otel/internal/domain/shared"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Kind string

const (
	KindImage Kind = "image"
	KindVideo Kind = "video"
)

type Asset struct {
	Kind         Kind                   `json:"kind"`
	MIMEType     string                 `json:"mime_type"`
	Size         int64                  `json:"size"`
	OriginalName string                 `json:"original_name"`
	MediaID      uuid.UUID              `json:"media_id"`
	HotelID      uuid.UUID              `json:"hotel_id"`
	StorageKey   string                 `json:"-"`
	URL          string                 `json:"url"`
	Title        shared.LocalizedString `json:"title"`
	Description  shared.LocalizedString `json:"description"`
	AltText      shared.LocalizedString `json:"alt_text"`
	SortOrder    int                    `json:"sort_order"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

func (p Asset) Validate() error {
	if p.Kind != KindImage && p.Kind != KindVideo {
		return apperrors.ErrMediaKind
	}
	if p.HotelID == uuid.Nil {
		return apperrors.ErrHotelRequired
	}
	if p.SortOrder < 0 {
		return apperrors.ErrMediaOrder
	}
	if p.StorageKey != "" {
		if p.URL != "/media/"+p.MediaID.String() {
			return apperrors.ErrStorageKey
		}
	} else if !ValidExternalURL(p.URL) {
		return apperrors.ErrMediaURL
	}
	for _, text := range []shared.LocalizedString{p.Title, p.Description, p.AltText} {
		if err := text.Validate(); err != nil {
			return err
		}
	}
	return nil
}
func ValidExternalURL(value string) bool {
	u, err := url.Parse(value)
	return err == nil && (u.Scheme == "https" || u.Scheme == "http") && u.Host != "" && u.User == nil && !strings.ContainsAny(value, "\r\n")
}

type Repository interface {
	FindAsset(context.Context, uuid.UUID) (Asset, error)
	ListAssets(context.Context, uuid.UUID) ([]Asset, error)
	SaveAssets(context.Context, []Asset) error
	DeleteAsset(context.Context, uuid.UUID) error
}
type Storage interface {
	Put(context.Context, string, io.Reader) error
	Delete(context.Context, string) error
	Open(context.Context, string) (io.ReadSeekCloser, error)
}
