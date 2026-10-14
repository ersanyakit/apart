package persistence

import (
	"otel/internal/domain/identity"
	"otel/internal/domain/media"
	"otel/internal/domain/property"
	"otel/internal/domain/shared"
	"otel/internal/infrastructure/persistence/models"
	"otel/utils"
)

func fromAsset(v models.Asset) media.Asset {
	return media.Asset{Kind: media.Kind(v.Kind), MIMEType: v.MIMEType, Size: v.Size, OriginalName: v.OriginalName,
		MediaID:     v.MediaID,
		HotelID:     v.HotelID,
		StorageKey:  v.StorageKey,
		URL:         v.URL,
		Title:       shared.LocalizedString(v.Title),
		Description: shared.LocalizedString(v.Description),
		AltText:     shared.LocalizedString(v.AltText),
		SortOrder:   v.SortOrder,
		CreatedAt:   v.CreatedAt,
		UpdatedAt:   v.UpdatedAt,
	}
}
func toAsset(v media.Asset) models.Asset {
	return models.Asset{Kind: string(v.Kind), MIMEType: v.MIMEType, Size: v.Size, OriginalName: v.OriginalName,
		MediaID:     v.MediaID,
		HotelID:     v.HotelID,
		StorageKey:  v.StorageKey,
		URL:         v.URL,
		Title:       utils.LocalizedString(v.Title),
		Description: utils.LocalizedString(v.Description),
		AltText:     utils.LocalizedString(v.AltText),
		SortOrder:   v.SortOrder,
		CreatedAt:   v.CreatedAt,
		UpdatedAt:   v.UpdatedAt,
	}
}
func fromFacilityInfo(v models.FacilityInfo) property.FacilityInfo {
	return property.FacilityInfo{
		Name:        v.Name,
		Description: shared.LocalizedString(v.Description),
		Address:     v.Address,
		Phone:       v.Phone,
		Email:       v.Email,
		TaxNumber:   v.TaxNumber,
		TaxOffice:   v.TaxOffice,
		LogoURL:     v.LogoURL,
		CoverURL:    v.CoverURL,
	}
}
func toFacilityInfo(v property.FacilityInfo) models.FacilityInfo {
	return models.FacilityInfo{
		Name:        v.Name,
		Description: utils.LocalizedString(v.Description),
		Address:     v.Address,
		Phone:       v.Phone,
		Email:       v.Email,
		TaxNumber:   v.TaxNumber,
		TaxOffice:   v.TaxOffice,
		LogoURL:     v.LogoURL,
		CoverURL:    v.CoverURL,
	}
}

func fromAssets(items []models.Asset) []media.Asset {
	out := make([]media.Asset, 0, len(items))
	for _, v := range items {
		out = append(out, fromAsset(v))
	}
	return out
}
func toAssets(items []media.Asset) []models.Asset {
	out := make([]models.Asset, 0, len(items))
	for _, v := range items {
		out = append(out, toAsset(v))
	}
	return out
}
func fromHotel(v models.Hotel) property.Hotel {
	out := property.Hotel{HotelID: v.HotelID, FacilityInfo: fromFacilityInfo(v.FacilityInfo), Assets: fromAssets(v.Assets), Inventory: []property.InventoryItem{}}
	for _, i := range v.Inventory {
		out.Inventory = append(out.Inventory, property.InventoryItem(i))
	}
	return out
}
func toHotel(v property.Hotel) models.Hotel {
	out := models.Hotel{HotelID: v.HotelID, FacilityInfo: toFacilityInfo(v.FacilityInfo), Assets: toAssets(v.Assets)}
	for _, i := range v.Inventory {
		out.Inventory = append(out.Inventory, models.InventoryItem(i))
	}
	return out
}
func fromBranch(v models.Branch) property.Branch {
	return property.Branch{BranchID: v.BranchID, HotelID: v.HotelID, FacilityInfo: fromFacilityInfo(v.FacilityInfo), Assets: fromAssets(v.Assets)}
}
func toBranch(v property.Branch) models.Branch {
	return models.Branch{BranchID: v.BranchID, HotelID: v.HotelID, FacilityInfo: toFacilityInfo(v.FacilityInfo), Assets: toAssets(v.Assets)}
}
func fromUser(v models.User) identity.User {
	out := identity.User{UserID: v.UserID, HotelID: v.HotelID, UserName: v.UserName, DisplayName: v.DisplayName, FirstName: v.FirstName, LastName: v.LastName, Email: v.Email, PasswordHash: v.Password, Role: v.UserRole}
	out.Preferences = v.Preferences
	if out.Preferences == nil {
		out.Preferences = identity.Preferences{}
	}
	for _, b := range v.BranchMemberships {
		out.BranchIDs = append(out.BranchIDs, b.BranchID)
	}
	return out
}
func fromRoom(v models.Room) property.Room {
	out := property.Room{Inactive: v.Inactive, BedLayout: v.BedLayout, FloorID: v.FloorID, ParentID: v.ParentID, Kind: v.Kind, Capacity: v.Capacity, Rentable: v.Rentable, BedGroup: v.BedGroup, BedLevel: v.BedLevel, Position: v.Position, RoomID: v.RoomID, BranchID: v.BranchID, Name: v.Name, Code: v.Code, Status: v.Status, Type: v.Type, Description: shared.LocalizedString(v.Description), Features: v.Features, InventoryIDs: v.InventoryIDs, CheckIn: v.CheckIn, CheckOut: v.CheckOut, Assets: fromAssets(v.Assets)}
	for _, g := range v.Guests {
		out.Guests = append(out.Guests, property.Guest(g))
	}
	return out
}
func toRoom(v property.Room) models.Room {
	out := models.Room{Inactive: v.Inactive, BedLayout: v.BedLayout, FloorID: v.FloorID, ParentID: v.ParentID, Kind: v.Kind, Capacity: v.Capacity, Rentable: v.Rentable, BedGroup: v.BedGroup, BedLevel: v.BedLevel, Position: v.Position, RoomID: v.RoomID, BranchID: v.BranchID, Name: v.Name, Code: v.Code, Status: v.Status, Type: v.Type, Description: utils.LocalizedString(v.Description), Features: v.Features, InventoryIDs: v.InventoryIDs, CheckIn: v.CheckIn, CheckOut: v.CheckOut, Assets: toAssets(v.Assets)}
	for _, g := range v.Guests {
		out.Guests = append(out.Guests, models.RoomGuest(g))
	}
	return out
}
