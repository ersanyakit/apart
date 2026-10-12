package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/internal/domain/property"
	"otel/utils"
)

type Room struct {
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Inactive  bool           `gorm:"not null;default:false"`
	BedLayout string
	FloorID   *uuid.UUID `gorm:"type:uuid;index"`
	ParentID  *uuid.UUID `gorm:"type:uuid;index"`
	Kind      string     `gorm:"not null;default:room"`
	Capacity  int        `gorm:"not null;default:1"`
	Rentable  bool       `gorm:"not null"`
	BedGroup  string
	BedLevel  int
	Position  property.Position `gorm:"serializer:json;type:jsonb"`

	RoomID       uuid.UUID             `gorm:"type:uuid;primaryKey;uniqueIndex:idx_room_branch,priority:1" json:"room_id"`
	BranchID     uuid.UUID             `gorm:"type:uuid;not null;index;uniqueIndex:idx_room_branch,priority:2;uniqueIndex:idx_room_branch_code,priority:1" json:"branch_id"`
	Name         string                `json:"name"`
	Code         string                `gorm:"not null;uniqueIndex:idx_room_branch_code,priority:2" json:"code"`
	Status       string                `json:"status"`
	Type         string                `json:"type"`
	Description  utils.LocalizedString `json:"description"`
	Features     []string              `gorm:"serializer:json" json:"features"`
	InventoryIDs []string              `gorm:"serializer:json" json:"inventory_ids"`
	CheckIn      string                `json:"check_in"`
	CheckOut     string                `json:"check_out"`
	Guests       []RoomGuest           `gorm:"serializer:json" json:"guests"`
	Assets       []Asset               `gorm:"many2many:room_media;foreignKey:RoomID;joinForeignKey:RoomID;references:MediaID;joinReferences:MediaID;constraint:OnDelete:CASCADE;" json:"assets,omitempty"`

	// The composite foreign key keeps each booking in its room's branch.
	Bookings []Booking `gorm:"foreignKey:RoomID,BranchID;references:RoomID,BranchID;constraint:OnDelete:RESTRICT;" json:"bookings,omitempty"`
}

type RoomGuest struct {
	Relationship string `json:"relationship,omitempty"`
	ID           string `json:"id"`
	Name         string `json:"name"`
	TCNo         string `json:"tcNo,omitempty"`
	Phone        string `json:"phone,omitempty"`
	Address      string `json:"address,omitempty"`
	Note         string `json:"note,omitempty"`
}
