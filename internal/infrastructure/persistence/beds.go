package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/accommodation"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence/models"
)

var _ accommodation.Repository = (*Repository)(nil)

func (r *Repository) ListBeds(ctx context.Context, branchID uuid.UUID) ([]accommodation.Bed, error) {
	var rows []models.Bed
	if err := r.db.WithContext(ctx).Where("branch_id = ?", branchID).Order("code").Find(&rows).Error; err != nil {
		return nil, translate(err)
	}
	var places []models.SleepingPlace
	if err := r.db.WithContext(ctx).Where("branch_id = ?", branchID).Order("level").Find(&places).Error; err != nil {
		return nil, translate(err)
	}
	var units []models.Room
	if err := r.db.WithContext(ctx).Where("branch_id = ? AND kind = ?", branchID, "bed").Find(&units).Error; err != nil {
		return nil, translate(err)
	}
	byID := map[uuid.UUID]models.Room{}
	for _, u := range units {
		byID[u.RoomID] = u
	}
	grouped := map[uuid.UUID][]accommodation.SleepingPlace{}
	for _, p := range places {
		u := byID[p.UnitID]
		grouped[p.BedID] = append(grouped[p.BedID], accommodation.SleepingPlace{UnitID: p.UnitID, Code: u.Code, Level: p.Level, Position: p.Position, WidthCM: p.WidthCM, LengthCM: p.LengthCM, Capacity: u.Capacity, IsActive: !u.Inactive, Rentable: u.Rentable})
	}
	out := make([]accommodation.Bed, 0, len(rows))
	for _, b := range rows {
		out = append(out, accommodation.Bed{BedID: b.BedID, BranchID: b.BranchID, RoomID: b.RoomID, FloorID: b.FloorID, Code: b.Code, Type: accommodation.BedType(b.Type), Structure: accommodation.Structure(b.Structure), WidthCM: b.WidthCM, LengthCM: b.LengthCM, Levels: b.Levels, Places: grouped[b.BedID]})
	}
	return out, nil
}
func (r *Repository) FindBed(ctx context.Context, id uuid.UUID) (accommodation.Bed, error) {
	var b models.Bed
	if err := r.db.WithContext(ctx).First(&b, "bed_id = ?", id).Error; err != nil {
		return accommodation.Bed{}, translate(err)
	}
	beds, err := r.ListBeds(ctx, b.BranchID)
	if err != nil {
		return accommodation.Bed{}, err
	}
	for _, b := range beds {
		if b.BedID == id {
			return b, nil
		}
	}
	return accommodation.Bed{}, constants.ErrNotFound
}

