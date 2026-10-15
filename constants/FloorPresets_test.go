package constants

import (
	"strings"
	"testing"
)

func TestFloorPresetsAllLanguages(t *testing.T) {
	presets := FloorPresets()
	if len(presets) != 25 {
		t.Fatalf("expected 25 presets, got %d", len(presets))
	}
	for _, p := range presets {
		for _, language := range SupportedLanguages() {
			if strings.TrimSpace(p.Label[language]) == "" || strings.Contains(p.Label[language], "{n}") {
				t.Fatalf("%s missing %s", p.ID, language)
			}
		}
	}
	if presets[3].SortOrder != 0.5 || presets[23].Code != "20" {
		t.Fatal("floor ordering mismatch")
	}
}
