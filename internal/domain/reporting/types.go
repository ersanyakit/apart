// Package reporting defines the reporting contract independently of storage and UI.
package reporting

import (
	"context"
	"github.com/google/uuid"
	"math"
	"otel/constants"
	"otel/internal/domain/booking"
	"otel/internal/domain/property"
	"regexp"
	"slices"
	"strings"
	"time"
)

var Zone = time.FixedZone("Europe/Istanbul", 3*60*60)

func Day(t time.Time) time.Time {
	y, m, d := t.In(Zone).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, Zone)
}
func Days(a, b time.Time) int { return int(Day(b).Sub(Day(a)).Hours() / 24) }

type Filter struct {
	HotelID   uuid.UUID   `json:"hotel_id"`
	BranchID  uuid.UUID   `json:"branch_id"`
	StartDate string      `json:"start_date"`
	EndDate   string      `json:"end_date"`
	RoomIDs   []uuid.UUID `json:"room_ids"`
	RoomTypes []string    `json:"room_types"`
	Channels  []string    `json:"channels"`
	GroupBy   string      `json:"group_by"`
	Currency  string      `json:"currency"`
	Unit      string      `json:"unit"`
	Key       string      `json:"key"`
}

func (f Filter) Range() (time.Time, time.Time, error) {
	a, e := time.ParseInLocation("2006-01-02", f.StartDate, Zone)
	if e != nil {
		return a, a, constants.ErrDates
	}
	b, e := time.ParseInLocation("2006-01-02", f.EndDate, Zone)
	if e != nil || b.Before(a) || Days(a, b) > 365 || a.Year() < 2000 || b.Year() > 2100 {
		return a, b, constants.ErrDates
	}
	return a, b.AddDate(0, 0, 1), nil
}
func (f Filter) Validate() error {
	if f.HotelID == uuid.Nil || len(f.RoomIDs) > 100 || len(f.RoomTypes) > 30 || len(f.Channels) > 30 {
		return constants.ErrPayload
	}
	if !slices.Contains([]string{"day", "week", "month"}, f.GroupBy) || !slices.Contains([]string{"room", "bed", "apartment", "dormitory"}, f.Unit) || !currency.MatchString(f.Currency) {
		return constants.ErrPayload
	}
	_, _, e := f.Range()
	return e
}

var currency = regexp.MustCompile(`^[A-Z]{3}$`)

// Records are append-only operational facts. Corrections void the original;
// their actor, creation time and void reason remain available for audit.
type Record struct {
	UnitPriceMinor  int64      `json:"unit_price_minor"`
	ResponsibleID   *uuid.UUID `json:"responsible_id" gorm:"type:uuid"`
	ResponsibleName string     `json:"responsible_name"`
	ShiftCode       string     `json:"shift_code"`
	Measure         string     `json:"measure"`
	Priority        string     `json:"priority"`
	ID              uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	HotelID         uuid.UUID  `json:"hotel_id" gorm:"type:uuid;not null;index"`
	BranchID        uuid.UUID  `json:"branch_id" gorm:"type:uuid;not null;index"`
	RoomID          *uuid.UUID `json:"room_id" gorm:"type:uuid"`
	BookingID       *uuid.UUID `json:"booking_id" gorm:"type:uuid"`
	ActorID         uuid.UUID  `json:"actor_id" gorm:"type:uuid;not null"`
	ActorName       string     `json:"actor_name"`
	Kind            string     `json:"kind" gorm:"not null;index"`
	Category        string     `json:"category"`
	Label           string     `json:"label"`
	Party           string     `json:"party"`
	Channel         string     `json:"channel"`
	Currency        string     `json:"currency"`
	AmountMinor     int64      `json:"amount_minor"`
	Quantity        float64    `json:"quantity"`
	Threshold       float64    `json:"threshold"`
	Status          string     `json:"status"`
	Reference       string     `json:"reference"`
	Notes           string     `json:"notes"`
	OccurredAt      time.Time  `json:"occurred_at" gorm:"not null;index"`
	DueAt           *time.Time `json:"due_at"`
	EndAt           *time.Time `json:"end_at"`
	CreatedAt       time.Time  `json:"created_at"`
	VoidedAt        *time.Time `json:"voided_at"`
	VoidReason      string     `json:"void_reason"`
}

func (Record) TableName() string { return "report_records" }

type Kind struct {
	Key   string `json:"key"`
	Name  string `json:"name"`
	Money bool   `json:"money"`
	Hint  string `json:"hint"`
}

