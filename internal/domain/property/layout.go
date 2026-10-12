package property

import (
	"context"
	"github.com/google/uuid"
	"math"
	"otel/constants"
	"otel/internal/domain/shared"
	"strings"
)

type Floor struct {
	FloorID   uuid.UUID              `json:"floor_id"`
	BranchID  uuid.UUID              `json:"branch_id"`
	Code      string                 `json:"code"`
	Label     shared.LocalizedString `json:"label"`
	SortOrder int                    `json:"sort_order"`
	Width     int                    `json:"width"`
	Height    int                    `json:"height"`
}

func (f Floor) Validate() error {
	if f.BranchID == uuid.Nil || strings.TrimSpace(f.Code) == "" || len(f.Code) > 32 || f.Width < 400 || f.Width > 10000 || f.Height < 300 || f.Height > 10000 {
		return constants.ErrFloor
	}
	return f.Label.Validate()
}

type Position struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

func (p Position) Validate() error {
	for _, v := range []float64{p.X, p.Y, p.Width, p.Height} {
		if math.IsNaN(v) || math.IsInf(v, 0) {
			return constants.ErrLayout
		}
	}
	if p.X < 0 || p.Y < 0 || p.Width < 40 || p.Height < 30 || p.X+p.Width > 10000 || p.Y+p.Height > 10000 {
		return constants.ErrLayout
	}
	return nil
}

type Placement struct {
	RoomID   uuid.UUID `json:"room_id"`
	Position Position  `json:"position"`
}
type FloorPlan struct {
	Floor    Floor  `json:"floor"`
	Rooms    []Room `json:"rooms"`
	Capacity int    `json:"capacity"`
}
type LayoutRepository interface {
	SaveUnits(context.Context, []Room) error
	ListFloors(context.Context, uuid.UUID) ([]Floor, error)
	FindFloor(context.Context, uuid.UUID) (Floor, error)
	SaveFloor(context.Context, Floor, bool) error
	DeleteFloor(context.Context, uuid.UUID) error
	SavePlan(context.Context, uuid.UUID, []Placement) error
}

// Related includes only the selected unit, its ancestors and descendants.
// Sibling rooms/beds remain independently bookable.
func Related(rooms []Room, id uuid.UUID) map[uuid.UUID]bool {
	out := map[uuid.UUID]bool{id: true}
	byID := map[uuid.UUID]Room{}
	for _, r := range rooms {
		byID[r.RoomID] = r
	}
	current := id
	for i := 0; i < len(rooms); i++ {
		r, ok := byID[current]
		if !ok || r.ParentID == nil {
			break
		}
		current = *r.ParentID
		if out[current] {
			break
		}
		out[current] = true
	}
	descendants := map[uuid.UUID]bool{id: true}
	for changed := true; changed; {
		changed = false
		for _, r := range rooms {
			if r.ParentID != nil && descendants[*r.ParentID] && !descendants[r.RoomID] {
				descendants[r.RoomID] = true
				out[r.RoomID] = true
				changed = true
			}
		}
	}
	return out
}
func EffectiveCapacity(rooms []Room, id uuid.UUID) int {
	byID := map[uuid.UUID]Room{}
	children := map[uuid.UUID][]uuid.UUID{}
	for _, r := range rooms {
		byID[r.RoomID] = r
		if r.ParentID != nil {
			children[*r.ParentID] = append(children[*r.ParentID], r.RoomID)
		}
	}
	seen := map[uuid.UUID]bool{}
	var visit func(uuid.UUID) int
	visit = func(id uuid.UUID) int {
		if seen[id] {
			return 0
		}
		seen[id] = true
		if byID[id].Inactive {
			return 0
		}
		if len(children[id]) == 0 {
			return byID[id].Capacity
		}
		n := 0
		for _, child := range children[id] {
			n += visit(child)
		}
		return n
	}
	return visit(id)
}

// ValidateStructure checks a complete branch tree after the proposed edit.
func ValidateStructure(rooms []Room) error {
	byID := map[uuid.UUID]Room{}
	bunks := map[string]bool{}
	for _, r := range rooms {
		byID[r.RoomID] = r
		if r.Kind == "bed" && r.BedGroup != "" {
			parent := ""
			if r.ParentID != nil {
				parent = r.ParentID.String()
			}
			floor := ""
			if r.FloorID != nil {
				floor = r.FloorID.String()
			}
			key := r.BranchID.String() + "/" + floor + "/" + parent + "/" + r.BedGroup + "/" + string(rune(r.BedLevel))
			if bunks[key] {
				return constants.ErrBunk
			}
			bunks[key] = true
		}
	}
	for _, r := range rooms {
		seen := map[uuid.UUID]bool{r.RoomID: true}
		current := r
		for current.ParentID != nil {
			p, ok := byID[*current.ParentID]
			if !ok || p.BranchID != r.BranchID || p.Kind == "bed" || seen[p.RoomID] {
				return constants.ErrHierarchy
			}
			seen[p.RoomID] = true
			current = p
		}
	}
	return nil
}

type BulkUnits struct {
	BranchID uuid.UUID  `json:"branch_id"`
	FloorID  *uuid.UUID `json:"floor_id"`
	ParentID *uuid.UUID `json:"parent_id"`
	Kind     string     `json:"kind"`
	Prefix   string     `json:"prefix"`
	Count    int        `json:"count"`
	Levels   int        `json:"levels"`
	Capacity int        `json:"capacity"`
	Rentable bool       `json:"rentable"`
}

// PublicProperty contains only the information displayed by the login selector.
type PublicProperty struct {
	HotelID  uuid.UUID `json:"hotel_id"`
	BranchID uuid.UUID `json:"branch_id"`
	Name     string    `json:"name"`
	Location string    `json:"location"`
	Image    string    `json:"image"`
}
