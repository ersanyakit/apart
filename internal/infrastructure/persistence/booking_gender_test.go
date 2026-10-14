package persistence

import (
	"encoding/json"
	"github.com/google/uuid"
	"otel/internal/domain/booking"
	"otel/internal/domain/property"
	"otel/internal/infrastructure/persistence/models"
	"testing"
	"time"
)

func TestBookingGuestGenderJSONRoundTrip(t *testing.T) {
	for _, gender := range []string{"", "female", "male", "unspecified"} {
		b := booking.Booking{BranchID: uuid.New(), RoomID: uuid.New(), GuestName: "Misafir", GuestCount: 1, CheckIn: time.Now(), CheckOut: time.Now().Add(24 * time.Hour), Guests: []property.Guest{{ID: "guest", Name: "Misafir", Gender: gender}}}
		if err := b.Validate(); err != nil {
			t.Fatal(err)
		}
		stored := toBooking(b)
		data, err := json.Marshal(stored.GuestDetails)
		if err != nil {
			t.Fatal(err)
		}
		var loaded []models.RoomGuest
		if err := json.Unmarshal(data, &loaded); err != nil {
			t.Fatal(err)
		}
		stored.GuestDetails = loaded
		if got := fromBooking(stored).Guests[0].Gender; got != gender {
			t.Fatalf("gender: got %q want %q", got, gender)
		}
		b.Guests[0].Gender = "invalid"
		if b.Validate() == nil {
			t.Fatal("invalid gender accepted")
		}
	}
}
