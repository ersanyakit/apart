// Package catalog owns the mandatory, hotel-independent product vocabulary.
package catalog

import (
	_ "embed"
	"fmt"
	"strings"

	"otel/constants"
	"otel/internal/domain/shared"
)

// Keys in defaults.txt are public identifiers: never derive them from translated
// labels or reorder/rename them when adding translations.
//
//go:embed defaults.txt
var source string

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

var categories, entries = parse()

func Categories() []Category { return append([]Category(nil), categories...) }
func Entries() []Entry       { return append([]Entry(nil), entries...) }
func Lookup(key string) (Entry, bool) {
	for _, e := range entries {
		if e.Key == key {
			return e, true
		}
	}
	return Entry{}, false
}
func IsReserved(key string) bool { return strings.HasPrefix(key, "catalog.") }

func labels(tr, en string) shared.LocalizedString {
	return shared.LocalizedString{constants.LanguageTR: tr, constants.LanguageEN: en}
}

func parse() ([]Category, []Entry) {
	var cats []Category
	var items []Entry
	var category Category
	var group, kind, scope string
	var groupLabel shared.LocalizedString
	seen := map[string]bool{}
	for lineNo, line := range strings.Split(source, "\n") {
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		p := strings.Split(line, "|")
		if len(p) < 3 {
			panic(fmt.Sprintf("invalid catalog line %d", lineNo+1))
		}
		switch p[0] {
		case "category":
			if len(p) != 5 {
				panic("invalid catalog category")
			}
			category = Category{Key: p[1], Label: labels(p[2], p[3]), IconKey: p[4], SortOrder: len(cats) + 1}
			cats = append(cats, category)
			group = ""
		case "group":
			if len(p) != 6 {
				panic("invalid catalog group")
			}
			group, groupLabel, kind, scope = p[1], labels(p[2], p[3]), p[4], p[5]
		default:
			if category.Key == "" || group == "" || len(p) > 5 {
				panic("catalog item without category/group")
			}
			e := Entry{Key: "catalog." + category.Key + "." + group + "." + p[0], Category: category, GroupKey: group, GroupLabel: groupLabel, Label: labels(p[1], p[2]), Kind: kind, Scope: scope, IconKey: category.IconKey, SortOrder: len(items) + 1}
			if len(p) > 3 {
				e.Kind = p[3]
			}
			if len(p) > 4 {
				e.Scope = p[4]
			}
			if seen[e.Key] || (e.Kind != "amenity" && e.Kind != "inventory" && e.Kind != "consumable") || (e.Scope != "room" && e.Scope != "property") {
				panic("invalid catalog item: " + e.Key)
			}
			seen[e.Key] = true
			items = append(items, e)
		}
	}
	return cats, items
}
