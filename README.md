# apart — INTERACTIVEOTEL

PostgreSQL + GORM, Fiber v3 ve Next.js SSR ile otel, tesis, kat, daire, oda ve yatak yönetimi. İş komutlarının tamamı `/action` üzerinden çalışır; sözleşme sürümü `1`.

## Çalıştırma

Go 1.26+, Node.js 20.9+ ve PostgreSQL gerekir.

1. `.env.example` dosyasını `.env` olarak kopyalayın; PostgreSQL bağlantısını ve rastgele bir `JWT_SECRET` değerini ayarlayın.
2. `ADMIN_USERNAME`, `ADMIN_PASSWORD` (12–72 karakter) ve `HOTEL_NAME` değerlerini belirleyin.
3. `go run . admin:create` ile migrationları uygulayın ve ilk yönetici, otel ve merkez tesis kaydını oluşturun. Bu komut yalnızca boş kullanıcı veritabanında çalışır.
4. `go run .` çalıştırın. Next.js bağımlılıkları gerektiğinde kurulur. Geliştirmede `next dev` başlar; UI dosyalarını kaydetmek tarayıcıyı Fast Refresh ile günceller. Go’yu yeniden başlatmak gerekmez.
5. `http://localhost:3000` adresinde işletmenizi seçerek giriş yapın.

`.env`, yüklenen medya, node_modules ve derleme çıktıları Git'e alınmaz. Üretimde PostgreSQL TLS, HTTPS reverse proxy, güçlü kimlik bilgileri ve kalıcı `DATA_DIR` kullanın. Uygulama portu ile UI portu farklı olmalıdır. Next.js yalnızca loopback üzerinde dinler. `SKIP_UI=true` yalnızca API'yi başlatır.

### Geliştirme ve üretim

- `APP_ENV=development go run .`: tek komut, tek adres (`http://localhost:3000`); API, SSR ve HMR WebSocket aynı origin üzerinden çalışır. `.env` geliştirme ayarındaysa `go run .` yeterlidir.
- `APP_ENV=production go run .`: üretim derlemesi ve `next start`; mevcut HTTPS zorunluluğu geçerlidir.
- İlk kez bu geliştirme akışına geçerken çalışan eski Go sürecini bir kez yeniden başlatın. Sonraki `.tsx` / CSS değişiklikleri otomatik görünür. Go kaynak değişiklikleri hâlâ Go sürecinin yeniden başlatılmasını gerektirir.
- Ayrı frontend süreci isteyenler için `npm --prefix ui run dev:hot` (:3002) kullanılabilir; normal geliştirmede gerekli değildir.

## Konaklama yapısı

- Otel → tesis/şube → katlar. Kat kodları tesis içinde benzersizdir; bodrum, asma kat vb. serbest kod ve sıralama ile tanımlanabilir.
- Birim türleri: `apartment`, `room`, `dormitory`, `bed`. `parent_id` aynı tesisteki başka birime bağlar; daire içinde oda, oda içinde yatak tanımlanabilir. Yatak altına birim eklenemez; döngüler reddedilir.
- `floor_id` fiziksel katı belirtir. Kat ataması olmayan birimler de desteklenir. Çok katlı bir dairenin alt birimleri farklı katlarda bulunabilir.
- `rentable` her birimin bağımsız kiralanıp kiralanamayacağını belirler. Fiziksel yatak kapasitesi terminal alt birimlerden hesaplanır; oda ve daire rezervasyonlarında kişi sayısına üst sınır koymaz.
- Ranza bir konaklama türü değil, yatakların `bed_group` ve `bed_level` ile tanımlanan fiziksel düzenidir. 100 yatak / 2 seviye toplu tanımı 50 ranza grubu oluşturur. Çift kişilik yatak için yatak kapasitesi 2 seçilebilir.
- Kat planı `x`, `y`, `width`, `height` koordinatlarıyla saklanır. Toplu plan değişiklikleri ve toplu birim oluşturma atomiktir. Toplu oluşturmada tek istekte en fazla 1000 birim tanımlanır.
- Birim tanımından kat/üst birim değiştirilebilir. Aktif rezervasyonu etkileyecek yapısal değişiklik ve silme engellenir; önce rezervasyon taşınmalı veya iptal edilmelidir.

## Rezervasyon ve hareketler

Rezervasyon oda üzerindeki geçici alanlardan bağımsız bir kayıttır. Başlangıç durumu `confirmed`; `check_in` → `checked_in`, `check_out` → `completed`, giriş yapılmamış rezervasyon için `cancel` → `cancelled`.

