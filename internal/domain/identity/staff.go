package identity

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
)

type Staff struct {
	UserID    uuid.UUID          `json:"user_id"`
	HotelID   uuid.UUID          `json:"hotel_id"`
	Username  string             `json:"username"`
	FirstName string             `json:"first_name"`
	LastName  string             `json:"last_name"`
	Email     string             `json:"email"`
	Role      constants.UserRole `json:"role"`
	BranchIDs []uuid.UUID        `json:"branch_ids"`
}
type StaffInput struct {
	Staff
	Password string `json:"password"`
}
type StaffRepository interface {
	ListStaff(context.Context, uuid.UUID) ([]Staff, error)
	SaveStaff(context.Context, Staff, string, bool) error
	DeleteStaff(context.Context, uuid.UUID, uuid.UUID) error
}

func StaffRole(role constants.UserRole) bool {
	switch role {
	case constants.UserRoleManagement, constants.UserRoleReception, constants.UserRoleAccounting, constants.UserRoleHousekeeping, constants.UserRoleTechnical, constants.UserRoleMaintenance, constants.UserRoleSupervisor:
		return true
	}
	return false
}
