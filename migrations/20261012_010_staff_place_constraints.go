package migrations

import (
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{Version: "20261012_010_staff_place_constraints", Up: func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(&models.SleepingPlace{}); err != nil {
			return err
		}
		if err := tx.Migrator().DropIndex(&models.SleepingPlace{}, "idx_bed_level"); err != nil {
			return err
		}
		if err := tx.Migrator().CreateIndex(&models.SleepingPlace{}, "idx_bed_level"); err != nil {
			return err
		}
		for _, sql := range []string{`CREATE UNIQUE INDEX idx_user_login_ci ON users(lower(user_name))`, `CREATE UNIQUE INDEX idx_user_email_ci ON users(lower(email)) WHERE email <> '' AND deleted_at IS NULL`} {
			if err := tx.Exec(sql).Error; err != nil {
				return err
			}
		}
		return nil
	}, Down: func(tx *gorm.DB) error {
		for _, sql := range []string{`DROP INDEX idx_user_login_ci`, `DROP INDEX idx_user_email_ci`, `DROP INDEX idx_bed_level`, `CREATE UNIQUE INDEX idx_bed_level ON sleeping_places(bed_id,level)`} {
			if err := tx.Exec(sql).Error; err != nil {
				return err
			}
		}
		return tx.Migrator().DropColumn(&models.SleepingPlace{}, "DeletedAt")
	}})
}
