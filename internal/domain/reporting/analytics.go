package reporting

import (
	"github.com/google/uuid"
	"otel/constants"
	"otel/internal/domain/booking"
	"otel/internal/domain/property"
	"slices"
	"time"
)

// Capacity measures occupied physical units, not summed bookings or guests.
// A whole-room booking blocks descendant beds; a bed booking blocks its parent
// room from whole-room sale. Related sets are de-duplicated per service night.
func occupiedNights(f Filter, d Dataset, a, z time.Time, meta map[uuid.UUID]Record, matches func(uuid.UUID) bool) map[string]map[uuid.UUID]bool {
	targets := map[uuid.UUID]bool{}
	for _, r := range d.Rooms {
		if !d.ArchivedRooms[r.RoomID] && r.Kind == f.Unit && matches(r.RoomID) {
			targets[r.RoomID] = true
		}
	}
	related := map[uuid.UUID]map[uuid.UUID]bool{}
	out := map[string]map[uuid.UUID]bool{}
	for _, b := range d.Bookings {
		if b.Status == booking.Cancelled || meta[b.BookingID].Status == "no_show" {
			continue
		}
		channel := meta[b.BookingID].Channel
		if channel == "" {
			channel = "Belirtilmemiş"
		}
		if len(f.Channels) > 0 && !slices.Contains(f.Channels, channel) {
			continue
		}
		start, end := dates(b, b.Status != booking.Confirmed)
		if b.Status == booking.CheckedIn && !end.After(Day(d.Now)) {
			end = Day(d.Now).AddDate(0, 0, 1)
		}
		for day := maxTime(a, start); day.Before(minTime(z, end)); day = day.AddDate(0, 0, 1) {
			if b.Status == booking.Confirmed && day.Before(Day(d.Now)) {
				continue
			}
			id := b.RoomID
			for _, s := range segments(b) {
				if s.Start.Before(day.AddDate(0, 0, 1)) && s.End.After(day) {
					id = s.RoomID
				}
			}
			if related[id] == nil {
				related[id] = property.Related(d.Rooms, id)
			}
			key := day.Format("2006-01-02")
			if out[key] == nil {
				out[key] = map[uuid.UUID]bool{}
			}
			for target := range related[id] {
				if targets[target] {
					out[key][target] = true
				}
			}
		}
	}
	return out
}
func groupCapacity(daily map[string]Row, by string) []Row {
	if by == "day" {
		return mapRows(daily, "date")
	}
	g := map[string]Row{}
	for date, r := range daily {
		day, _ := time.ParseInLocation("2006-01-02", date, Zone)
		v := rowAt(g, bucket(day, by))
		for _, k := range []string{"physical", "sellable", "closed", "occupied", "free", "revenue", "sold"} {
			add(v, k, num(r[k]))
		}
	}
	for _, v := range g {
		v["rate"] = ratio(num(v["occupied"]), num(v["sellable"])) * 100
		v["physical_rate"] = ratio(num(v["occupied"]), num(v["physical"])) * 100
	}
	return mapRows(g, "date")
}
func ageLabel(due time.Time, z time.Time) string {
	days := Days(due, z.AddDate(0, 0, -1))
	if days > 30 {
		return "30 gün üzeri"
	}
	if days > 7 {
		return "8–30 gün"
	}
	if days > 0 {
		return "1–7 gün"
	}
	return "Vadesi gelmedi"
}
func openAccounts(records []Record, z time.Time) Table {
	settled := map[string]float64{}
	for _, r := range records {
		if !r.OccurredAt.Before(z) || r.Reference == "" || r.Status != "completed" {
			continue
		}
		key := r.BranchID.String() + "/" + r.Reference
		if r.Kind == "receipt" {
			settled["receivable/"+key] += money(r.AmountMinor)
		}
		if r.Kind == "payment" {
			settled["payable/"+key] += money(r.AmountMinor)
		}
	}
	rows := []Row{}
	for _, r := range records {
		if !slices.Contains([]string{"receivable", "payable"}, r.Kind) || !r.OccurredAt.Before(z) || r.Status == "completed" {
			continue
		}
		key := r.Kind + "/" + r.BranchID.String() + "/" + r.Reference
		balance := money(r.AmountMinor) - settled[key]
		if balance <= 0 {
			continue
		}
		due := r.OccurredAt
		if r.DueAt != nil {
			due = *r.DueAt
		}
		label := "Alacak"
		if r.Kind == "payable" {
			label = "Borç"
		}
		rows = append(rows, Row{"party": r.Party, "type": label, "reference": r.Reference, "amount": balance, "due": due, "age": ageLabel(due, z)})
	}
	return table("accounts", "Diğer açık hesaplar · aynı referansla yapılan ödemeler düşülür", columns("party", "Taraf", "", "type", "Hesap", "", "reference", "Referans", "", "amount", "Açık bakiye", "money", "due", "Vade", "datetime", "age", "Yaşlandırma", ""), rows)
}
func managementMetrics(out *Result, f Filter, d Dataset, bookings []booking.Booking, records []Record, meta map[uuid.UUID]Record, rooms map[uuid.UUID]property.Room, a, z time.Time, received float64) {
	metric := func(k, l string, v float64, format string) {
		out.Metrics = append(out.Metrics, Metric{Key: k, Label: l, Value: v, Format: format})
	}
	today := Day(d.Now)
	tomorrow := today.AddDate(0, 0, 1)
	arrivals, departures, cancelled, ns, totalCount, nights, dirty, maintenance := 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
	for _, b := range bookings {
		if in(b.CreatedAt, a, z) {
			totalCount++
			if b.Status == booking.Cancelled {
				cancelled++
			} else if meta[b.BookingID].Status == "no_show" {
				ns++
			} else {
				nights += float64(Days(b.CheckIn, b.CheckOut))
			}
		}
		if b.Status != booking.Cancelled && meta[b.BookingID].Status != "no_show" {
			if in(b.CheckIn, today, tomorrow) {
				arrivals++
			}
			if in(b.CheckOut, today, tomorrow) {
				departures++
			}
		}
	}
	for _, r := range rooms {
		if !r.Inactive && r.Status == constants.RoomDirty && r.Kind != "bed" {
			dirty++
		}
	}
	for _, r := range records {
		if r.Kind == "maintenance" && r.Status != "completed" {
			maintenance++
		}
	}
	metric("arrivals", "Bugünkü girişler", arrivals, "number")
	metric("departures", "Bugünkü çıkışlar", departures, "number")
	metric("dirty", "Temizlik bekleyen birim", dirty, "number")
	metric("maintenance", "Açık bakım kaydı", maintenance, "number")
	metric("booking_count", "Dönem rezervasyonu", totalCount, "number")
	metric("cancel_rate", "İptal oranı", ratio(cancelled, totalCount)*100, "percent")
	metric("no_show_rate", "No-show oranı", ratio(ns, totalCount)*100, "percent")
	metric("length", "Ortalama konaklama (gece)", ratio(nights, totalCount-cancelled-ns), "number")
	balance := balanceTable(bookings, records, z, rooms)
	outstanding, overdue := 0.0, 0.0
	for _, r := range balance.Rows {
		outstanding += num(r["balance"])
		if r["age"] != "Vadesi gelmedi" {
			overdue += num(r["balance"])
		}
	}
	metric("outstanding", "Rezervasyon alacakları", outstanding, "money")
	metric("overdue", "Vadesi geçmiş rezervasyon alacağı", overdue, "money")
	for _, kind := range []string{"room", "bed"} {
		ff := f
		ff.Unit = kind
		occ := occupiedNights(ff, d, today, tomorrow, meta, func(uuid.UUID) bool { return true })
		label := "Bugün dolu / rezerve oda"
		if kind == "bed" {
			label = "Bugün dolu / rezerve yatak"
		}
		metric("occupied_"+kind, label, float64(len(occ[today.Format("2006-01-02")])), "number")
	}
}
func guestProfile(bookings []booking.Booking, a, z time.Time) Table {
	first := map[string]time.Time{}
	for _, b := range bookings {
		if b.Status == booking.Cancelled {
			continue
		}
		key := guestKey(b)
		if key != "" && (first[key].IsZero() || b.CheckIn.Before(first[key])) {
			first[key] = b.CheckIn
		}
	}
	g := map[string]Row{}
	for _, b := range bookings {
		if b.Status == booking.Cancelled || !in(b.CheckIn, a, z) {
			continue
		}
		country := "Belirtilmemiş"
		if len(b.Guests) > 0 && b.Guests[0].Nationality != "" {
			country = b.Guests[0].Nationality
		}
		r := rowAt(g, country)
		add(r, "bookings", 1)
		add(r, "guests", float64(b.GuestCount))
		key := guestKey(b)
		if key == "" {
			add(r, "unknown", 1)
		} else if first[key].Before(b.CheckIn) {
			add(r, "repeat", 1)
		} else {
			add(r, "new", 1)
		}
		add(r, "sales", money(total(b)))
		add(r, "nights", float64(Days(b.CheckIn, b.CheckOut)))
	}
	rows := mapRows(g, "country")
	for _, r := range rows {
		r["average"] = ratio(num(r["nights"]), num(r["bookings"]))
		r["spend"] = ratio(num(r["sales"]), num(r["guests"]))
	}
	return table("guest_profile", "İlk misafirin ülkesine göre toplulaştırılmış profil", columns("country", "Ülke", "", "bookings", "Rezervasyon", "number", "guests", "Kişi", "number", "new", "Yeni", "number", "repeat", "Tekrar", "number", "unknown", "Kimliği eşleşmeyen", "number", "average", "Ortalama gece", "number", "spend", "Kişi başına satış", "money"), rows)
}

