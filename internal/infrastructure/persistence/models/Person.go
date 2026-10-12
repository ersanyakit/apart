package models

import "github.com/google/uuid"

type Person struct {
	PersonID   uuid.UUID `gorm:"type:uuid;primaryKey" json:"person_id"`
	Name       string    `json:"name"`
	LastName   string    `json:"last_name"`
	FullName   string    `json:"full_name"`
	Email      string    `json:"email,omitempty"`
	Phone      string    `json:"phone,omitempty"`
	PassportNo string    `json:"passport_no,omitempty"`
	IDNumber   string    `json:"id_number,omitempty"`
}
