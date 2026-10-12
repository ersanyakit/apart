package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Hotel struct {
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	FacilityInfo
	HotelID   uuid.UUID       `gorm:"type:uuid;primaryKey" json:"hotel_id"`
	Users     []User          `gorm:"foreignKey:HotelID;references:HotelID;constraint:OnDelete:CASCADE;" json:"-"`
	Branches  []Branch        `gorm:"foreignKey:HotelID;references:HotelID;constraint:OnDelete:RESTRICT;" json:"branches,omitempty"`
	Assets    []Asset         `gorm:"many2many:hotel_media;foreignKey:HotelID;joinForeignKey:HotelID;references:MediaID;joinReferences:MediaID;constraint:OnDelete:CASCADE;" json:"assets"`
	Inventory []InventoryItem `gorm:"serializer:json" json:"inventory"`
}
