package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{Version: "20261012_007_soft_delete_audit", Up: func(tx *gorm.DB) error {
		return tx.AutoMigrate(&models.Hotel{}, &models.Branch{}, &models.Room{}, &models.Floor{}, &models.Bed{}, &models.Asset{}, &models.FeatureCategory{}, &models.FeatureDefinition{}, &models.AuditLog{})
	}, Down: func(tx *gorm.DB) error {
		if err := tx.Migrator().DropTable(&models.AuditLog{}); err != nil {
			return err
		}
		for _, model := range []any{&models.Hotel{}, &models.Branch{}, &models.Room{}, &models.Floor{}, &models.Bed{}, &models.Asset{}, &models.FeatureCategory{}, &models.FeatureDefinition{}} {
			if err := tx.Migrator().DropColumn(model, "DeletedAt"); err != nil {
				return err
			}
		}
		return nil
	}})
}
