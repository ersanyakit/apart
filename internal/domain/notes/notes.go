package notes

import (
	"context"
	"github.com/google/uuid"
	"otel/constants"
	"strings"
	"time"
	"unicode/utf8"
)

type Note struct {
	ID            uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	HotelID       uuid.UUID `gorm:"type:uuid;not null" json:"hotel_id"`
	BranchID      uuid.UUID `gorm:"type:uuid;not null" json:"branch_id"`
	Title         string    `gorm:"not null" json:"title"`
	Body          string    `gorm:"not null" json:"body"`
	Status        string    `gorm:"not null" json:"status"`
	Priority      string    `gorm:"not null" json:"priority"`
	Archived      bool      `gorm:"not null;default:false" json:"archived"`
	Version       int64     `gorm:"not null" json:"version"`
	CreatedBy     uuid.UUID `gorm:"type:uuid;not null" json:"created_by"`
	CreatedByName string    `gorm:"not null" json:"created_by_name"`
	UpdatedBy     uuid.UUID `gorm:"type:uuid;not null" json:"updated_by"`
	UpdatedByName string    `gorm:"not null" json:"updated_by_name"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (Note) TableName() string { return "reception_notes" }

type Input struct {
	ID       uuid.UUID `json:"id"`
	HotelID  uuid.UUID `json:"hotel_id"`
	BranchID uuid.UUID `json:"branch_id"`
	Title    string    `json:"title"`
	Body     string    `json:"body"`
	Status   string    `json:"status"`
	Priority string    `json:"priority"`
	Archived bool      `json:"archived"`
	Version  int64     `json:"version"`
}

func ValidStatus(s string) bool { return s == "todo" || s == "doing" || s == "done" }
func (in Input) Validate() error {
	if in.ID == uuid.Nil || in.Version < 0 || in.Version > 1000000000 || !ValidStatus(in.Status) || (in.Priority != "normal" && in.Priority != "urgent") || utf8.RuneCountInString(strings.TrimSpace(in.Title)) < 1 || utf8.RuneCountInString(in.Title) > 160 || utf8.RuneCountInString(in.Body) > 8000 || (in.Version == 0 && in.Archived) {
		return constants.ErrPayload
	}
	return nil
}

type Query struct {
	HotelID  uuid.UUID `json:"hotel_id"`
	BranchID uuid.UUID `json:"branch_id"`
	Status   string    `json:"status"`
	Search   string    `json:"search"`
	Archived bool      `json:"archived"`
	Page     int       `json:"page"`
}
type Page struct {
	Items []Note `json:"items"`
	Total int64  `json:"total"`
	Page  int    `json:"page"`
}

const PageSize = 25

type Repository interface {
	ListNotes(context.Context, Query) (Page, error)
	SaveNote(context.Context, Input, uuid.UUID, string) (Note, error)
}
