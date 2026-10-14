package reporting

import (
	"github.com/google/uuid"
	"sort"
	"strings"
	"time"
)

var expenseCategories = map[string]string{"payroll": "Personel maaşları", "rent": "Kira giderleri", "utilities": "Fatura (türü belirtilmemiş)", "electricity": "Elektrik", "water": "Su", "internet": "İnternet", "natural_gas": "Doğal gaz", "cleaning": "Temizlik malzemeleri", "laundry": "Çamaşırhane", "maintenance": "Bakım ve onarım", "ota": "OTA komisyonları", "tax": "Vergi ve muhasebe", "other": "Diğer işletme giderleri"}

func utilityCategory(category string) bool {
	switch category {
	case "electricity", "water", "internet", "natural_gas", "utilities":
		return true
	}
	return false
}

func expenseReport(f Filter, d Dataset, records []Record, a, z time.Time) Result {
	out := Result{Key: f.Key, GeneratedAt: d.Now, Currency: f.Currency, Notes: []string{"Giderler kayıt tarihine göre, seçilen para biriminde gösterilir. İptal edilmiş kayıtlar dahil edilmez.", "Gider kaydı ödeme yapıldığı anlamına gelmez. Kasa/banka çıkışını ayrıca ödeme olarak kaydedin; aynı gideri ikinci kez oluşturmayın.", "Maaş kayıtları girilen işletme gideridir; net/brüt ücret, vergi veya bordro hesabı otomatik yapılmaz."}}
	bills := f.Key == "finance.utility_expenses"
	if bills {
		out.Notes = []string{"Mevcut gider kayıtları, gider tarihi ve seçilen para birimi üzerinden raporlanır. İptal edilmiş kayıtlar dahil edilmez.", "Eski genel fatura kayıtlarının türü bilinmediği için elektrik, su, internet veya doğal gaza dağıtılmaz; türü belirtilmemiş olarak gösterilir.", "Gider tutarı ödeme durumu değildir. Aynı faturaya ait ödeme hareketi gider toplamına ikinci kez eklenmez."}
	}
	categories, periods, parties := map[string]Row{}, map[string]Row{}, map[string]Row{}
	details := []Row{}
	var total, payroll, rent, unassigned, unspecified float64
	branches := map[uuid.UUID]string{}
	for _, b := range d.Branches {
		branches[b.BranchID] = b.Name
	}
	for _, r := range records {
		if r.Kind != "expense" || r.VoidedAt != nil || !in(r.OccurredAt, a, z) {
			continue
		}
		if bills && !utilityCategory(r.Category) {
			continue
		}
		if f.Key == "finance.payroll" && r.Category != "payroll" || f.Key == "finance.rent_expenses" && r.Category != "rent" {
			continue
		}
		value := money(r.AmountMinor)
		total += value
		if r.Category == "utilities" {
			unspecified += value
		}
		if r.Category == "payroll" {
			payroll += value
			if r.ResponsibleID == nil {
				unassigned += value
			}
		}
		if r.Category == "rent" {
			rent += value
		}
		category := expenseCategories[r.Category]
		if category == "" {
			category = expenseCategories["other"]
		}
		g := rowAt(categories, category)
		add(g, "amount", value)
		add(g, "count", 1)
		p := rowAt(periods, bucket(r.OccurredAt, f.GroupBy))
		if bills {
			for _, key := range []string{"electricity", "water", "internet", "natural_gas", "utilities"} {
				if _, ok := p[key]; !ok {
					p[key] = float64(0)
				}
			}
		}
		add(p, "amount", value)
		if utilityCategory(r.Category) {
			add(p, r.Category, value)
		}
		if r.Category == "payroll" {
			add(p, "payroll", value)
		} else if r.Category == "rent" {
			add(p, "rent", value)
		} else {
			add(p, "other", value)
		}
		person := strings.TrimSpace(r.ResponsibleName)
		if person == "" {
			person = "Personel seçilmemiş"
		}
		payee := strings.TrimSpace(r.Party)
		if payee == "" {
			payee = "Alıcı belirtilmemiş"
		}
		partyKey := payee
		partyLabel := payee
		if f.Key == "finance.payroll" {
			partyKey = "unassigned"
			partyLabel = person
			if r.ResponsibleID != nil {
				partyKey = r.ResponsibleID.String()
			}
		}
		group := rowAt(parties, partyKey)
		group["name"] = partyLabel
		add(group, "amount", value)
		add(group, "count", 1)
		details = append(details, Row{"id": r.ID, "date": r.OccurredAt, "category": category, "label": r.Label, "branch": branches[r.BranchID], "person": person, "party": payee, "amount": r.AmountMinor, "actor": r.ActorName, "notes": r.Notes, "reference": r.Reference})
	}
	for _, g := range categories {
		g["share"] = ratio(num(g["amount"]), total) * 100
	}
	sort.SliceStable(details, func(i, j int) bool {
		a, b := details[i]["date"].(time.Time), details[j]["date"].(time.Time)
		if a.Equal(b) {
			return details[i]["id"].(uuid.UUID).String() < details[j]["id"].(uuid.UUID).String()
		}
		return a.After(b)
	})
	out.Metrics = []Metric{{Key: "expenses", Label: "Kayıtlı gider toplamı", Value: total, Format: "money"}, {Key: "expense_count", Label: "Gider kaydı", Value: float64(len(details)), Format: "number"}}
	if bills {
		out.Metrics[0].Label = "Toplam fatura gideri"
		out.Metrics[1].Label = "Fatura gider kaydı"
		out.Metrics = append(out.Metrics, Metric{Key: "unspecified", Label: "Türü belirtilmemiş fatura", Value: unspecified, Format: "money"})
	} else if f.Key == "finance.payroll" {
		out.Metrics = append(out.Metrics, Metric{Key: "unassigned", Label: "Personel seçilmemiş maaş gideri", Value: unassigned, Format: "money"})
	} else if f.Key == "finance.expenses" {
		out.Metrics = append(out.Metrics, Metric{Key: "payroll", Label: "Personel maaşları", Value: payroll, Format: "money"}, Metric{Key: "rent", Label: "Kira giderleri", Value: rent, Format: "money"})
	}
	out.Tables = []Table{table("expense_categories", "Giderlerin dağılımı", columns("category", "Gider kalemi", "", "count", "Kayıt sayısı", "number", "amount", "Gider", "money", "share", "Toplamdaki payı", "percent"), mapRows(categories, "category")), table("expense_periods", "Dönemlere göre giderler", columns("date", "Dönem", "", "payroll", "Maaş", "money", "rent", "Kira", "money", "other", "Diğer giderler", "money", "amount", "Toplam gider", "money"), mapRows(periods, "date"))}
	if bills {
		out.Tables[0].Title = "Fatura türlerine göre giderler"
		out.Tables[1] = table("expense_periods", "Dönemlere göre fatura giderleri", columns("date", "Dönem", "", "electricity", "Elektrik", "money", "water", "Su", "money", "internet", "İnternet", "money", "natural_gas", "Doğal gaz", "money", "utilities", "Türü belirtilmemiş", "money", "amount", "Toplam fatura", "money"), mapRows(periods, "date"))
	}
	if bills || f.Key == "finance.payroll" || f.Key == "finance.rent_expenses" {
		label := "Kira alıcısı"
		title := "Kira alıcılarına göre giderler"
		if bills {
			label = "Tedarikçi"
			title = "Tedarikçilere göre fatura giderleri"
		}
		if f.Key == "finance.payroll" {
			label = "Personel"
			title = "Personele göre maaş giderleri"
		}
		out.Tables = append(out.Tables, table("expense_parties", title, columns("name", label, "", "count", "Kayıt sayısı", "number", "amount", "Gider tutarı", "money"), mapRows(parties, "id")))
	}
	cols := columns("date", "Gider tarihi", "datetime", "branch", "Tesis", "", "category", "Gider kalemi", "", "label", "Açıklama / dönem", "", "amount", "Tutar", "money", "party", "Alıcı / kiraya veren", "", "person", "İlgili personel", "", "actor", "Kaydeden", "", "notes", "Not / belge bilgisi", "")
	title := "Gider kayıtları"
	if bills {
		title = "Fatura gider dökümü"
		cols = columns("date", "Gider tarihi", "datetime", "branch", "Tesis", "", "category", "Fatura türü", "", "label", "Açıklama / dönem", "", "amount", "Tutar", "money", "party", "Tedarikçi", "", "reference", "Fatura / referans no", "", "actor", "Kaydeden", "", "notes", "Not / belge bilgisi", "")
	}
	out.Tables = append(out.Tables, table("expense_records", title, cols, details))
	return out
}