func summarizeReport(out *Result, f Filter, records []Record, a, z time.Time) {
	kinds := map[string][]string{
		"management.records": {}, "reservations.conversion": {"lead"}, "guests.complaints": {"complaint"}, "guests.satisfaction": {"review"}, "staff.tasks": {"task"}, "operations.housekeeping": {"task"}, "hostel.readiness": {"task"}, "operations.maintenance": {"maintenance"}, "apart.maintenance": {"maintenance"}, "operations.damage": {"damage"}, "hostel.common_areas": {"common_area"}, "apart.contracts": {"contract"}, "pricing.competitors": {"competitor"}, "hostel.extras": {"income"}, "apart.costs": {"expense"},
	}
	allowed, ok := kinds[f.Key]
	if !ok {
		return
	}
	count, completed, open, late, hours, resolved, cost, score := 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
	for _, r := range records {
		at := r.OccurredAt
		if f.Key == "apart.contracts" {
			if r.EndAt == nil {
				continue
			}
			at = *r.EndAt
		}
		if !in(at, a, z) || (len(allowed) > 0 && !slices.Contains(allowed, r.Kind)) {
			continue
		}
		if slices.Contains([]string{"operations.housekeeping", "hostel.readiness"}, f.Key) && r.Category != "housekeeping" {
			continue
		}
		count++
		cost += money(r.AmountMinor)
		if r.Status == "completed" {
			completed++
		} else {
			open++
			if r.DueAt != nil && r.DueAt.Before(out.GeneratedAt) {
				late++
			}
		}
		if r.EndAt != nil && r.Status == "completed" {
			hours += r.EndAt.Sub(r.OccurredAt).Hours()
			resolved++
		}
		if r.Kind == "review" {
			score += r.Quantity
		}
	}
	previous := out.Metrics
	out.Metrics = []Metric{{Key: "records", Label: "Dönem kaydı", Value: count, Format: "number"}}
	add := func(k, l string, v float64, format string) {
		out.Metrics = append(out.Metrics, Metric{Key: k, Label: l, Value: v, Format: format})
	}
	if slices.Contains([]string{"guests.complaints", "staff.tasks", "operations.housekeeping", "hostel.readiness", "operations.maintenance", "apart.maintenance"}, f.Key) {
		add("completed", "Tamamlanan", completed, "number")
		add("open", "Açık", open, "number")
		add("late", "Geciken", late, "number")
		add("resolution", "Ortalama çözüm (saat)", ratio(hours, resolved), "number")
	}
	if slices.Contains([]string{"operations.maintenance", "apart.maintenance", "operations.damage", "apart.costs", "hostel.extras", "apart.contracts"}, f.Key) {
		add("cost", "Kayıtlı tutar", cost, "money")
	}
	if f.Key == "guests.satisfaction" {
		add("score", "Ortalama puan / 5", ratio(score, count), "number")
	}
	for _, m := range previous {
		if slices.Contains([]string{"conversion", "damage_collected"}, m.Key) {
			out.Metrics = append(out.Metrics, m)
		}
	}
}

