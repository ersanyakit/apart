// Errors is the shared error catalog. Domain and adapters refer to
// these stable codes; HTTP responses never expose underlying driver errors.
package constants

import "fmt"

type Kind uint8

const (
	Validation Kind = iota
	Unauthorized
	Forbidden
	NotFound
	Conflict
	Internal
)

type Error struct {
	Code    string
	Message string
	Kind    Kind
	Cause   error
}

func (e *Error) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Cause)
	}
	return e.Message
}
func (e *Error) Unwrap() error { return e.Cause }
func (e *Error) Is(target error) bool {
	other, ok := target.(*Error)
	return ok && e.Code == other.Code
}
func Wrap(e *Error, cause error) *Error {
	return &Error{Code: e.Code, Message: e.Message, Kind: e.Kind, Cause: cause}
}

var ErrorMessages = map[string]string{}

func define(code, message string, kind Kind) *Error {
	ErrorMessages[code] = message
	return &Error{Code: code, Message: message, Kind: kind}
}

var (
	ErrNoteChanged            = define("note_changed", "Bu not başka bir personel tarafından güncellendi. Son halini açıp tekrar deneyin; yazdığınız metin korunuyor.", Conflict)
	ErrNotFound               = define("not_found", "Kayıt bulunamadı.", NotFound)
	ErrForbidden              = define("forbidden", "Bu işlem için yetkiniz yok.", Forbidden)
	ErrUnauthorized           = define("unauthorized", "Oturum açmanız gerekiyor.", Unauthorized)
	ErrConflict               = define("conflict", "Kayıt mevcut veya başka kayıtlar tarafından kullanılıyor.", Conflict)
	ErrFloorCodeExists        = define("floor_code_exists", "Bu kat kodu tesiste zaten kullanılıyor. Mevcut katı düzenleyin veya farklı bir kod girin.", Conflict)
	ErrInternal               = define("internal_error", "İşlem tamamlanamadı. Lütfen tekrar deneyin.", Internal)
	ErrLanguage               = define("invalid_language", "Desteklenmeyen dil kodu.", Validation)
	ErrTranslation            = define("invalid_translation", "Çeviri bir metin olmalıdır.", Validation)
	ErrTranslationLength      = define("translation_too_long", "Çeviri en fazla 16000 karakter olabilir.", Validation)
	ErrDuplicateTranslation   = define("duplicate_translation", "Aynı dil için birden fazla çeviri gönderilemez.", Validation)
	ErrJSON                   = define("invalid_json", "Geçerli bir JSON nesnesi gereklidir.", Validation)
	ErrScan                   = define("invalid_json_column", "JSON alanı okunamadı.", Internal)
	ErrRole                   = define("invalid_role", "Geçersiz kullanıcı rolü.", Validation)
	ErrHotelRequired          = define("hotel_required", "Otel bilgisi gereklidir.", Validation)
	ErrBranchRequired         = define("branch_required", "Şube bilgisi gereklidir.", Validation)
	ErrFacilityName           = define("invalid_facility_name", "Tesis adı 1–200 karakter olmalıdır.", Validation)
	ErrRoomCode               = define("invalid_room_code", "Oda numarası 1–32 karakter olmalıdır.", Validation)
	ErrRoomStatus             = define("invalid_room_status", "Geçersiz oda durumu.", Validation)
	ErrDates                  = define("invalid_stay_dates", "Çıkış tarihi giriş tarihinden sonra olmalıdır.", Validation)
	ErrGuestRequired          = define("guest_required", "Rezervasyon ve konaklama için misafir adı gereklidir.", Validation)
	ErrMediaURL               = define("invalid_media_url", "Geçerli bir HTTP(S) medya adresi gereklidir.", Validation)
	ErrMediaKind              = define("invalid_media_kind", "Medya türü image veya video olmalıdır.", Validation)
	ErrMediaOrder             = define("invalid_media_order", "Medya sırası negatif olamaz.", Validation)
	ErrMediaLimit             = define("media_limit", "Bir kayda en fazla 30 medya eklenebilir.", Validation)
	ErrDuplicateMedia         = define("duplicate_media", "Aynı medya birden fazla kez eklenemez.", Validation)
	ErrUploadType             = define("unsupported_upload", "JPEG, PNG, GIF, WebP, MP4 veya WebM yükleyebilirsiniz.", Validation)
	ErrUploadSize             = define("upload_size", "Dosya boyutu sınırı aşıldı: resim 10 MB, video 50 MB.", Validation)
	ErrUploadCount            = define("upload_count", "Bir seferde 1–10 dosya yükleyebilirsiniz.", Validation)
	ErrUpload                 = define("upload_failed", "Medya yüklenemedi.", Internal)
	ErrStorage                = define("storage_failed", "Medya depolama işlemi tamamlanamadı.", Internal)
	ErrStorageKey             = define("invalid_storage_key", "Geçersiz medya dosyası.", Validation)
	ErrCredentials            = define("invalid_credentials", "Kullanıcı adı veya şifre hatalı.", Unauthorized)
	ErrPassword               = define("invalid_password", "Şifre 12–72 karakter olmalıdır.", Validation)
	ErrLoginRequired          = define("login_required", "Kullanıcı adı gereklidir.", Validation)
	ErrAuth                   = define("auth_failed", "Oturum işlemi tamamlanamadı.", Internal)
	ErrOrigin                 = define("invalid_origin", "İsteğin kaynağına izin verilmiyor.", Forbidden)
	ErrMethod                 = define("invalid_method", "Bu komut için HTTP metodu geçersiz.", Validation)
	ErrVersion                = define("invalid_version", "Desteklenmeyen komut sürümü.", Validation)
	ErrCommand                = define("invalid_command", "Bilinmeyen komut.", Validation)
	ErrPayload                = define("invalid_payload", "İstek alanları geçersiz veya eksik.", Validation)
	ErrRateLimit              = define("rate_limited", "Çok fazla istek gönderildi. Lütfen biraz bekleyin.", Validation)
	ErrDatabaseURL            = define("database_url_required", "DATABASE_URL gereklidir; .env.example dosyasına bakın.", Internal)
	ErrDatabase               = define("database_failed", "PostgreSQL bağlantısı veya sorgusu başarısız.", Internal)
	ErrJWTSecret              = define("jwt_secret_required", "JWT_SECRET en az 32 bayt olmalıdır.", Internal)
	ErrConfig                 = define("invalid_config", "Uygulama yapılandırması geçersiz.", Internal)
	ErrBootstrap              = define("invalid_bootstrap", "ADMIN_USERNAME, ADMIN_PASSWORD ve HOTEL_NAME kurulum için gereklidir.", Validation)
	ErrAlreadyInitialized     = define("already_initialized", "İlk yönetici zaten oluşturulmuş.", Conflict)
	ErrMigration              = define("migration_failed", "Migration işlemi başarısız.", Internal)
	ErrMigrationMissing       = define("migration_missing", "Uygulanmış migration için Down tanımı bulunamadı.", Internal)
	ErrMigrationName          = define("invalid_migration_name", "Migration adı küçük harf, rakam ve alt çizgiden oluşmalıdır.", Validation)
	ErrMigrationExists        = define("migration_exists", "Migration dosyası zaten var.", Conflict)
	ErrMigrationUnimplemented = define("migration_unimplemented", "Migration Up/Down fonksiyonlarını uygulayın.", Internal)
	ErrCLI                    = define("invalid_cli_command", "Bilinmeyen komut. serve, tunnel, migrate, migrate:status, migrate:rollback, migrate:reset, make:migration, admin:create veya db:seed [defaults|demo] kullanın.", Validation)
	ErrUI                     = define("ui_failed", "Next.js sunucusu başlatılamadı.", Internal)
	ErrUIUnavailable          = define("ui_unavailable", "Arayüz hazırlanıyor. Lütfen kısa süre sonra yeniden deneyin.", Internal)
	ErrNode                   = define("node_required", "Next.js SSR için Node.js ve npm gereklidir.", Internal)
	ErrServer                 = define("server_failed", "HTTP sunucusu başlatılamadı.", Internal)
)

