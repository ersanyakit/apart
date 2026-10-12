package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Branch represents a physical location belonging to a hotel.
type Branch struct {
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	FacilityInfo
	BranchID uuid.UUID `gorm:"type:uuid;primaryKey;uniqueIndex:idx_branch_hotel,priority:1" json:"branch_id"`
	HotelID  uuid.UUID `gorm:"type:uuid;not null;index;uniqueIndex:idx_branch_hotel,priority:2" json:"hotel_id"`

	Rooms    []Room    `gorm:"foreignKey:BranchID;references:BranchID;constraint:OnDelete:RESTRICT;" json:"rooms,omitempty"`
	Bookings []Booking `gorm:"foreignKey:BranchID;references:BranchID;constraint:OnDelete:RESTRICT;" json:"bookings,omitempty"`
	Assets   []Asset   `gorm:"many2many:branch_media;foreignKey:BranchID;joinForeignKey:BranchID;references:MediaID;joinReferences:MediaID;constraint:OnDelete:CASCADE;" json:"assets,omitempty"`

	// Including HotelID prevents assigning users from another hotel.
	UserMemberships []UserBranch `gorm:"foreignKey:BranchID,HotelID;references:BranchID,HotelID;constraint:OnDelete:CASCADE;" json:"user_memberships,omitempty"`
}
