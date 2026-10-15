package accommodation

import (
	_ "embed"
	"encoding/json"
)

//go:embed bed_presets.json
var bedCatalogJSON []byte

type BedPreset struct {
	Key             string    `json:"key"`
	Label           string    `json:"label"`
	NameEN          string    `json:"name_en"`
	Type            BedType   `json:"type"`
	Category        string    `json:"category"`
	Structure       Structure `json:"structure"`
	WidthCM         int       `json:"width_cm"`
	LengthCM        int       `json:"length_cm"`
	Levels          int       `json:"levels"`
	PhysicalCount   int       `json:"physical_count"`
	PlaceCapacities []int     `json:"place_capacities"`
	PlaceWidths     []int     `json:"place_widths"`
	Capacity        int       `json:"capacity"`
	BedPlaces       int       `json:"bed_places"`
}

// BedPresets is the shared source for the generated UI contract and server validation.
func BedPresets() []BedPreset {
	var presets []BedPreset
	if err := json.Unmarshal(bedCatalogJSON, &presets); err != nil {
		panic(err)
	}
	return presets
}

func validBedType(t BedType) bool {
	for _, preset := range BedPresets() {
		if preset.Type == t {
			return true
		}
	}
	return false
}

// BedTypeLabels names physical types, independently of preset capacity variants.
func BedTypeLabels() map[BedType]string {
	return map[BedType]string{Single: "Tek kişilik", Double: "Çift kişilik", Queen: "Queen", King: "King", "super_king": "Süper King", Bunk: "Ranza", "l_shaped_bunk": "L tipi ranza", Loft: "Yükseltilmiş", Capsule: "Kapsül", Sofa: "Açılır kanepe", Futon: "Futon", Murphy: "Duvara katlanan", Rollaway: "İlave yatak", Crib: "Bebek yatağı", Daybed: "Divan", "trundle_bed": "Çekmeceli", "folding_bed": "Katlanır", "portable_bed": "Taşınabilir"}
}
