package persistence

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/identity"
	"otel/internal/infrastructure/persistence/models"
)

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (identity.User, error) {
	var row models.User
	err := r.db.WithContext(ctx).Preload("BranchMemberships").First(&row, "user_id = ?", id).Error
	return fromUser(row), translate(err)
}

func (r *Repository) LoginPeople(ctx context.Context, branchID uuid.UUID) ([]identity.LoginPerson, error) {
	out := []identity.LoginPerson{}
	err := r.db.WithContext(ctx).Table("users u").
		Select("u.user_id, COALESCE(NULLIF(TRIM(u.first_name), ''), split_part(TRIM(u.display_name), ' ', 1)) AS name").
		Joins("JOIN branches b ON b.hotel_id = u.hotel_id AND b.branch_id = ?", branchID).
		Where("u.deleted_at IS NULL AND b.deleted_at IS NULL AND u.user_role IN ?", []constants.UserRole{constants.UserRoleAdmin, constants.UserRoleManagement, constants.UserRoleReception, constants.UserRoleAccounting, constants.UserRoleHousekeeping, constants.UserRoleTechnical, constants.UserRoleMaintenance, constants.UserRoleSupervisor}).
		Where("u.user_role IN ? OR EXISTS (SELECT 1 FROM user_branches ub WHERE ub.user_id = u.user_id AND ub.branch_id = b.branch_id AND ub.hotel_id = b.hotel_id)", []constants.UserRole{constants.UserRoleAdmin, constants.UserRoleManagement}).
		Order("name, u.user_id").Scan(&out).Error
	return out, translate(err)
}
