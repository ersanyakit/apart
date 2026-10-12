package models

import (
	"encoding/json"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/internal/domain/features"
	"otel/utils"
)

type FeatureCategory struct {
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
	CategoryID uuid.UUID      `gorm:"type:uuid;primaryKey;uniqueIndex:idx_category_hotel,priority:1"`
	HotelID    uuid.UUID      `gorm:"type:uuid;not null;index;uniqueIndex:idx_category_hotel,priority:2;uniqueIndex:idx_category_code,priority:1"`
	Code       string         `gorm:"not null;uniqueIndex:idx_category_code,priority:2"`
	Label      utils.LocalizedString
	SortOrder  int
}
type FeatureDefinition struct {
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"-"`
	FeatureID   uuid.UUID       `gorm:"type:uuid;primaryKey;uniqueIndex:idx_feature_hotel,priority:1"`
	HotelID     uuid.UUID       `gorm:"type:uuid;not null;uniqueIndex:idx_feature_hotel,priority:2;uniqueIndex:idx_feature_code,priority:1"`
	CategoryID  uuid.UUID       `gorm:"type:uuid;not null;index"`
	Category    FeatureCategory `gorm:"belongsTo:Category;foreignKey:CategoryID,HotelID;references:CategoryID,HotelID;constraint:OnDelete:RESTRICT"`
	Code        string          `gorm:"not null;uniqueIndex:idx_feature_code,priority:2"`
	Label       utils.LocalizedString
	Description utils.LocalizedString
	ValueType   string           `gorm:"not null"`
	Scopes      []features.Scope `gorm:"serializer:json;type:jsonb"`
	Min         *float64
	Max         *float64
	Unit        string
	Filterable  bool
	Required    bool
	Options     []FeatureOption `gorm:"foreignKey:FeatureID;references:FeatureID;constraint:OnDelete:CASCADE"`
	Assets      []Asset         `gorm:"many2many:feature_media;foreignKey:FeatureID;joinForeignKey:FeatureID;references:MediaID;joinReferences:MediaID;constraint:OnDelete:CASCADE"`
}
type FeatureOption struct {
	ValueID   uuid.UUID `gorm:"type:uuid;primaryKey"`
	FeatureID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_feature_option,priority:1"`
	Code      string    `gorm:"not null;uniqueIndex:idx_feature_option,priority:2"`
	Label     utils.LocalizedString
}
type PropertyAssignment struct {
	BranchID   uuid.UUID         `gorm:"type:uuid;primaryKey"`
	FeatureID  uuid.UUID         `gorm:"type:uuid;primaryKey"`
	HotelID    uuid.UUID         `gorm:"type:uuid;not null;index"`
	Value      json.RawMessage   `gorm:"type:jsonb;not null"`
	Branch     Branch            `gorm:"belongsTo:Branch;foreignKey:BranchID,HotelID;references:BranchID,HotelID;constraint:OnDelete:CASCADE"`
	Definition FeatureDefinition `gorm:"belongsTo:Definition;foreignKey:FeatureID,HotelID;references:FeatureID,HotelID;constraint:OnDelete:RESTRICT"`
}
type RoomAssignment struct {
	RoomID     uuid.UUID         `gorm:"type:uuid;primaryKey"`
	FeatureID  uuid.UUID         `gorm:"type:uuid;primaryKey"`
	BranchID   uuid.UUID         `gorm:"type:uuid;not null;index"`
	HotelID    uuid.UUID         `gorm:"type:uuid;not null;index"`
	Value      json.RawMessage   `gorm:"type:jsonb;not null"`
	Room       Room              `gorm:"belongsTo:Room;foreignKey:RoomID,BranchID;references:RoomID,BranchID;constraint:OnDelete:CASCADE"`
	Branch     Branch            `gorm:"belongsTo:Branch;foreignKey:BranchID,HotelID;references:BranchID,HotelID;constraint:OnDelete:CASCADE"`
	Definition FeatureDefinition `gorm:"belongsTo:Definition;foreignKey:FeatureID,HotelID;references:FeatureID,HotelID;constraint:OnDelete:RESTRICT"`
}
