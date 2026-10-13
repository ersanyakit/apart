package persistence

import (
	"context"
	"encoding/json"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"otel/constants"
	"otel/internal/domain/catalog"
	"otel/internal/domain/features"
	"otel/internal/infrastructure/persistence/models"
	"otel/utils"
)

// EnsureDefaultCatalog runs independently of demo seeding. It is safe on every
// startup and never creates assignments, physical assets or opening stock.
func EnsureDefaultCatalog(ctx context.Context, db *gorm.DB) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(734821604)).Error; err != nil {
			return err
		}
		if err := seedGlobalCatalog(tx); err != nil {
			return err
		}
		var hotels []models.Hotel
		if err := tx.Find(&hotels).Error; err != nil {
			return err
		}
		for _, hotel := range hotels {
			if err := ensureHotelCatalog(tx, hotel.HotelID); err != nil {
				return err
			}
		}
		return nil
	})
}

func seedGlobalCatalog(tx *gorm.DB) error {
	for _, c := range catalog.Categories() {
		label, _ := json.Marshal(c.Label)
		for _, table := range []string{"amenity_categories", "inventory_categories"} {
			if err := tx.Exec("INSERT INTO "+table+" (code,label,icon_key,sort_order) VALUES (?,?::jsonb,?,?) ON CONFLICT (code) DO UPDATE SET label=EXCLUDED.label,icon_key=EXCLUDED.icon_key,sort_order=EXCLUDED.sort_order", c.Key, string(label), c.IconKey, c.SortOrder).Error; err != nil {
				return err
			}
		}
	}
	for _, e := range catalog.Entries() {
		label, _ := json.Marshal(e.Label)
		groupLabel, _ := json.Marshal(e.GroupLabel)
		args := []any{e.Key, e.Category.Key, e.GroupKey, string(groupLabel), string(label), e.IconKey, e.Scope, e.SortOrder}
		table, extraColumn, extraValue, extraUpdate := "amenities", "", "", ""
		if e.Kind != "amenity" {
			table, extraColumn, extraValue, extraUpdate = "inventory_items", ",kind", ",?", ",kind=EXCLUDED.kind"
			args = append(args, e.Kind)
		}
		if err := tx.Exec("INSERT INTO "+table+" (code,category_code,group_code,group_label,label,icon_key,scope,sort_order"+extraColumn+") VALUES (?,?,?,?::jsonb,?::jsonb,?,?,?"+extraValue+") ON CONFLICT (code) DO UPDATE SET label=EXCLUDED.label,group_label=EXCLUDED.group_label,icon_key=EXCLUDED.icon_key,sort_order=EXCLUDED.sort_order"+extraUpdate, args...).Error; err != nil {
			return err
		}
	}
	return nil
}

// Hotel-specific IDs preserve the feature engine's tenant isolation. Public
// codes and icons remain identical across hotels. Reserved definitions cannot
// be customized or deleted; hotels can still create their own definitions.
func ensureHotelCatalog(tx *gorm.DB, hotelID uuid.UUID) error {
	if err := lockFeatures(tx, hotelID); err != nil {
		return err
	}
	for _, c := range catalog.Categories() {
		row := models.FeatureCategory{CategoryID: uuid.NewSHA1(hotelID, []byte("catalog."+c.Key)), HotelID: hotelID, Code: "catalog." + c.Key, Label: utils.LocalizedString(c.Label), SortOrder: c.SortOrder}
		if err := tx.Unscoped().Clauses(catalogConflict("feature_categories", []string{"label", "sort_order", "deleted_at"})).Create(&row).Error; err != nil {
			return err
		}
	}
	var cats []models.FeatureCategory
	if err := tx.Where("hotel_id = ?", hotelID).Find(&cats).Error; err != nil {
		return err
	}
	ids := map[string]uuid.UUID{}
	for _, c := range cats {
		ids[c.Code] = c.CategoryID
	}
	for _, e := range catalog.Entries() {
		valueType, unit := "boolean", ""
		var min *float64
		if e.Kind != "amenity" {
			valueType, unit = "integer", "piece"
			zero := float64(0)
			min = &zero
		}
		row := models.FeatureDefinition{FeatureID: uuid.NewSHA1(hotelID, []byte(e.Key)), HotelID: hotelID, CategoryID: ids["catalog."+e.Category.Key], Code: e.Key, Label: utils.LocalizedString(e.Label), ValueType: valueType, Scopes: []features.Scope{features.Scope(e.Scope)}, Min: min, Unit: unit, Filterable: true}
		if err := tx.Unscoped().Omit(clause.Associations).Clauses(catalogConflict("feature_definitions", []string{"category_id", "label", "value_type", "scopes", "min", "max", "unit", "filterable", "required", "deleted_at"})).Create(&row).Error; err != nil {
			return err
		}
	}
	return nil
}

