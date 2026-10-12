package property

import (
	"context"
	apperrors "otel/constants"
	"otel/internal/domain/features"
	"otel/internal/domain/identity"
	"otel/internal/domain/media"
	"otel/internal/domain/shared"
	"strings"

	"github.com/google/uuid"
)

type FacilityInfo struct {
	Name        string                 `json:"name"`
	Description shared.LocalizedString `json:"description"`
	Address     string                 `json:"address"`
	Phone       string                 `json:"phone"`
	Email       string                 `json:"email"`
	TaxNumber   string                 `json:"tax_number"`
	TaxOffice   string                 `json:"tax_office"`
	LogoURL     string                 `json:"logo_url"`
	CoverURL    string                 `json:"cover_url"`
}

func (f FacilityInfo) Validate() error {
	if strings.TrimSpace(f.Name) == "" {
		return apperrors.ErrFacilityName
	}
	if len(f.Name) > 200 {
		return apperrors.ErrFacilityName
	}
	for _, value := range []string{f.LogoURL, f.CoverURL} {
		if value != "" && !media.ValidExternalURL(value) && !strings.HasPrefix(value, "/media/") {
			return apperrors.ErrMediaURL
		}
	}
	return f.Description.Validate()
}

type InventoryItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon,omitempty"`
}
type Hotel struct {
	FacilityInfo
	HotelID   uuid.UUID       `json:"hotel_id"`
	Assets    []media.Asset   `json:"assets"`
	Inventory []InventoryItem `json:"inventory"`
}
type Branch struct {
	FeatureAssignments []features.Assignment `json:"feature_assignments"`
	FacilityInfo
	BranchID uuid.UUID     `json:"branch_id"`
	HotelID  uuid.UUID     `json:"hotel_id"`
	Assets   []media.Asset `json:"assets"`
}
type Guest struct {
	Relationship string `json:"relationship,omitempty"`
	ID           string `json:"id"`
	Name         string `json:"name"`
	TCNo         string `json:"tcNo,omitempty"`
	Phone        string `json:"phone,omitempty"`
	Address      string `json:"address,omitempty"`
	Note         string `json:"note,omitempty"`
}
type Room struct {
	Inactive           bool                   `json:"inactive"`
	BedLayout          string                 `json:"bed_layout"`
	FloorID            *uuid.UUID             `json:"floor_id"`
	ParentID           *uuid.UUID             `json:"parent_id"`
	Kind               string                 `json:"kind"`
	Capacity           int                    `json:"capacity"`
	EffectiveCapacity  int                    `json:"effective_capacity"`
	Rentable           bool                   `json:"rentable"`
	BedGroup           string                 `json:"bed_group"`
	BedLevel           int                    `json:"bed_level"`
	Position           Position               `json:"position"`
	FeatureAssignments []features.Assignment  `json:"feature_assignments"`
	RoomID             uuid.UUID              `json:"room_id"`
	BranchID           uuid.UUID              `json:"branch_id"`
	Name               string                 `json:"name"`
	Code               string                 `json:"code"`
	Status             string                 `json:"status"`
	Type               string                 `json:"type"`
	Description        shared.LocalizedString `json:"description"`
	Assets             []media.Asset          `json:"assets"`
	Features           []string               `json:"features"`
	InventoryIDs       []string               `json:"inventory_ids"`
	CheckIn            string                 `json:"check_in"`
	CheckOut           string                 `json:"check_out"`
	Guests             []Guest                `json:"guests"`
}

func (r Room) Validate() error {
	switch r.BedLayout {
	case "", "single", "double", "twin", "mixed":
	default:
		return apperrors.ErrBedLayout
	}
	switch r.Kind {
	case "apartment", "room", "dormitory", "bed":
	default:
		return apperrors.ErrUnitKind
	}
	if r.Capacity < 1 || r.Capacity > 100000 {
		return apperrors.ErrCapacity
	}
	if r.Kind == "bed" {
		if r.BedLevel < 1 || r.BedLevel > 10 || len(r.BedGroup) > 64 {
			return apperrors.ErrBunk
		}
	} else if r.BedGroup != "" || r.BedLevel != 0 {
		return apperrors.ErrBunk
	}
	if err := r.Position.Validate(); err != nil {
		return err
	}
	if r.BranchID == uuid.Nil {
		return apperrors.ErrBranchRequired
	}
	if strings.TrimSpace(r.Code) == "" {
		return apperrors.ErrRoomCode
	}
	if len(r.Code) > 32 {
		return apperrors.ErrRoomCode
	}
	switch r.Status {
	case "Bos", "Temiz", "Kirli", "Arizali", "Tadilat":
	default:
		return apperrors.ErrRoomStatus
	}
	return r.Description.Validate()
}
func (r *Room) ClearStay(status string) {
	r.Status = status
	r.Name = ""
	r.CheckIn = ""
	r.CheckOut = ""
	r.Guests = nil
}

type Repository interface {
	PublicProperties(context.Context) ([]PublicProperty, error)
	ListHotels(context.Context, identity.User) ([]Hotel, error)
	FindHotel(context.Context, uuid.UUID) (Hotel, error)
	SaveHotel(context.Context, Hotel, bool) error
	ListBranches(context.Context, uuid.UUID, identity.User) ([]Branch, error)
	FindBranch(context.Context, uuid.UUID) (Branch, error)
	SaveBranch(context.Context, Branch, bool) error
	DeleteBranch(context.Context, uuid.UUID) error
	ListRooms(context.Context, uuid.UUID) ([]Room, error)
	FindRoom(context.Context, uuid.UUID) (Room, error)
	SaveRoom(context.Context, Room, bool) error
	DeleteRoom(context.Context, uuid.UUID) error
	DeleteRooms(context.Context, uuid.UUID, []uuid.UUID) error
	SaveOperationalState(context.Context, uuid.UUID, string) error
	SaveInventory(context.Context, uuid.UUID, []InventoryItem) error
}