Planlanan girişten önce gelen misafir, birim gerçek giriş anından planlanan çıkışa kadar müsaitse aynı rezervasyon üzerinden erken giriş yapabilir. Planlanan tarihler korunur; `actual_check_in` ve birim tahsisinin başlangıcı gerçek giriş anını kaydeder. Erken girişten sonra taşıma ve çıkış işlemleri bu gerçek başlangıcı kullanır.

Giriş yapılmış rezervasyonların planlanan tarihleri düzenlenebilir. Gerçek giriş saati, konaklama durumu ve önceki oda tahsisleri korunur; yeni çıkış tarihi ileri bir zaman olmalı ve mevcut odada başka rezervasyonla çakışmamalıdır. Oda değişikliği rezervasyon düzenleme yerine taşıma işlemiyle yapılır.

Bir rezervasyon bir kiralanabilir birimin tamamını ayırır: daire, oda veya tek yatak. Aynı tarihlerde birimin kendisi, üst birimleri ve alt birimleri çakışır; kardeş yataklar ayrı kiralanabilir. Zaman aralıkları `[giriş, çıkış)` olarak değerlendirilir; aynı çıkış anında sonraki rezervasyon başlayabilir. Çıkışı gecikmiş ve hâlâ konaklayan misafir yeni rezervasyon için engel sayılır.

Rezervasyon oluşturma/güncelleme, taşıma ve karşılıklı değişim aynı tesis için PostgreSQL transaction advisory lock altında doğrulanır. Tek tek kiralanan yatakların kişi sınırı, bakım durumu ve tarih çakışması kontrolü ile kayıt aynı transaction içindedir. Bu koruma uygulamadaki yazma yolları içindir; doğrudan SQL yazan başka bir sistem aynı kilit protokolüne uymalıdır.

`move` konaklayan misafiri işlem anından itibaren başka birime taşır; eski tahsis süresi saklanır. `swap` iki rezervasyonun birimlerini atomik değiştirir ve iki tarafın uygunluğunu ve yatak birimlerinde kişi sınırını kontrol eder. Giriş yapılmamış iki rezervasyonun karşılıklı değişimi aynı giriş anını gerektirir. Çıkışta kullanılan birim ve alt birimleri kirli duruma alınır; temizlik durumu rezervasyondan ayrıdır.

Bu kapsam rezervasyon/konaklama ve fiziksel birim yönetimidir. Ödeme, faturalama, kanal yöneticisi veya resmî kimlik bildirimi entegrasyonu içermez; bunlar için başarı simülasyonu yapılmaz.

## API

`constants/Commands.go` izin verilen komut ve HTTP metodunun tek kaynağıdır. `constants/Errors.go` hata kodlarını ve mesajlarını tutar. `go generate ./constants` UI sözleşmesini günceller.

POST/PUT/DELETE gövdesi:

```json
{"version":"1","code":"floor.create","payload":{"branch_id":"UUID","code":"3","label":{"TR":"3. Kat","EN":"Third floor"},"sort_order":3,"width":2400,"height":1600}}
```

GET isteklerinde `version`, `code`, JSON `payload` query parametreleri gönderilir. Cookie ile yazma yapan istemciler `X-Requested-With: INTERACTIVEOTEL` başlığını gönderir; tarayıcı origin denetimi de uygulanır. JWT HttpOnly cookie veya Bearer başlığıyla taşınır. Logout oturumu sunucuda iptal eder.

| İşlem | Komutlar |
| --- | --- |
| Giriş | `auth.properties` (yalnızca işletme kart bilgileri), `auth.login`, `auth.logout` |
| Başlangıç / seçim | `system.initial_sync`; `hotel_id`, `branch_id`, isteğe bağlı `floor_id` |
| Otel / tesis | `hotel.list/create/update`, `branch.list/create/update/delete` |
| Kat / plan | `floor.list/create/update/delete`, `floor.plan`, `floor.plan.save` |
| Birimler | `room.list/create/update/delete`, `room.bulk_create`, `room.state` |
| Müsaitlik | `room.availability` — giriş, çıkış, kişi sayısı |
| Rezervasyon | `booking.list/create/update`, `booking.transition` |
| Taşıma / değişim | `booking.transition` veya `room.exchange`: `action: move/swap` |
| Olanaklar | `feature.registry`, kategori ve özellik kayıtları, `feature.assign`, `room.filter` |
| Medya | `media.list/upload/update/delete`; görüntüleme `/media/:id` |

