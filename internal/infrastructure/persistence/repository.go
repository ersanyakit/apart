package persistence

import (
	"context"
	"fmt"
	"otel/constants"
	"otel/internal/domain/features"
	"otel/internal/domain/identity"
	"otel/internal/domain/media"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository struct{ db *gorm.DB }

func New(db *gorm.DB) *Repository { InstallAudit(db); return &Repository{db: db} }

var _ property.Repository = (*Repository)(nil)
var _ identity.Repository = (*Repository)(nil)
var _ media.Repository = (*Repository)(nil)

func ordered(db *gorm.DB) *gorm.DB { return db.Order("sort_order ASC, media_id ASC") }

func (r *Repository) FindByLogin(ctx context.Context, login string) (identity.User, error) {
	var row models.User
	err := r.db.WithContext(ctx).Preload("BranchMemberships").Where("lower(user_name) = ? OR lower(email) = ?", login, login).First(&row).Error
	return fromUser(row), translate(err)
}
func (r *Repository) FindSessionUser(ctx context.Context, id string, userID uuid.UUID) (identity.User, error) {
	var session models.Session
	if err := r.db.WithContext(ctx).Where("id = ? AND user_id = ? AND expires_at > ?", id, userID, time.Now()).First(&session).Error; err != nil {
		return identity.User{}, translate(err)
	}
	var row models.User
	err := r.db.WithContext(ctx).Preload("BranchMemberships").First(&row, "user_id = ?", userID).Error
	u := fromUser(row)
	u.SessionID = id
	return u, translate(err)
}
func (r *Repository) CreateSession(ctx context.Context, s identity.Session) error {
	return translate(r.db.WithContext(ctx).Create(&models.Session{ID: s.ID, UserID: s.UserID, ExpiresAt: s.ExpiresAt}).Error)
}
func (r *Repository) DeleteSession(ctx context.Context, id string) error {
	return translate(r.db.WithContext(ctx).Delete(&models.Session{}, "id = ?", id).Error)
}

func (r *Repository) ListHotels(ctx context.Context, u identity.User) ([]property.Hotel, error) {
	q := r.db.WithContext(ctx).Preload("Assets", ordered).Order("name")
	if !u.IsAdmin() {
		q = q.Where("hotel_id = ?", u.HotelID)
	}
	var rows []models.Hotel
	err := q.Find(&rows).Error
	out := []property.Hotel{}
	for _, v := range rows {
		out = append(out, fromHotel(v))
	}
	return out, translate(err)
}
func (r *Repository) FindHotel(ctx context.Context, id uuid.UUID) (property.Hotel, error) {
	var row models.Hotel
	err := r.db.WithContext(ctx).Preload("Assets", ordered).First(&row, "hotel_id = ?", id).Error
	return fromHotel(row), translate(err)
}
func (r *Repository) ListBranches(ctx context.Context, id uuid.UUID, u identity.User) ([]property.Branch, error) {
	q := r.db.WithContext(ctx).Where("hotel_id = ?", id).Preload("Assets", ordered).Order("name")
	if !u.IsManager() {
		q = q.Where("branch_id IN ?", u.BranchIDs)
	}
	var rows []models.Branch
	err := q.Find(&rows).Error
	out := []property.Branch{}
	for _, v := range rows {
		item := fromBranch(v)
		item.FeatureAssignments, err = r.Assignments(ctx, features.Target{Scope: features.ScopeProperty, ID: v.BranchID})
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, translate(err)
}
func (r *Repository) FindBranch(ctx context.Context, id uuid.UUID) (property.Branch, error) {
	var row models.Branch
	err := r.db.WithContext(ctx).Preload("Assets", ordered).First(&row, "branch_id = ?", id).Error
	item := fromBranch(row)
	if err == nil {
		item.FeatureAssignments, err = r.Assignments(ctx, features.Target{Scope: features.ScopeProperty, ID: id})
	}
	return item, translate(err)
}
func (r *Repository) ListRooms(ctx context.Context, id uuid.UUID) ([]property.Room, error) {
	var rows []models.Room
	if err := r.db.WithContext(ctx).Where("branch_id = ?", id).Preload("Assets", ordered).Order("code").Find(&rows).Error; err != nil {
		return nil, translate(err)
	}
	var assignments []models.RoomAssignment
	if err := r.db.WithContext(ctx).Preload("Definition").Where("branch_id = ?", id).Find(&assignments).Error; err != nil {
		return nil, translate(err)
	}
	byRoom := map[uuid.UUID][]features.Assignment{}
	for _, a := range assignments {
		byRoom[a.RoomID] = append(byRoom[a.RoomID], features.Assignment{OwnerType: features.ScopeRoom, OwnerID: a.RoomID, Code: a.Definition.Code, Value: a.Value})
	}
	out := make([]property.Room, 0, len(rows))
	for _, row := range rows {
		item := fromRoom(row)
		item.FeatureAssignments = byRoom[row.RoomID]
		if item.FeatureAssignments == nil {
			item.FeatureAssignments = []features.Assignment{}
		}
		out = append(out, item)
	}
	return out, nil
}
func (r *Repository) FindRoom(ctx context.Context, id uuid.UUID) (property.Room, error) {
	var row models.Room
	err := r.db.WithContext(ctx).Preload("Assets", ordered).First(&row, "room_id = ?", id).Error
	item := fromRoom(row)
	if err == nil {
		item.FeatureAssignments, err = r.Assignments(ctx, features.Target{Scope: "room", ID: id})
	}
	return item, translate(err)
}
func (r *Repository) SaveHotel(ctx context.Context, item property.Hotel, create bool) error {
	row := toHotel(item)
	return r.save(ctx, &row, row.Assets, create)
}
func (r *Repository) SaveBranch(ctx context.Context, item property.Branch, create bool) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		repo := New(tx)
		row := toBranch(item)
		if err := repo.save(ctx, &row, row.Assets, create); err != nil {
			return err
		}
		return repo.Assign(ctx, features.Target{Scope: features.ScopeProperty, ID: item.BranchID, BranchID: item.BranchID, HotelID: item.HotelID}, item.FeatureAssignments)
	})
}
func (r *Repository) SaveRoom(ctx context.Context, item property.Room, create bool) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBranch(tx, item.BranchID); err != nil {
			return err
		}
		if err := validateRoomStructure(tx, item, create); err != nil {
			return err
		}
		if !create {
			var current models.Room
			if err := tx.First(&current, "room_id = ?", item.RoomID).Error; err != nil {
				return err
			}
			var linked int64
			if err := tx.Model(&models.SleepingPlace{}).Where("unit_id = ?", item.RoomID).Count(&linked).Error; err != nil {
				return err
			}
			if linked > 0 && (current.Kind != item.Kind || current.Capacity != item.Capacity || current.Rentable != item.Rentable || current.Inactive != item.Inactive || !sameID(current.ParentID, item.ParentID) || !sameID(current.FloorID, item.FloorID) || current.BedGroup != item.BedGroup || current.BedLevel != item.BedLevel) {
				return constants.ErrBedEdit
			}
			item.Status = current.Status
		}
		repo := New(tx)
		row := toRoom(item)
		if err := repo.save(ctx, &row, row.Assets, create); err != nil {
			return err
		}
		var branch models.Branch
		if err := tx.First(&branch, "branch_id = ?", item.BranchID).Error; err != nil {
			return err
		}
		if err := repo.Assign(ctx, features.Target{Scope: "room", ID: item.RoomID, BranchID: item.BranchID, HotelID: branch.HotelID}, item.FeatureAssignments); err != nil {
			return err
		}
		if create && item.Kind == "bed" {
			return ensureLegacyBed(tx, item)
		}
		return nil
	}))
}
func (r *Repository) save(ctx context.Context, row any, assets []models.Asset, create bool) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i := range assets {
			if err := tx.Save(&assets[i]).Error; err != nil {
				return err
			}
		}
		q := tx.Omit("Assets", "Users", "Branches", "Rooms", "Bookings", "UserMemberships")
		var err error
		if create {
			err = q.Create(row).Error
		} else {
			err = q.Save(row).Error
		}
		if err != nil {
			return err
		}
		return tx.Model(row).Association("Assets").Replace(assets)
	}))
}
func (r *Repository) DeleteBranch(ctx context.Context, id uuid.UUID) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBranch(tx, id); err != nil {
			return err
		}
		for _, model := range []any{&models.Room{}, &models.Floor{}, &models.Bed{}} {
			var n int64
			if err := tx.Model(model).Where("branch_id = ?", id).Count(&n).Error; err != nil {
				return err
			}
			if n > 0 {
				return constants.ErrConflict
			}
		}
		return tx.Delete(&models.Branch{}, "branch_id = ?", id).Error
	}))
}
func (r *Repository) DeleteRoom(ctx context.Context, id uuid.UUID) error {
	var row models.Room
	if err := r.db.WithContext(ctx).First(&row, "room_id = ?", id).Error; err != nil {
		return translate(err)
	}
	return r.DeleteRooms(ctx, row.BranchID, []uuid.UUID{id})
}
func (r *Repository) SaveOperationalState(ctx context.Context, id uuid.UUID, status string) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var row models.Room
		if err := tx.First(&row, "room_id = ?", id).Error; err != nil {
			return err
		}
		if err := lockBranch(tx, row.BranchID); err != nil {
			return err
		}
		if status == "Arizali" || status == "Tadilat" {
			rooms, err := inventory(tx, row.BranchID)
			if err != nil {
				return err
			}
			related := property.Related(rooms, id)
			ids := []uuid.UUID{}
			for id := range related {
				ids = append(ids, id)
			}
			var n int64
			if err := tx.Table("booking_allocations a").Joins("JOIN bookings b ON b.booking_id = a.booking_id").Where("a.room_id IN ? AND b.status IN ? AND a.\"end\" > ?", ids, []string{"confirmed", "checked_in"}, time.Now()).Count(&n).Error; err != nil {
				return err
			}
			if n > 0 {
				return constants.ErrStructureInUse
			}
		}
		return tx.Model(&models.Room{}).Where("room_id = ?", id).Update("status", status).Error
	}))
}
func (r *Repository) SaveInventory(ctx context.Context, id uuid.UUID, items []property.InventoryItem) error {
	row := models.Hotel{}
	for _, v := range items {
		row.Inventory = append(row.Inventory, models.InventoryItem(v))
	}
	return translate(r.db.WithContext(ctx).Model(&models.Hotel{}).Where("hotel_id = ?", id).Select("Inventory").Updates(&row).Error)
}
func (r *Repository) FindAsset(ctx context.Context, id uuid.UUID) (media.Asset, error) {
	var row models.Asset
	err := r.db.WithContext(ctx).First(&row, "media_id = ?", id).Error
	return fromAsset(row), translate(err)
}
func (r *Repository) ListAssets(ctx context.Context, id uuid.UUID) ([]media.Asset, error) {
	var rows []models.Asset
	err := r.db.WithContext(ctx).Where("hotel_id = ?", id).Order("sort_order, media_id").Find(&rows).Error
	return fromAssets(rows), translate(err)
}
func (r *Repository) SaveAssets(ctx context.Context, items []media.Asset) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, p := range items {
			row := toAsset(p)
			if err := tx.Save(&row).Error; err != nil {
				return err
			}
		}
		return nil
	}))
}
func (r *Repository) DeleteAsset(ctx context.Context, id uuid.UUID) error {
	return translate(r.db.WithContext(ctx).Delete(&models.Asset{}, "media_id = ?", id).Error)
}

