package reporting

import (
	"github.com/google/uuid"
	"testing"
)

func TestExpenseReportsSeparateSalaryRentAndCashWithoutDoubleCounting(t *testing.T) {
	f, d := fixture()
	at := instant("2026-10-11T12:00:00+03:00")
	p1, p2 := uuid.New(), uuid.New()
	d.Records = []Record{
		{Kind: "expense", Category: "payroll", ResponsibleID: &p1, ResponsibleName: "Aynı Ad", AmountMinor: 2500},
		{Kind: "expense", Category: "payroll", ResponsibleID: &p2, ResponsibleName: "Aynı Ad", AmountMinor: 3000},
		{Kind: "expense", Category: "payroll", AmountMinor: 100},
		{Kind: "expense", Category: "rent", Party: "Mal sahibi", AmountMinor: 10000},
		{Kind: "expense", Category: "utilities", AmountMinor: 400},
		{Kind: "payment", Category: "rent", AmountMinor: 10000, Status: "completed"},
		{Kind: "expense", Category: "payroll", AmountMinor: 500, VoidedAt: &at},
	}
	for i := range d.Records {
		d.Records[i].ID = uuid.New()
		d.Records[i].OccurredAt = at
		d.Records[i].Currency = "TRY"
	}
	d.Records = append(d.Records, Record{ID: uuid.New(), Kind: "expense", Category: "payroll", AmountMinor: 50000, Currency: "USD", OccurredAt: at}, Record{ID: uuid.New(), Kind: "expense", Category: "rent", AmountMinor: 30000, Currency: "TRY", OccurredAt: at.AddDate(0, 0, 10)})
	for _, key := range []string{"finance.income_expense", "finance.expenses", "finance.payroll", "finance.rent_expenses"} {
		f.Key = key
		r := generate(f, d)
		expected := float64(16000)
		if key == "finance.payroll" {
			expected = 5600
			if len(tbl(r, "expense_parties").Rows) != 3 || mvalue(r, "unassigned") != 100 {
				t.Fatal("staff names merged or legacy records hidden")
			}
		}
		if key == "finance.rent_expenses" {
			expected = 10000
		}
		if mvalue(r, "expenses") != expected {
			t.Fatalf("%s: expenses %v want %v", key, mvalue(r, "expenses"), expected)
		}
		if key == "finance.income_expense" && (mvalue(r, "result") != 4000 || mvalue(r, "payroll") != 5600 || mvalue(r, "rent") != 10000) {
			t.Fatal("costs not reflected in income/expense")
		}
		var categories float64
		for _, row := range tbl(r, "expense_categories").Rows {
			categories += num(row["amount"])
		}
		if categories != expected {
			t.Fatalf("category sum %s: %v", key, categories)
		}
	}
	f.Key = "finance.expenses"
	f.RoomIDs = []uuid.UUID{uuid.New()}
	if mvalue(generate(f, d), "expenses") != 0 {
		t.Fatal("unallocated costs leaked into room-scoped report")
	}
}

func TestUtilityExpenseReportUsesExistingCostsAndKeepsUnspecifiedBills(t *testing.T) {
	f, d := fixture()
	f.Key = "finance.utility_expenses"
	if _, ok := Lookup(f.Key); !ok {
		t.Fatal("bill report not registered")
	}
	at := instant("2026-10-11T12:00:00+03:00")
	for i, category := range []string{"electricity", "water", "internet", "natural_gas", "utilities"} {
		d.Records = append(d.Records, Record{ID: uuid.New(), Kind: "expense", Category: category, AmountMinor: int64((i + 1) * 100), Currency: "TRY", OccurredAt: at, Party: "Tedarikçi", Reference: "FAT-001", Notes: "Mevcut gider", Label: "Ekim faturası"})
	}
	d.Records = append(d.Records,
		Record{ID: uuid.New(), Kind: "payment", Category: "electricity", AmountMinor: 9000, Currency: "TRY", OccurredAt: at, Status: "completed"},
		Record{ID: uuid.New(), Kind: "expense", Category: "rent", AmountMinor: 9000, Currency: "TRY", OccurredAt: at},
		Record{ID: uuid.New(), Kind: "expense", Category: "water", AmountMinor: 9000, Currency: "USD", OccurredAt: at},
		Record{ID: uuid.New(), Kind: "expense", Category: "water", AmountMinor: 9000, Currency: "TRY", OccurredAt: at, VoidedAt: &at},
		Record{ID: uuid.New(), Kind: "expense", Category: "water", AmountMinor: 9000, Currency: "TRY", OccurredAt: at.AddDate(0, 1, 0)})
	r := generate(f, d)
	if mvalue(r, "expenses") != 1500 || mvalue(r, "expense_count") != 5 || mvalue(r, "unspecified") != 500 {
		t.Fatalf("bill metrics %+v", r.Metrics)
	}
	categories := tbl(r, "expense_categories").Rows
	if len(categories) != 5 {
		t.Fatalf("categories %+v", categories)
	}
	for _, row := range categories {
		if row["category"] == "Fatura (türü belirtilmemiş)" && num(row["amount"]) != 500 {
			t.Fatal("legacy bill guessed or lost")
		}
	}
	periods := tbl(r, "expense_periods").Rows
	if len(periods) != 1 || num(periods[0]["electricity"]) != 100 || num(periods[0]["water"]) != 200 || num(periods[0]["internet"]) != 300 || num(periods[0]["natural_gas"]) != 400 || num(periods[0]["utilities"]) != 500 {
		t.Fatalf("period breakdown %+v", periods)
	}
	if len(tbl(r, "expense_parties").Rows) != 1 || num(tbl(r, "expense_parties").Rows[0]["amount"]) != 1500 {
		t.Fatal("supplier grouping")
	}
	details := tbl(r, "expense_records").Rows
	if len(details) != 5 || details[0]["reference"] != "FAT-001" || details[0]["notes"] != "Mevcut gider" {
		t.Fatal("bill detail missing")
	}
	f.Key = "finance.income_expense"
	if mvalue(generate(f, d), "expenses") != 10500 {
		t.Fatal("existing income/expense totals changed")
	}
	f.Key = "finance.utility_expenses"
	f.RoomIDs = []uuid.UUID{uuid.New()}
	if mvalue(generate(f, d), "expenses") != 0 {
		t.Fatal("unassigned bills in room filter")
	}
}
