package accommodation

import (
	"fmt"
	"github.com/google/uuid"
	"testing"
)

func TestBedCatalogPresetsValidate(t *testing.T) {
	seen := map[string]bool{}
	for _, p := range BedPresets() {
		t.Run(p.Key, func(t *testing.T) {
			if seen[p.Key] {
				t.Fatal("duplicate key")
			}
			seen[p.Key] = true
			if p.NameEN == "" || p.Label == "" || BedTypeLabels()[p.Type] == "" {
				t.Fatal("missing label")
			}
			b := Bed{BranchID: uuid.New(), Code: "TEST", Type: p.Type, Structure: p.Structure, WidthCM: p.WidthCM, LengthCM: p.LengthCM, Levels: p.Levels}
			for i, c := range p.PlaceCapacities {
				position := "single"
				if p.Levels > 1 {
					position = "middle"
					if i == 0 {
						position = "lower"
					}
					if i == p.Levels-1 {
						position = "upper"
					}
				}
				b.Places = append(b.Places, SleepingPlace{Code: fmt.Sprintf("TEST-%d", i+1), Level: i + 1, Position: position, WidthCM: p.PlaceWidths[i], LengthCM: p.LengthCM, Capacity: c, IsActive: true})
			}
			if err := b.Validate(); err != nil {
				t.Fatal(err)
			}
			if b.SleepingCapacity()*p.PhysicalCount != p.Capacity || len(b.Places)*p.PhysicalCount != p.BedPlaces {
				t.Fatal("capacity or surface count mismatch")
			}
		})
	}
	if len(seen) != 29 {
		t.Fatalf("got %d presets", len(seen))
	}
}
