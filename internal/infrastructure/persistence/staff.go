package persistence

import (
	"context"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/identity"
	"otel/internal/infrastructure/persistence/models"
)

func (r *Repository) ListStaff(ctx context.Context, hotelID uuid.UUID) ([]identity.Staff, error) {
	var rows []models.User
	err := r.db.WithContext(ctx).Preload("BranchMemberships").Where("hotel_id = ?", hotelID).Order("first_name,last_name").Find(&rows).Error
	out := []identity.Staff{}
	for _, u := range rows {
		ids := []uuid.UUID{}
		for _, m := range u.BranchMemberships {
			ids = append(ids, m.BranchID)
		}
		out = append(out, identity.Staff{UserID: u.UserID, HotelID: u.HotelID, Username: u.UserName, FirstName: u.FirstName, LastName: u.LastName, Email: u.Email, Role: u.UserRole, BranchIDs: ids})
	}
	return out, translate(err)
}
func ensureManager(tx *gorm.DB, hotelID, exclude uuid.UUID) error {
	var n int64
	if err := tx.Model(&models.User{}).Where("hotel_id = ? AND user_id <> ? AND user_role IN ?", hotelID, exclude, []constants.UserRole{constants.UserRoleManagement, constants.UserRoleAdmin}).Count(&n).Error; err != nil {
		return err
	}
	if n == 0 {
		return constants.ErrLastManager
	}
	return nil
}
func (r *Repository) SaveStaff(ctx context.Context, p identity.Staff, hash string, create bool) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,11))", p.HotelID.String()).Error; err != nil {
			return err
		}
		row := models.User{UserID: p.UserID, HotelID: p.HotelID, UserName: p.Username, FirstName: p.FirstName, LastName: p.LastName, DisplayName: p.FirstName + " " + p.LastName, Email: p.Email, UserRole: p.Role, Password: hash}
		if create {
			if err := tx.Create(&row).Error; err != nil {
				return err
			}
		} else {
			var old models.User
			if err := tx.First(&old, "user_id = ? AND hotel_id = ?", p.UserID, p.HotelID).Error; err != nil {
				return err
			}
			if (old.UserRole == constants.UserRoleManagement || old.UserRole == constants.UserRoleAdmin) && p.Role != constants.UserRoleManagement && p.Role != constants.UserRoleAdmin {
				if err := ensureManager(tx, p.HotelID, p.UserID); err != nil {
					return err
				}
			}
			fields := []string{"UserName", "FirstName", "LastName", "DisplayName", "Email", "UserRole"}
			if hash != "" {
				fields = append(fields, "Password")
			}
			if err := tx.Model(&old).Select(fields).Updates(&row).Error; err != nil {
				return err
			}
			if err := tx.Where("user_id = ?", p.UserID).Delete(&models.Session{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Where("user_id = ?", p.UserID).Delete(&models.UserBranch{}).Error; err != nil {
			return err
		}
		for _, id := range p.BranchIDs {
			var branch models.Branch
			if err := tx.First(&branch, "branch_id = ? AND hotel_id = ?", id, p.HotelID).Error; err != nil {
				return err
			}
			if err := tx.Create(&models.UserBranch{UserID: p.UserID, BranchID: id, HotelID: p.HotelID, Role: p.Role}).Error; err != nil {
				return err
			}
		}
		return nil
	}))
}
func (r *Repository) DeleteStaff(ctx context.Context, hotelID, id uuid.UUID) error {
	return translate(r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtextextended(?,11))", hotelID.String()).Error; err != nil {
			return err
		}
		var user models.User
		if err := tx.First(&user, "user_id = ? AND hotel_id = ?", id, hotelID).Error; err != nil {
			return err
		}
		if user.UserRole == constants.UserRoleManagement || user.UserRole == constants.UserRoleAdmin {
			if err := ensureManager(tx, hotelID, id); err != nil {
				return err
			}
		}
		if err := tx.Where("user_id = ?", id).Delete(&models.Session{}).Error; err != nil {
			return err
		}
		return tx.Delete(&user).Error
	}))
}