func pricePerformance(bookings []booking.Booking, meta map[uuid.UUID]Record, rooms map[uuid.UUID]property.Room, a, z time.Time, matches func(uuid.UUID) bool) Table {
	g := map[string]Row{}
	for _, b := range bookings {
		if b.Status == booking.Cancelled || meta[b.BookingID].Status == "no_show" {
			continue
		}
		start, end := dates(b, false)
		for day := maxTime(a, start); day.Before(minTime(z, end)); day = day.AddDate(0, 0, 1) {
			id := b.RoomID
			for _, s := range segments(b) {
				if s.Start.Before(day.AddDate(0, 0, 1)) && s.End.After(day) {
					id = s.RoomID
				}
			}
			if !matches(id) {
				continue
			}
			room := rooms[id]
			kind := "Hafta içi"
			if day.Weekday() == time.Saturday || day.Weekday() == time.Sunday {
				kind = "Hafta sonu"
			}
			channel := meta[b.BookingID].Channel
			if channel == "" {
				channel = "Belirtilmemiş"
			}
			key := room.Type + " / " + room.Kind + " / " + channel + " / " + kind + " / " + day.Format("2006-01")
			r := rowAt(g, key)
			add(r, "nights", 1)
			add(r, "sales", money(b.DailyPriceMinor))
		}
	}
	rows := mapRows(g, "group")
	for _, r := range rows {
		r["average"] = ratio(num(r["sales"]), num(r["nights"]))
	}
	return table("prices", "Tür, kanal, hizmet günü ve ay bazında fiyat", columns("group", "Tür / birim / kanal / gün / ay", "", "nights", "Satılmış gece", "number", "sales", "Satış tutarı", "money", "average", "Ortalama gecelik satış", "money"), rows)
}
func summarizeTables(out *Result, f Filter) {
	sums := func(tableKey, field string) float64 {
		n := 0.0
		for _, t := range out.Tables {
			if t.Key == tableKey {
				for _, r := range t.Rows {
					n += num(r[field])
				}
			}
		}
		return n
	}
	count := func(key string) float64 {
		for _, t := range out.Tables {
			if t.Key == key {
				return float64(len(t.Rows))
			}
		}
		return 0
	}
	metric := func(k, l string, v float64, format string) {
		out.Metrics = append(out.Metrics, Metric{Key: k, Label: l, Value: v, Format: format})
	}
	switch f.Key {
	case "staff.performance":
		out.Metrics = []Metric{}
		metric("staff", "İşlem kaydı olan personel", count("staff"), "number")
		metric("bookings", "Oluşturulan rezervasyon", sums("staff", "bookings"), "number")
		metric("checkouts", "Çıkış işlemi", sums("staff", "checkouts"), "number")
		metric("completed", "Tamamlanan görev", sums("staff", "completed"), "number")
		metric("hours", "Fazla mesai (saat)", sums("staff", "hours"), "number")
	case "staff.shifts":
		out.Metrics = []Metric{}
		metric("shifts", "Vardiya", count("shifts"), "number")
		metric("cash", "Beklenen kasa toplamı", sums("shifts", "expected"), "money")
		metric("difference", "Kapanan vardiyaların farkı", sums("shifts", "difference"), "money")
	case "finance.receivables":
		out.Metrics = []Metric{}
		metric("balances", "Rezervasyon alacağı", sums("balances", "balance"), "money")
		receivables, payables := 0.0, 0.0
		for _, t := range out.Tables {
			if t.Key == "accounts" {
				for _, r := range t.Rows {
					if r["type"] == "Alacak" {
						receivables += num(r["amount"])
					} else {
						payables += num(r["amount"])
					}
				}
			}
		}
		metric("receivables", "Diğer alacak", receivables, "money")
		metric("payables", "Tedarikçi borcu", payables, "money")
	case "operations.inventory":
		out.Metrics = []Metric{}
		metric("items", "Hareketi olan ürün", count("stock"), "number")
		metric("consumed", "Tüketim miktarı", sums("stock", "used"), "number")
		metric("cost", "Tüketim maliyeti", sums("stock", "cost"), "money")
	case "guests.profile":
		out.Metrics = []Metric{}
		metric("new", "Yeni misafir rezervasyonu", sums("guest_profile", "new"), "number")
		metric("repeat", "Tekrar misafir rezervasyonu", sums("guest_profile", "repeat"), "number")
		metric("ratio", "Tekrar oranı (eşleşenler)", ratio(sums("guest_profile", "repeat"), sums("guest_profile", "new")+sums("guest_profile", "repeat"))*100, "percent")
		metric("unmatched", "Kimliği eşleşmeyen", sums("guest_profile", "unknown"), "number")
	case "guests.repeat":
		out.Metrics = []Metric{}
		metric("guests", "Kimliği eşleşen misafir", count("guests"), "number")
		metric("visits", "Toplam ziyaret", sums("guests", "visits"), "number")
		metric("sales", "Toplam konaklama satış tutarı", sums("guests", "revenue"), "money")
	case "hostel.moves":
		out.Metrics = []Metric{}
		metric("moves", "Birim değişimi", count("moves"), "number")
	case "hostel.bunks":
		out.Metrics = []Metric{}
		metric("places", "Fiziksel yatak birimi", count("bunks"), "number")
		metric("people", "Fiziksel kişi kapasitesi", sums("bunks", "capacity"), "number")
	case "apart.deposits":
		out.Metrics = []Metric{}
		metric("deposits", "Güvence hesabı", count("deposits"), "number")
		metric("balance", "İade edilmemiş güvence", sums("deposits", "balance"), "money")
	case "pricing.performance":
		metric("nights", "Satılmış gece", sums("prices", "nights"), "number")
		metric("price", "Ortalama gecelik satış", ratio(sums("prices", "sales"), sums("prices", "nights")), "money")
	}
}
