package reporting

import (
	"github.com/google/uuid"
	"testing"
)

func TestFolioSeparatesChargesCashAndSecurityAndProtectsReviewedVersion(t *testing.T) {
	_, d := fixture()
	b := d.Bookings[0]
	id := b.BookingID
	at := b.CheckIn
	records := []Record{{ID: uuid.New(), BookingID: &id, Kind: "income", AmountMinor: 400, Currency: "TRY", OccurredAt: at}, {ID: uuid.New(), BookingID: &id, Kind: "receipt", Status: "completed", AmountMinor: 2000, Currency: "TRY", OccurredAt: at}, {ID: uuid.New(), BookingID: &id, Kind: "refund", Status: "completed", AmountMinor: 500, Currency: "TRY", OccurredAt: at}, {ID: uuid.New(), BookingID: &id, Kind: "refund", Status: "pending", AmountMinor: 700, Currency: "TRY", OccurredAt: at}, {ID: uuid.New(), BookingID: &id, Kind: "deposit_in", Status: "completed", AmountMinor: 10000, Currency: "TRY", OccurredAt: at}, {ID: uuid.New(), BookingID: &id, Kind: "deposit_in", Status: "completed", AmountMinor: 2500, Currency: "USD", OccurredAt: at}}
	f := BuildFolio(b, "101", records)
	if len(f.Totals) != 2 {
		t.Fatal(f.Totals)
	}
	t0 := f.Totals[0]
	if t0.Currency != "TRY" || t0.Charges != 20400 || t0.Paid != 5000 || t0.Refunds != 500 || t0.Balance != 15900 || t0.SecurityDeposit != 10000 || t0.PendingRefunds != 700 {
		t.Fatalf("incorrect folio %+v", t0)
	}
	if !f.NeedsAcknowledgement || f.Totals[1].SecurityDeposit != 2500 {
		t.Fatal("currency/security mixed")
	}
	again := BuildFolio(b, "101", records)
	if f.Token != again.Token {
		t.Fatal("unstable review token")
	}
	records[0].VoidedAt = &at
	changed := BuildFolio(b, "101", records)
	if f.Token == changed.Token {
		t.Fatal("void didn't invalidate review")
	}
}
