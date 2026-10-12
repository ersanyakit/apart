package persistence

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"otel/constants"
	"otel/internal/domain/features"
	"otel/internal/domain/shared"
	"otel/internal/infrastructure/persistence/models"
	"otel/utils"
)

var _ features.Repository = (*Repository)(nil)

func fromDefinition(d models.FeatureDefinition) features.Definition {
	out := features.Definition{FeatureID: d.FeatureID, HotelID: d.HotelID, CategoryID: d.CategoryID, Code: d.Code, Label: shared.LocalizedString(d.Label), Category: d.Category.Code, Description: shared.LocalizedString(d.Description), ValueType: features.ValueType(d.ValueType), Filterable: d.Filterable, Scopes: d.Scopes, Min: d.Min, Max: d.Max, Unit: d.Unit, Required: d.Required, Assets: fromAssets(d.Assets), Options: []string{}, OptionLabels: map[string]shared.LocalizedString{}}
	for _, v := range d.Options {
		out.Options = append(out.Options, v.Code)
		out.OptionLabels[v.Code] = shared.LocalizedString(v.Label)
	}
	return out
}
func (r *Repository) Registry(ctx context.Context, id uuid.UUID) (features.Registry, error) {
	out := features.Registry{Categories: []features.Category{}, Definitions: []features.Definition{}}
	var categories []models.FeatureCategory
	if err := r.db.WithContext(ctx).Where("hotel_id = ?", id).Order("sort_order,category_id").Find(&categories).Error; err != nil {
		return out, translate(err)
	}
	for _, c := range categories {
		out.Categories = append(out.Categories, features.Category{CategoryID: c.CategoryID, HotelID: c.HotelID, Code: c.Code, Label: shared.LocalizedString(c.Label), SortOrder: c.SortOrder})
	}
	var definitions []models.FeatureDefinition
	if err := r.db.WithContext(ctx).Where("hotel_id = ?", id).Preload("Category").Preload("Options", func(db *gorm.DB) *gorm.DB { return db.Order("code") }).Preload("Assets", ordered).Order("code").Find(&definitions).Error; err != nil {
		return out, translate(err)
	}
	for _, d := range definitions {
		out.Definitions = append(out.Definitions, fromDefinition(d))
	}
	return out, nil
}
func (r *Repository) SaveCategory(ctx context.Context, c features.Category, create bool) error {
	row := models.FeatureCategory{CategoryID: c.CategoryID, HotelID: c.HotelID, Code: c.Code, Label: utils.LocalizedString(c.Label), SortOrder: c.SortOrder}
	if create {
		return translate(r.db.WithContext(ctx).Create(&row).Error)
	}
	result := r.db.WithContext(ctx).Model(&models.FeatureCategory{}).Where("category_id = ? AND hotel_id = ?", c.CategoryID, c.HotelID).Select("Label", "SortOrder").Updates(&row)
	if result.Error == nil && result.RowsAffected == 0 {
		return constants.ErrNotFound
	}
	return translate(result.Error)
}

