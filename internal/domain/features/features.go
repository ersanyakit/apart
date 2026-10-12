package features

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"math"
	"otel/constants"
	"otel/internal/domain/media"
	"otel/internal/domain/shared"
	"strings"
)

type ValueType string

const (
	TypeBoolean   ValueType = "boolean"
	TypeInteger   ValueType = "integer"
	TypeDecimal   ValueType = "decimal"
	TypeString    ValueType = "string"
	TypeEnum      ValueType = "enum"
	TypeMultiEnum ValueType = "multi_enum"
)

type Scope string

const (
	ScopeProperty Scope = "property"
	ScopeRoom     Scope = "room"
)

type Category struct {
	CategoryID uuid.UUID              `json:"category_id"`
	HotelID    uuid.UUID              `json:"hotel_id"`
	Code       string                 `json:"code"`
	Label      shared.LocalizedString `json:"label"`
	SortOrder  int                    `json:"sort_order"`
}
type Definition struct {
	FeatureID    uuid.UUID                         `json:"feature_id"`
	HotelID      uuid.UUID                         `json:"hotel_id"`
	CategoryID   uuid.UUID                         `json:"category_id"`
	Code         string                            `json:"code"`
	Label        shared.LocalizedString            `json:"label"`
	Description  shared.LocalizedString            `json:"description"`
	Category     string                            `json:"category"`
	Scopes       []Scope                           `json:"scopes"`
	ValueType    ValueType                         `json:"value_type"`
	Options      []string                          `json:"options,omitempty"`
	OptionLabels map[string]shared.LocalizedString `json:"option_labels,omitempty"`
	Filterable   bool                              `json:"filterable"`
	Min          *float64                          `json:"min"`
	Max          *float64                          `json:"max"`
	Unit         string                            `json:"unit"`
	Required     bool                              `json:"required"`
	Assets       []media.Asset                     `json:"assets"`
}
type Assignment struct {
	OwnerType Scope           `json:"owner_type"`
	OwnerID   uuid.UUID       `json:"owner_id"`
	Code      string          `json:"code"`
	Value     json.RawMessage `json:"value"`
}
type Target struct {
	Scope    Scope     `json:"scope"`
	ID       uuid.UUID `json:"id"`
	HotelID  uuid.UUID `json:"hotel_id"`
	BranchID uuid.UUID `json:"branch_id"`
}
type Registry struct {
	Categories  []Category   `json:"categories"`
	Definitions []Definition `json:"definitions"`
}
type Filter struct {
	Code     string          `json:"code"`
	Operator string          `json:"operator"`
	Value    json.RawMessage `json:"value"`
}

func HasText(text shared.LocalizedString) bool {
	for _, v := range text {
		if strings.TrimSpace(v) != "" {
			return true
		}
	}
	return false
}
func (d Definition) Validate() error {
	if d.HotelID == uuid.Nil || d.CategoryID == uuid.Nil || strings.TrimSpace(d.Code) == "" || !HasText(d.Label) {
		return constants.ErrFeatureDefinition
	}
	if err := d.Label.Validate(); err != nil {
		return err
	}
	if err := d.Description.Validate(); err != nil {
		return err
	}
	if len(d.Scopes) == 0 {
		return constants.ErrFeatureScope
	}
	for _, s := range d.Scopes {
		if s != ScopeProperty && s != ScopeRoom {
			return constants.ErrFeatureScope
		}
	}
	switch d.ValueType {
	case TypeBoolean, TypeInteger, TypeDecimal, TypeString:
		if len(d.Options) > 0 {
			return constants.ErrFeatureOptions
		}
	case TypeEnum, TypeMultiEnum:
		if len(d.Options) == 0 {
			return constants.ErrFeatureOptions
		}
	default:
		return constants.ErrFeatureType
	}
	if d.Min != nil && d.Max != nil && *d.Min > *d.Max {
		return constants.ErrFeatureRange
	}
	seen := map[string]bool{}
	for _, o := range d.Options {
		if strings.TrimSpace(o) == "" || seen[o] {
			return constants.ErrFeatureOptions
		}
		seen[o] = true
	}
	for code, label := range d.OptionLabels {
		if !seen[code] {
			return constants.ErrFeatureOptions
		}
		if err := label.Validate(); err != nil {
			return err
		}
	}
	return nil
}
func (d Definition) Allows(scope Scope) bool {
	for _, s := range d.Scopes {
		if s == scope {
			return true
		}
	}
	return false
}