var (
	ErrFeatureDefinition = define("invalid_feature_definition", "Özellik adı, kodu, oteli ve kategorisi gereklidir.", Validation)
	ErrFeatureType       = define("invalid_feature_type", "Geçersiz özellik veri türü.", Validation)
	ErrFeatureScope      = define("invalid_feature_scope", "Özellik bu varlık türüne atanamaz.", Validation)
	ErrFeatureOptions    = define("invalid_feature_options", "Seçenek kodları ve adları dolu ve benzersiz olmalıdır.", Validation)
	ErrFeatureRange      = define("feature_out_of_range", "Özellik değeri izin verilen aralığın dışında.", Validation)
	ErrFeatureValue      = define("invalid_feature_value", "Özellik değeri tanımlanan veri türüyle eşleşmiyor.", Validation)
	ErrFeatureDuplicate  = define("duplicate_feature", "Aynı özellik birden fazla kez atanamaz.", Validation)
	ErrFeatureRequired   = define("required_feature", "Zorunlu özellikler doldurulmalıdır.", Validation)
	ErrFeatureInUse      = define("feature_in_use", "Bu değişiklik mevcut özellik atamalarını geçersiz kılar.", Conflict)
	ErrCategoryInUse     = define("feature_category_in_use", "Bu kategoride olanaklar var. Önce olanakları başka bir kategoriye taşıyın veya silin.", Conflict)
	ErrFeatureAssigned   = define("feature_assigned", "Bu olanak birim veya tesislerde kullanılıyor. Silmeden önce bu seçimleri kaldırın.", Conflict)
	ErrFeatureFilter     = define("invalid_feature_filter", "Geçersiz özellik filtresi veya karşılaştırma işlemi.", Validation)
)