func (r *Repository) SaveBeds(ctx context.Context, beds []accommodation.Bed, create bool) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, b := range beds {
			if err := b.Validate(); err != nil {
				return err
			}
			if err := lockBranch(tx, b.BranchID); err != nil {
				return err
			}
			rentalMode := ""
			if b.RoomID != nil {
				var parent models.Room
				if err := tx.First(&parent, "room_id = ? AND branch_id = ?", *b.RoomID, b.BranchID).Error; err != nil {
					return err
				}
				rentalMode = parent.RentalMode
				if parent.Kind == "bed" {
					return constants.ErrHierarchy
				}
			}
			if b.FloorID != nil {
				var floor models.Floor
				if err := tx.First(&floor, "floor_id = ? AND branch_id = ?", *b.FloorID, b.BranchID).Error; err != nil {
					return err
				}
			}
			previous := map[uuid.UUID]models.SleepingPlace{}
			if !create {
				var old models.Bed
				if err := tx.First(&old, "bed_id = ? AND branch_id = ?", b.BedID, b.BranchID).Error; err != nil {
					return err
				}
				var places []models.SleepingPlace
				if err := tx.Where("bed_id = ?", b.BedID).Find(&places).Error; err != nil {
					return err
				}
				for _, p := range places {
					previous[p.UnitID] = p
				}
			}
			row := models.Bed{BedID: b.BedID, BranchID: b.BranchID, RoomID: b.RoomID, FloorID: b.FloorID, Code: b.Code, Type: string(b.Type), Structure: string(b.Structure), WidthCM: b.WidthCM, LengthCM: b.LengthCM, Levels: b.Levels}
			if create {
				if err := tx.Create(&row).Error; err != nil {
					return err
				}
			} else {
				if err := tx.Model(&models.Bed{}).Where("bed_id = ? AND branch_id = ?", b.BedID, b.BranchID).Select("RoomID", "FloorID", "Code", "Type", "Structure", "WidthCM", "LengthCM", "Levels").Updates(&row).Error; err != nil {
					return err
				}
			}
			// Archive removed mappings while retaining the identities of existing places.
			if err := tx.Where("bed_id = ?", b.BedID).Delete(&models.SleepingPlace{}).Error; err != nil {
				return err
			}
			retained := map[uuid.UUID]bool{}
			for i, p := range b.Places {
				old, exists := previous[p.UnitID]
				unit := property.Room{RoomID: p.UnitID, BranchID: b.BranchID, Kind: "bed", Status: constants.RoomClean, Position: property.Position{X: float64(20 + (i%8)*160), Y: float64(20 + (i/8)*120), Width: 140, Height: 100}}
				if exists {
					var u models.Room
					if err := tx.First(&u, "room_id = ?", old.UnitID).Error; err != nil {
						return err
					}
					unit = fromRoom(u)
				} else {
					var count int64
					if err := tx.Model(&models.Room{}).Where("room_id = ?", p.UnitID).Count(&count).Error; err != nil {
						return err
					}
					if count != 0 {
						return constants.ErrBedEdit
					}
				}
				unit.FloorID, unit.ParentID, unit.Code, unit.Capacity, unit.Rentable, unit.Inactive, unit.BedLevel, unit.BedGroup = b.FloorID, b.RoomID, p.Code, p.Capacity, p.Rentable, !p.IsActive, p.Level, b.BedID.String()
				if rentalMode != "" {
					unit.Rentable = rentalMode == "beds"
				}
				if err := unit.Validate(); err != nil {
					return err
				}
				if err := validateRoomStructure(tx, unit, !exists); err != nil {
					return err
				}
				model := toRoom(unit)
				if exists {
					if err := tx.Model(&models.Room{}).Where("room_id = ?", p.UnitID).Select("FloorID", "ParentID", "Code", "Capacity", "Rentable", "Inactive", "BedLevel", "BedGroup").Updates(&model).Error; err != nil {
						return err
					}
				} else if err := tx.Omit("Assets", "Bookings").Create(&model).Error; err != nil {
					return err
				}
				place := models.SleepingPlace{UnitID: p.UnitID, BranchID: b.BranchID, BedID: b.BedID, Level: p.Level, Position: p.Position, WidthCM: p.WidthCM, LengthCM: p.LengthCM}
				if exists {
					if err := tx.Unscoped().Model(&models.SleepingPlace{}).Where("unit_id = ? AND bed_id = ?", p.UnitID, b.BedID).Select("BranchID", "BedID", "Level", "Position", "WidthCM", "LengthCM", "DeletedAt").Updates(&place).Error; err != nil {
						return err
					}
				} else if err := tx.Create(&place).Error; err != nil {
					return err
				}
				retained[p.UnitID] = true
			}
			for id := range previous {
				if !retained[id] {
					if err := New(tx).DeleteRoom(ctx, id); err != nil {
						return err
					}
				}
			}
		}
		return nil
	}))
}

func (r *Repository) DeleteBed(ctx context.Context, id uuid.UUID) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var bed models.Bed
		if err := tx.First(&bed, "bed_id = ?", id).Error; err != nil {
			return err
		}
		if err := lockBranch(tx, bed.BranchID); err != nil {
			return err
		}
		var places []models.SleepingPlace
		if err := tx.Where("bed_id = ?", id).Find(&places).Error; err != nil {
			return err
		}
		ids := []uuid.UUID{}
		for _, p := range places {
			ids = append(ids, p.UnitID)
		}
		if len(ids) > 0 {
			if err := New(tx).DeleteRooms(ctx, bed.BranchID, ids); err != nil {
				return err
			}
		}
		if err := tx.Where("bed_id = ?", id).Delete(&models.SleepingPlace{}).Error; err != nil {
			return err
		}
		return tx.Delete(&models.Bed{}, "bed_id = ?", id).Error
	}))
}