// Avoid writes and audit noise when the system vocabulary has not changed.
func catalogConflict(table string, columns []string) clause.OnConflict {
	var comparisons []string
	for _, column := range columns {
		cast := ""
		if column == "label" {
			cast = "::jsonb"
		}
		comparisons = append(comparisons, table+"."+column+cast+" IS DISTINCT FROM EXCLUDED."+column+cast)
	}
	return clause.OnConflict{Columns: []clause.Column{{Name: "hotel_id"}, {Name: "code"}}, DoUpdates: clause.AssignmentColumns(columns), Where: clause.Where{Exprs: []clause.Expression{clause.Expr{SQL: strings.Join(comparisons, " OR ")}}}}
}

func syncCatalogAssignments(tx *gorm.DB, target features.Target, items []features.Assignment) error {
	table, owner := "property_amenities", "branch_id"
	if target.Scope == features.ScopeRoom {
		table, owner = "room_amenities", "room_id"
	}
	if err := tx.Exec("DELETE FROM "+table+" WHERE "+owner+" = ? AND hotel_id = ?", target.ID, target.HotelID).Error; err != nil {
		return err
	}
	previous := map[string]int64{}
	if target.Scope == features.ScopeRoom {
		var rows []struct {
			ItemCode string
			Quantity int64
		}
		if err := tx.Table("room_inventory").Where("room_id = ? AND hotel_id = ?", target.ID, target.HotelID).Find(&rows).Error; err != nil {
			return err
		}
		for _, r := range rows {
			previous[r.ItemCode] = r.Quantity
		}
		if err := tx.Exec("DELETE FROM room_inventory WHERE room_id = ? AND hotel_id = ?", target.ID, target.HotelID).Error; err != nil {
			return err
		}
	}
	next := map[string]int64{}
	for _, a := range items {
		e, ok := catalog.Lookup(a.Code)
		if !ok {
			continue
		}
		if e.Scope != string(target.Scope) {
			return constants.ErrFeatureScope
		}
		if e.Kind == "amenity" {
			var available bool
			if err := json.Unmarshal(a.Value, &available); err != nil {
				return constants.ErrFeatureValue
			}
			if target.Scope == features.ScopeRoom {
				if err := tx.Exec("INSERT INTO room_amenities (room_id,branch_id,hotel_id,amenity_code,available) VALUES (?,?,?,?,?)", target.ID, target.BranchID, target.HotelID, a.Code, available).Error; err != nil {
					return err
				}
			} else {
				if err := tx.Exec("INSERT INTO property_amenities (branch_id,hotel_id,amenity_code,available) VALUES (?,?,?,?)", target.ID, target.HotelID, a.Code, available).Error; err != nil {
					return err
				}
			}
		} else if target.Scope == features.ScopeRoom {
			var quantity int64
			if json.Unmarshal(a.Value, &quantity) != nil || quantity < 0 {
				return constants.ErrFeatureValue
			}
			next[a.Code] = quantity
			if quantity > 0 {
				if err := tx.Exec("INSERT INTO room_inventory (room_id,branch_id,hotel_id,item_code,quantity) VALUES (?,?,?,?,?)", target.ID, target.BranchID, target.HotelID, a.Code, quantity).Error; err != nil {
					return err
				}
			}
		}
	}
	for key := range previous {
		if _, ok := next[key]; !ok {
			next[key] = 0
		}
	}
	for key, quantity := range next {
		if delta := quantity - previous[key]; delta != 0 {
			// Assignment deltas describe room quantities, not warehouse receipts.
			if err := tx.Exec("INSERT INTO inventory_movements (movement_id,item_code,hotel_id,branch_id,room_id,quantity_delta,kind) VALUES (?,?,?,?,?,?,'room_assignment')", uuid.New(), key, target.HotelID, target.BranchID, target.ID, delta).Error; err != nil {
				return err
			}
		}
	}
	return nil
}
