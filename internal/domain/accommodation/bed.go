package accommodation

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"strings"
)

type BedType string
type Structure string

const (
	Single           BedType   = "single"
	Double           BedType   = "double"
	Queen            BedType   = "queen"
	King             BedType   = "king"
	Bunk             BedType   = "bunk_bed"
	Loft             BedType   = "loft_bed"
	Capsule          BedType   = "capsule_bed"
	Sofa             BedType   = "sofa_bed"
	Futon            BedType   = "futon"
	Murphy           BedType   = "murphy_bed"
	Rollaway         BedType   = "rollaway_bed"
	Crib             BedType   = "crib"
	Daybed           BedType   = "daybed"
	Standard         Structure = "standard"
	BunkStructure    Structure = "bunk"
	CapsuleStructure Structure = "capsule"
	SofaStructure    Structure = "sofa"
	Folding          Structure = "folding"
	LoftStructure    Structure = "loft"
)

// One record represents one physical structure, never a quantity of anonymous beds.
// Each place is one sleeping surface; a double surface can accommodate two people.
type Bed struct {
	BedID     uuid.UUID       `json:"bed_id"`
	BranchID  uuid.UUID       `json:"branch_id"`
	RoomID    *uuid.UUID      `json:"room_id"`
	FloorID   *uuid.UUID      `json:"floor_id"`
	Code      string          `json:"code"`
	Type      BedType         `json:"type"`
	Structure Structure       `json:"structure"`
	WidthCM   int             `json:"width_cm"`
	LengthCM  int             `json:"length_cm"`
	Levels    int             `json:"levels"`
	Places    []SleepingPlace `json:"places"`
}

type SleepingPlace struct {
	UnitID   uuid.UUID `json:"unit_id"`
	Code     string    `json:"code"`
	Level    int       `json:"level"`
	Position string    `json:"position"`
	WidthCM  int       `json:"width_cm"`
	LengthCM int       `json:"length_cm"`
	Capacity int       `json:"capacity"`
	IsActive bool      `json:"is_active"`
	Rentable bool      `json:"rentable"`
}

func (b Bed) SleepingCapacity() int {
	n := 0
	for _, p := range b.Places {
		if p.IsActive {
			n += p.Capacity
		}
	}
	return n
}

func dimensions(w, l int) bool {
	return w >= 0 && w <= 500 && l >= 0 && l <= 500 && ((w == 0) == (l == 0))
}

func (b Bed) Validate() error {
	if b.BranchID == uuid.Nil || strings.TrimSpace(b.Code) == "" || len(b.Code) > 32 {
		return constants.ErrBed
	}
	if !validBedType(b.Type) {
		return constants.ErrBedType
	}
	switch b.Structure {
	case Standard, BunkStructure, CapsuleStructure, SofaStructure, Folding, LoftStructure:
	default:
		return constants.ErrBedStructure
	}
	if !dimensions(b.WidthCM, b.LengthCM) || b.Levels < 1 || b.Levels > 10 || len(b.Places) < 1 || len(b.Places) > b.Levels {
		return constants.ErrBed
	}
	if b.Levels > 1 && b.Structure != BunkStructure && b.Structure != CapsuleStructure {
		return constants.ErrBedStructure
	}
	seenLevels := map[int]bool{}
	seenIDs := map[uuid.UUID]bool{}
	seenCodes := map[string]bool{}
	for _, p := range b.Places {
		if p.Level < 1 || p.Level > b.Levels || seenLevels[p.Level] || !dimensions(p.WidthCM, p.LengthCM) || p.Capacity < 1 || p.Capacity > 10 || strings.TrimSpace(p.Code) == "" || len(p.Code) > 32 || seenCodes[p.Code] {
			return constants.ErrSleepingPlace
		}
		switch p.Position {
		case "lower", "middle", "upper", "single":
		default:
			return constants.ErrSleepingPlace
		}
		if p.UnitID != uuid.Nil && seenIDs[p.UnitID] {
			return constants.ErrSleepingPlace
		}
		seenIDs[p.UnitID], seenLevels[p.Level], seenCodes[p.Code] = true, true, true
	}
	return nil
}

type Repository interface {
	ListBeds(context.Context, uuid.UUID) ([]Bed, error)
	FindBed(context.Context, uuid.UUID) (Bed, error)
	SaveBeds(context.Context, []Bed, bool) error
	DeleteBed(context.Context, uuid.UUID) error
}
