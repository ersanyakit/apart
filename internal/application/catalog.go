package application

import (
	"context"
	"errors"
	"otel/constants"
	"otel/internal/domain/booking"
	"otel/internal/domain/features"
	"otel/internal/domain/identity"
	"otel/internal/domain/media"
	"otel/internal/domain/property"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Catalog struct {
	Properties property.Repository
	Media      media.Repository
	Features   features.Repository
	Layout     property.LayoutRepository
	Bookings   booking.Repository
}
type Selection struct {
	HotelID  uuid.UUID  `json:"hotel_id"`
	BranchID uuid.UUID  `json:"branch_id"`
	FloorID  *uuid.UUID `json:"floor_id"`
}
type Snapshot struct {
	Floors          []property.Floor     `json:"floors"`
	Bookings        []booking.Booking    `json:"bookings"`
	FeatureRegistry features.Registry    `json:"feature_registry"`
	Application     string               `json:"application"`
	User            identity.User        `json:"user"`
	Languages       []constants.Language `json:"languages"`
	Hotels          []property.Hotel     `json:"hotels"`
	Branches        []property.Branch    `json:"branches"`
	Rooms           []property.Room      `json:"rooms"`
	HotelID         uuid.UUID            `json:"hotel_id"`
	BranchID        uuid.UUID            `json:"branch_id"`
	ServerTime      time.Time            `json:"server_time"`
}

func (s *Catalog) Hotel(ctx context.Context, u identity.User, id uuid.UUID) (property.Hotel, error) {
	if !u.CanAccessHotel(id) {
		return property.Hotel{}, constants.ErrForbidden
	}
	return s.Properties.FindHotel(ctx, id)
}
func (s *Catalog) Branch(ctx context.Context, u identity.User, id uuid.UUID) (property.Branch, error) {
	b, err := s.Properties.FindBranch(ctx, id)
	if err != nil {
		return b, err
	}
	if !u.CanAccessBranch(b.HotelID, b.BranchID) {
		return property.Branch{}, constants.ErrForbidden
	}
	return b, nil
}
func (s *Catalog) Room(ctx context.Context, u identity.User, id uuid.UUID) (property.Room, error) {
	r, err := s.Properties.FindRoom(ctx, id)
	if err != nil {
		return r, err
	}
	_, err = s.Branch(ctx, u, r.BranchID)
	return r, err
}
func (s *Catalog) InitialSync(ctx context.Context, u identity.User, selection Selection) (Snapshot, error) {
	out := Snapshot{Application: constants.APPLICATION_NAME, User: u, Languages: constants.SupportedLanguages(), ServerTime: time.Now().UTC(), Branches: []property.Branch{}, Rooms: []property.Room{}}
	var err error
	out.Hotels, err = s.Properties.ListHotels(ctx, u)
	if err != nil {
		return out, err
	}
	if len(out.Hotels) == 0 {
		return out, nil
	}
	out.HotelID = selection.HotelID
	if out.HotelID == uuid.Nil {
		out.HotelID = out.Hotels[0].HotelID
	}
	if _, err = s.Hotel(ctx, u, out.HotelID); err != nil {
		return out, err
	}
	out.FeatureRegistry, err = s.Features.Registry(ctx, out.HotelID)
	if err != nil {
		return out, err
	}
	out.Branches, err = s.Properties.ListBranches(ctx, out.HotelID, u)
	if err != nil {
		return out, err
	}
	if len(out.Branches) == 0 {
		return out, nil
	}
	out.BranchID = selection.BranchID
	if out.BranchID == uuid.Nil {
		out.BranchID = out.Branches[0].BranchID
	}
	b, err := s.Branch(ctx, u, out.BranchID)
	if err != nil {
		return out, err
	}
	if b.HotelID != out.HotelID {
		return out, constants.ErrForbidden
	}
	out.Rooms, err = s.Properties.ListRooms(ctx, out.BranchID)
	if err != nil {
		return out, err
	}
	for i := range out.Rooms {
		out.Rooms[i].EffectiveCapacity = property.EffectiveCapacity(out.Rooms, out.Rooms[i].RoomID)
	}
	if selection.FloorID != nil {
		filtered := []property.Room{}
		for _, r := range out.Rooms {
			if r.FloorID != nil && *r.FloorID == *selection.FloorID {
				filtered = append(filtered, r)
			}
		}
		out.Rooms = filtered
	}
	out.Floors, err = s.Layout.ListFloors(ctx, out.BranchID)
	if err != nil {
		return out, err
	}
	out.Bookings, err = s.Bookings.ListBookings(ctx, booking.Query{BranchID: out.BranchID})
	return out, err
}
func (s *Catalog) resolveAssets(ctx context.Context, hotelID uuid.UUID, assets []media.Asset) ([]media.Asset, error) {
	if len(assets) > 30 {
		return nil, constants.ErrMediaLimit
	}
	out := make([]media.Asset, 0, len(assets))
	seen := map[uuid.UUID]bool{}
	for i, a := range assets {
		if a.MediaID != uuid.Nil {
			old, err := s.Media.FindAsset(ctx, a.MediaID)
			if err != nil {
				return nil, err
			}
			if old.HotelID != hotelID {
				return nil, constants.ErrForbidden
			}
			a.HotelID = old.HotelID
			a.StorageKey = old.StorageKey
			a.URL = old.URL
			a.Kind = old.Kind
			a.MIMEType = old.MIMEType
			a.Size = old.Size
			a.OriginalName = old.OriginalName
			a.CreatedAt = old.CreatedAt
		} else {
			a.MediaID = uuid.New()
			a.HotelID = hotelID
			a.CreatedAt = time.Now().UTC()
		}
		if seen[a.MediaID] {
			return nil, constants.ErrDuplicateMedia
		}
		seen[a.MediaID] = true
		a.SortOrder = i
		if err := a.Validate(); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, nil
}
func (s *Catalog) SaveHotel(ctx context.Context, u identity.User, item property.Hotel, create bool) (property.Hotel, error) {
	if !u.IsManager() || (create && !u.IsAdmin()) {
		return item, constants.ErrForbidden
	}
	if create {
		item.HotelID = uuid.New()
	} else {
		old, err := s.Hotel(ctx, u, item.HotelID)
		if err != nil {
			return item, err
		}
		item.Inventory = old.Inventory
	}
	if err := item.FacilityInfo.Validate(); err != nil {
		return item, err
	}
	var err error
	item.Assets, err = s.resolveAssets(ctx, item.HotelID, item.Assets)
	if err != nil {
		return item, err
	}
	if err = s.Properties.SaveHotel(ctx, item, create); err != nil {
		return item, err
	}
	return s.Properties.FindHotel(ctx, item.HotelID)
}
func (s *Catalog) SaveBranch(ctx context.Context, u identity.User, item property.Branch, create bool) (property.Branch, error) {
	if !u.IsManager() {
		return item, constants.ErrForbidden
	}
	if _, err := s.Hotel(ctx, u, item.HotelID); err != nil {
		return item, err
	}
	if create {
		item.BranchID = uuid.New()
	} else {
		old, err := s.Branch(ctx, u, item.BranchID)
		if err != nil {
			return item, err
		}
		if old.HotelID != item.HotelID {
			return item, constants.ErrForbidden
		}
	}
	if err := item.FacilityInfo.Validate(); err != nil {
		return item, err
	}
	var err error
	item.Assets, err = s.resolveAssets(ctx, item.HotelID, item.Assets)
	if err != nil {
		return item, err
	}
	if err = s.Properties.SaveBranch(ctx, item, create); err != nil {
		return item, err
	}
	return s.Properties.FindBranch(ctx, item.BranchID)
}
func (s *Catalog) DeleteBranch(ctx context.Context, u identity.User, id uuid.UUID) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	if _, err := s.Branch(ctx, u, id); err != nil {
		return err
	}
	if err := s.Properties.DeleteBranch(ctx, id); err != nil {
		if errors.Is(err, constants.ErrStructureInUse) {
			return constants.ErrBranchInUse
		}
		return err
	}
	return nil
}
func (s *Catalog) SaveRoom(ctx context.Context, u identity.User, item property.Room, create bool) (property.Room, error) {
	if !u.IsManager() {
		return item, constants.ErrForbidden
	}
	b, err := s.Branch(ctx, u, item.BranchID)
	if err != nil {
		return item, err
	}
	if create {
		item.RoomID = uuid.New()
		item.ClearStay(item.Status)
		if (item.Status == "Tadilat" || item.Status == "Arizali") && (len(strings.TrimSpace(item.StatusReason)) < 10 || len(item.StatusReason) > 2000) {
			return item, constants.ErrReasonRequired
		}
	} else {
		old, err := s.Room(ctx, u, item.RoomID)
		if err != nil {
			return item, err
		}
		if old.BranchID != item.BranchID {
			return item, constants.ErrForbidden
		}
		item.Status = old.Status
		item.StatusReason = old.StatusReason
		item.Name = old.Name
		item.CheckIn = old.CheckIn
		item.CheckOut = old.CheckOut
		item.Guests = old.Guests
	}
	if err := item.Validate(); err != nil {
		return item, err
	}
	item.Assets, err = s.resolveAssets(ctx, b.HotelID, item.Assets)
	if err != nil {
		return item, err
	}
	if err = s.Properties.SaveRoom(ctx, item, create); err != nil {
		return item, err
	}
	return s.Properties.FindRoom(ctx, item.RoomID)
}
func (s *Catalog) DeleteRoom(ctx context.Context, u identity.User, id uuid.UUID) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	if _, err := s.Room(ctx, u, id); err != nil {
		return err
	}
	return s.Properties.DeleteRoom(ctx, id)
}
func (s *Catalog) SaveState(ctx context.Context, u identity.User, state property.Room) (property.Room, error) {
	if !u.CanOperateRooms() {
		return state, constants.ErrForbidden
	}
	room, err := s.Room(ctx, u, state.RoomID)
	if err != nil {
		return room, err
	}
	if u.Role == constants.UserRoleHousekeeping && state.Status != "Temiz" && state.Status != "Kirli" {
		return room, constants.ErrForbidden
	}
	switch state.Status {
	case "Bos", "Temiz", "Kirli", "Arizali", "Tadilat":
	default:
		return room, constants.ErrBookingRequired
	}
	if (state.Status == "Tadilat" || state.Status == "Arizali") && (len(strings.TrimSpace(state.StatusReason)) < 10 || len(state.StatusReason) > 2000) {
		return room, constants.ErrReasonRequired
	}
	if err := s.Properties.SaveOperationalState(ctx, room.RoomID, state.Status, strings.TrimSpace(state.StatusReason)); err != nil {
		return room, err
	}
	return s.Properties.FindRoom(ctx, room.RoomID)
}
func (s *Catalog) SaveInventory(ctx context.Context, u identity.User, id uuid.UUID, items []property.InventoryItem) error {
	if !u.IsManager() {
		return constants.ErrForbidden
	}
	if _, err := s.Hotel(ctx, u, id); err != nil {
		return err
	}
	return s.Properties.SaveInventory(ctx, id, items)
}
