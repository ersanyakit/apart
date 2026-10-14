package reporting

import (
	"context"
	"encoding/json"
	"github.com/google/uuid"
	"math"
	"otel/internal/domain/booking"
	"otel/internal/domain/property"
	"testing"
	"time"
)

func instant(s string) time.Time {
	v, e := time.Parse(time.RFC3339, s)
	if e != nil {
		panic(e)
	}
	return v
}
func fixture() (Filter, Dataset) {
	room, branch := uuid.New(), uuid.New()
	b := booking.Booking{BookingID: uuid.New(), RoomID: room, BranchID: branch, GuestName: "Misafir", GuestCount: 1, DailyPriceMinor: 10000, DepositMinor: 3000, Status: booking.Completed, CheckIn: instant("2026-10-10T14:00:00+03:00"), CheckOut: instant("2026-10-12T11:00:00+03:00"), CreatedAt: instant("2026-10-01T10:00:00+03:00")}
	return Filter{HotelID: uuid.New(), StartDate: "2026-10-10", EndDate: "2026-10-12", Currency: "TRY", Unit: "room", GroupBy: "day", Key: "finance.daily_revenue"}, Dataset{Rooms: []property.Room{{RoomID: room, BranchID: branch, Kind: "room", Code: "101", Rentable: true, Status: "Temiz"}}, Bookings: []booking.Booking{b}, Now: instant("2026-10-14T12:00:00+03:00")}
}
func mvalue(r Result, key string) float64 {
	for _, m := range r.Metrics {
		if m.Key == key {
			return m.Value
		}
	}
	return math.NaN()
}
func tbl(r Result, key string) Table {
	for _, t := range r.Tables {
		if t.Key == key {
			return t
		}
	}
	return Table{}
}
func TestRevenueCollectionsAndBalancesAreIndependent(t *testing.T) {
	f, d := fixture()
	id := d.Bookings[0].BookingID
	at := instant("2026-10-11T10:00:00+03:00")
	d.Records = []Record{{Kind: "receipt", BookingID: &id, AmountMinor: 2000, Currency: "TRY", Status: "completed", OccurredAt: at}, {Kind: "receipt", AmountMinor: 9000, Currency: "TRY", Status: "pending", OccurredAt: at}, {Kind: "refund", BookingID: &id, AmountMinor: 500, Currency: "TRY", Status: "completed", OccurredAt: at}, {Kind: "expense", AmountMinor: 1000, Currency: "TRY", OccurredAt: at}, {Kind: "income", AmountMinor: 400, Currency: "TRY", BookingID: &id, OccurredAt: at}}
	r := generate(f, d)
	if mvalue(r, "revenue") != 20000 || mvalue(r, "receipts") != 2000 || mvalue(r, "result") != 19400 {
		t.Fatalf("incorrect finance %+v", r.Metrics)
	}
	f.Key = "finance.receivables"
	r = generate(f, d)
	rows := tbl(r, "balances").Rows
	if len(rows) != 1 || num(rows[0]["balance"]) != 15900 {
		t.Fatalf("deposit / cash double counted: %+v", rows)
	}
}
func TestMovesAndEarlyCheckoutDoNotDuplicateNights(t *testing.T) {
	f, d := fixture()
	other := uuid.New()
	d.Rooms = append(d.Rooms, property.Room{RoomID: other, Kind: "room", Code: "102", Rentable: true})
	b := &d.Bookings[0]
	b.CheckOut = instant("2026-10-15T11:00:00+03:00")
	early := instant("2026-10-12T09:00:00+03:00")
	b.ActualCheckOut = &early
	b.Allocations = []booking.Allocation{{RoomID: other, Start: instant("2026-10-11T13:00:00+03:00"), End: b.CheckOut}, {RoomID: b.RoomID, Start: b.CheckIn, End: instant("2026-10-11T13:00:00+03:00")}}
	f.Key = "occupancy.performance"
	r := generate(f, d)
	if mvalue(r, "revenue") != 20000 {
		t.Fatalf("wrong revenue %+v", r.Metrics)
	}
	rows := tbl(r, "units").Rows
	if len(rows) != 2 {
		t.Fatal(rows)
	}
	for _, row := range rows {
		if num(row["sold"]) != 1 {
			t.Fatalf("move duplicated night: %+v", rows)
		}
	}
}
func TestFutureNightsExcludedFromADR(t *testing.T) {
	f, d := fixture()
	b := d.Bookings[0]
	b.BookingID = uuid.New()
	b.Status = booking.Confirmed
	b.CheckIn = instant("2026-10-15T14:00:00+03:00")
	b.CheckOut = instant("2026-10-17T11:00:00+03:00")
	d.Bookings = append(d.Bookings, b)
	f.EndDate = "2026-10-17"
	f.Key = "pricing.metrics"
	r := generate(f, d)
	if mvalue(r, "adr") != 10000 || mvalue(r, "sold") != 2 {
		t.Fatalf("forecast diluted ADR: %+v", r.Metrics)
	}
	if mvalue(r, "revpar") != 4000 {
		t.Fatalf("future denominator: %+v", r.Metrics)
	}
}
func TestWholeRoomBlocksBedsAcrossCurrenciesWithoutDoubleCounting(t *testing.T) {
	f, d := fixture()
	f.Unit = "bed"
	f.Key = "occupancy.daily"
	f.Currency = "USD"
	parent := d.Rooms[0].RoomID
	for i := 0; i < 8; i++ {
		d.Rooms = append(d.Rooms, property.Room{RoomID: uuid.New(), ParentID: &parent, Kind: "bed", Rentable: true, Status: "Temiz"})
	}
	r := generate(f, d)
	rows := tbl(r, "capacity").Rows
	if num(rows[0]["occupied"]) != 8 || num(rows[0]["rate"]) != 100 || num(rows[2]["occupied"]) != 0 {
		t.Fatalf("capacity wrong: %+v", rows)
	}
}
func TestNoShowAndExpiredConfirmationNotOccupancy(t *testing.T) {
	f, d := fixture()
	d.Bookings[0].Status = booking.Confirmed
	f.Key = "occupancy.history"
	r := generate(f, d)
	if mvalue(r, "occupancy") != 0 {
		t.Fatal(r.Metrics)
	}
	d.Bookings[0].Status = booking.Completed
	id := d.Bookings[0].BookingID
	d.Records = []Record{{Kind: "booking_details", BookingID: &id, Status: "no_show", Currency: "TRY"}}
	r = generate(f, d)
	if mvalue(r, "occupancy") != 0 {
		t.Fatal(r.Metrics)
	}
}
func TestWeekGroupingAndTimezoneBoundaries(t *testing.T) {
	f, d := fixture()
	f.Key = "occupancy.history"
	f.GroupBy = "week"
	r := generate(f, d)
	rows := tbl(r, "capacity").Rows
	if len(rows) != 2 {
		t.Fatal(rows)
	}
	if Days(instant("2026-10-10T22:00:00Z"), instant("2026-10-11T22:00:00Z")) != 1 {
		t.Fatal("Istanbul dates")
	}
}
func TestShiftAndOpenAccountReferencesStayScoped(t *testing.T) {
	f, d := fixture()
	a, z, _ := f.Range()
	br1, br2 := uuid.New(), uuid.New()
	records := []Record{{BranchID: br1, Kind: "cash_open", Reference: "A", Currency: "TRY", Status: "completed", OccurredAt: a, AmountMinor: 10000}, {BranchID: br1, Kind: "receipt", Reference: "A", Currency: "TRY", Status: "completed", OccurredAt: a, Channel: "cash", AmountMinor: 2000}, {BranchID: br2, Kind: "receipt", Reference: "A", Currency: "TRY", Status: "completed", OccurredAt: a, Channel: "cash", AmountMinor: 8000}, {BranchID: br1, Kind: "cash_close", Reference: "A", Currency: "TRY", Status: "completed", OccurredAt: a, AmountMinor: 11900}}
	r := shiftTable(records, a, z)
	if num(r.Rows[0]["expected"]) != 12000 || num(r.Rows[0]["difference"]) != -100 {
		t.Fatal(r.Rows)
	}
	_ = d
	records = append(records, Record{BranchID: br1, Kind: "receivable", Reference: "A", Status: "open", OccurredAt: a, AmountMinor: 4000})
	accounts := openAccounts(records, z)
	if len(accounts.Rows) != 1 || num(accounts.Rows[0]["amount"]) != 2000 {
		t.Fatal(accounts.Rows)
	}
}
func TestEveryReportIsRegisteredAndSerializable(t *testing.T) {
	f, d := fixture()
	for _, def := range Definitions() {
		t.Run(def.Key, func(t *testing.T) {
			f.Key = def.Key
			r, ok := Lookup(def.Key)
			if !ok {
				t.Fatal("missing")
			}
			result, e := r.Generate(context.Background(), f, d)
			if e != nil {
				t.Fatal(e)
			}
			if len(result.Tables) == 0 {
				t.Fatal("report has no dataset")
			}
			if _, e = json.Marshal(result); e != nil {
				t.Fatal(e)
			}
		})
	}
}
func TestFilterBounds(t *testing.T) {
	f, _ := fixture()
	if f.Validate() != nil {
		t.Fatal("valid rejected")
	}
	f.EndDate = "2028-01-01"
	if f.Validate() == nil {
		t.Fatal("unbounded range accepted")
	}
	f.EndDate = "2026-01-01"
	if f.Validate() == nil {
		t.Fatal("reversed range accepted")
	}
}