// A tenant-scoped transaction lock serializes registry edits and assignments so
// definitions cannot change between validation and persistence.
func lockFeatures(tx *gorm.DB, id uuid.UUID) error {
	return tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", id.String()).Error
}
func (r *Repository) SaveDefinition(ctx context.Context, d features.Definition, create bool) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockFeatures(tx, d.HotelID); err != nil {
			return err
		}
		if !create {
			var old models.FeatureDefinition
			if err := tx.Where("feature_id = ? AND hotel_id = ?", d.FeatureID, d.HotelID).First(&old).Error; err != nil {
				return err
			}
			var rooms []models.RoomAssignment
			if err := tx.Where("feature_id = ?", d.FeatureID).Find(&rooms).Error; err != nil {
				return err
			}
			for _, a := range rooms {
				if d.ValidateValue(features.ScopeRoom, a.Value) != nil {
					return constants.ErrFeatureInUse
				}
			}
			var properties []models.PropertyAssignment
			if err := tx.Where("feature_id = ?", d.FeatureID).Find(&properties).Error; err != nil {
				return err
			}
			for _, a := range properties {
				if d.ValidateValue(features.ScopeProperty, a.Value) != nil {
					return constants.ErrFeatureInUse
				}
			}
		}
		row := models.FeatureDefinition{FeatureID: d.FeatureID, HotelID: d.HotelID, CategoryID: d.CategoryID, Code: d.Code, Label: utils.LocalizedString(d.Label), Description: utils.LocalizedString(d.Description), ValueType: string(d.ValueType), Filterable: d.Filterable, Scopes: d.Scopes, Min: d.Min, Max: d.Max, Unit: d.Unit, Required: d.Required, Assets: toAssets(d.Assets)}
		for _, a := range row.Assets {
			if err := tx.Save(&a).Error; err != nil {
				return err
			}
		}
		var err error
		if create {
			err = tx.Omit("Category", "Assets", "Options").Create(&row).Error
		} else {
			err = tx.Omit("Category", "Assets", "Options").Save(&row).Error
		}
		if err != nil {
			return err
		}
		if err := tx.Where("feature_id = ?", d.FeatureID).Delete(&models.FeatureOption{}).Error; err != nil {
			return err
		}
		for _, v := range d.Options {
			if err := tx.Create(&models.FeatureOption{ValueID: uuid.NewSHA1(d.FeatureID, []byte(v)), FeatureID: d.FeatureID, Code: v, Label: utils.LocalizedString(d.OptionLabels[v])}).Error; err != nil {
				return err
			}
		}
		return tx.Model(&row).Association("Assets").Replace(row.Assets)
	}))
}
func (r *Repository) DeleteDefinition(ctx context.Context, id, hotelID uuid.UUID) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockFeatures(tx, hotelID); err != nil {
			return err
		}
		for _, model := range []any{&models.RoomAssignment{}, &models.PropertyAssignment{}} {
			var n int64
			if err := tx.Model(model).Where("feature_id = ?", id).Count(&n).Error; err != nil {
				return err
			}
			if n > 0 {
				return constants.ErrFeatureInUse
			}
		}
		result := tx.Where("feature_id = ? AND hotel_id = ?", id, hotelID).Delete(&models.FeatureDefinition{})
		if result.Error == nil && result.RowsAffected == 0 {
			return constants.ErrNotFound
		}
		return result.Error
	}))
}
func (r *Repository) Assignments(ctx context.Context, t features.Target) ([]features.Assignment, error) {
	out := []features.Assignment{}
	if t.Scope == features.ScopeRoom {
		var rows []models.RoomAssignment
		err := r.db.WithContext(ctx).Preload("Definition").Where("room_id = ?", t.ID).Find(&rows).Error
		for _, a := range rows {
			out = append(out, features.Assignment{OwnerType: features.ScopeRoom, OwnerID: a.RoomID, Code: a.Definition.Code, Value: a.Value})
		}
		return out, translate(err)
	}
	var rows []models.PropertyAssignment
	err := r.db.WithContext(ctx).Preload("Definition").Where("branch_id = ?", t.ID).Find(&rows).Error
	for _, a := range rows {
		out = append(out, features.Assignment{OwnerType: features.ScopeProperty, OwnerID: a.BranchID, Code: a.Definition.Code, Value: a.Value})
	}
	return out, translate(err)
}
func (r *Repository) Assign(ctx context.Context, t features.Target, items []features.Assignment) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockFeatures(tx, t.HotelID); err != nil {
			return err
		}
		registry, err := New(tx).Registry(ctx, t.HotelID)
		if err != nil {
			return err
		}
		if err := features.ValidateAssignments(registry.Definitions, t, items); err != nil {
			return err
		}
		ids := map[string]uuid.UUID{}
		for _, d := range registry.Definitions {
			ids[d.Code] = d.FeatureID
		}
		if t.Scope == features.ScopeRoom {
			if err := tx.Where("room_id = ?", t.ID).Delete(&models.RoomAssignment{}).Error; err != nil {
				return err
			}
			for _, a := range items {
				row := models.RoomAssignment{RoomID: t.ID, BranchID: t.BranchID, HotelID: t.HotelID, FeatureID: ids[a.Code], Value: a.Value}
				if err := tx.Omit(clause.Associations).Create(&row).Error; err != nil {
					return err
				}
			}
		} else {
			if err := tx.Where("branch_id = ?", t.ID).Delete(&models.PropertyAssignment{}).Error; err != nil {
				return err
			}
			for _, a := range items {
				row := models.PropertyAssignment{BranchID: t.ID, HotelID: t.HotelID, FeatureID: ids[a.Code], Value: a.Value}
				if err := tx.Omit(clause.Associations).Create(&row).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}))
}
func (r *Repository) FilterRooms(ctx context.Context, hotelID, branchID uuid.UUID, filters []features.Filter) ([]uuid.UUID, error) {
	registry, err := r.Registry(ctx, hotelID)
	if err != nil {
		return nil, err
	}
	ids := map[string]uuid.UUID{}
	for _, d := range registry.Definitions {
		ids[d.Code] = d.FeatureID
	}
	q := r.db.WithContext(ctx).Model(&models.Room{}).Where("branch_id = ?", branchID)
	for _, f := range filters {
		sub := r.db.WithContext(ctx).Model(&models.RoomAssignment{}).Select("room_id").Where("hotel_id = ? AND branch_id = ? AND feature_id = ?", hotelID, branchID, ids[f.Code])
		if f.Operator == "eq" {
			sub = sub.Where("value = ?::jsonb", string(f.Value))
		} else if f.Operator == "contains" {
			sub = sub.Where("value @> ?::jsonb", string(f.Value))
		} else {
			op := map[string]string{"gte": ">=", "lte": "<="}[f.Operator]
			if op == "" {
				return nil, constants.ErrFeatureFilter
			}
			var n float64
			if json.Unmarshal(f.Value, &n) != nil {
				return nil, constants.ErrFeatureFilter
			}
			sub = sub.Where(fmt.Sprintf("(value #>> '{}')::numeric %s ?", op), n)
		}
		q = q.Where("room_id IN (?)", sub)
	}
	idsOut := []uuid.UUID{}
	err = q.Pluck("room_id", &idsOut).Error
	return idsOut, translate(err)
}