func (r *Repository) PublicProperties(ctx context.Context) ([]property.PublicProperty, error) {
	rows := []property.PublicProperty{}
	err := r.db.WithContext(ctx).Table("branches b").Select("b.hotel_id,b.branch_id, CASE WHEN b.name = h.name THEN h.name ELSE h.name || ' / ' || b.name END AS name, COALESCE(NULLIF(b.address,''),h.address) AS location, COALESCE(NULLIF(b.logo_url,''),h.logo_url) AS image").Joins("JOIN hotels h ON h.hotel_id=b.hotel_id").Where("b.deleted_at IS NULL AND h.deleted_at IS NULL").Order("h.name,b.name").Scan(&rows).Error
	return rows, translate(err)
}

// Compatibility for v1 room.create/bulk_create: a bed unit also receives a physical
// structure. New clients use bed.create to supply explicit type and dimensions.
func ensureLegacyBed(tx *gorm.DB, u property.Room) error {
	key := u.RoomID.String()
	if u.BedGroup != "" {
		key = fmt.Sprintf("%s/%v/%v/%s", u.BranchID, u.FloorID, u.ParentID, u.BedGroup)
	}
	id := uuid.NewSHA1(uuid.NameSpaceOID, []byte("legacy-bed/"+key))
	b := models.Bed{BedID: id, BranchID: u.BranchID, RoomID: u.ParentID, FloorID: u.FloorID, Code: u.Code, Type: "single", Structure: "standard", Levels: u.BedLevel}
	if u.BedLevel > 1 || u.BedGroup != "" {
		b.Type, b.Structure = "bunk_bed", "bunk"
	}
	if err := tx.Where("bed_id = ?", id).FirstOrCreate(&b).Error; err != nil {
		return err
	}
	if b.Levels < u.BedLevel {
		if err := tx.Model(&b).Updates(map[string]any{"levels": u.BedLevel, "structure": "bunk", "type": "bunk_bed"}).Error; err != nil {
			return err
		}
	}
	position := "single"
	if u.BedGroup != "" {
		position = "upper"
		if u.BedLevel == 1 {
			position = "lower"
		}
	}
	if err := tx.Create(&models.SleepingPlace{UnitID: u.RoomID, BranchID: u.BranchID, BedID: id, Level: u.BedLevel, Position: position}).Error; err != nil {
		return err
	}
	levels := b.Levels
	if u.BedLevel > levels {
		levels = u.BedLevel
	}
	if levels > 1 {
		return tx.Model(&models.SleepingPlace{}).Where("bed_id = ?", id).Update("position", gorm.Expr("CASE WHEN level = 1 THEN 'lower' WHEN level = ? THEN 'upper' ELSE 'middle' END", levels)).Error
	}
	return nil
}