`booking.transition` payload: `branch_id`, `booking_id`, `action`; taşıma için `target_id`, karşılıklı değişim için `other_booking_id`. Kat planını almak için `floor.plan` payload: `{"id":"KAT_UUID"}`. Plan kaydı: `floor_id`, `placements: [{room_id, position:{x,y,width,height}}]`. Tesisin tüm odaları için `room.list` payload: `hotel_id`, `branch_id`; yalnızca bir kat için ayrıca `floor_id`.

Medya resim ve video destekler; otel/tesis/birim/özellik kayıtlarına birden fazla medya bağlanabilir. Başlık, açıklama ve alternatif metin JSON olarak çok dillidir. Desteklenen diller sözleşmede listelenir: TR, EN, DE, FR, RU, AR, NE, TH, ZH-CN, ZH-TW. Olanaklar boolean, integer, decimal, string, enum ve multi_enum tipleriyle tanımlanır.

## Mimari ve migrationlar

`internal/domain`: kurallar ve repository portları. `internal/application`: yetkilendirme ve kullanım senaryoları. `internal/infrastructure/persistence`: PostgreSQL/GORM modelleri, eşlemeler ve transaction uygulamaları. `internal/interfaces/httpapi`: Fiber komut handler'ı. UI, aynı origin altındaki Fiber API'sini kullanır; ilk oturum verisi Next.js tarafından sunucuda okunur.

GORM model tanımları yalnızca `internal/infrastructure/persistence/models` içindedir; migration altında model kopyası yoktur. İlk kurulum migrationı bu modelleri kullanır. Sonraki değişiklikler açık Up/Down adımlarıyla eklenmelidir; uygulanmış başlangıç migrationının dosyasını değiştirmek çalışan veritabanını güncellemez. Migration kayıtlarındaki sıra kimlikleri API sürümü değildir.

```sh
go run . make:migration add_example_field
go run . migrate
go run . migrate:status
go run . migrate:rollback   # son batch
go run . migrate:reset      # tüm migrationlar, veri kaybına yol açar
```

Oluşturulan migration boş olarak uygulanmaz: Up/Down işlevleri yazılana kadar merkezi `migration_unimplemented` hatasını döndürür. PostgreSQL DDL ve migration geçmişi tek transaction içindedir.

## Doğrulama

```sh
go test ./...
go vet ./...
TEST_DATABASE_URL='postgres://...' MIGRATION_TEST_DATABASE_URL='postgres://...' go test -race ./...
npm --prefix ui ci
npm --prefix ui run lint
npm --prefix ui run build
```

PostgreSQL entegrasyon testleri her çalıştırmada kendi geçici şemasını oluşturur/siler; uygulama şemasına dokunmaz. Veritabanı ortam değişkeni verilmezse bu testler atlanır.

Tarayıcı testi için ayrı, yalnızca teste ayrılmış bir veritabanı oluşturun:

```sh
DATABASE_URL='postgres://.../interactiveotel_e2e' ADMIN_USERNAME=e2e ADMIN_PASSWORD=isolated-e2e-password HOTEL_NAME='E2E Hotel' go run . admin:create
E2E_DATABASE_URL='postgres://.../interactiveotel_e2e' npm --prefix ui run test:e2e
```

Playwright Chromium gerekir (`cd ui && npx playwright install chromium`). İsteğe bağlı `CHROME_PATH` ile yerel Chrome binary yolu verilebilir. Test sunucusu 3100/3101 portlarını kullanır; test kayıtları bu ayrı veritabanında kalır. Testler işletme seçimi, 100 yatak kaydı, SSR yenileme, rezervasyon hareketleri, plan kaydı ve çok dilli medya/olanak kaydını kapsar.

## Seedler ve demo

Seedler şema migrationlarından ayrıdır: `internal/infrastructure/seeding/Registry`. Tümü `go run . db:seed`, tek seed `go run . db:seed demo` ile çalıştırılır. İlk demo kurulumu için:

```sh
DEMO_PASSWORD='kendinizin-belirledigi-en-az-12-karakter' go run . db:seed demo
```

`Interaktif Test Otel`, otel yöneticisi `demo` (ad: Demo, soyad: Demo), üç kat, beş örnek oda, daire, hostel odası ve fiziksel yatak örnekleri oluşur. Aynı seed tekrar çalıştırıldığında kayıt çoğaltılmaz, şifreler ve düzenlenmiş kayıtlar değiştirilmez. Silinmiş kayıtlar otomatik geri açılmaz. Seedler sunucu açılışında kendiliğinden çalışmaz; PostgreSQL kilidi ve tek transaction ile uygulanır.

Giriş sırası otel → personel kartı → şifredir. `auth.people`, seçilen şubenin yetkili personelinin yalnızca adını ve kullanıcı kimliğini döndürür; soyadı, e-posta ve kullanıcı adı halka açık listeye gönderilmez. Personel tanımları otel bazında yapılır; rol ve şube erişimleri API tarafında denetlenir. Personel silme/güncelleme açık oturumları iptal eder.

