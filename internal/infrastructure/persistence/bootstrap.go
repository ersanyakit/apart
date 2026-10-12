package persistence

import (
	"context"
	"otel/constants"
	"otel/internal/infrastructure/persistence/models"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Bootstrap is an explicit CLI use case. It never runs during server startup.
func Bootstrap(ctx context.Context, db *gorm.DB, username, password, hotelName string) error {
	if strings.TrimSpace(username) == "" || strings.TrimSpace(hotelName) == "" {
		return constants.ErrBootstrap
	}
	if len(password) < 12 || len(password) > 72 {
		return constants.ErrPassword
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return constants.Wrap(constants.ErrAuth, err)
	}
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(734821602)).Error; err != nil {
			return err
		}
		var count int64
		if err := tx.Model(&models.User{}).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return constants.ErrAlreadyInitialized
		}
		hotel := models.Hotel{HotelID: uuid.New(), FacilityInfo: models.FacilityInfo{Name: hotelName}}
		if err := tx.Create(&hotel).Error; err != nil {
			return err
		}
		branch := models.Branch{BranchID: uuid.New(), HotelID: hotel.HotelID, FacilityInfo: models.FacilityInfo{Name: "Merkez"}}
		if err := tx.Create(&branch).Error; err != nil {
			return err
		}
		return tx.Create(&models.User{UserID: uuid.New(), HotelID: hotel.HotelID, UserName: strings.ToLower(strings.TrimSpace(username)), FirstName: "Yönetici", DisplayName: "Yönetici", Password: string(hash), UserRole: constants.UserRoleAdmin}).Error
	})
}
