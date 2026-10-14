package reporting

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"github.com/google/uuid"
	"otel/internal/domain/booking"
	"sort"
	"time"
)

type FolioLine struct {
	ID          string    `json:"id"`
	Label       string    `json:"label"`
	Kind        string    `json:"kind"`
	Currency    string    `json:"currency"`
	AmountMinor int64     `json:"amount_minor"`
	At          time.Time `json:"at"`
	Actor       string    `json:"actor"`
	Channel     string    `json:"channel"`
	Status      string    `json:"status"`
	Notes       string    `json:"notes"`
}
type FolioTotal struct {
	Currency        string `json:"currency"`
	Charges         int64  `json:"charges"`
	Paid            int64  `json:"paid"`
	Refunds         int64  `json:"refunds"`
	Balance         int64  `json:"balance"`
	SecurityDeposit int64  `json:"security_deposit"`
	PendingRefunds  int64  `json:"pending_refunds"`
}
type Folio struct {
	Booking              booking.Booking `json:"booking"`
	Room                 string          `json:"room"`
	Token                string          `json:"token"`
	Lines                []FolioLine     `json:"lines"`
	Totals               []FolioTotal    `json:"totals"`
	Notes                []string        `json:"notes"`
	NeedsAcknowledgement bool            `json:"needs_acknowledgement"`
}
type FolioRepository interface {
	BookingFolio(context.Context, uuid.UUID, uuid.UUID) (Folio, error)
}

func BuildFolio(b booking.Booking, room string, records []Record) Folio {
	out := Folio{Booking: b, Room: room, Lines: []FolioLine{}, Totals: []FolioTotal{}, Notes: []string{"Konaklama bedeli rezervasyondaki anlaşılmış tarih ve gecelik fiyata göre hesaplanır. Erken çıkış fiyatı kendiliğinden değiştirmez.", "Güvence depozitosu oda borcundan ayrı tutulur. Çıkışı tamamlamak ödeme veya iade kaydı oluşturmaz."}}
	sort.Slice(records, func(i, j int) bool { return records[i].ID.String() < records[j].ID.String() })
	raw, _ := json.Marshal(struct {
		Booking booking.Booking
		Records []Record
	}{b, records})
	sum := sha256.Sum256(raw)
	out.Token = hex.EncodeToString(sum[:])
	currency := "TRY"
	hasCurrency := false
	for _, r := range records {
		if r.VoidedAt == nil && r.Kind == "booking_details" {
			currency = r.Currency
			hasCurrency = true
		}
	}
	if !hasCurrency {
		out.Notes = append(out.Notes, "Eski rezervasyonda para birimi tutulmadığı için konaklama ve kapora TRY kabul edilir.")
	}
	totals := map[string]*FolioTotal{}
	total := func(c string) *FolioTotal {
		if totals[c] == nil {
			totals[c] = &FolioTotal{Currency: c}
		}
		return totals[c]
	}
	start, end := b.CheckIn.In(Zone), b.CheckOut.In(Zone)
	a := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.UTC)
	z := time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, time.UTC)
	nights := int64(z.Sub(a).Hours() / 24)
	if nights < 1 {
		nights = 1
	}
	lodging := nights * b.DailyPriceMinor
	total(currency).Charges = lodging
	out.Lines = append(out.Lines, FolioLine{ID: "lodging", Label: "Anlaşılmış konaklama bedeli", Kind: "charge", Currency: currency, AmountMinor: lodging, At: b.CheckIn, Actor: b.CreatedByName, Status: "completed"})
	if b.DepositMinor > 0 {
		total(currency).Paid += b.DepositMinor
		out.Lines = append(out.Lines, FolioLine{ID: "legacy-deposit", Label: "Rezervasyon kaporası", Kind: "receipt", Currency: currency, AmountMinor: b.DepositMinor, At: b.CreatedAt, Channel: b.DepositChannel, Status: "completed", Notes: "Rezervasyon kartındaki kapora; ayrıca tahsilat olarak tekrar kaydetmeyin."})
	}
	for _, r := range records {
		if r.VoidedAt != nil {
			continue
		}
		t := total(r.Currency)
		include := true
		switch r.Kind {
		case "income":
			t.Charges += r.AmountMinor
		case "receipt":
			t.Paid += r.AmountMinor
		case "refund":
			if r.Status == "completed" {
				t.Refunds += r.AmountMinor
			} else {
				t.PendingRefunds += r.AmountMinor
			}
		case "deposit_in":
			t.SecurityDeposit += r.AmountMinor
		case "deposit_out":
			t.SecurityDeposit -= r.AmountMinor
		default:
			include = false
		}
		if include {
			out.Lines = append(out.Lines, FolioLine{ID: r.ID.String(), Label: r.Label, Kind: r.Kind, Currency: r.Currency, AmountMinor: r.AmountMinor, At: r.OccurredAt, Actor: r.ActorName, Channel: r.Channel, Status: r.Status, Notes: r.Notes})
		}
	}
	for _, t := range totals {
		t.Balance = t.Charges - t.Paid + t.Refunds
		if t.Balance != 0 || t.SecurityDeposit != 0 || t.PendingRefunds != 0 {
			out.NeedsAcknowledgement = true
		}
		out.Totals = append(out.Totals, *t)
	}
	sort.Slice(out.Totals, func(i, j int) bool { return out.Totals[i].Currency < out.Totals[j].Currency })
	sort.SliceStable(out.Lines, func(i, j int) bool { return out.Lines[i].At.Before(out.Lines[j].At) })
	return out
}
