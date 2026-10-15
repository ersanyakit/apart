package constants

type ReportGroupDefinition struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func ReportGroups() []ReportGroupDefinition {
	return []ReportGroupDefinition{
		{"management", "Yönetim", "İşletmenizin genel durumunu, performansını ve önemli göstergelerini inceleyin."},
		{"finance", "Finans", "Tahsilatları, ödemeleri, bakiyeleri ve finansal hareketleri takip edin."},
		{"occupancy", "Doluluk", "Oda ve yatak kullanımını, müsaitliği ve doluluk eğilimlerini inceleyin."},
		{"reservations", "Rezervasyon", "Rezervasyon akışını, giriş ve çıkışları, iptalleri takip edin."},
		{"pricing", "Gelir yönetimi", "Gelir performansını ve fiyatlandırma göstergelerini karşılaştırın."},
		{"guests", "Misafir", "Müşterilerinizi, misafir profilini ve konaklama geçmişini inceleyin."},
		{"staff", "Personel", "Personel faaliyetlerini ve ekip performansını takip edin."},
		{"operations", "Operasyon", "Temizlik, bakım ve günlük operasyon kayıtlarını inceleyin."},
		{"apart", "Apart", "Apart işletmenizin konaklama ve tahsilat durumunu takip edin."},
		{"hostel", "Hostel", "Hostelinizin yatak kullanımını ve konaklama performansını inceleyin."},
	}
}
