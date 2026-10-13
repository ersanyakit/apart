package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/property"
	"otel/internal/domain/shared"
	"otel/internal/infrastructure/persistence/models"
	"otel/utils"
)

var _ property.LayoutRepository = (*Repository)(nil)

// All inventory/booking writes for one branch take this lock before reading.
// This serializes overlapping parent/child reservations and structure edits.
func lockBranch(tx *gorm.DB, id uuid.UUID) error {
	return tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?, 7))", id.String()).Error
}
func fromFloor(row models.Floor) property.Floor {
	return property.Floor{FloorID: row.FloorID, BranchID: row.BranchID, Code: row.Code, Label: shared.LocalizedString(row.Label), SortOrder: row.SortOrder, Width: row.Width, Height: row.Height}
}
func (r *Repository) ListFloors(ctx context.Context, id uuid.UUID) ([]property.Floor, error) {
	var rows []models.Floor
	err := r.db.WithContext(ctx).Where("branch_id = ?", id).Order("sort_order, code").Find(&rows).Error
	out := []property.Floor{}
	for _, row := range rows {
		out = append(out, fromFloor(row))
	}
	return out, translate(err)
}
func (r *Repository) FindFloor(ctx context.Context, id uuid.UUID) (property.Floor, error) {
	var row models.Floor
	err := r.db.WithContext(ctx).First(&row, "floor_id = ?", id).Error
	return fromFloor(row), translate(err)
}
func (r *Repository) SaveFloor(ctx context.Context, f property.Floor, create bool) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBranch(tx, f.BranchID); err != nil {
			return err
		}
		var duplicates int64
		if err := tx.Model(&models.Floor{}).Where("branch_id = ? AND code = ? AND floor_id <> ?", f.BranchID, f.Code, f.FloorID).Count(&duplicates).Error; err != nil {
			return err
		}
		if duplicates > 0 {
			return constants.ErrFloorCodeExists
		}
		row := models.Floor{FloorID: f.FloorID, BranchID: f.BranchID, Code: f.Code, Label: utils.LocalizedString(f.Label), SortOrder: f.SortOrder, Width: f.Width, Height: f.Height}
		if create {
			return tx.Omit("Branch").Create(&row).Error
		}
		var count int64
		if err := tx.Model(&models.Room{}).Where("floor_id = ? AND ((position->>'x')::numeric + (position->>'width')::numeric > ? OR (position->>'y')::numeric + (position->>'height')::numeric > ?)", f.FloorID, f.Width, f.Height).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return constants.ErrLayout
		}
		result := tx.Model(&models.Floor{}).Where("floor_id = ? AND branch_id = ?", f.FloorID, f.BranchID).Select("Code", "Label", "SortOrder", "Width", "Height").Updates(&row)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return constants.ErrNotFound
		}
		return nil
	}))
}
func (r *Repository) DeleteFloor(ctx context.Context, id uuid.UUID) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var floor models.Floor
		if err := tx.First(&floor, "floor_id = ?", id).Error; err != nil {
			return err
		}
		if err := lockBranch(tx, floor.BranchID); err != nil {
			return err
		}
		var n int64
		if err := tx.Model(&models.Room{}).Where("floor_id = ?", id).Count(&n).Error; err != nil {
			return err
		}
		if n > 0 {
			return constants.ErrConflict
		}
		return tx.Delete(&models.Floor{}, "floor_id = ?", id).Error
	}))
}
func (r *Repository) SavePlan(ctx context.Context, id uuid.UUID, placements []property.Placement) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var f models.Floor
		if err := tx.First(&f, "floor_id = ?", id).Error; err != nil {
			return err
		}
		if err := lockBranch(tx, f.BranchID); err != nil {
			return err
		}
		if err := tx.First(&f, "floor_id = ?", id).Error; err != nil {
			return err
		}
		seen := map[uuid.UUID]bool{}
		for _, p := range placements {
			if seen[p.RoomID] {
				return constants.ErrPlanDuplicate
			}
			seen[p.RoomID] = true
			if err := p.Position.Validate(); err != nil {
				return err
			}
			if p.Position.X+p.Position.Width > float64(f.Width) || p.Position.Y+p.Position.Height > float64(f.Height) {
				return constants.ErrLayout
			}
			result := tx.Model(&models.Room{}).Where("room_id = ? AND floor_id = ? AND branch_id = ?", p.RoomID, id, f.BranchID).Select("Position").Updates(&models.Room{Position: p.Position})
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return constants.ErrNotFound
			}
		}
		return nil
	}))
}
func validateRoomStructure(tx *gorm.DB, item property.Room, create bool) error {
	var rows []models.Room
	if err := tx.Where("branch_id = ?", item.BranchID).Find(&rows).Error; err != nil {
		return err
	}
	oldRooms := make([]property.Room, 0, len(rows))
	rooms := make([]property.Room, 0, len(rows)+1)
	changed := create
	found := false
	for _, row := range rows {
		old := fromRoom(row)
		oldRooms = append(oldRooms, old)
		if old.RoomID == item.RoomID {
			found = true
			changed = old.Inactive != item.Inactive || old.Kind != item.Kind || old.Capacity != item.Capacity || old.Rentable != item.Rentable || !sameID(old.ParentID, item.ParentID) || !sameID(old.FloorID, item.FloorID) || old.BedGroup != item.BedGroup || old.BedLevel != item.BedLevel
			continue
		}
		rooms = append(rooms, old)
	}
	if !create && !found {
		return constants.ErrNotFound
	}
	rooms = append(rooms, item)
	if err := property.ValidateStructure(rooms); err != nil {
		return err
	}
	if item.FloorID != nil {
		var f models.Floor
		if err := tx.First(&f, "floor_id = ? AND branch_id = ?", *item.FloorID, item.BranchID).Error; err != nil {
			return translate(err)
		}
		if item.Position.X+item.Position.Width > float64(f.Width) || item.Position.Y+item.Position.Height > float64(f.Height) {
			return constants.ErrLayout
		}
	}
	if changed {
		related := property.Related(rooms, item.RoomID)
		for id := range property.Related(oldRooms, item.RoomID) {
			related[id] = true
		}
		ids := []uuid.UUID{}
		for id := range related {
			ids = append(ids, id)
		}
		var count int64
		if err := tx.Table("booking_allocations a").Joins("JOIN bookings b ON b.booking_id = a.booking_id").Where("a.room_id IN ? AND b.status IN ?", ids, []string{"confirmed", "checked_in"}).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return constants.ErrStructureInUse
		}
	}
	return nil
}
func sameID(a, b *uuid.UUID) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func (r *Repository) SaveUnits(ctx context.Context, rooms []property.Room) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		repo := New(tx)
		for _, room := range rooms {
			if err := repo.SaveRoom(ctx, room, true); err != nil {
				return err
			}
		}
		return nil
	}))
}
