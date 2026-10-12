package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/utils"
)

type Floor struct {
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	FloorID   uuid.UUID      `gorm:"type:uuid;primaryKey;uniqueIndex:idx_floor_branch,priority:1"`
	BranchID  uuid.UUID      `gorm:"type:uuid;not null;uniqueIndex:idx_floor_branch,priority:2;uniqueIndex:idx_floor_code,priority:1"`
	Code      string         `gorm:"not null;uniqueIndex:idx_floor_code,priority:2"`
	Label     utils.LocalizedString
	SortOrder int
	Width     int
	Height    int
	Branch    Branch `gorm:"belongsTo:Branch;foreignKey:BranchID;references:BranchID;constraint:OnDelete:RESTRICT"`
}
