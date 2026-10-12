package migrations

import (
	"otel/constants"
	"sort"
	"time"

	"gorm.io/gorm"
)

type Migration struct {
	Version string
	Up      func(*gorm.DB) error
	Down    func(*gorm.DB) error
}

type Record struct {
	Version   string    `gorm:"primaryKey" json:"version"`
	Batch     int       `gorm:"not null" json:"batch"`
	AppliedAt time.Time `json:"applied_at"`
}

func (Record) TableName() string { return "schema_migrations" }

func Register(m Migration) {
	All = append(All, m)
	sort.Slice(All, func(i, j int) bool { return All[i].Version < All[j].Version })
}

var All []Migration

func locked(db *gorm.DB, work func(*gorm.DB) error) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(734821601)).Error; err != nil {
			return err
		}
		if err := tx.AutoMigrate(&Record{}); err != nil {
			return err
		}
		return work(tx)
	})
}

func Status(db *gorm.DB) ([]Record, error) {
	var records []Record
	err := locked(db, func(tx *gorm.DB) error { return tx.Order("version").Find(&records).Error })
	return records, err
}

// Up applies all pending migrations as one atomic batch. No application models
// are auto-migrated outside a versioned migration.
func Up(db *gorm.DB) error {
	return locked(db, func(tx *gorm.DB) error {
		var applied []Record
		if err := tx.Find(&applied).Error; err != nil {
			return err
		}
		versions := map[string]bool{}
		batch := 0
		for _, record := range applied {
			versions[record.Version] = true
			if record.Batch > batch {
				batch = record.Batch
			}
		}
		for _, migration := range All {
			if versions[migration.Version] {
				continue
			}
			if err := migration.Up(tx); err != nil {
				return constants.Wrap(constants.ErrMigration, err)
			}
			if err := tx.Create(&Record{Version: migration.Version, Batch: batch + 1, AppliedAt: time.Now().UTC()}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// Down rolls back the latest batch (or every applied migration for reset).
func Down(db *gorm.DB, reset bool) error {
	return locked(db, func(tx *gorm.DB) error {
		var records []Record
		if err := tx.Order("batch DESC, version DESC").Find(&records).Error; err != nil {
			return err
		}
		if len(records) == 0 {
			return nil
		}
		known := map[string]Migration{}
		for _, migration := range All {
			known[migration.Version] = migration
		}
		for _, record := range records {
			if !reset && record.Batch != records[0].Batch {
				break
			}
			migration, ok := known[record.Version]
			if !ok {
				return constants.ErrMigrationMissing
			}
			if err := migration.Down(tx); err != nil {
				return constants.Wrap(constants.ErrMigration, err)
			}
			if err := tx.Delete(&Record{}, "version = ?", record.Version).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