var (
	ErrFloor           = define("invalid_floor", "Kat kodu ve geçerli plan ölçüleri gereklidir.", Validation)
	ErrLayout          = define("invalid_layout", "Birim konumu veya boyutları kat planı sınırlarının dışında.", Validation)
	ErrHierarchy       = define("invalid_unit_hierarchy", "Üst birim aynı tesiste olmalı; yatak altına birim eklenemez ve döngü oluşturulamaz.", Validation)
	ErrUnitKind        = define("invalid_unit_kind", "Birim türü apartment, room, dormitory veya bed olmalıdır.", Validation)
	ErrCapacity        = define("invalid_capacity", "Misafir sayısı birimin kapasitesini aşıyor veya kapasite geçersiz.", Validation)
	ErrBunk            = define("invalid_bunk", "Ranza katı 1–10 olmalı; aynı ranza katında birden fazla yatak bulunamaz.", Validation)
	ErrRoomRequired    = define("unit_required", "Rezervasyon için bir konaklama birimi seçilmelidir.", Validation)
	ErrUnavailable     = define("unit_unavailable", "Seçilen tarihlerde birim veya bağlı birimleri müsait değil.", Conflict)
	ErrRoomDirty       = define("room_dirty", "Oda kirli olduğu için giriş yapılamaz. Önce oda durumunu Temiz olarak güncelleyin.", Conflict)
	ErrBookingState    = define("invalid_booking_transition", "Rezervasyonun mevcut durumu veya tarihleri bu işleme uygun değil.", Conflict)
	ErrCheckInExpired  = define("check_in_expired", "Rezervasyonun çıkış tarihi geçmiş. Giriş yapmadan önce rezervasyon tarihlerini düzenleyin.", Conflict)
	ErrStructureInUse  = define("structure_in_use", "Aktif rezervasyonu olan birimin yapısı değiştirilemez. Önce rezervasyonu taşıyın veya iptal edin.", Conflict)
	ErrBranchInUse     = define("branch_in_use", "Bu tesiste aktif veya yaklaşan konaklama bulunduğu için arşive kaldırılamaz.", Conflict)
	ErrBookingRequired = define("booking_required", "Konaklama işlemleri rezervasyon kaydı üzerinden yapılmalıdır.", Validation)
	ErrPlanDuplicate   = define("duplicate_placement", "Kat planında aynı birim birden fazla kez gönderilemez.", Validation)
)

