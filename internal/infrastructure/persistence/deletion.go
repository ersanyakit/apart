package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence/models"
)

// DeleteRooms archives the selected trees atomically. Historical allocations and
// media associations remain intact. Current/future stays prevent the entire batch.
func (r *Repository) DeleteRooms(ctx context.Context, branchID uuid.UUID, requested []uuid.UUID) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBranch(tx, branchID); err != nil {
			return err
		}
		var rooms []models.Room
		if err := tx.Where("branch_id = ?", branchID).Find(&rooms).Error; err != nil {
			return err
		}
		byID := map[uuid.UUID]models.Room{}
		selected := map[uuid.UUID]bool{}
		domain := []property.Room{}
		for _, room := range rooms {
			byID[room.RoomID] = room
			domain = append(domain, fromRoom(room))
		}
		for _, id := range requested {
			if _, ok := byID[id]; !ok {
				return constants.ErrNotFound
			}
			selected[id] = true
		}
		for changed := true; changed; {
			changed = false
			for _, room := range rooms {
				if room.ParentID != nil && selected[*room.ParentID] && !selected[room.RoomID] {
					selected[room.RoomID] = true
					changed = true
				}
			}
		}
		related := map[uuid.UUID]bool{}
		ids := []uuid.UUID{}
		for id := range selected {
			ids = append(ids, id)
			for id := range property.Related(domain, id) {
				related[id] = true
			}
		}
		affected := []uuid.UUID{}
		for id := range related {
			affected = append(affected, id)
		}
		var count int64
		if err := tx.Table("booking_allocations a").Joins("JOIN bookings b ON b.booking_id=a.booking_id").Where("a.room_id IN ? AND b.status IN ?", affected, []string{"confirmed", "checked_in"}).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return constants.ErrStructureInUse
		}
		// Physical structures are archived only if every one of their places is archived.
		var beds []models.Bed
		if err := tx.Where("branch_id = ?", branchID).Find(&beds).Error; err != nil {
			return err
		}
		for _, bed := range beds {
			var places []models.SleepingPlace
			if err := tx.Where("bed_id = ?", bed.BedID).Find(&places).Error; err != nil {
				return err
			}
			all := len(places) > 0
			any := false
			for _, p := range places {
				if selected[p.UnitID] {
					any = true
				} else if _, active := byID[p.UnitID]; active {
					all = false
				}
			}
			if any && !all {
				return constants.ErrBedEdit
			}
			if any && all {
				if err := tx.Delete(&models.Bed{}, "bed_id = ?", bed.BedID).Error; err != nil {
					return err
				}
			}
		}
		if err := tx.Where("branch_id = ? AND unit_id IN ?", branchID, ids).Delete(&models.SleepingPlace{}).Error; err != nil {
			return err
		}
		return tx.Where("branch_id = ? AND room_id IN ?", branchID, ids).Delete(&models.Room{}).Error
	}))
}
