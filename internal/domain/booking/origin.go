package booking

import (
	"otel/constants"
	"regexp"
	"strings"
	"unicode"
)

// Sources are extensible provider slugs, not evidence of a live connection.
const ManualSource = "manual"

var sourcePattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,63}$`)

func (b Booking) ValidateOrigin() error {
	if b.Source != "" && !sourcePattern.MatchString(b.Source) {
		return constants.ErrPayload
	}
	for _, id := range []string{b.ExternalPropertyID, b.ExternalReservationID} {
		if len(id) > 255 || strings.TrimSpace(id) != id || strings.IndexFunc(id, unicode.IsControl) >= 0 {
			return constants.ErrPayload
		}
	}
	if (b.ExternalPropertyID == "") != (b.ExternalReservationID == "") {
		return constants.ErrPayload
	}
	if b.ExternalReservationID != "" && (b.Source == "" || b.Source == ManualSource) {
		return constants.ErrPayload
	}
	return nil
}

// ResolveOrigin preserves fields omitted by older clients and prevents an
// existing channel identity from being reassigned through a reservation edit.
func (b *Booking) ResolveOrigin(old *Booking) error {
	if old != nil {
		if b.Source == "" && b.ExternalPropertyID == "" && b.ExternalReservationID == "" {
			b.Source, b.ExternalPropertyID, b.ExternalReservationID = old.Source, old.ExternalPropertyID, old.ExternalReservationID
		}
		if old.ExternalReservationID != "" && (b.Source != old.Source || b.ExternalPropertyID != old.ExternalPropertyID || b.ExternalReservationID != old.ExternalReservationID) {
			return constants.ErrExternalBookingIdentity
		}
	}
	if b.Source == "" {
		b.Source = ManualSource
	}
	return b.ValidateOrigin()
}