## Fiziksel yatak envanteri

Kat ve oda tanımları aynı ekrandadır. Yataklar sekmesindeki her kayıt tek fiziksel yapıyı temsil eder; aynı odadaki iki ranza iki ayrı kayıttır. `single`, `double`, `queen`, `king`, `bunk_bed`, `loft_bed`, `capsule_bed`, `sofa_bed`, `futon`, `murphy_bed`, `rollaway_bed`, `crib`, `daybed` sabit tür kodlarıdır. Yapı, seviye sayısı, genişlik ve uzunluk ayrı alanlardır. `twin`, oda üzerindeki `bed_layout` değeridir.

Her `sleeping_place` mevcut rezervasyon birimine (`unit_id`) bağlanır. Seviye, alt/orta/üst konum, ölçüler, kişi kapasitesi, aktiflik ve ayrı kiralanabilirlik tutulur. Kapasite aktif yerlerden toplanır; kat sayısından hesaplanmaz. Örneğin altı çift kişilik, üstü tek kişilik ranza 3 kişidir. Pasif yatak yeri rezerve edilemez. Eski yatak birimleri migration ile aynı rezervasyon kimliği korunarak fiziksel yapıya bağlanır.

## Silme ve işlem günlükleri

Oda/birim, kat, tesis, fiziksel yatak, medya, personel ve özellik tanımı silme işlemleri soft delete kullanır. Toplu oda silme alt birimleri birlikte arşivler; aktif rezervasyonu olan birim veya üst birimi varsa batch bütünüyle reddedilir. Geçmiş rezervasyon tahsisleri, misafir geçmişi ve belge içerikleri korunur. Kayıt kodları yeniden kullanılamaz.

GORM yazma callback'leri aynı transaction içinde otel kimliği, kullanıcı, komut, kayıt kimliği, işlem ve zaman içeren audit kaydı oluşturur. Parola ve belge/misafir içerikleri log metnine yazılmaz. `audit.list` yalnızca yetkili yöneticinin erişebildiği otel için çalışır. Sistem Logları ekranı tarih/işlem filtresi ve sayfalama içerir. Silinmiş kayıtların yönetim arayüzünden geri yüklenmesi henüz sunulmaz.

Oda durumları temiz, kirli, arızalı, tadilatta ve boştur; doluluk ve rezervasyon seçili tarihteki tahsislerden hesaplanır. Çıkış kullanılan birimleri kirli yapar. Bakım ve arıza, ilgili birim/üst birim/alt birimde yeni rezervasyon açılmasını engeller.

## Misafir geçmişi, belgeler ve çıktılar

Misafirler otel bazlı kimliklerle ve rezervasyon üyelikleriyle saklanır. Konaklama başladıktan sonra `booking.guests.update` ile yeni kişi eklenebilir. Oda/daire kişi sayısı rezervasyonda belirlenir; kapasite sınırı yalnızca tek tek kiralanan yataklarda kontrol edilir. Eklenme/ayrılma zamanları saklanır. İsim benzerliğiyle farklı insanlar birleştirilmez. Bir misafirin geçmişine tıklandığında oda tahsisleri, saatler ve o aralıkta birlikte kaldığı kişiler görüntülenir. Tarih, isim/kimlik/telefon, durum filtreleri ve sütun başlıklarından sıralama desteklenir.

Excel/PDF çıktıları ekrandaki sorgunun tamamını kapsar (en fazla 10000 satır); yalnızca görünen sayfa dışa aktarılmaz. Excel hücrelerine kullanıcı girdileri formül olarak yazılmaz. PDF üretiminde Playwright Chromium kullanılır:

```sh
cd ui
npx playwright install chromium
```

Alternatif olarak `CHROME_PATH` ile kurulu Chrome yolu verilebilir; macOS'taki standart Chrome kurulumu otomatik bulunur. Sunucunun ilgili dilleri destekleyen sistem fontları olmalıdır. PDF sayfası dış ağ kaynakları yükleyemez ve şablon metni HTML olarak çalıştırılmaz.

Her otel için ayrı kira/satış sözleşmesi, rezervasyon/tahsilat/iptal belgesi şablonları tanımlanır. Başlık ve metin desteklenen her dil için ayrı kaydedilebilir; eksik dil sessizce başka dille değiştirilmez. Örnek kira metni kullanıcının sağladığı içerikten hazırlanmıştır; işletme unvanı, turizm belge numarası ve koşullar otel tarafından düzenlenir. Oluşturulmuş belge, metin ve ödeme alanlarının değişmez anlık kopyasını saklar; şablon güncellemesi eski belgeleri değiştirmez. Tahsilat dekontu tutar, para birimi, yöntem ve tarih gerektirir. Bu kayıt banka/POS üzerinden ödeme çekmez; KBS'ye bildirim göndermez.

