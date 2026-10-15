package booking

import (
	"otel/constants"
	"testing"
)

func TestOriginValidation(t *testing.T) {
	for _, tc := range []struct {
		b     Booking
		valid bool
	}{
		{Booking{}, true}, {Booking{Source: "manual"}, true}, {Booking{Source: "agoda"}, true},
		{Booking{Source: "booking_com", ExternalPropertyID: "hotel-1", ExternalReservationID: "000123"}, true},
		{Booking{Source: "new_provider"}, true}, {Booking{Source: "Booking.com"}, false},
		{Booking{Source: "manual", ExternalPropertyID: "p", ExternalReservationID: "r"}, false},
		{Booking{Source: "agoda", ExternalReservationID: "r"}, false},
		{Booking{Source: "airbnb", ExternalPropertyID: " p", ExternalReservationID: "r"}, false},
		{Booking{Source: "expedia", ExternalPropertyID: "p", ExternalReservationID: "r\n"}, false},
	} {
		if err := tc.b.ValidateOrigin(); (err == nil) != tc.valid {
			t.Fatalf("%+v: %v", tc.b, err)
		}
	}
}
func TestOriginCompatibilityAndIdentity(t *testing.T) {
	var fresh Booking
	if err := fresh.ResolveOrigin(nil); err != nil || fresh.Source != "manual" {
		t.Fatal(fresh, err)
	}
	old := Booking{Source: "booking_com", ExternalPropertyID: "hotel-1", ExternalReservationID: "000123"}
	var legacy Booking
	if err := legacy.ResolveOrigin(&old); err != nil || legacy.ExternalReservationID != old.ExternalReservationID {
		t.Fatal(legacy, err)
	}
	changed := old
	changed.ExternalReservationID = "different"
	if err := changed.ResolveOrigin(&old); err != constants.ErrExternalBookingIdentity {
		t.Fatal(err)
	}
}
