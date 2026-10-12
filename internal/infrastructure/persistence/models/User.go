package models

import (
	"otel/constants"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	UserID      uuid.UUID          `gorm:"type:uuid;primaryKey;uniqueIndex:idx_user_hotel,priority:1" json:"user_id"`
	HotelID     uuid.UUID          `gorm:"type:uuid;not null;index;uniqueIndex:idx_user_hotel,priority:2" json:"hotel_id"`
	UserName    string             `gorm:"uniqueIndex" json:"username"`
	FirstName   string             `json:"first_name"`
	LastName    string             `json:"last_name"`
	DisplayName string             `json:"displayname"`
	Email       string             `json:"-"`
	Password    string             `json:"-"`
	DateOfBirth *time.Time         `json:"date_of_birth,omitempty"`
	UserRole    constants.UserRole `json:"user_role"` // Hotel-level role; branch roles belong to UserBranch.
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
	DeletedAt   gorm.DeletedAt     `gorm:"index" json:"deleted_at,omitempty"`

	BranchMemberships []UserBranch `gorm:"foreignKey:UserID,HotelID;references:UserID,HotelID;constraint:OnDelete:CASCADE;" json:"branch_memberships,omitempty"`
}
