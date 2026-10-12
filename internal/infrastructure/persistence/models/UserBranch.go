package models

import (
	"otel/constants"

	"github.com/google/uuid"
)

// UserBranch assigns a user a role at a branch of their hotel.
// The composite primary key allows one membership per user and branch.
type UserBranch struct {
	UserID   uuid.UUID          `gorm:"type:uuid;primaryKey" json:"user_id"`
	BranchID uuid.UUID          `gorm:"type:uuid;primaryKey;index" json:"branch_id"`
	HotelID  uuid.UUID          `gorm:"type:uuid;not null;index" json:"hotel_id"`
	Role     constants.UserRole `gorm:"not null" json:"role"`
}
