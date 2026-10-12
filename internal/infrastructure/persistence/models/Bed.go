package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Bed struct {
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	BedID     uuid.UUID      `gorm:"type:uuid;primaryKey;uniqueIndex:idx_bed_branch,priority:1"`
	BranchID  uuid.UUID      `gorm:"type:uuid;not null;uniqueIndex:idx_bed_branch,priority:2;uniqueIndex:idx_bed_code,priority:1"`
	RoomID    *uuid.UUID     `gorm:"type:uuid"`
	FloorID   *uuid.UUID     `gorm:"type:uuid"`
	Code      string         `gorm:"not null;uniqueIndex:idx_bed_code,priority:2"`
	Type      string
	Structure string
	WidthCM   int
	LengthCM  int
	Levels    int
}

type SleepingPlace struct {
	DeletedAt gorm.DeletedAt `gorm:"index"`
	UnitID    uuid.UUID      `gorm:"type:uuid;primaryKey"`
	BranchID  uuid.UUID      `gorm:"type:uuid;not null"`
	BedID     uuid.UUID      `gorm:"type:uuid;not null;uniqueIndex:idx_bed_level,priority:1,where:deleted_at IS NULL"`
	Level     int            `gorm:"not null;uniqueIndex:idx_bed_level,priority:2,where:deleted_at IS NULL"`
	Position  string
	WidthCM   int
	LengthCM  int
}
