package catalog

import (
	"encoding/json"
	"otel/constants"
	"reflect"
	"regexp"
	"strings"
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

func TestCatalogJSONValidation(t *testing.T) {
	tests := []struct {
		name   string
		change func(*seedDocument)
		want   string
	}{
		{"version", func(d *seedDocument) { d.Version = 2 }, "unsupported version"},
		{"no categories", func(d *seedDocument) { d.Categories = nil }, "categories must not be empty"},
		{"duplicate category", func(d *seedDocument) { d.Categories = append(d.Categories, d.Categories[0]) }, "duplicate category"},
		{"duplicate group", func(d *seedDocument) { c := &d.Categories[0]; c.Groups = append(c.Groups, c.Groups[0]) }, "duplicate group"},
		{"duplicate entry", func(d *seedDocument) { g := &d.Categories[0].Groups[0]; g.Entries = append(g.Entries, g.Entries[0]) }, "duplicate entry"},
		{"wrong parent", func(d *seedDocument) { d.Categories[0].Groups[0].Entries[0].Key = "catalog.other.fixtures.shower" }, "key must belong"},
		{"missing category translation", func(d *seedDocument) { delete(d.Categories[0].Label, constants.LanguageEN) }, "label.EN is required"},
		{"missing group translation", func(d *seedDocument) { delete(d.Categories[0].Groups[0].Label, constants.LanguageEN) }, "label.EN is required"},
		{"missing entry translation", func(d *seedDocument) { delete(d.Categories[0].Groups[0].Entries[0].Label, constants.LanguageEN) }, "label.EN is required"},
		{"unsupported locale", func(d *seedDocument) { d.Categories[0].Label["ZZ"] = "Invalid" }, ""},
		{"empty translation", func(d *seedDocument) { d.Categories[0].Label[constants.LanguageDE] = "  " }, "must not be blank"},
		{"kind", func(d *seedDocument) { d.Categories[0].Groups[0].Entries[0].Kind = "demo" }, "invalid kind"},
		{"scope", func(d *seedDocument) { d.Categories[0].Groups[0].Entries[0].Scope = "unknown" }, "invalid scope"},
		{"icon", func(d *seedDocument) { d.Categories[0].IconKey = "" }, "invalid icon"},
		{"order", func(d *seedDocument) { d.Categories[0].Groups[0].Entries[0].SortOrder = 0 }, "sort_order"},
		{"duplicate order", func(d *seedDocument) { d.Categories[0].Groups[0].Entries[0].SortOrder = 2 }, "sort_order"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var doc seedDocument
			if err := json.Unmarshal(source, &doc); err != nil {
				t.Fatal(err)
			}
			tt.change(&doc)
			data, err := json.Marshal(doc)
			if err != nil {
				t.Fatal(err)
			}
			if _, err = decodeCatalog(data); err == nil || !strings.Contains(err.Error(), tt.want) {
				t.Fatalf("expected %q, got %v", tt.want, err)
			}
		})
	}
	for _, data := range [][]byte{[]byte(`{"version":1,"typo":true}`), append(append([]byte{}, source...), []byte(`{}`)...), []byte(`{"version":`)} {
		if _, err := decodeCatalog(data); err == nil {
			t.Fatal("invalid JSON accepted")
		}
	}
}

func TestCatalogJSONTranslationsAndStableOrder(t *testing.T) {
	var doc seedDocument
	if err := json.Unmarshal(source, &doc); err != nil {
		t.Fatal(err)
	}
	entry := &doc.Categories[0].Groups[0].Entries[0]
	key := entry.Key
	entry.Label[constants.LanguageDE] = "Dusche | Bad\nMehrzeilig"
	entry.Label[constants.LanguageYUE] = "淋浴"
	doc.Categories[0], doc.Categories[1] = doc.Categories[1], doc.Categories[0]
	data, err := json.Marshal(doc)
	if err != nil {
		t.Fatal(err)
	}
	loaded, err := decodeCatalog(data)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.categories[0].Key != "bathroom" || loaded.entries[0].Key != key {
		t.Fatal("JSON order changed public ordering")
	}
	if loaded.byKey[key].Label[constants.LanguageDE] != "Dusche | Bad\nMehrzeilig" || loaded.byKey[key].Label[constants.LanguageYUE] != "淋浴" {
		t.Fatal("additional translations lost")
	}
}

func TestCatalogReadersCannotMutateDefaults(t *testing.T) {
	original := Entries()[0]
	categories := Categories()
	categories[0].Label[constants.LanguageTR] = "changed"
	entries := Entries()
	entries[0].Label[constants.LanguageTR] = "changed"
	entries[0].GroupLabel[constants.LanguageTR] = "changed"
	entries[0].Category.Label[constants.LanguageTR] = "changed"
	found, _ := Lookup(original.Key)
	found.Label[constants.LanguageTR] = "changed"
	after, _ := Lookup(original.Key)
	if !reflect.DeepEqual(original, after) {
		t.Fatal("caller modified shared seed data")
	}
}
