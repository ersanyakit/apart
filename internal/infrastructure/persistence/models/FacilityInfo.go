package models

import "otel/utils"

// FacilityInfo is shared by the hotel brand and its physical branches.
type FacilityInfo struct {
	Name        string                `gorm:"not null" json:"name"`
	Description utils.LocalizedString `json:"description"`
	Address     string                `json:"address"`
	Phone       string                `json:"phone"`
	Email       string                `json:"email"`
	TaxNumber   string                `json:"tax_number"`
	TaxOffice   string                `json:"tax_office"`
	LogoURL     string                `json:"logo_url"`
	CoverURL    string                `json:"cover_url"`
}

type InventoryItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon,omitempty"`
}
