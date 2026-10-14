// Package catalog owns the mandatory, hotel-independent product vocabulary.
package catalog

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"maps"
	"regexp"
	"sort"
	"strings"

	"otel/constants"
	"otel/internal/domain/shared"
)

// The versioned JSON document is the source for the defaults seed. Embedding
// bundles the data with the binary; deployment never depends on a working directory.
// Public keys and sort orders are explicit and independent of translated labels.
//
//go:embed defaults.json
var source []byte

type Category struct {
	Key       string
	Label     shared.LocalizedString
	IconKey   string
	SortOrder int
}

type Entry struct {
	Key        string
	Category   Category
	GroupKey   string
	GroupLabel shared.LocalizedString
	Label      shared.LocalizedString
	Kind       string // amenity, inventory, consumable
	Scope      string // room or property; property equipment is never offered inside rooms
	IconKey    string
	SortOrder  int
}

type seedDocument struct {
	Schema     string         `json:"$schema"`
	Version    int            `json:"version"`
	Categories []seedCategory `json:"categories"`
}
type seedCategory struct {
	Key       string                 `json:"key"`
	Label     shared.LocalizedString `json:"label"`
	IconKey   string                 `json:"icon_key"`
	SortOrder int                    `json:"sort_order"`
	Groups    []seedGroup            `json:"groups"`
}
type seedGroup struct {
	Key     string                 `json:"key"`
	Label   shared.LocalizedString `json:"label"`
	Entries []seedEntry            `json:"entries"`
}
type seedEntry struct {
	Key       string                 `json:"key"`
	Label     shared.LocalizedString `json:"label"`
	Kind      string                 `json:"kind"`
	Scope     string                 `json:"scope"`
	IconKey   string                 `json:"icon_key"`
	SortOrder int                    `json:"sort_order"`
}
type vocabulary struct {
	categories []Category
	entries    []Entry
	byKey      map[string]Entry
}

var defaults = mustLoad()

func Categories() []Category {
	out := make([]Category, len(defaults.categories))
	for i, c := range defaults.categories {
		c.Label = maps.Clone(c.Label)
		out[i] = c
	}
	return out
}
func Entries() []Entry {
	out := make([]Entry, len(defaults.entries))
	for i, e := range defaults.entries {
		out[i] = cloneEntry(e)
	}
	return out
}
func Lookup(key string) (Entry, bool) {
	e, ok := defaults.byKey[key]
	return cloneEntry(e), ok
}
func IsReserved(key string) bool { return strings.HasPrefix(key, "catalog.") }
func cloneEntry(e Entry) Entry {
	e.Label, e.GroupLabel, e.Category.Label = maps.Clone(e.Label), maps.Clone(e.GroupLabel), maps.Clone(e.Category.Label)
	return e
}
func mustLoad() vocabulary {
	data, err := decodeCatalog(source)
	if err != nil {
		panic(fmt.Errorf("invalid default catalog JSON: %w", err))
	}
	return data
}

func decodeCatalog(data []byte) (vocabulary, error) {
	out := vocabulary{byKey: map[string]Entry{}}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	var doc seedDocument
	if err := decoder.Decode(&doc); err != nil {
		return out, err
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		return out, fmt.Errorf("expected one JSON document")
	}
	if doc.Version != 1 {
		return out, fmt.Errorf("unsupported version %d", doc.Version)
	}
	if len(doc.Categories) == 0 {
		return out, fmt.Errorf("categories must not be empty")
	}
	keyPattern := regexp.MustCompile(`^[a-z][a-z0-9_]*$`)
	iconPattern := regexp.MustCompile(`^[a-z][a-z0-9-]*$`)
	categoryKeys, categoryOrders, entryOrders := map[string]bool{}, map[int]bool{}, map[int]bool{}
	for _, c := range doc.Categories {
		if !keyPattern.MatchString(c.Key) || categoryKeys[c.Key] {
			return out, fmt.Errorf("invalid or duplicate category key %q", c.Key)
		}
		categoryKeys[c.Key] = true
		if !iconPattern.MatchString(c.IconKey) || c.SortOrder < 1 || categoryOrders[c.SortOrder] {
			return out, fmt.Errorf("category %s: invalid icon or sort_order", c.Key)
		}
		categoryOrders[c.SortOrder] = true
		if err := validateLabel(c.Label); err != nil {
			return out, fmt.Errorf("category %s: %w", c.Key, err)
		}
		if len(c.Groups) == 0 {
			return out, fmt.Errorf("category %s: groups must not be empty", c.Key)
		}
		category := Category{Key: c.Key, Label: c.Label, IconKey: c.IconKey, SortOrder: c.SortOrder}
		out.categories = append(out.categories, category)
		groupKeys := map[string]bool{}
		for _, g := range c.Groups {
			if !keyPattern.MatchString(g.Key) || groupKeys[g.Key] {
				return out, fmt.Errorf("category %s: invalid or duplicate group key %q", c.Key, g.Key)
			}
			groupKeys[g.Key] = true
			if err := validateLabel(g.Label); err != nil {
				return out, fmt.Errorf("group %s.%s: %w", c.Key, g.Key, err)
			}
			if len(g.Entries) == 0 {
				return out, fmt.Errorf("group %s.%s: entries must not be empty", c.Key, g.Key)
			}
			for _, e := range g.Entries {
				prefix := "catalog." + c.Key + "." + g.Key + "."
				if !strings.HasPrefix(e.Key, prefix) || !keyPattern.MatchString(strings.TrimPrefix(e.Key, prefix)) {
					return out, fmt.Errorf("entry %q: key must belong to %s", e.Key, prefix)
				}
				if _, exists := out.byKey[e.Key]; exists {
					return out, fmt.Errorf("duplicate entry key %s", e.Key)
				}
				if err := validateLabel(e.Label); err != nil {
					return out, fmt.Errorf("entry %s: %w", e.Key, err)
				}
				if e.Kind != "amenity" && e.Kind != "inventory" && e.Kind != "consumable" {
					return out, fmt.Errorf("entry %s: invalid kind %q", e.Key, e.Kind)
				}
				if e.Scope != "room" && e.Scope != "property" {
					return out, fmt.Errorf("entry %s: invalid scope %q", e.Key, e.Scope)
				}
				if !iconPattern.MatchString(e.IconKey) || e.SortOrder < 1 || entryOrders[e.SortOrder] {
					return out, fmt.Errorf("entry %s: invalid icon or sort_order", e.Key)
				}
				entryOrders[e.SortOrder] = true
				entry := Entry{Key: e.Key, Category: category, GroupKey: g.Key, GroupLabel: g.Label, Label: e.Label, Kind: e.Kind, Scope: e.Scope, IconKey: e.IconKey, SortOrder: e.SortOrder}
				out.entries = append(out.entries, entry)
				out.byKey[e.Key] = entry
			}
		}
	}
	sort.Slice(out.categories, func(i, j int) bool { return out.categories[i].SortOrder < out.categories[j].SortOrder })
	sort.Slice(out.entries, func(i, j int) bool { return out.entries[i].SortOrder < out.entries[j].SortOrder })
	return out, nil
}

func validateLabel(label shared.LocalizedString) error {
	if err := label.Validate(); err != nil {
		return err
	}
	for _, lang := range []constants.Language{constants.LanguageTR, constants.LanguageEN} {
		if strings.TrimSpace(label[lang]) == "" {
			return fmt.Errorf("label.%s is required", lang)
		}
	}
	for lang, value := range label {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("label.%s must not be blank", lang)
		}
	}
	return nil
}
