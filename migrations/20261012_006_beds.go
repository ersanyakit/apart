package migrations

import (
	"fmt"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"otel/internal/infrastructure/persistence/models"
)

func init() {
	Register(Migration{Version: "20261012_006_beds", Up: func(tx *gorm.DB) error {
		if err := tx.AutoMigrate(&models.Room{}, &models.Bed{}, &models.SleepingPlace{}); err != nil {
			return err
		}
		for _, sql := range []string{
			`ALTER TABLE beds ADD CONSTRAINT fk_bed_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id) ON DELETE RESTRICT`,
			`ALTER TABLE beds ADD CONSTRAINT fk_bed_room FOREIGN KEY (room_id,branch_id) REFERENCES rooms(room_id,branch_id) ON DELETE RESTRICT`,
			`ALTER TABLE beds ADD CONSTRAINT fk_bed_floor FOREIGN KEY (floor_id,branch_id) REFERENCES floors(floor_id,branch_id) ON DELETE RESTRICT`,
			`ALTER TABLE beds ADD CONSTRAINT chk_bed_levels CHECK (levels BETWEEN 1 AND 10)`,
			`ALTER TABLE sleeping_places ADD CONSTRAINT fk_place_bed FOREIGN KEY (bed_id,branch_id) REFERENCES beds(bed_id,branch_id) ON DELETE RESTRICT`,
			`ALTER TABLE sleeping_places ADD CONSTRAINT fk_place_unit FOREIGN KEY (unit_id,branch_id) REFERENCES rooms(room_id,branch_id) ON DELETE RESTRICT`,
			`ALTER TABLE sleeping_places ADD CONSTRAINT chk_place_level CHECK (level BETWEEN 1 AND 10)`,
		} {
			if err := tx.Exec(sql).Error; err != nil {
				return err
			}
		}
		// Preserve reservation unit IDs while upgrading legacy bed groups.
		var units []models.Room
		if err := tx.Where("kind = ?", "bed").Order("bed_level").Find(&units).Error; err != nil {
			return err
		}
		groups := map[string][]models.Room{}
		for _, u := range units {
			key := fmt.Sprintf("%s/%v/%v/%s", u.BranchID, u.FloorID, u.ParentID, u.BedGroup)
			if u.BedGroup == "" {
				key = u.RoomID.String()
			}
			groups[key] = append(groups[key], u)
		}
		for key, items := range groups {
			first := items[0]
			levels := 1
			for _, u := range items {
				if u.BedLevel > levels {
					levels = u.BedLevel
				}
			}
			b := models.Bed{BedID: uuid.NewSHA1(uuid.NameSpaceOID, []byte("legacy-bed/"+key)), BranchID: first.BranchID, RoomID: first.ParentID, FloorID: first.FloorID, Code: first.Code, Type: "single", Structure: "standard", Levels: levels}
			if levels > 1 {
				b.Type, b.Structure = "bunk_bed", "bunk"
			}
			if err := tx.Create(&b).Error; err != nil {
				return err
			}
			for _, u := range items {
				level := u.BedLevel
				if level < 1 {
					level = 1
				}
				position := "single"
				if levels > 1 {
					position = "middle"
					if level == 1 {
						position = "lower"
					}
					if level == levels {
						position = "upper"
					}
				}
				p := models.SleepingPlace{UnitID: u.RoomID, BranchID: u.BranchID, BedID: b.BedID, Level: level, Position: position}
				if err := tx.Create(&p).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}, Down: func(tx *gorm.DB) error {
		if err := tx.Migrator().DropTable(&models.SleepingPlace{}, &models.Bed{}); err != nil {
			return err
		}
		for _, field := range []string{"Inactive", "BedLayout"} {
			if err := tx.Migrator().DropColumn(&models.Room{}, field); err != nil {
				return err
			}
		}
		return nil
	}})
}
