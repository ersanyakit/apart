package constants

type UserRole string

const (
	UserRoleReception    UserRole = "reception"         // Resepsiyon: Check-in / check-out, misafir karşılama ve oda atama işlemleri
	UserRoleAccounting   UserRole = "accounting"        // Muhasebe: Fatura, ödeme, gelir-gider ve finansal raporlama
	UserRoleHousekeeping UserRole = "housekeeping"      // Kat Hizmetleri: Oda temizliği, düzeni ve durum güncellemeleri
	UserRoleTechnical    UserRole = "technical_service" // Teknik Servis: Arıza, bakım ve teknik ekipman sorunları
	UserRoleMaintenance  UserRole = "maintenance"       // Bakım Ekibi: Genel tesis bakım işleri (elektrik, su, mekanik)
	UserRoleManagement   UserRole = "management"        // Yönetim: Tüm sistem üzerinde geniş yetkiler, rapor ve karar mekanizması
	UserRoleSupervisor   UserRole = "supervisor"        // Sorumlu: Departman denetimi ve operasyon kontrolü
	UserRoleGuest        UserRole = "guest"             // Misafir: Otel müşterisi, sadece kendi rezervasyon ve bilgilerini görür

	UserRoleAdmin      UserRole = "admin"      // Sistem Yöneticisi: Tüm kullanıcılar ve sistem üzerinde tam yetki
	UserRolePending    UserRole = "pending"    // Beklemede: Hesabı oluşturulmuş ancak henüz onaylanmamış kullanıcı
	UserRoleVerified   UserRole = "verified"   // Doğrulanmış: Kimliği veya hesabı onaylanmış kullanıcı
	UserRoleUnverified UserRole = "unverified" // Doğrulanmamış: Henüz doğrulama işlemi tamamlanmamış kullanıcı
	UserRoleBanned     UserRole = "banned"     // Yasaklı: Sisteme erişimi engellenmiş kullanıcı
	UserRoleDeleted    UserRole = "deleted"    // Silinmiş: Hesabı pasif hale getirilmiş kullanıcı
)

func (r UserRole) IsValid() bool {
	switch r {
	case UserRoleReception,
		UserRoleAccounting,
		UserRoleHousekeeping,
		UserRoleTechnical,
		UserRoleMaintenance,
		UserRoleManagement,
		UserRoleSupervisor,
		UserRoleGuest,
		UserRoleAdmin,
		UserRolePending,
		UserRoleVerified,
		UserRoleUnverified,
		UserRoleBanned,
		UserRoleDeleted:
		return true
	}
	return false
}

func ParseUserRole(s string) (UserRole, error) {
	r := UserRole(s)

	switch r {
	case UserRoleReception,
		UserRoleAccounting,
		UserRoleHousekeeping,
		UserRoleTechnical,
		UserRoleMaintenance,
		UserRoleManagement,
		UserRoleSupervisor,
		UserRoleGuest,
		UserRoleAdmin,
		UserRolePending,
		UserRoleVerified,
		UserRoleUnverified,
		UserRoleBanned,
		UserRoleDeleted:
		return r, nil
	}

	return "", ErrRole
}
