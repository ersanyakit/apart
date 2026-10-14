package reporting

import (
	"github.com/google/uuid"
	"testing"
)

func TestFolioServiceRequiresValidAmounts(t *testing.T) {
	good := FolioServiceInput{ID: uuid.New(), BranchID: uuid.New(), BookingID: uuid.New(), Label: "Çamaşırhane", Category: "laundry", Quantity: 2, UnitPriceMinor: 15000, Currency: "TRY"}
	if e := good.Validate(); e != nil {
		t.Fatal(e)
	}
	for _, mutate := range []func(*FolioServiceInput){func(x *FolioServiceInput) { x.Quantity = 0 }, func(x *FolioServiceInput) { x.UnitPriceMinor = -1 }, func(x *FolioServiceInput) { x.Quantity = 10001 }, func(x *FolioServiceInput) { x.UnitPriceMinor = 1000000001 }, func(x *FolioServiceInput) { x.Currency = "bad" }, func(x *FolioServiceInput) { x.Label = " " }, func(x *FolioServiceInput) { x.Category = "unknown" }} {
		bad := good
		mutate(&bad)
		if bad.Validate() == nil {
			t.Fatalf("invalid accepted %+v", bad)
		}
	}
}
