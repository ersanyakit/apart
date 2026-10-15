package constants

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
)

//go:embed floor_labels.json
var floorLabelsJSON []byte

type FloorPreset struct {
	ID        string              `json:"id"`
	Code      string              `json:"code"`
	Kind      string              `json:"kind"`
	SortOrder float64             `json:"sort_order"`
	Label     map[Language]string `json:"label"`
}

func FloorPresets() []FloorPreset {
	var translations map[Language]map[string]string
	if err := json.Unmarshal(floorLabelsJSON, &translations); err != nil {
		panic(err)
	}
	presets := []FloorPreset{{ID: "basement2", Code: "B2", Kind: "basement", SortOrder: -2}, {ID: "basement1", Code: "B1", Kind: "basement", SortOrder: -1}, {ID: "ground", Code: "G", Kind: "ground", SortOrder: 0}, {ID: "mezzanine", Code: "M", Kind: "mezzanine", SortOrder: 0.5}}
	for n := 1; n <= 20; n++ {
		presets = append(presets, FloorPreset{ID: fmt.Sprintf("floor%d", n), Code: fmt.Sprint(n), Kind: "standard", SortOrder: float64(n)})
	}
	presets = append(presets, FloorPreset{ID: "roof", Code: "RF", Kind: "roof", SortOrder: 21})
	for i := range presets {
		p := &presets[i]
		p.Label = map[Language]string{}
		number := p.SortOrder
		if number < 0 {
			number = -number
		}
		for _, language := range SupportedLanguages() {
			p.Label[language] = strings.ReplaceAll(translations[language][p.Kind], "{n}", fmt.Sprintf("%.0f", number))
		}
	}
	return presets
}