var (
	ErrSeed         = define("seed_failed", "Seed işlemi tamamlanamadı.", Internal)
	ErrSeedName     = define("unknown_seed", "Bilinmeyen seed. db:seed defaults veya db:seed demo kullanın.", Validation)
	ErrSeedConflict = define("seed_conflict", "Demo kullanıcı adı başka bir otele ait veya silinmiş; mevcut kayıt değiştirilmedi.", Conflict)
)

var (
	ErrBed           = define("invalid_bed", "Yatak kodu, ölçüleri ve seviye sayısı geçerli olmalıdır.", Validation)
	ErrBedType       = define("invalid_bed_type", "Geçersiz yatak türü. Twin, oda yatak düzenidir.", Validation)
	ErrBedStructure  = define("invalid_bed_structure", "Yatak yapısı veya bu yapı için seviye sayısı geçersiz.", Validation)
	ErrSleepingPlace = define("invalid_sleeping_place", "Yatak yerinin kodu, seviyesi, konumu, ölçüleri ve kapasitesi geçerli ve benzersiz olmalıdır.", Validation)
	ErrBedEdit       = define("physical_bed_required", "Yatak türü, kapasitesi, konumu ve aktifliği Yataklar ekranından düzenlenmelidir.", Conflict)
	ErrBedLayout     = define("invalid_bed_layout", "Geçersiz oda yatak düzeni.", Validation)
)

var (
	ErrGuestIdentity = define("invalid_guest_identity", "Aynı misafir bir konaklamaya iki kez eklenemez; misafir kimliği geçerli olmalıdır.", Validation)
	ErrGuestRejoin   = define("guest_rejoin", "Çıkış yapan misafirin yeniden gelişi için yeni konaklama kaydı açın.", Conflict)
	ErrExportLimit   = define("export_limit", "Tek çıktıda en fazla 10000 kayıt alınabilir. Tarih aralığını daraltın.", Validation)
	ErrExport        = define("export_failed", "Çıktı oluşturulamadı.", Internal)
)

var (
	ErrDocumentLength      = define("document_body_too_long", "Belge içeriği 64 KB sınırını aşıyor. Metni kısaltın.", Validation)
	ErrDocumentKind        = define("invalid_document_kind", "Geçersiz belge türü.", Validation)
	ErrDocumentTemplate    = define("invalid_document_template", "Belge başlığı ve metni aynı dilde tanımlanmalıdır.", Validation)
	ErrDocumentTranslation = define("document_translation_missing", "Bu otel, belge türü ve dil için şablon tanımlayın.", Validation)
	ErrDocumentPlaceholder = define("invalid_document_placeholder", "Şablonda desteklenmeyen veya kapanmamış bir alan var.", Validation)
	ErrDocumentPayment     = define("invalid_document_payment", "Dekont tutarı, para birimi, ödeme yöntemi ve ödeme tarihi geçerli olmalıdır.", Validation)
)

var (
	ErrStaff       = define("invalid_staff", "Personelin adı, soyadı, kullanıcı adı, e-posta ve şube seçimleri geçerli olmalıdır.", Validation)
	ErrLastManager = define("last_manager", "Otelin son yöneticisi silinemez veya yetkisi düşürülemez.", Conflict)
)

var ErrReasonRequired = define("reason_required", "İşlemin gerekçesini en az 10, en fazla 2000 karakterle açıklayın.", Validation)
var ErrFolioChanged = define("folio_changed", "Folyo değişti. Güncel tutarları incelemek için folyoyu yeniden yükleyin.", Conflict)
var ErrBalanceAcknowledgement = define("balance_acknowledgement", "Açık borç, iade veya güvence bakiyesini inceleyip onaylayın.", Validation)

var ErrBlacklistIdentity = define("blacklist_identity", "Kara listeye eklemek için misafirin kimlik/pasaport numarasını ve ülkesini rezervasyonda tamamlayın.", Validation)