// ValidateValue validates the actual JSON value, without an extra type wrapper.
// JSON null is rejected explicitly; unmarshalling null into Go scalars otherwise succeeds.
func ValidateValue(def Definition, value json.RawMessage) error {
	if len(bytes.TrimSpace(value)) == 0 || bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
		return constants.ErrFeatureValue
	}
	contains := func(v string) bool {
		for _, o := range def.Options {
			if o == v {
				return true
			}
		}
		return false
	}
	var number float64
	switch def.ValueType {
	case TypeBoolean:
		var v bool
		if json.Unmarshal(value, &v) != nil {
			return constants.ErrFeatureValue
		}
	case TypeInteger:
		var v int64
		if json.Unmarshal(value, &v) != nil {
			return constants.ErrFeatureValue
		}
		number = float64(v)
	case TypeDecimal:
		if json.Unmarshal(value, &number) != nil || math.IsNaN(number) || math.IsInf(number, 0) {
			return constants.ErrFeatureValue
		}
	case TypeString:
		var v string
		if json.Unmarshal(value, &v) != nil {
			return constants.ErrFeatureValue
		}
		if def.Required && strings.TrimSpace(v) == "" {
			return constants.ErrFeatureRequired
		}
	case TypeEnum:
		var v string
		if json.Unmarshal(value, &v) != nil || !contains(v) {
			return constants.ErrFeatureValue
		}
	case TypeMultiEnum:
		var values []string
		if json.Unmarshal(value, &values) != nil {
			return constants.ErrFeatureValue
		}
		seen := map[string]bool{}
		for _, v := range values {
			if !contains(v) || seen[v] {
				return constants.ErrFeatureValue
			}
			seen[v] = true
		}
		if def.Required && len(values) == 0 {
			return constants.ErrFeatureRequired
		}
	default:
		return constants.ErrFeatureType
	}
	if def.ValueType == TypeInteger || def.ValueType == TypeDecimal {
		if def.Min != nil && number < *def.Min || def.Max != nil && number > *def.Max {
			return constants.ErrFeatureRange
		}
	}
	return nil
}
func (d Definition) ValidateValue(scope Scope, v json.RawMessage) error {
	if !d.Allows(scope) {
		return constants.ErrFeatureScope
	}
	return ValidateValue(d, v)
}
func ValidateAssignments(registry []Definition, target Target, assignments []Assignment) error {
	definitions := map[string]Definition{}
	for _, d := range registry {
		definitions[d.Code] = d
	}
	seen := map[string]bool{}
	for _, a := range assignments {
		d, ok := definitions[a.Code]
		if !ok || d.HotelID != target.HotelID {
			return constants.ErrFeatureDefinition
		}
		if seen[a.Code] {
			return constants.ErrFeatureDuplicate
		}
		seen[a.Code] = true
		if a.OwnerID != uuid.Nil && a.OwnerID != target.ID || a.OwnerType != "" && a.OwnerType != target.Scope {
			return constants.ErrFeatureScope
		}
		if err := d.ValidateValue(target.Scope, a.Value); err != nil {
			return err
		}
	}
	for _, d := range registry {
		if d.Required && d.Allows(target.Scope) && !seen[d.Code] {
			return constants.ErrFeatureRequired
		}
	}
	return nil
}

type Repository interface {
	Registry(context.Context, uuid.UUID) (Registry, error)
	SaveCategory(context.Context, Category, bool) error
	SaveDefinition(context.Context, Definition, bool) error
	DeleteDefinition(context.Context, uuid.UUID, uuid.UUID) error
	Assign(context.Context, Target, []Assignment) error
	Assignments(context.Context, Target) ([]Assignment, error)
	FilterRooms(context.Context, uuid.UUID, uuid.UUID, []Filter) ([]uuid.UUID, error)
}
