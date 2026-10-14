package guest

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"otel/constants"
)

// Only the shared blacklist is cross-hotel. Ratings remain scoped to their hotel.
type Assessment struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	HotelID       uuid.UUID  `json:"hotel_id" gorm:"type:uuid;not null"`
	BranchID      uuid.UUID  `json:"-" gorm:"type:uuid;not null"`
	BookingID     uuid.UUID  `json:"-" gorm:"type:uuid;not null"`
	GuestID       uuid.UUID  `json:"-" gorm:"type:uuid;not null"`
	ActorID       uuid.UUID  `json:"actor_id" gorm:"type:uuid;not null"`
	ActorName     string     `json:"actor_name"`
	HotelName     string     `json:"hotel_name"`
	Name          string     `json:"name"`
	IdentityKey   string     `json:"-" gorm:"index"`
	IdentityHint  string     `json:"identity_hint"`
	Kind          string     `json:"kind" gorm:"not null"`
	Score         int        `json:"score"`
	Reason        string     `json:"reason"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	RevokedAt     *time.Time `json:"revoked_at"`
	RevokedBy     *uuid.UUID `json:"-" gorm:"type:uuid"`
	RevokedByName string     `json:"revoked_by_name"`
	RevokeReason  string     `json:"revoke_reason"`
	CanRevoke     bool       `json:"can_revoke" gorm:"-"`
}

func (Assessment) TableName() string { return "guest_assessments" }

type AssessmentInput struct {
	ID        uuid.UUID `json:"id"`
	HotelID   uuid.UUID `json:"hotel_id"`
	BranchID  uuid.UUID `json:"branch_id"`
	BookingID uuid.UUID `json:"booking_id"`
	GuestID   uuid.UUID `json:"guest_id"`
	Kind      string    `json:"kind"`
	Score     int       `json:"score"`
	Reason    string    `json:"reason"`
}

func (in AssessmentInput) Validate() error {
	if in.ID == uuid.Nil || in.HotelID == uuid.Nil || in.BranchID == uuid.Nil || in.BookingID == uuid.Nil || in.GuestID == uuid.Nil || utf8.RuneCountInString(strings.TrimSpace(in.Reason)) < 10 || utf8.RuneCountInString(in.Reason) > 2000 {
		return constants.ErrPayload
	}
	if in.Kind == "rating" && in.Score >= 1 && in.Score <= 5 {
		return nil
	}
	if in.Kind == "blacklist" && in.Score == 0 {
		return nil
	}
	return constants.ErrPayload
}

type AssessmentQuery struct {
	HotelID        uuid.UUID `json:"hotel_id"`
	BranchID       uuid.UUID `json:"branch_id"`
	GuestID        uuid.UUID `json:"guest_id"`
	Search         string    `json:"search"`
	NationalID     string    `json:"national_id"`
	Nationality    string    `json:"nationality"`
	Page           int       `json:"page"`
	PageSize       int       `json:"page_size"`
	IncludeRevoked bool      `json:"include_revoked"`
}
type AssessmentPage struct {
	Items    []Assessment `json:"items"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
}
type Reputation struct {
	Ratings     []Assessment `json:"ratings"`
	Blacklist   []Assessment `json:"blacklist"`
	Average     float64      `json:"average"`
	RatingCount int64        `json:"rating_count"`
}
type RevokeAssessment struct {
	ID     uuid.UUID `json:"id"`
	Reason string    `json:"reason"`
}
type AssessmentRepository interface {
	SaveGuestAssessment(context.Context, AssessmentInput, uuid.UUID, string) (Assessment, error)
	GuestReputation(context.Context, AssessmentQuery) (Reputation, error)
	SharedBlacklist(context.Context, AssessmentQuery) (AssessmentPage, error)
	RevokeGuestAssessment(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, bool, bool, string, string) error
}

// Nationality namespaces passport numbers; neither names nor phone numbers are identity matches.
func IdentityKey(nationalID, nationality string) string {
	id := strings.Map(func(r rune) rune {
		if unicode.IsSpace(r) {
			return -1
		}
		return unicode.ToUpper(r)
	}, strings.TrimSpace(nationalID))
	country := strings.ToUpper(strings.TrimSpace(nationality))
	if len(id) < 4 || len(country) != 2 {
		return ""
	}
	sum := sha256.Sum256([]byte(country + ":" + id))
	return hex.EncodeToString(sum[:])
}
func IdentityHint(nationalID, nationality string) string {
	id := []rune(strings.TrimSpace(nationalID))
	if len(id) < 4 {
		return "Kimlik bilgisi eksik"
	}
	return strings.ToUpper(nationality) + " · ••••" + string(id[len(id)-4:])
}
func PageSize(n int) int {
	if n == 25 || n == 50 || n == 100 {
		return n
	}
	return 100
}