| Ek işlev | Komutlar |
| --- | --- |
| Personel | `staff.list/create/update/delete`, `auth.people` |
| Yatak | `bed.list/create/update/delete` |
| Toplu silme / günlük | `room.delete_many`, `audit.list` |
| Misafir sorgusu / çıktı | `guest.stays`, `guest.export`, `booking.guests.update` |
| Şablonlar | `document.templates`, `document.template.defaults`, `document.template.save` |
| Belgeler | `document.list/preview/issue/download` |

Sağ tık menüsü rezervasyon, satış/giriş, çıkış, misafirler, oda değişimi, durum ve belge işlemlerine bağlıdır. Onaylar uygulama modalı olarak gösterilir; native `alert`, `confirm` ve `prompt` kullanılmaz.

## Ülke adları ve arayüz dili

Ayarlar → Dil seçimi ülke/uyruk adlarını ve ilgili seçim alanlarını günceller. Desteklenen diller backend ile aynıdır: TR, EN, DE, FR, RU, AR, NE, TH, ZH-CN ve ZH-TW. Tercih bu cihazda `interactiveotel.locale` anahtarıyla saklanır; başlangıç dili Türkçedir. Dil değişikliği kayıtlı ülke kodlarını, misafir uyruğunu veya para birimi tercihini değiştirmez.

Ortak `I18nProvider` ve `useI18n()` arayüze `locale`, `direction`, `setLocale` ve tip kontrollü `t(key, params)` sağlar. Dil tanımları `ui/src/lib/i18n/config.ts`, metin sözlükleri `messages.ts` içindedir. Yeni çevrilebilir metinleri bu sözlüklere ekleyip `t()` ile kullanın. Bu aşamada ülke/uyruk alanları çevrilmiştir; diğer ekran metinleri henüz bu sözlüklere taşınmamıştır.

Ülke adları `Intl.DisplayNames` ile üretilir, dile göre sıralanır ve önbelleğe alınır. `getCountries(locale)`, `countryByCode(code, locale)` ve `searchCountries(query, limit, locale)` aynı kaynağı kullanır. Arama seçili dildeki adları, İngilizce/Türkçe adları ve ISO kodlarını kabul eder; sonuçları seçili dilde gösterir. Arapça seçim alanları sağdan sola görüntülenir. Yerelleştirme desteği bulunmayan ortamlarda paketlenmiş ülke adlarına dönülür.

Dil ve ülke araması kontrolleri: `npm --prefix ui run test:i18n`. Tip kontrolü: `npm --prefix ui run lint`.

## Konaklama takvimi ve işlem kayıtları

Menü → Konaklama Takvimi günlük/haftalık oda çizelgesini ve aylık çok günlük konaklama şeritlerini gösterir. Bir kayda dokunmak konaklayanları, tarihler, notlar ve gecelik fiyatı açar. Arama ve durum filtreleri uygulanır; CSV seçilen dönemin filtrelenmiş oda tahsislerini, Yazdır / PDF görünen takvimi dışa aktarır. PDF tarayıcının yazdırma penceresinden kaydedilir. Bileşen `ui/src/components/hotel-calendar/HotelCalendar.tsx` üzerinden rezervasyon/birim verisi ve tesis adı alır; API veya oturum bağımlılığı yoktur. Tarih ve export kontrolleri: `npm --prefix ui run test:calendar`.

İşlem logları başarılı veri değişiklikleriyle aynı veritabanı işleminde yazılır. Misafir girişi/çıkışı, iptal, taşıma, takas, oturum açma/kapatma ve özellik atamaları ayrı adlarla görünür. Mevcut oluşturma/güncelleme/silme kayıtları korunur. Rezervasyonlarda önceki/sonraki durum, kişi sayısı, tarihler ve fiyat bulunur; parola, oturum anahtarı ve kimlik numarası log detaylarına kopyalanmaz. Başarısız işlemler başarı kaydı üretmez. Eski logların bulunmayan işlem detayları geriye dönük uydurulmaz.

Login footer markası `constants/Brand.go` içindeki `BrandName` ve `BrandURL` değerlerinden `go generate ./constants` ile UI sözleşmesine aktarılır. Logo `ui/src/assets/brand/researchcave.svg` dosyasındadır.
