package reporting

import (
	"context"
	"sort"
)

// Registration belongs to each report implementation; navigation is generated
// from this registry rather than maintained as a second frontend catalogue.
type generator struct {
	spec Definition
	run  func(Filter, Dataset) Result
}

func (g generator) Definition() Definition { return g.spec }
func (g generator) Generate(ctx context.Context, f Filter, d Dataset) (Result, error) {
	if e := ctx.Err(); e != nil {
		return Result{}, e
	}
	return g.run(f, d), nil
}

var registry = map[string]Report{}

func Register(r Report) {
	k := r.Definition().Key
	if _, exists := registry[k]; exists {
		panic("duplicate report: " + k)
	}
	registry[k] = r
}
func Lookup(key string) (Report, bool) { r, ok := registry[key]; return r, ok }
func Definitions() []Definition {
	out := []Definition{}
	for _, r := range registry {
		out = append(out, r.Definition())
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Key < out[j].Key })
	return out
}
func init() {
	groups := []struct {
		category string
		items    [][3]string
	}{
		{"Yönetim", [][3]string{{"management.dashboard", "Yönetim özeti", "Gelir, tahsilat, kapasite ve operasyon göstergeleri."}, {"management.properties", "Tesis karşılaştırması", "Yetkili olduğunuz işletmenin tesislerini aynı dönemde karşılaştırın."}, {"management.records", "İşlem kayıtları", "Raporlara kaynak olan finans ve operasyon kayıtları."}}},
		{"Finans", [][3]string{{"finance.daily_revenue", "Günlük gelir ve tahsilat", "Konaklama tahakkuku, ek gelir, tahsilat ve iadeler ayrı gösterilir."}, {"finance.income_expense", "Gelir–gider", "Dönem geliri, faaliyet giderleri ve faaliyet sonucu."}, {"finance.payment_methods", "Ödeme yöntemleri", "Tahsilat ve iade kanalları."}, {"finance.receivables", "Alacak ve borç", "Rezervasyon bakiyeleri ve diğer açık hesapların vade analizi."}, {"finance.refunds", "İptal ve iadeler", "İptal edilen satışlar, gerçekleşen ve bekleyen iadeler."}, {"finance.profitability", "Birim bazında faaliyet sonucu", "Birim gelirleri ile doğrudan atanmış giderler; dağıtılmamış giderler ayrıca gösterilir."}}},
		{"Doluluk", [][3]string{{"occupancy.daily", "Günlük doluluk", "Fiziksel kapasite ve satılabilir kapasite ayrı paydalarla."}, {"occupancy.history", "Geçmiş doluluk", "Günlük, haftalık ve aylık karşılaştırma."}, {"occupancy.forecast", "Gelecek doluluk", "Mevcut rezervasyonlara dayanan kapasite görünümü."}, {"occupancy.performance", "Birim performansı", "Oda, yatak veya daire başına gece, gelir ve doluluk."}, {"occupancy.capacity", "Kapasite kullanımı", "Mevcut fiziksel, satışa açık ve kapalı birimler."}}},
		{"Rezervasyon", [][3]string{{"reservations.summary", "Rezervasyon özeti", "Oluşturulma tarihine göre rezervasyon durumları."}, {"reservations.channels", "Rezervasyon kaynakları", "Kanal geliri, iptal oranı ve komisyon sonrası satış."}, {"reservations.conversion", "Satış dönüşümü", "Talep, teklif, kazanılan ve kaybedilen satışlar."}, {"reservations.future", "Giriş ve çıkış listesi", "Seçilen dönemin planlanan giriş ve çıkışları."}, {"reservations.length", "Konaklama süresi", "Gece sayısı ve kısa / uzun konaklama dağılımı."}}},
		{"Gelir yönetimi", [][3]string{{"pricing.metrics", "ADR ve RevPAR", "Aynı ürün türü için gelir / satılan gece ve gelir / satılabilir gece."}, {"pricing.performance", "Fiyat performansı", "Ürün ve gün türüne göre ortalama gecelik satış."}, {"pricing.forecast", "Gelir tahmini", "Kesinleşmiş rezervasyonların gelecekteki konaklama tutarı."}, {"pricing.competitors", "Rakip fiyatları", "Kaynağı belirtilerek girilmiş fiyat gözlemleri."}}},
		{"Misafir", [][3]string{{"guests.profile", "Misafir profili", "Kimliği eşleştirilebilen misafirlerde yeni / tekrar ve ülke dağılımı."}, {"guests.repeat", "Tekrar gelen misafirler", "Tekrar konaklama, konaklama geliri ve ziyaret aralığı."}, {"guests.satisfaction", "Misafir memnuniyeti", "Kaydedilen değerlendirmelerin 5 üzerinden puanı."}, {"guests.complaints", "Şikâyetler", "Sorun kategorileri, açık işler ve çözüm süreleri."}}},
		{"Personel", [][3]string{{"staff.performance", "Personel performansı", "Rezervasyon işlemleri, görevler ve fazla mesai."}, {"staff.shifts", "Vardiya ve kasa", "Açılış + nakit tahsilat − iade − ödeme ile sayılan kasa karşılaştırması."}, {"staff.tasks", "Görev tamamlama", "Tamamlanan, açık ve geciken görevler."}}},
		{"Operasyon", [][3]string{{"operations.housekeeping", "Temizlik", "Birimlerin güncel temizlik durumu ve kayıtlı temizlik görevleri."}, {"operations.maintenance", "Arıza ve bakım", "Açık arızalar, çözüm süreleri ve bakım maliyetleri."}, {"operations.inventory", "Stok ve tüketim", "Ürün koduna göre giriş, tüketim, bakiye ve sipariş eşiği."}, {"operations.damage", "Kayıp ve hasar", "Kaynak, maliyet ve kaydedilen hasar tahsilatları."}}},
		{"Apart", [][3]string{{"apart.income", "Daire geliri", "Daire bazında konaklama geliri."}, {"apart.occupancy", "Daire doluluğu", "Daire-gece kapasitesi ve doluluk."}, {"apart.long_stays", "Uzun dönem konaklama", "28 gece ve üzeri rezervasyonlar."}, {"apart.rent", "Kira ve tahsilat", "Kontrat bedeli, vade ve ödeme kayıtları."}, {"apart.costs", "Daire giderleri", "Daireye doğrudan atanmış giderler."}, {"apart.maintenance", "Daire bakımı", "Daire bazında bakım kayıtları."}, {"apart.profitability", "Daire faaliyet sonucu", "Doğrudan atanmış giderlerden sonraki sonuç."}, {"apart.contracts", "Kontrat bitişleri", "Seçilen dönemde sona erecek sözleşmeler."}, {"apart.deposits", "Güvence depozitoları", "Alınan ve iade edilen güvence bakiyeleri."}}},
		{"Hostel", [][3]string{{"hostel.occupancy", "Yatak doluluğu", "Yatak-gece üzerinden doluluk."}, {"hostel.bunks", "Ranza kapasitesi", "Alt / üst kat ve yatak gruplarının kapasitesi."}, {"hostel.revenue", "Yatak başına gelir", "Yatak bazında gece ve gelir."}, {"hostel.types", "Yatakhane performansı", "Birim türü bazında satış ve kullanım."}, {"hostel.moves", "Yatak ve oda değişimleri", "Rezervasyon yerleşim geçmişi."}, {"hostel.groups", "Grup konaklama", "Grup koduyla eşleştirilmiş rezervasyonlar."}, {"hostel.common_areas", "Ortak alan kullanımı", "Kaydedilmiş ortak alan kullanımları."}, {"hostel.short_stays", "Kısa süreli konaklama", "1–7 gece rezervasyonlar."}, {"hostel.extras", "Ek hizmet gelirleri", "Dolap, çamaşırhane, kahvaltı ve diğer ek gelirler."}, {"hostel.readiness", "Yatak hazırlığı", "Yatakların temizlik durumu ve hazırlık görevleri."}}},
	}
	for _, g := range groups {
		for _, item := range g.items {
			spec := Definition{Key: item[0], Name: item[1], Category: g.category, Description: item[2]}
			if g.category == "Apart" {
				spec.Unit = "apartment"
			}
			if g.category == "Hostel" {
				spec.Unit = "bed"
			}
			Register(generator{spec: spec, run: generate})
		}
	}
}