var Kinds = []Kind{
	{"receipt", "Tahsilat", true, "Kapora dışında alınan ödeme. Rezervasyon ve ödeme yöntemini seçin."},
	{"refund", "İade", true, "İade durumunu Tamamlandı veya Bekliyor olarak seçin."},
	{"income", "Ek hizmet / diğer gelir", true, "Konaklama otomatik hesaplanır. Bu alana yalnızca ek gelir girin; tahsilat ayrı kaydedilir."},
	{"expense", "Gider", true, "Dönemde oluşan gider. Ödeme ayrı kaydedilir. Birime bağlanırsa doğrudan maliyete eklenir."},
	{"payment", "Gider ödemesi", true, "Borç/gider ödemesi; gider tahakkukunu tekrar oluşturmaz."},
	{"receivable", "Diğer alacak", true, "Rezervasyon bakiyesi otomatik hesaplanır. Buraya yalnızca diğer açık hesapları girin."},
	{"payable", "Tedarikçi borcu", true, "Tedarikçiye olan borcu kaydedin. Ödeme yaparken ilgili açık hesabı seçin; bakiye otomatik azalır."},
	{"cash_open", "Vardiya açılışı", true, "Sorumlu personeli ve vardiya başında kasadaki nakdi girin. Sonraki ödemeleri bu vardiyaya bağlayabilirsiniz."},
	{"cash_close", "Vardiya kapanışı", true, "Açık vardiyayı seçin ve kasada saydığınız gerçek nakdi girin."},
	{"task", "Görev / temizlik", false, "Temizlik, oda kontrolü veya teknik bakım görevini seçin. Bitiş zamanı tamamlanma zamanıdır."},
	{"maintenance", "Arıza / bakım", true, "Tutar bakım maliyetidir; finansal gider raporu için ayrıca gider kaydı oluşturun."},
	{"stock_in", "Stok girişi", true, "Katalogdan ürünü ve ölçü birimini seçin. Giren miktarı, toplam maliyeti ve düşük stok uyarısı eşiğini yazın."},
	{"stock_out", "Stok tüketimi", true, "Tüketilen ürünü seçin, miktarı ve toplam tüketim maliyetini girin."},
	{"damage", "Kayıp / hasar", true, "Tutar onarım/değişim maliyeti, kategori hasar kaynağıdır. Tahsilat ayrıca damage kategorisiyle girilir."},
	{"complaint", "Şikâyet", false, "Kategori sorun türü; bitiş çözüm zamanı; durum Açık veya Tamamlandı."},
	{"review", "Değerlendirme", false, "Misafirin işletmeye verdiği 1–5 arası puanı ve değerlendirme platformunu kaydedin."},
	{"lead", "Satış talebi", false, "Durum Açık, Teklif verildi, Onaylı veya Kaybedildi; not alanı kayıp nedenidir."},
	{"contract", "Uzun dönem kontrat", true, "Başlangıç ve bitiş tarihleri, tutar dönem bedeli; vade ödeme tarihidir."},
	{"deposit_in", "Güvence depozitosu alındı", true, "Rezervasyon kaporasından farklıdır; gelir olarak sayılmaz."},
	{"deposit_out", "Güvence depozitosu iadesi", true, "İade edilen güvence tutarı; gelirden düşülmez."},
	{"common_area", "Ortak alan kullanımı", false, "Kategori alan adı, miktar kişi veya kullanım adedi."},
	{"overtime", "Fazla mesai", false, "Personeli seçin ve fazla çalıştığı saat sayısını girin."},
	{"competitor", "Rakip fiyat gözlemi", true, "Taraf rakip tesis, kategori ürün türü; dış kaynaktan doğrulanmış gecelik fiyat."},
	{"booking_details", "Rezervasyon rapor bilgisi", true, "Rezervasyonu, satış kaynağını, fiyatının para birimini ve kanal komisyonunu belirtin. Misafir gelmediyse durumunu seçin."},
}

