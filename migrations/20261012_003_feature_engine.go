package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{Version: "20261012_003_feature_engine", Up: func(tx *gorm.DB) error {
		return tx.AutoMigrate(&models.FeatureCategory{}, &models.FeatureDefinition{}, &models.FeatureOption{}, &models.PropertyAssignment{}, &models.RoomAssignment{})
	}, Down: func(tx *gorm.DB) error {
		for _, table := range []string{"room_assignments", "property_assignments", "feature_media", "feature_options", "feature_definitions", "feature_categories"} {
			if err := tx.Migrator().DropTable(table); err != nil {
				return err
			}
		}
		return nil
	}})
}
