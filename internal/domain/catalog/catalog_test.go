package catalog

import (
	"otel/constants"
	"regexp"
	"testing"
)

func TestCompleteCatalog(t *testing.T) {
	want := map[string]int{"bathroom": 51, "bedroom": 62, "living_room": 27, "tables_chairs": 26, "kitchen": 55, "kitchenware": 90, "electronics": 27, "climate": 23, "lighting": 20, "decoration": 38, "outdoor": 28, "pool_spa": 33, "safety": 26, "housekeeping": 28, "workspace": 18, "children": 19, "facilities": 47, "accessibility": 17, "structural": 23, "guest_supplies": 24}
	if len(Categories()) != 20 || len(Entries()) != 682 {
		t.Fatal("incomplete default catalog")
	}
	counts := map[string]int{}
	seen := map[string]bool{}
	keyPattern := regexp.MustCompile(`^catalog\.[a-z_]+\.[a-z_]+\.[a-z0-9_]+$`)
	for _, e := range Entries() {
		if !keyPattern.MatchString(e.Key) || seen[e.Key] {
			t.Fatalf("unstable/duplicate key %s", e.Key)
		}
		seen[e.Key] = true
		counts[e.Category.Key]++
		if e.IconKey == "" || e.Label[constants.LanguageTR] == "" || e.Label[constants.LanguageEN] == "" || e.GroupLabel[constants.LanguageEN] == "" || e.Category.Label[constants.LanguageEN] == "" {
			t.Fatalf("missing icon/translation for %s", e.Key)
		}
		if err := e.Label.Validate(); err != nil {
			t.Fatal(err)
		}
		if e.Category.Key == "facilities" && e.Kind != "amenity" {
			t.Fatalf("service treated as physical inventory: %s", e.Key)
		}
	}
	for key, count := range want {
		if counts[key] != count {
			t.Errorf("%s: got %d, want %d", key, counts[key], count)
		}
	}
	for _, key := range []string{"catalog.safety.equipment.security_camera", "catalog.safety.equipment.alarm_system", "catalog.lighting.equipment.generator"} {
		e, ok := Lookup(key)
		if !ok || e.Scope != "property" {
			t.Fatalf("facility equipment offered inside rooms: %s", key)
		}
	}
}
