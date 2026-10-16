package application

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/identity"
	"otel/internal/domain/property"
)

type SetupFloor struct {
	Key   string         `json:"key"`
	Floor property.Floor `json:"floor"`
}
type SetupUnit struct {
	Key       string        `json:"key"`
	FloorKey  string        `json:"floor_key"`
	ParentKey string        `json:"parent_key"`
	Room      property.Room `json:"room"`
}
type SetupInput struct {
	RequestID uuid.UUID             `json:"request_id"`
	Company   property.Hotel        `json:"company"`
	Facility  property.Branch       `json:"facility"`
	Floors    []SetupFloor          `json:"floors"`
	Units     []SetupUnit           `json:"units"`
	Staff     []identity.StaffInput `json:"staff"`
}
type SetupResult struct {
	HotelID  uuid.UUID `json:"hotel_id"`
	BranchID uuid.UUID `json:"branch_id"`
	Floors   int       `json:"floors"`
	Units    int       `json:"units"`
	Staff    int       `json:"staff"`
}
type SetupExecutor interface {
	Setup(context.Context, identity.User, SetupInput) (SetupResult, error)
}

// ApplySetup reuses the ordinary services. The executor must wrap it in one transaction.
func ApplySetup(ctx context.Context, u identity.User, in SetupInput, c *Catalog, a *Accommodation, s *Staff) (SetupResult, error) {
	out := SetupResult{}
	if !u.IsManager() {
		return out, constants.ErrForbidden
	}
	if in.RequestID == uuid.Nil || len(in.Floors) == 0 || len(in.Floors) > 100 || len(in.Units) == 0 || len(in.Units) > 500 || len(in.Staff) > 50 {
		return out, constants.ErrPayload
	}
	company, err := c.SaveHotel(ctx, u, in.Company, in.Company.HotelID == uuid.Nil)
	if err != nil {
		return out, fmt.Errorf("İşletme: %w", err)
	}
	in.Facility.HotelID = company.HotelID
	if in.Facility.BranchID != uuid.Nil {
		if _, err = c.Branch(ctx, u, in.Facility.BranchID); err != nil {
			return out, err
		}
		rooms, e := c.Properties.ListRooms(ctx, in.Facility.BranchID)
		if e != nil {
			return out, e
		}
		if len(rooms) > 0 {
			return out, constants.ErrStructureInUse
		}
	}
	branch, err := c.SaveBranch(ctx, u, in.Facility, in.Facility.BranchID == uuid.Nil)
	if err != nil {
		return out, fmt.Errorf("Tesis: %w", err)
	}
	existing, err := a.Floors(ctx, u, branch.BranchID)
	if err != nil {
		return out, err
	}
	floorIDs := map[string]uuid.UUID{}
	for _, f := range in.Floors {
		if f.Key == "" || floorIDs[f.Key] != uuid.Nil {
			return out, constants.ErrPayload
		}
		f.Floor.BranchID = branch.BranchID
		f.Floor.FloorID = uuid.Nil
		for _, old := range existing {
			if old.Code == f.Floor.Code {
				f.Floor.FloorID = old.FloorID
			}
		}
		saved, e := a.SaveFloor(ctx, u, f.Floor, f.Floor.FloorID == uuid.Nil)
		if e != nil {
			return out, fmt.Errorf("Kat %s: %w", f.Floor.Code, e)
		}
		floorIDs[f.Key] = saved.FloorID
	}
	unitIDs := map[string]uuid.UUID{}
	rentable := 0
	for _, unit := range in.Units {
		floorID := floorIDs[unit.FloorKey]
		if floorID == uuid.Nil || unit.Key == "" || unitIDs[unit.Key] != uuid.Nil {
			return out, constants.ErrPayload
		}
		room := unit.Room
		room.RoomID = uuid.Nil
		room.BranchID = branch.BranchID
		room.FloorID = &floorID
		room.ParentID = nil
		if unit.ParentKey != "" {
			id := unitIDs[unit.ParentKey]
			if id == uuid.Nil {
				return out, constants.ErrPayload
			}
			room.ParentID = &id
		}
		// A wizard never creates artificial guests or an occupied room.
		room.Name = ""
		room.CheckIn = ""
		room.CheckOut = ""
		room.Guests = nil
		if room.Status != constants.RoomClean && room.Status != constants.RoomDirty {
			return out, constants.ErrRoomStatus
		}
		if room.Kind == "bed" || len(room.NewBeds) > 100 {
			return out, constants.ErrPayload
		}
		if room.RentalMode == "beds" && len(room.NewBeds) == 0 {
			return out, constants.ErrCapacity
		}
		saved, e := c.SaveRoom(ctx, u, room, true)
		if e != nil {
			return out, fmt.Errorf("Birim %s: %w", room.Code, e)
		}
		unitIDs[unit.Key] = saved.RoomID
		if saved.Rentable || saved.RentalMode == "beds" {
			rentable++
		}
	}
	if rentable == 0 {
		return out, constants.ErrPayload
	}
	for _, person := range in.Staff {
		person.HotelID = company.HotelID
		person.UserID = uuid.Nil
		person.BranchIDs = []uuid.UUID{branch.BranchID}
		if _, e := s.Save(ctx, u, person, true); e != nil {
			return out, fmt.Errorf("Personel %s: %w", person.Username, e)
		}
	}
	return SetupResult{HotelID: company.HotelID, BranchID: branch.BranchID, Floors: len(in.Floors), Units: len(in.Units), Staff: len(in.Staff)}, nil
}
