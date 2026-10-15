package seeding

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"otel/constants"
	"otel/internal/domain/accommodation"
	"otel/internal/domain/document"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence"
	"otel/internal/infrastructure/persistence/models"
	"otel/utils"
)

const DemoHotelName = "Interaktif Test Otel"

func demo(ctx context.Context, tx *gorm.DB, options Options) error {
	hotel := models.Hotel{HotelID: uuid.New(), FacilityInfo: models.FacilityInfo{Name: DemoHotelName, Description: utils.LocalizedString{constants.LanguageTR: "Test ve eğitim oteli", constants.LanguageEN: "Test and training hotel"}}}
	hotelDefaults := hotel
	hotel = models.Hotel{}
	if err := tx.Unscoped().Where("name = ?", DemoHotelName).Attrs(hotelDefaults).FirstOrCreate(&hotel).Error; err != nil {
		return err
	}
	if hotel.DeletedAt.Valid {
		return nil
	}
	branch := models.Branch{BranchID: uuid.New(), HotelID: hotel.HotelID, FacilityInfo: models.FacilityInfo{Name: DemoHotelName, Address: "Demo tesis"}}
	branchDefaults := branch
	branch = models.Branch{}
	if err := tx.Unscoped().Where("hotel_id = ? AND name = ?", hotel.HotelID, DemoHotelName).Attrs(branchDefaults).FirstOrCreate(&branch).Error; err != nil {
		return err
	}
	if branch.DeletedAt.Valid {
		return nil
	}
	var users []models.User
	if err := tx.Unscoped().Where("lower(user_name) = ?", "demo").Find(&users).Error; err != nil {
		return err
	}
	if len(users) > 0 {
		if len(users) != 1 || users[0].HotelID != hotel.HotelID || users[0].DeletedAt.Valid {
			return constants.ErrSeedConflict
		}
	} else {
		if len(options.DemoPassword) < 12 || len(options.DemoPassword) > 72 {
			return constants.ErrPassword
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(options.DemoPassword), 12)
		if err != nil {
			return constants.Wrap(constants.ErrSeed, err)
		}
		user := models.User{UserID: uuid.New(), HotelID: hotel.HotelID, UserName: "demo", FirstName: "Demo", LastName: "Demo", DisplayName: "Demo Demo", Password: string(hash), UserRole: constants.UserRoleManagement}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
	}
	floors := make([]models.Floor, 3)
	for i := range floors {
		floors[i] = models.Floor{FloorID: uuid.New(), BranchID: branch.BranchID, Code: fmt.Sprint(i + 1), Label: utils.LocalizedString{constants.LanguageTR: fmt.Sprintf("%d. Kat", i+1), constants.LanguageEN: fmt.Sprintf("Floor %d", i+1)}, SortOrder: float64(i + 1), Width: 2400, Height: 1600}
		defaults := floors[i]
		floors[i] = models.Floor{}
		if err := tx.Unscoped().Where("branch_id = ? AND code = ?", branch.BranchID, defaults.Code).Attrs(defaults).FirstOrCreate(&floors[i]).Error; err != nil {
			return err
		}
	}
	room := func(code, kind string, floor int, parent *uuid.UUID, capacity int) (models.Room, error) {
		row := models.Room{RoomID: uuid.New(), BranchID: branch.BranchID, FloorID: &floors[floor-1].FloorID, ParentID: parent, Code: code, Kind: kind, Capacity: capacity, Rentable: true, Status: constants.RoomClean, Position: property.Position{X: 20, Y: 20, Width: 140, Height: 100}}
		defaults := row
		row = models.Room{}
		err := tx.Unscoped().Where("branch_id = ? AND code = ?", branch.BranchID, code).Attrs(defaults).FirstOrCreate(&row).Error
		return row, err
	}
	rooms := []models.Room{}
	for i := 1; i <= 5; i++ {
		r, err := room(fmt.Sprintf("10%d", i), "room", 1, nil, 2)
		if err != nil {
			return err
		}
		rooms = append(rooms, r)
	}
	apt, err := room("201", "apartment", 2, nil, 4)
	if err != nil {
		return err
	}
	for i := 1; i <= 2; i++ {
		if _, err := room(fmt.Sprintf("201-%d", i), "room", 2, &apt.RoomID, 2); err != nil {
			return err
		}
	}
	dorm, err := room("301", "dormitory", 3, nil, 6)
	if err != nil {
		return err
	}
	repo := persistence.New(tx)
	bed := func(code string, parent models.Room, kind accommodation.BedType, structure accommodation.Structure, width, levels int, capacities []int) error {
		if parent.DeletedAt.Valid {
			return nil
		}
		var count int64
		if err := tx.Unscoped().Model(&models.Bed{}).Where("branch_id = ? AND code = ?", branch.BranchID, code).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return nil
		}
		b := accommodation.Bed{BedID: uuid.New(), BranchID: branch.BranchID, RoomID: &parent.RoomID, FloorID: parent.FloorID, Code: code, Type: kind, Structure: structure, WidthCM: width, LengthCM: 200, Levels: levels}
		for i, c := range capacities {
			pos := "single"
			if levels > 1 {
				pos = "middle"
				if i == 0 {
					pos = "lower"
				}
				if i == levels-1 {
					pos = "upper"
				}
			}
			b.Places = append(b.Places, accommodation.SleepingPlace{UnitID: uuid.New(), Code: fmt.Sprintf("%s-%d", code, i+1), Level: i + 1, Position: pos, WidthCM: width, LengthCM: 200, Capacity: c, IsActive: true, Rentable: parent.Kind == "dormitory"})
		}
		return repo.SaveBeds(ctx, []accommodation.Bed{b}, true)
	}
	if err := bed("101-S1", rooms[0], accommodation.Single, accommodation.Standard, 90, 1, []int{1}); err != nil {
		return err
	}
	if err := bed("101-S2", rooms[0], accommodation.Single, accommodation.Standard, 90, 1, []int{1}); err != nil {
		return err
	}
	if err := bed("102-Q", rooms[1], accommodation.Queen, accommodation.Standard, 160, 1, []int{2}); err != nil {
		return err
	}
	for i := 1; i <= 2; i++ {
		if err := bed(fmt.Sprintf("301-R%d", i), dorm, accommodation.Bunk, accommodation.BunkStructure, 90, 3, []int{1, 1, 1}); err != nil {
			return err
		}
	}
	for _, template := range document.Defaults(hotel.HotelID) {
		var count int64
		if err := tx.Unscoped().Model(&models.DocumentTemplate{}).Where("hotel_id = ? AND kind = ?", hotel.HotelID, template.Kind).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			if _, err := repo.SaveTemplate(ctx, template); err != nil {
				return err
			}
		}
	}
	return nil
}
