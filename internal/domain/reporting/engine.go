package reporting

import (
	"fmt"
	"github.com/google/uuid"
	"math"
	"otel/internal/domain/booking"
	"otel/internal/domain/property"
	"slices"
	"sort"
	"strings"
	"time"
)

func columns(pairs ...string) []Column {
	out := []Column{}
	for i := 0; i < len(pairs); i += 3 {
		out = append(out, Column{pairs[i], pairs[i+1], pairs[i+2]})
	}
	return out
}
func table(key, title string, c []Column, rows []Row) Table {
	if rows == nil {
		rows = []Row{}
	}
	return Table{key, title, c, rows}
}
func num(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case int64:
		return float64(n)
	}
	return 0
}
func add(r Row, key string, v float64) { r[key] = num(r[key]) + v }
func ratio(a, b float64) float64 {
	if b == 0 {
		return 0
	}
	return a / b
}
func money(v int64) float64     { return float64(v) }
func in(t, a, b time.Time) bool { return !t.Before(a) && t.Before(b) }
func bucket(t time.Time, by string) string {
	d := Day(t)
	if by == "month" {
		return d.Format("2006-01")
	}
	if by == "week" {
		d = d.AddDate(0, 0, -(int(d.Weekday())+6)%7)
	}
	return d.Format("2006-01-02")
}
func mapRows(m map[string]Row, key string) []Row {
	keys := []string{}
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	out := []Row{}
	for _, k := range keys {
		m[k][key] = k
		out = append(out, m[k])
	}
	return out
}
func rowAt(m map[string]Row, k string) Row {
	if m[k] == nil {
		m[k] = Row{}
	}
	return m[k]
}
func segments(b booking.Booking) []booking.Allocation {
	if len(b.Allocations) > 0 {
		out := append([]booking.Allocation(nil), b.Allocations...)
		sort.Slice(out, func(i, j int) bool { return out[i].Start.Before(out[j].Start) })
		return out
	}
	return []booking.Allocation{{RoomID: b.RoomID, BranchID: b.BranchID, Start: b.CheckIn, End: b.CheckOut}}
}
func dates(b booking.Booking, actual bool) (time.Time, time.Time) {
	a, z := b.CheckIn, b.CheckOut
	if actual {
		if b.ActualCheckIn != nil {
			a = *b.ActualCheckIn
		}
		if b.ActualCheckOut != nil {
			z = *b.ActualCheckOut
		}
	}
	return Day(a), Day(z)
}
func total(b booking.Booking) int64 {
	return int64(max(1, Days(b.CheckIn, b.CheckOut))) * b.DailyPriceMinor
}
func guestKey(b booking.Booking) string {
	if len(b.Guests) == 0 {
		return ""
	}
	g := b.Guests[0]
	if g.TCNo != "" {
		return "national:" + g.TCNo
	}
	if g.ID != "" {
		return "id:" + g.ID
	}
	return ""
}
func generate(f Filter, d Dataset) Result {
	a, z, _ := f.Range()
	today := Day(d.Now)
	if strings.HasPrefix(f.Key, "apart.") {
		f.Unit = "apartment"
	}
	if strings.HasPrefix(f.Key, "hostel.") {
		f.Unit = "bed"
	}
	out := Result{Key: f.Key, GeneratedAt: d.Now, Currency: f.Currency, Metrics: []Metric{}, Tables: []Table{}, Notes: []string{
		"Tarihler Europe/Istanbul; bitiş günü dahildir. Tutarlar seçilen para biriminde, döviz çevrimi yapılmadan gösterilir.",
		"Rezervasyon rapor bilgisi girilmemiş eski kayıtların fiyatı TRY, kanalı Belirtilmemiş kabul edilir. Eski kaporalar yalnızca rezervasyon bakiyesinden düşülür; ödeme tarihi bilinmediğinden günlük tahsilata eklenmez.",
	}}
	metric := func(k, l string, v float64, format string) {
		out.Metrics = append(out.Metrics, Metric{Key: k, Label: l, Value: v, Format: format})
	}
	rooms := map[uuid.UUID]property.Room{}
	for _, r := range d.Rooms {
		rooms[r.RoomID] = r
	}
	metadata := map[uuid.UUID]Record{}
	for _, r := range d.Records {
		if r.Kind == "booking_details" && r.BookingID != nil {
			metadata[*r.BookingID] = r
		}
	}
	meta := func(b booking.Booking) (string, string) {
		m, ok := metadata[b.BookingID]
		if !ok {
			return "Belirtilmemiş", "TRY"
		}
		ch := m.Channel
		if ch == "" {
			ch = "Belirtilmemiş"
		}
		return ch, m.Currency
	}
	unitScoped := slices.Contains([]string{"occupancy.performance", "finance.profitability", "pricing.metrics", "pricing.performance"}, f.Key)
	roomMatches := func(id uuid.UUID) bool {
		r, ok := rooms[id]
		return ok && (!unitScoped || r.Kind == f.Unit) && (len(f.RoomIDs) == 0 || slices.Contains(f.RoomIDs, id)) && (len(f.RoomTypes) == 0 || slices.Contains(f.RoomTypes, r.Type))
	}
	bookingMatches := func(b booking.Booking) bool {
		ch, cur := meta(b)
		if (strings.HasPrefix(f.Key, "apart.") && rooms[b.RoomID].Kind != "apartment") || (strings.HasPrefix(f.Key, "hostel.") && rooms[b.RoomID].Kind != "bed") {
			return false
		}
		if cur != f.Currency || (len(f.Channels) > 0 && !slices.Contains(f.Channels, ch)) {
			return false
		}
		for _, s := range segments(b) {
			if roomMatches(s.RoomID) {
				return true
			}
		}
		return false
	}
	selected := []booking.Booking{}
	for _, b := range d.Bookings {
		if bookingMatches(b) {
			selected = append(selected, b)
		}
	}
	records := []Record{}
	for _, r := range d.Records {
		if strings.HasPrefix(f.Key, "apart.") && r.RoomID != nil && rooms[*r.RoomID].Kind != "apartment" {
			continue
		}
		isMoney := true
		for _, k := range Kinds {
			if k.Key == r.Kind {
				isMoney = k.Money
			}
		}
		if isMoney && r.Currency != f.Currency {
			continue
		}
		if (len(f.RoomIDs) > 0 || len(f.RoomTypes) > 0) && (r.RoomID == nil || !roomMatches(*r.RoomID)) {
			continue
		}
		if unitScoped && r.RoomID != nil && !roomMatches(*r.RoomID) {
			continue
		}
		if len(f.Channels) > 0 && !slices.Contains(f.Channels, r.Channel) {
			continue
		}
		records = append(records, r)
	}
	finance := map[string]Row{}
	units := map[string]Row{}
	daily := map[string]Row{}
	branches := map[string]Row{}
	branchName := map[uuid.UUID]string{}
	for _, b := range d.Branches {
		branchName[b.BranchID] = b.Name
	}
	for _, r := range d.Rooms {
		if d.ArchivedRooms[r.RoomID] || !roomMatches(r.RoomID) {
			continue
		}
		units[r.RoomID.String()] = Row{"unit": r.Code, "branch": branchName[r.BranchID], "type": r.Type, "kind": r.Kind, "sold": 0, "revenue": 0, "expenses": 0, "extra": 0, "forecast": 0}
	}
	var revenue, forecast, extra, expenses, received, refunded float64
	// Night ownership uses the allocation in force at the end of that service day.
	// A same-day move never creates two sold nights or doubles lodging revenue.
	for _, b := range selected {
		if b.Status == booking.Cancelled || metadata[b.BookingID].Status == "no_show" {
			continue
		}
		start, end := dates(b, b.Status != booking.Confirmed)
		if b.Status == booking.CheckedIn && !end.After(today) {
			end = today.AddDate(0, 0, 1)
		}
		for day := maxTime(start, a); day.Before(minTime(end, z)); day = day.AddDate(0, 0, 1) {
			id := b.RoomID
			for _, s := range segments(b) {
				if s.Start.Before(day.AddDate(0, 0, 1)) && s.End.After(day) {
					id = s.RoomID
				}
			}
			if !roomMatches(id) {
				continue
			}
			room := rooms[id]
			key := id.String()
			u := rowAt(units, key)
			u["unit"] = room.Code
			u["type"] = room.Type
			u["kind"] = room.Kind
			u["branch"] = branchName[room.BranchID]
			future := !day.Before(today) && b.Status == booking.Confirmed || day.After(today)
			if b.Status == booking.Confirmed && day.Before(today) {
				continue
			}
			amount := money(b.DailyPriceMinor)
			if future {
				forecast += amount
				add(rowAt(finance, bucket(day, f.GroupBy)), "forecast", amount)
				add(u, "forecast", amount)
			} else if b.Status == booking.CheckedIn || b.Status == booking.Completed {
				revenue += amount
				add(rowAt(finance, bucket(day, f.GroupBy)), "lodging", amount)
				add(u, "revenue", amount)
				add(rowAt(branches, branchName[b.BranchID]), "revenue", amount)
			}
			add(u, "sold", 1)
			if room.Kind == f.Unit {
				row := rowAt(daily, day.Format("2006-01-02"))
				if !future {
					add(row, "sold", 1)
				}
				if !future && (b.Status == booking.CheckedIn || b.Status == booking.Completed) {
					add(row, "revenue", amount)
				}
			}
		}
	}
	for _, r := range records {
		if !in(r.OccurredAt, a, z) || (slices.Contains([]string{"receipt", "payment", "refund"}, r.Kind) && r.Status != "completed") {
			continue
		}
		row := rowAt(finance, bucket(r.OccurredAt, f.GroupBy))
		v := money(r.AmountMinor)
		switch r.Kind {
		case "income":
			extra += v
			add(row, "extra", v)
		case "expense":
			expenses += v
			add(row, "expenses", v)
		case "receipt":
			received += v
			add(row, "receipts", v)
		case "refund":
			if r.Status == "completed" {
				refunded += v
				add(row, "refunds", v)
			}
		}
		if r.Kind == "expense" || r.Kind == "income" {
			k := "unassigned"
			if r.RoomID != nil {
				k = r.RoomID.String()
			}
			u := rowAt(units, k)
			if k == "unassigned" {
				u["unit"] = "Birim atanmamış gelir / gider"
			} else {
				rr := rooms[*r.RoomID]
				u["unit"] = rr.Code
				u["kind"] = rr.Kind
			}
			if r.Kind == "expense" {
				add(u, "expenses", v)
			} else {
				add(u, "extra", v)
			}
		}
	}
	// Capacity is an explicit current-inventory baseline, never an invented history.
	physical, sellable := 0.0, 0.0
	for _, r := range d.Rooms {
		if d.ArchivedRooms[r.RoomID] || r.Kind != f.Unit || !roomMatches(r.RoomID) {
			continue
		}
		physical++
		available := r.Rentable && !r.Inactive && r.Status != "Arizali" && r.Status != "Tadilat"
		parent := r.ParentID
		seen := map[uuid.UUID]bool{}
		for parent != nil && !seen[*parent] {
			seen[*parent] = true
			p, ok := rooms[*parent]
			if !ok {
				break
			}
			if p.Inactive || p.Status == "Arizali" || p.Status == "Tadilat" {
				available = false
			}
			parent = p.ParentID
		}
		if available {
			sellable++
		}
	}
	occupied := occupiedNights(f, d, a, z, metadata, roomMatches)
	var sold, unitRevenue, occupiedCount float64
	for day := a; day.Before(z); day = day.AddDate(0, 0, 1) {
		key := day.Format("2006-01-02")
		row := rowAt(daily, key)
		occ := float64(len(occupied[key]))
		row["occupied"] = occ
		row["physical"] = physical
		row["sellable"] = sellable
		row["closed"] = physical - sellable
		row["free"] = math.Max(0, sellable-occ)
		row["physical_rate"] = ratio(occ, physical) * 100
		row["rate"] = ratio(occ, sellable) * 100
		sold += num(row["sold"])
		unitRevenue += num(row["revenue"])
		occupiedCount += occ
	}
	nights := float64(Days(a, z))
	metric("revenue", "Konaklama geliri", revenue, "money")
	metric("receipts", "Kaydedilen tahsilat", received, "money")
	metric("expenses", "Faaliyet gideri", expenses, "money")
	metric("result", "Kayıtlı giderler sonrası sonuç", revenue+extra-expenses, "money")
	financeCols := columns("date", "Dönem", "", "lodging", "Konaklama", "money", "extra", "Ek gelir", "money", "expenses", "Gider", "money", "receipts", "Tahsilat", "money", "refunds", "İade", "money", "forecast", "Gelecek satış", "money")
	capacityCols := columns("date", "Tarih", "", "physical", "Fiziksel birim-gece", "number", "sellable", "Satılabilir birim-gece", "number", "closed", "Kapalı birim-gece", "number", "occupied", "Dolu / rezerve birim-gece", "number", "free", "Boş", "number", "physical_rate", "Fiziksel doluluk", "percent", "rate", "Satılabilir doluluk", "percent")
	unitCols := columns("unit", "Birim", "", "branch", "Tesis", "", "type", "Tür", "", "sold", "Satılan gece", "number", "revenue", "Gelir", "money", "extra", "Ek gelir", "money", "expenses", "Doğrudan gider", "money", "result", "Doğrudan gider sonrası", "money", "forecast", "Gelecek satış", "money")
	unitRows := mapRows(units, "id")
	for _, r := range unitRows {
		r["result"] = num(r["revenue"]) + num(r["extra"]) - num(r["expenses"])
	}
	addUnits := func() {
		rows := []Row{}
		for _, r := range unitRows {
			if r["kind"] == f.Unit || r["id"] == "unassigned" {
				rows = append(rows, r)
			}
		}
		out.Tables = append(out.Tables, table("units", "Birim performansı", unitCols, rows))
	}
	addCapacity := func() {
		metric("occupancy", "Satılabilir kapasite doluluğu", ratio(occupiedCount, sellable*nights)*100, "percent")
		metric("physical_occupancy", "Fiziksel kapasite doluluğu", ratio(occupiedCount, physical*nights)*100, "percent")
		out.Tables = append(out.Tables, table("capacity", "Kapasite · "+f.Unit, capacityCols, groupCapacity(daily, f.GroupBy)))
		out.Notes = append(out.Notes, "Kapasite para biriminden bağımsız tüm rezervasyonları içerir. Satılan fiziksel yatak birimi, kişi kapasitesi değildir. Kapasite paydası mevcut birim tanımlarına dayanır; geçmiş bakım/kapanış geçmişi tutulmadığından tarihsel satılabilir kapasite kesin değildir. Oda ve yatak oranları birleştirilmez. Gelecek doluluk yalnızca kayıtlı rezervasyonları içerir.")
	}
	addRecords := func(kinds ...string) {
		out.Tables = append(out.Tables, recordTable(records, kinds, a, z, rooms, d.Now))
	}
	switch f.Key {
	case "management.dashboard":
		managementMetrics(&out, f, d, selected, records, metadata, rooms, a, z, received)
		metric("extras", "Ek hizmet geliri", extra, "money")
		metric("refunds", "Gerçekleşen iadeler", refunded, "money")
		metric("forecast", "Rezervasyonlu gelecek gelir", forecast, "money")
		addCapacity()
		out.Tables = append(out.Tables, table("finance", "Gelir ve nakit hareketleri", financeCols, mapRows(finance, "date")))
		out.Tables = append(out.Tables, balanceTable(selected, records, z, rooms))
		addUnits()
	case "management.properties":
		for _, b := range selected {
			if in(b.CreatedAt, a, z) {
				add(rowAt(branches, branchName[b.BranchID]), "bookings", 1)
			}
		}
		for _, r := range records {
			if in(r.OccurredAt, a, z) {
				v := rowAt(branches, branchName[r.BranchID])
				switch r.Kind {
				case "expense":
					add(v, "expenses", money(r.AmountMinor))
				case "receipt":
					add(v, "receipts", money(r.AmountMinor))
				case "income":
					add(v, "extra", money(r.AmountMinor))
				}
			}
		}
		out.Tables = append(out.Tables, table("properties", "Tesis karşılaştırması", columns("branch", "Tesis", "", "bookings", "Rezervasyon", "number", "revenue", "Konaklama", "money", "extra", "Ek gelir", "money", "expenses", "Gider", "money", "receipts", "Tahsilat", "money"), mapRows(branches, "branch")))
	case "management.records":
		addRecords()
	case "finance.daily_revenue", "finance.income_expense":
		metric("extras", "Ek hizmet geliri", extra, "money")
		metric("refunds", "Gerçekleşen iadeler", refunded, "money")
		metric("net_cash", "Net tahsilat", received-refunded, "money")
		out.Tables = append(out.Tables, table("finance", "Gelir, gider ve tahsilat", financeCols, mapRows(finance, "date")))
		addRecords("income", "expense")
	case "finance.payment_methods":
		rows := map[string]Row{}
		for _, r := range records {
			if !in(r.OccurredAt, a, z) || r.Status != "completed" {
				continue
			}
			row := rowAt(rows, r.Channel)
			switch r.Kind {
			case "receipt":
				add(row, "receipts", money(r.AmountMinor))
			case "refund":
				if r.Status == "completed" {
					add(row, "refunds", money(r.AmountMinor))
				}
			case "payment":
				add(row, "payments", money(r.AmountMinor))
			}
		}
		out.Tables = append(out.Tables, table("methods", "Ödeme yöntemleri", columns("method", "Yöntem", "", "receipts", "Tahsilat", "money", "refunds", "İade", "money", "payments", "Ödeme", "money"), mapRows(rows, "method")))
	case "finance.receivables":
		out.Tables = append(out.Tables, openAccounts(records, z))
		out.Tables = append(out.Tables, balanceTable(selected, records, z, rooms))
		addRecords("receivable", "payable")
	case "finance.refunds":
		rows := []Row{}
		lost := 0.0
		for _, b := range selected {
			cancelledAt := b.UpdatedAt
			if b.CancelledAt != nil {
				cancelledAt = *b.CancelledAt
			}
			if b.Status == booking.Cancelled && in(cancelledAt, a, z) {
				ch, _ := meta(b)
				rows = append(rows, Row{"guest": b.GuestName, "channel": ch, "amount": total(b), "reason": b.CancellationReason})
				lost += money(total(b))
			}
		}
		metric("cancelled", "İptal edilen rezervasyon", float64(len(rows)), "number")
		metric("cancelled_value", "İptal edilen sözleşme tutarı", lost, "money")
		out.Tables = append(out.Tables, table("cancellations", "İptaller", columns("guest", "Misafir", "", "channel", "Kanal", "", "amount", "Satış tutarı", "money", "reason", "Neden", ""), rows))
		addRecords("refund")
		out.Notes = append(out.Notes, "İptal dönemi kayıtlı iptal tarihidir; eski kayıtlarda son güncellenme tarihi kullanılır. Satış tutarı gerçekleşmiş gelir değildir.")
	case "finance.profitability", "apart.profitability", "apart.income", "occupancy.performance", "hostel.revenue":
		addUnits()
		out.Notes = append(out.Notes, "Giderler yalnızca açıkça atanan birime yazılır. Dağıtılmamış giderler ayrı satırdır; birim sonucu net muhasebe kârı değildir.")
	case "occupancy.daily", "occupancy.history", "occupancy.forecast", "occupancy.capacity", "apart.occupancy", "hostel.occupancy":
		out.Metrics = []Metric{}
		addCapacity()
		prevStart := a.AddDate(0, 0, -Days(a, z))
		prev := occupiedNights(f, d, prevStart, a, metadata, roomMatches)
		n := 0
		for _, ids := range prev {
			n += len(ids)
		}
		metric("previous_occupancy", "Önceki eşit dönem doluluğu", ratio(float64(n), sellable*nights)*100, "percent")
		metric("physical", "Fiziksel kapasite", physical, "number")
		metric("sellable", "Satılabilir kapasite", sellable, "number")
	case "pricing.metrics":
		out.Metrics = []Metric{}
		metric("adr", "ADR", ratio(unitRevenue, sold), "money")
		metric("revpar", "RevPAR", ratio(unitRevenue, sellable*float64(max(0, Days(a, minTime(z, today.AddDate(0, 0, 1)))))), "money")
		metric("sold", "Satılan birim-gece", sold, "number")
		metric("available", "Satılabilir birim-gece", sellable*nights, "number")
		addCapacity()
		out.Notes = append(out.Notes, "ADR yalnızca gerçekleşen birim-geceleri, RevPAR geçmiş günler ve bugünün satılabilir birim-gecelerini kullanır. İlerideki geceler bu iki orana dahil edilmez. Güncel günün geliri giriş gecesi itibarıyla tahakkuk eder.")
	case "pricing.forecast":
		metric("forecast", "Rezervasyonlu gelecek gelir", forecast, "money")
		out.Tables = append(out.Tables, table("forecast", "Kesinleşmiş satışlara göre tahmin", financeCols, mapRows(finance, "date")))
		out.Notes = append(out.Notes, "Bu bir talep modeli değildir. Yeni rezervasyonlar ve iptaller tahmini değiştirir.")
	case "pricing.competitors":
		addRecords("competitor")
	case "pricing.performance":
		out.Tables = append(out.Tables, pricePerformance(selected, metadata, rooms, a, z, roomMatches))
		out.Metrics = []Metric{}
	case "reservations.summary", "reservations.channels", "reservations.length", "hostel.types", "hostel.groups":
		groups := map[string]Row{}
		count, cancelled, ns, stayNights := 0.0, 0.0, 0.0, 0.0
		for _, b := range selected {
			if !in(b.CreatedAt, a, z) {
				continue
			}
			ch, _ := meta(b)
			m := metadata[b.BookingID]
			key := b.Status
			switch f.Key {
			case "reservations.channels":
				key = ch
			case "reservations.length":
				n := Days(b.CheckIn, b.CheckOut)
				key = "1–7 gece"
				if n > 7 {
					key = "8–27 gece"
				}
				if n >= 28 {
					key = "28+ gece"
				}
			case "hostel.types":
				key = rooms[b.RoomID].Type
			case "hostel.groups":
				key = m.Category
				if key == "" {
					continue
				}
			}
			row := rowAt(groups, key)
			add(row, "count", 1)
			count++
			if b.Status == booking.Cancelled {
				add(row, "cancelled", 1)
				cancelled++
			} else if m.Status == "no_show" {
				add(row, "no_show", 1)
				ns++
			} else {
				add(row, "sales", money(total(b)))
				add(row, "nights", float64(max(1, Days(b.CheckIn, b.CheckOut))))
				stayNights += float64(max(1, Days(b.CheckIn, b.CheckOut)))
				add(row, "commission", money(m.AmountMinor))
			}
			add(row, "guests", float64(b.GuestCount))
		}
		rows := mapRows(groups, "group")
		for _, r := range rows {
			r["net"] = num(r["sales"]) - num(r["commission"])
			r["average"] = ratio(num(r["sales"]), num(r["count"])-num(r["cancelled"])-num(r["no_show"]))
			r["cancel_rate"] = ratio(num(r["cancelled"]), num(r["count"])) * 100
			r["adr"] = ratio(num(r["sales"]), num(r["nights"]))
		}
		out.Metrics = []Metric{}
		metric("bookings", "Rezervasyon", count, "number")
		metric("cancel_rate", "İptal oranı", ratio(cancelled, count)*100, "percent")
		metric("no_show", "No-show oranı", ratio(ns, count)*100, "percent")
		metric("length", "Ortalama gece", ratio(stayNights, count-cancelled-ns), "number")
		out.Tables = append(out.Tables, table("bookings", "Oluşturulma dönemine göre satış analizi", columns("group", "Grup", "", "count", "Rezervasyon", "number", "guests", "Kişi", "number", "nights", "Gece", "number", "sales", "Sözleşme tutarı", "money", "average", "Ortalama satış", "money", "adr", "Gecelik satış", "money", "cancel_rate", "İptal oranı", "percent", "commission", "Komisyon", "money", "net", "Komisyon sonrası", "money"), rows))
	case "reservations.future", "apart.long_stays", "hostel.short_stays":
		rows := []Row{}
		for _, b := range selected {
			if b.Status == booking.Cancelled || metadata[b.BookingID].Status == "no_show" {
				continue
			}
			n := Days(b.CheckIn, b.CheckOut)
			if f.Key == "apart.long_stays" && (n < 28 || rooms[b.RoomID].Kind != "apartment") {
				continue
			}
			if f.Key == "hostel.short_stays" && (n > 7 || rooms[b.RoomID].Kind != "bed") {
				continue
			}
			if !in(b.CheckIn, a, z) && !in(b.CheckOut, a, z) && !(f.Key != "reservations.future" && b.CheckIn.Before(z) && b.CheckOut.After(a)) {
				continue
			}
			rows = append(rows, Row{"id": b.BookingID, "guest": b.GuestName, "unit": rooms[b.RoomID].Code, "start": b.CheckIn, "end": b.CheckOut, "nights": n, "count": b.GuestCount, "amount": total(b), "notes": b.Notes})
		}
		sort.Slice(rows, func(i, j int) bool { return rows[i]["start"].(time.Time).Before(rows[j]["start"].(time.Time)) })
		out.Tables = append(out.Tables, table("arrivals", "Giriş ve çıkışlar", columns("guest", "Misafir", "", "unit", "Birim", "", "start", "Giriş", "datetime", "end", "Çıkış", "datetime", "nights", "Gece", "number", "count", "Kişi", "number", "amount", "Satış tutarı", "money", "notes", "Özel istek / not", ""), rows))
		out.Tables = append(out.Tables, balanceTable(selected, records, z, rooms))
	case "reservations.conversion":
		addRecords("lead")
		g := map[string]Row{}
		won, all := 0.0, 0.0
		for _, r := range records {
			if r.Kind == "lead" && in(r.OccurredAt, a, z) {
				add(rowAt(g, r.Status), "count", 1)
				all++
				if r.Status == "confirmed" {
					won++
				}
			}
		}
		metric("conversion", "Talep dönüşümü", ratio(won, all)*100, "percent")
		out.Tables = append(out.Tables, table("funnel", "Satış aşamaları", columns("status", "Aşama", "", "count", "Adet", "number"), mapRows(g, "status")))
	case "guests.profile", "guests.repeat":
		if f.Key == "guests.profile" {
			out.Tables = append(out.Tables, guestProfile(selected, a, z))
		} else {
			out.Tables = append(out.Tables, guestTable(selected, a, z))
		}
		out.Notes = append(out.Notes, "Tekrar misafir eşleştirmesi ilk misafirin kayıt kimliği veya kimlik numarasıyla yapılır; ada göre eşleştirilmez. Kişisel kimlik numaraları rapora aktarılmaz. Kimliği olmayan rezervasyonlar tekrar oranına alınmaz.")
	case "guests.satisfaction":
		addRecords("review")
		g := map[string]Row{}
		for _, r := range records {
			if r.Kind == "review" && in(r.OccurredAt, a, z) {
				v := rowAt(g, r.Channel)
				add(v, "count", 1)
				add(v, "sum", r.Quantity)
			}
		}
		rows := mapRows(g, "platform")
		for _, r := range rows {
			r["score"] = ratio(num(r["sum"]), num(r["count"]))
		}
		out.Tables = append(out.Tables, table("ratings", "Platform puanları", columns("platform", "Platform", "", "count", "Değerlendirme", "number", "score", "Puan / 5", "number"), rows))
	case "guests.complaints":
		addRecords("complaint")
	case "staff.tasks":
		addRecords("task")
	case "staff.performance":
		g := map[string]Row{}
		for _, b := range selected {
			if in(b.CreatedAt, a, z) {
				label := b.CreatedByName
				if label == "" {
					label = b.UserID.String()
				}
				add(rowAt(g, label), "bookings", 1)
			}
		}
		for _, b := range selected {
			if b.ActualCheckOut != nil && in(*b.ActualCheckOut, a, z) {
				name := b.CheckedOutByName
				if name == "" {
					name = "Kaydeden bilgisi yok"
				}
				add(rowAt(g, name), "checkouts", 1)
			}
		}
		for _, r := range records {
			if !in(r.OccurredAt, a, z) {
				continue
			}
			name := r.ResponsibleName
			if name == "" {
				name = r.ActorName
			}
			v := rowAt(g, name)
			if r.Kind == "task" {
				add(v, "tasks", 1)
				if r.Status == "completed" {
					add(v, "completed", 1)
				}
			}
			if r.Kind == "overtime" {
				add(v, "hours", r.Quantity)
			}
		}
		out.Tables = append(out.Tables, table("staff", "Personel işlem ve görevleri", columns("staff", "Personel", "", "bookings", "Rezervasyon oluşturma", "number", "checkouts", "Çıkış işlemi", "number", "tasks", "Görev", "number", "completed", "Tamamlanan", "number", "hours", "Fazla mesai (saat)", "number"), mapRows(g, "staff")))
		out.Notes = append(out.Notes, "İşlem sayıları tek başına çalışan performans puanı değildir; iş yükü ve görev koşullarıyla değerlendirilmelidir.")
	case "staff.shifts":
		out.Tables = append(out.Tables, shiftTable(records, a, z))
	case "operations.housekeeping", "hostel.readiness":
		rows := []Row{}
		for _, r := range d.Rooms {
			if r.Inactive || !roomMatches(r.RoomID) || (f.Key == "hostel.readiness" && r.Kind != "bed") {
				continue
			}
			rows = append(rows, Row{"unit": r.Code, "kind": r.Kind, "status": r.Status})
		}
		out.Tables = append(out.Tables, table("readiness", "Güncel birim durumu", columns("unit", "Birim", "", "kind", "Tür", "", "status", "Durum", ""), rows))
		addRecords("task")
	case "operations.maintenance", "apart.maintenance":
		addRecords("maintenance")
	case "operations.inventory":
		out.Tables = append(out.Tables, inventoryTable(records, a, z))
	case "operations.damage":
		addRecords("damage")
		sum := 0.0
		for _, r := range records {
			if r.Kind == "receipt" && r.Category == "damage" && in(r.OccurredAt, a, z) {
				sum += money(r.AmountMinor)
			}
		}
		metric("damage_collected", "Hasar tahsilatı", sum, "money")
	case "apart.costs":
		addRecords("expense")
	case "apart.rent":
		addRecords("contract", "receipt", "receivable")
	case "apart.contracts":
		rows := []Record{}
		for _, r := range records {
			if r.Kind == "contract" && r.EndAt != nil && in(*r.EndAt, a, z) {
				r.OccurredAt = *r.EndAt
				rows = append(rows, r)
			}
		}
		out.Tables = append(out.Tables, recordTable(rows, []string{"contract"}, a, z, rooms, d.Now))
	case "apart.deposits":
		g := map[string]Row{}
		for _, r := range records {
			if !r.OccurredAt.Before(z) {
				continue
			}
			if r.Status != "completed" || (r.Kind != "deposit_in" && r.Kind != "deposit_out") {
				continue
			}
			key := r.Reference
			if r.BookingID != nil {
				key = r.BookingID.String()
			}
			v := rowAt(g, key)
			v["party"] = r.Party
			delta := money(r.AmountMinor)
			if r.Kind == "deposit_out" {
				delta = -delta
			}
			add(v, "balance", delta)
		}
		out.Tables = append(out.Tables, table("deposits", "Dönem sonu güvence bakiyesi", columns("reference", "Rezervasyon / referans", "", "party", "Taraf", "", "balance", "İade edilmemiş güvence", "money"), mapRows(g, "reference")))
		addRecords("deposit_in", "deposit_out")
	case "hostel.bunks":
		rows := []Row{}
		for _, r := range d.Rooms {
			if r.Kind == "bed" && roomMatches(r.RoomID) {
				rows = append(rows, Row{"unit": r.Code, "group": r.BedGroup, "level": r.BedLevel, "capacity": r.Capacity, "status": r.Status})
			}
		}
		out.Tables = append(out.Tables, table("bunks", "Fiziksel yatak yapısı", columns("unit", "Yatak", "", "group", "Ranza grubu", "", "level", "Kat", "number", "capacity", "Kişi kapasitesi", "number", "status", "Durum", ""), rows))
	case "hostel.moves":
		rows := []Row{}
		for _, b := range selected {
			ss := segments(b)
			sort.Slice(ss, func(i, j int) bool { return ss[i].Start.Before(ss[j].Start) })
			for i, s := range ss {
				if i == 0 || !in(s.Start, a, z) {
					continue
				}
				rows = append(rows, Row{"guest": b.GuestName, "from": rooms[ss[i-1].RoomID].Code, "to": rooms[s.RoomID].Code, "date": s.Start})
			}
		}
		out.Tables = append(out.Tables, table("moves", "Yerleşim değişimleri", columns("guest", "Misafir", "", "from", "Önceki birim", "", "to", "Yeni birim", "", "date", "Tarih", "datetime"), rows))
	case "hostel.common_areas":
		addRecords("common_area")
	case "hostel.extras":
		addRecords("income")
	}
	out.Notes = append(out.Notes, "Konaklama geliri giriş/çıkışa göre hizmet gecelerine dağıtılır. İade nakit çıkışıdır; geliri otomatik ters çevirmez. Faaliyet sonucu vergi ve finansman sonrası net kâr değildir.")
	summarizeReport(&out, f, records, a, z)
	summarizeTables(&out, f)
	return out
}
func maxTime(a, b time.Time) time.Time {
	if a.After(b) {
		return a
	}
	return b
}
func minTime(a, b time.Time) time.Time {
	if a.Before(b) {
		return a
	}
	return b
}
func recordTable(records []Record, kinds []string, a, z time.Time, rooms map[uuid.UUID]property.Room, now time.Time) Table {
	rows := []Row{}
	for _, r := range records {
		if !in(r.OccurredAt, a, z) || (len(kinds) > 0 && !slices.Contains(kinds, r.Kind)) {
			continue
		}
		name := r.Kind
		for _, k := range Kinds {
			if k.Key == r.Kind {
				name = k.Name
			}
		}
		unit := ""
		if r.RoomID != nil {
			unit = rooms[*r.RoomID].Code
		}
		hours := 0.0
		if r.EndAt != nil {
			hours = r.EndAt.Sub(r.OccurredAt).Hours()
		}
		late := ""
		if r.DueAt != nil && r.DueAt.Before(minTime(now, z)) && r.Status != "completed" {
			late = "Gecikmiş"
		}
		rows = append(rows, Row{"id": r.ID, "date": r.OccurredAt, "kind": name, "label": r.Label, "category": r.Category, "unit": unit, "party": r.Party, "channel": r.Channel, "reference": r.Reference, "amount": r.AmountMinor, "quantity": r.Quantity, "status": r.Status, "due": r.DueAt, "end": r.EndAt, "hours": hours, "late": late, "actor": r.ActorName, "responsible": r.ResponsibleName, "priority": r.Priority, "measure": r.Measure, "notes": r.Notes})
	}
	sort.SliceStable(rows, func(i, j int) bool { return rows[i]["date"].(time.Time).After(rows[j]["date"].(time.Time)) })
	cols := columns("date", "Tarih", "datetime", "kind", "İşlem", "", "label", "Açıklama", "", "category", "Kategori", "", "unit", "Birim", "", "party", "Misafir / firma", "", "responsible", "Sorumlu personel", "", "priority", "Öncelik", "", "measure", "Ölçü birimi", "", "channel", "Kanal", "", "reference", "Referans", "", "amount", "Tutar", "money", "quantity", "Miktar / puan", "number", "status", "Durum", "", "due", "Vade", "datetime", "hours", "Süre (saat)", "number", "late", "Gecikme", "", "actor", "Kaydeden", "", "notes", "Not", "")
	if len(kinds) > 0 {
		keep := map[string]bool{"date": true, "label": true, "category": true, "unit": true, "party": true, "status": true, "actor": true, "responsible": true, "notes": true}
		if len(kinds) > 1 {
			keep["kind"] = true
		}
		for _, kind := range kinds {
			for _, k := range Kinds {
				if k.Key == kind && k.Money {
					keep["amount"] = true
				}
			}
			if slices.Contains([]string{"task", "maintenance", "complaint"}, kind) {
				keep["due"] = true
				keep["hours"] = true
				keep["late"] = true
				keep["priority"] = true
			}
			if slices.Contains([]string{"contract", "receivable", "payable"}, kind) {
				keep["due"] = true
				keep["reference"] = true
			}
			if slices.Contains([]string{"review", "stock_in", "stock_out", "common_area", "overtime"}, kind) {
				keep["quantity"] = true
				keep["measure"] = true
			}
			if slices.Contains([]string{"review", "lead", "refund", "receipt", "payment", "competitor", "booking_details"}, kind) {
				keep["channel"] = true
			}
		}
		filtered := []Column{}
		for _, c := range cols {
			if keep[c.Key] {
				filtered = append(filtered, c)
			}
		}
		cols = filtered
	}
	return table("records", "Kaynak kayıtlar", cols, rows)
}
func balanceTable(bookings []booking.Booking, records []Record, z time.Time, rooms map[uuid.UUID]property.Room) Table {
	paid := map[uuid.UUID]float64{}
	extra := map[uuid.UUID]float64{}
	for _, r := range records {
		if r.BookingID == nil || !r.OccurredAt.Before(z) || (r.Kind == "receipt" && r.Status != "completed") {
			continue
		}
		switch r.Kind {
		case "receipt":
			paid[*r.BookingID] += money(r.AmountMinor)
		case "refund":
			if r.Status == "completed" {
				paid[*r.BookingID] -= money(r.AmountMinor)
			}
		case "income":
			extra[*r.BookingID] += money(r.AmountMinor)
		}
	}
	rows := []Row{}
	for _, b := range bookings {
		if !b.CreatedAt.Before(z) || b.Status == booking.Cancelled {
			continue
		}
		balance := money(total(b)-b.DepositMinor) + extra[b.BookingID] - paid[b.BookingID]
		if balance <= 0 {
			continue
		}
		days := Days(b.CheckOut, z.AddDate(0, 0, -1))
		age := "Vadesi gelmedi"
		if days > 30 {
			age = "30 gün üzeri"
		} else if days > 7 {
			age = "8–30 gün"
		} else if days > 0 {
			age = "1–7 gün"
		}
		rows = append(rows, Row{"guest": b.GuestName, "unit": rooms[b.RoomID].Code, "status": b.Status, "due": b.CheckOut, "age": age, "balance": balance})
	}
	return table("balances", "Rezervasyon bakiyeleri · çıkış tarihinde vade", columns("guest", "Misafir", "", "unit", "Birim", "", "status", "Durum", "", "due", "Vade", "datetime", "age", "Yaşlandırma", "", "balance", "Kalan tutar", "money"), rows)
}
func guestTable(bookings []booking.Booking, a, z time.Time) Table {
	groups := map[string][]booking.Booking{}
	for _, b := range bookings {
		if b.Status == booking.Cancelled {
			continue
		}
		key := guestKey(b)
		if key != "" && b.CheckIn.Before(z) {
			groups[key] = append(groups[key], b)
		}
	}
	rows := []Row{}
	for _, list := range groups {
		sort.Slice(list, func(i, j int) bool { return list[i].CheckIn.Before(list[j].CheckIn) })
		last := list[len(list)-1]
		if !in(last.CheckIn, a, z) {
			continue
		}
		nights, totalValue := 0.0, 0.0
		for _, b := range list {
			nights += float64(Days(b.CheckIn, b.CheckOut))
			totalValue += money(total(b))
		}
		country := ""
		if len(last.Guests) > 0 {
			country = last.Guests[0].Nationality
		}
		interval := 0.0
		if len(list) > 1 {
			interval = float64(Days(list[0].CheckIn, last.CheckIn)) / float64(len(list)-1)
		}
		rows = append(rows, Row{"guest": last.GuestName, "visits": len(list), "country": country, "average": nights / float64(len(list)), "revenue": totalValue, "last": last.CheckIn, "interval": interval, "type": map[bool]string{true: "Tekrar", false: "Yeni"}[len(list) > 1]})
	}
	sort.Slice(rows, func(i, j int) bool { return num(rows[i]["visits"]) > num(rows[j]["visits"]) })
	return table("guests", "Misafir ziyaretleri (son giriş seçili dönemde)", columns("guest", "Misafir", "", "type", "Profil", "", "country", "Ülke", "", "visits", "Ziyaret", "number", "average", "Ortalama gece", "number", "revenue", "Toplam satış tutarı", "money", "last", "Son giriş", "datetime", "interval", "Ziyaret aralığı (gün)", "number"), rows)
}
func shiftTable(records []Record, a, z time.Time) Table {
	groups := map[string]Row{}
	for _, r := range records {
		key := r.BranchID.String() + "/" + r.Reference
		if r.Kind == "cash_open" && in(r.OccurredAt, a, z) {
			groups[key] = Row{"reference": r.Reference, "date": r.OccurredAt, "opening": r.AmountMinor, "staff": r.ActorName, "closing": nil}
		}
	}
	for _, r := range records {
		ref := r.Reference
		if r.ShiftCode != "" {
			ref = r.ShiftCode
		}
		key := r.BranchID.String() + "/" + ref
		g := groups[key]
		if g == nil || !in(r.OccurredAt, g["date"].(time.Time), z) {
			continue
		}
		if r.Currency == "" || r.Status != "completed" {
			continue
		}
		switch r.Kind {
		case "cash_close":
			g["closing"] = r.AmountMinor
		case "receipt":
			if r.Channel == "cash" {
				add(g, "receipts", money(r.AmountMinor))
			}
		case "refund":
			if r.Channel == "cash" && r.Status == "completed" {
				add(g, "refunds", money(r.AmountMinor))
			}
		case "payment":
			if r.Channel == "cash" {
				add(g, "payments", money(r.AmountMinor))
			}
		}
	}
	rows := mapRows(groups, "id")
	for _, r := range rows {
		r["expected"] = num(r["opening"]) + num(r["receipts"]) - num(r["refunds"]) - num(r["payments"])
		if r["closing"] != nil {
			r["difference"] = num(r["closing"]) - num(r["expected"])
		}
	}
	return table("shifts", "Vardiya kasa mutabakatı", columns("reference", "Vardiya", "", "date", "Açılış", "datetime", "staff", "Personel", "", "opening", "Başlangıç", "money", "receipts", "Nakit tahsilat", "money", "refunds", "İade", "money", "payments", "Kasa çıkışı", "money", "expected", "Beklenen", "money", "closing", "Sayılan", "money", "difference", "Fark", "money"), rows)
}
func inventoryTable(records []Record, a, z time.Time) Table {
	groups := map[string]Row{}
	for _, r := range records {
		if !r.OccurredAt.Before(z) || !slices.Contains([]string{"stock_in", "stock_out"}, r.Kind) {
			continue
		}
		key := r.BranchID.String() + "/" + r.Reference + "/" + r.Measure
		g := rowAt(groups, key)
		g["item"] = r.Label
		g["code"] = r.Reference
		g["threshold"] = r.Threshold
		g["measure"] = r.Measure
		delta := r.Quantity
		if r.Kind == "stock_out" {
			delta = -delta
		}
		add(g, "balance", delta)
		if in(r.OccurredAt, a, z) {
			if delta < 0 {
				add(g, "used", -delta)
				add(g, "cost", money(r.AmountMinor))
			} else {
				add(g, "in", delta)
			}
		}
	}
	rows := mapRows(groups, "id")
	for _, r := range rows {
		r["reorder"] = fmt.Sprint(num(r["balance"]) <= num(r["threshold"]))
		r["unit_cost"] = ratio(num(r["cost"]), num(r["used"]))
	}
	return table("stock", "Dönem sonu stok ve dönem tüketimi", columns("code", "Ürün kodu", "", "item", "Ürün", "", "measure", "Ölçü birimi", "", "in", "Dönem girişi", "number", "used", "Tüketim", "number", "balance", "Kalan", "number", "threshold", "Sipariş eşiği", "number", "unit_cost", "Tüketim birim maliyeti", "money", "cost", "Tüketim maliyeti", "money", "reorder", "Sipariş gerekli", ""), rows)
}
