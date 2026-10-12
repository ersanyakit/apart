package application

import (
	"bytes"
	"context"
	"io"
	"log/slog"
	"net/http"
	"otel/constants"
	"otel/internal/domain/identity"
	"otel/internal/domain/media"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Media struct {
	Repository media.Repository
	Storage    media.Storage
	Catalog    *Catalog
}
type Upload struct {
	Name string
	Size int64
	Open func() (io.ReadCloser, error)
}

func (s *Media) List(ctx context.Context, u identity.User, hotelID uuid.UUID) ([]media.Asset, error) {
	if !u.IsManager() {
		return nil, constants.ErrForbidden
	}
	if _, err := s.Catalog.Hotel(ctx, u, hotelID); err != nil {
		return nil, err
	}
	return s.Repository.ListAssets(ctx, hotelID)
}
func (s *Media) Find(ctx context.Context, u identity.User, id uuid.UUID) (media.Asset, error) {
	a, err := s.Repository.FindAsset(ctx, id)
	if err != nil {
		return a, err
	}
	if !u.CanAccessHotel(a.HotelID) {
		return media.Asset{}, constants.ErrForbidden
	}
	return a, nil
}
func (s *Media) Upload(ctx context.Context, u identity.User, hotelID uuid.UUID, files []Upload) ([]media.Asset, error) {
	if !u.IsManager() {
		return nil, constants.ErrForbidden
	}
	if _, err := s.Catalog.Hotel(ctx, u, hotelID); err != nil {
		return nil, err
	}
	if len(files) == 0 || len(files) > 10 {
		return nil, constants.ErrUploadCount
	}
	assets := []media.Asset{}
	committed := false
	defer func() {
		if !committed {
			for _, a := range assets {
				if err := s.Storage.Delete(context.WithoutCancel(ctx), a.StorageKey); err != nil {
					slog.Error(constants.ErrStorage.Message, "error", err)
				}
			}
		}
	}()
	for _, file := range files {
		if file.Size <= 0 || file.Size > 50<<20 {
			return nil, constants.ErrUploadSize
		}
		source, err := file.Open()
		if err != nil {
			return nil, constants.Wrap(constants.ErrUpload, err)
		}
		header := make([]byte, 512)
		n, readErr := io.ReadFull(source, header)
		if readErr != nil && readErr != io.ErrUnexpectedEOF && readErr != io.EOF {
			source.Close()
			return nil, constants.Wrap(constants.ErrUpload, readErr)
		}
		mime := http.DetectContentType(header[:n])
		kind, ext := media.KindImage, ""
		switch mime {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/gif":
			ext = ".gif"
		case "image/webp":
			ext = ".webp"
		case "video/mp4":
			kind = media.KindVideo
			ext = ".mp4"
		case "video/webm":
			kind = media.KindVideo
			ext = ".webm"
		default:
			source.Close()
			return nil, constants.ErrUploadType
		}
		if kind == media.KindImage && file.Size > 10<<20 {
			source.Close()
			return nil, constants.ErrUploadSize
		}
		id := uuid.New()
		key := id.String() + ext
		asset := media.Asset{MediaID: id, HotelID: hotelID, StorageKey: key, URL: "/media/" + id.String(), Kind: kind, MIMEType: mime, Size: file.Size, OriginalName: filepath.Base(file.Name), CreatedAt: time.Now().UTC()}
		assets = append(assets, asset)
		err = s.Storage.Put(ctx, key, io.MultiReader(bytes.NewReader(header[:n]), io.LimitReader(source, 50<<20)))
		source.Close()
		if err != nil {
			return nil, constants.Wrap(constants.ErrUpload, err)
		}
	}
	if err := s.Repository.SaveAssets(ctx, assets); err != nil {
		return nil, err
	}
	committed = true
	return assets, nil
}
func (s *Media) Update(ctx context.Context, u identity.User, input media.Asset) (media.Asset, error) {
	if !u.IsManager() {
		return input, constants.ErrForbidden
	}
	old, err := s.Find(ctx, u, input.MediaID)
	if err != nil {
		return input, err
	}
	old.Title = input.Title
	old.Description = input.Description
	old.AltText = input.AltText
	old.SortOrder = input.SortOrder
	if err := old.Validate(); err != nil {
		return old, err
	}
	err = s.Repository.SaveAssets(ctx, []media.Asset{old})
	return old, err
}
func (s *Media) Delete(ctx context.Context, u identity.User, id uuid.UUID) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	if _, err := s.Find(ctx, u, id); err != nil {
		return err
	}
	// Soft deletion retains the underlying file for history and recovery.
	if err := s.Repository.DeleteAsset(ctx, id); err != nil {
		return err
	}
	return nil
}
func (s *Media) Open(ctx context.Context, u identity.User, id uuid.UUID) (media.Asset, io.ReadSeekCloser, error) {
	a, err := s.Find(ctx, u, id)
	if err != nil {
		return a, nil, err
	}
	if a.StorageKey == "" || strings.Contains(a.StorageKey, "/") {
		return a, nil, constants.ErrNotFound
	}
	file, err := s.Storage.Open(ctx, a.StorageKey)
	return a, file, err
}