func (r Record) Validate() error {
	k := -1
	for i, v := range Kinds {
		if v.Key == r.Kind {
			k = i
		}
	}
	if r.UnitPriceMinor < 0 || r.UnitPriceMinor > 1000000000 {
		return constants.ErrPayload
	}
	if r.UnitPriceMinor > 0 && (r.Quantity < 1 || r.Quantity > 10000 || math.Trunc(r.Quantity) != r.Quantity || r.AmountMinor != int64(r.Quantity)*r.UnitPriceMinor) {
		return constants.ErrPayload
	}
	if math.IsNaN(r.Quantity) || math.IsInf(r.Quantity, 0) || math.IsNaN(r.Threshold) || math.IsInf(r.Threshold, 0) {
		return constants.ErrPayload
	}
	if k < 0 || r.ID == uuid.Nil || r.HotelID == uuid.Nil || r.BranchID == uuid.Nil || r.OccurredAt.IsZero() || r.OccurredAt.Year() < 2000 || r.OccurredAt.Year() > 2100 || strings.TrimSpace(r.Label) == "" || len(r.Label) > 200 || len(r.Party) > 200 || len(r.Notes) > 4000 || len(r.Reference) > 100 || len(r.Category) > 100 || len(r.Channel) > 100 || !currency.MatchString(r.Currency) || r.AmountMinor < 0 || r.AmountMinor > 999999999999 || r.Quantity < 0 || r.Quantity > 1000000 || r.Threshold < 0 || r.Threshold > 1000000 {
		return constants.ErrPayload
	}
	if !slices.Contains([]string{"open", "pending", "completed", "quoted", "confirmed", "lost", "no_show"}, r.Status) {
		return constants.ErrPayload
	}
	if r.EndAt != nil && r.EndAt.Before(r.OccurredAt) {
		return constants.ErrDates
	}
	if r.Kind == "review" && (r.Quantity < 1 || r.Quantity > 5) {
		return constants.ErrPayload
	}
	if r.Kind == "booking_details" && r.BookingID == nil {
		return constants.ErrPayload
	}
	if slices.Contains([]string{"cash_open", "cash_close", "stock_in", "stock_out"}, r.Kind) && strings.TrimSpace(r.Reference) == "" {
		return constants.ErrPayload
	}
	if slices.Contains([]string{"receipt", "payment", "cash_open", "cash_close", "deposit_in", "deposit_out", "stock_in", "stock_out"}, r.Kind) && r.Status != "completed" {
		return constants.ErrPayload
	}
	if slices.Contains([]string{"receivable", "payable", "deposit_in", "deposit_out"}, r.Kind) && strings.TrimSpace(r.Reference) == "" {
		return constants.ErrPayload
	}
	if r.Kind == "receivable" && r.BookingID != nil {
		return constants.ErrPayload
	}
	if r.Kind == "contract" && r.EndAt == nil {
		return constants.ErrDates
	}
	if r.DueAt != nil && (r.DueAt.Year() < 2000 || r.DueAt.Year() > 2100) {
		return constants.ErrDates
	}
	if r.EndAt != nil && (r.EndAt.Year() < 2000 || r.EndAt.Year() > 2100) {
		return constants.ErrDates
	}
	if len(r.ShiftCode) > 100 || !slices.Contains([]string{"piece", "litre", "kg", "pack", "hour", "person"}, r.Measure) || !slices.Contains([]string{"low", "normal", "high", "urgent"}, r.Priority) {
		return constants.ErrPayload
	}
	if !Kinds[k].Money && r.AmountMinor != 0 {
		return constants.ErrPayload
	}
	return nil
}

type Dataset struct {
	ArchivedRooms map[uuid.UUID]bool
	Rooms         []property.Room
	Bookings      []booking.Booking
	Records       []Record
	Branches      []property.Branch
	Now           time.Time
}
type Column struct {
	Key    string `json:"key"`
	Label  string `json:"label"`
	Format string `json:"format,omitempty"`
}
type Row map[string]any
type Table struct {
	Key     string   `json:"key"`
	Title   string   `json:"title"`
	Columns []Column `json:"columns"`
	Rows    []Row    `json:"rows"`
}
type Metric struct {
	Key    string  `json:"key"`
	Label  string  `json:"label"`
	Value  float64 `json:"value"`
	Format string  `json:"format"`
	Note   string  `json:"note,omitempty"`
}
type Result struct {
	Key         string    `json:"key"`
	GeneratedAt time.Time `json:"generated_at"`
	Currency    string    `json:"currency"`
	Metrics     []Metric  `json:"metrics"`
	Tables      []Table   `json:"tables"`
	Notes       []string  `json:"notes"`
}
type Definition struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Category    string `json:"category"`
	Description string `json:"description"`
	Unit        string `json:"unit,omitempty"`
}
type Report interface {
	Definition() Definition
	Generate(context.Context, Filter, Dataset) (Result, error)
}
type Repository interface {
	RecordChoices(context.Context, uuid.UUID, uuid.UUID) (Choices, error)
	ReportData(context.Context, Filter) (Dataset, error)
	AppendReportRecord(context.Context, Record) (Record, error)
	VoidReportRecord(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, string) error
}

type Choice struct {
	Kind     string `json:"kind"`
	Currency string `json:"currency"`
	Value    string `json:"value"`
	Label    string `json:"label"`
}
type Choices struct {
	Shifts   []Choice `json:"shifts"`
	Accounts []Choice `json:"accounts"`
}
