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

### Cloudflared ile dışarıdan erişim

macOS'ta bir kez `brew install cloudflared` çalıştırın. Mevcut `go run .` sürecini durdurup proje kökünde başlatın:

```sh
go run . tunnel
```

Bu komut Go, Next.js ve Cloudflared'i birlikte çalıştırır. Terminaldeki `https://….trycloudflare.com` adresini açın; normal kullanıcı hesabınızla giriş yapın. API, medya, SSR ve geliştirme WebSocket'i aynı adresten geçer. Üretilen adres API kaynak denetimine ve Next.js `allowedDevOrigins` ayarına otomatik aktarılır; oturum çerezleri HTTPS/Secure olur. `.env` değiştirilmez. Tünel açıkken hem terminaldeki HTTPS adresi hem `http://localhost:PORT` kullanılabilir; bu iki adres dışında yazma isteklerine izin verilmez. Oturumlar adres bazında ayrıdır. `Ctrl+C` uygulamayı ve tüneli kapatır. Tünel süreci beklenmedik şekilde kapanırsa uygulama da kapanır.

`PORT` ve `UI_PORT` mevcut ayarlardan alınır; Cloudflare hedefi **Go portudur** (varsayılan `http://127.0.0.1:3000`), Next.js portu değildir. Port doluysa tünel açılmaz. `BIND_HOST=127.0.0.1` kullanın. Yerel Cloudflare yapılandırmanız ve named tunnel kimlik bilgileriniz değiştirilmez.

[Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) geçici geliştirme/paylaşım içindir; adres her başlatmada değişir. `APP_ENV=development` gerektirir. Kalıcı alan adı için Cloudflare panelinde bir named tunnel ve Published application route oluşturun:

- Hostname: kendi alan adınız (örnek `otel.example.com`).
- Service: `http://127.0.0.1:3000` (özel `PORT` kullanıyorsanız onu yazın).
- Uygulamanın `.env` dosyasında `APP_URL=https://otel.example.com` ayarlayın; üretim derlemesi için `APP_ENV=production` kullanın. `go run .` ile başlatın.
- Cloudflare panelinden aldığınız token'ı ikinci terminalde `TUNNEL_TOKEN` ortam değişkenine alın ve `cloudflared tunnel --no-autoupdate run` çalıştırın. Token'ı repoya veya komut argümanına yazmayın. [Token ile çalıştırma](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/#token).

Named tunnel servis olarak ayrıca yönetilir; uygulamanın `Ctrl+C` ile kapatılması o servisi kapatmaz. Public hostname mevcut giriş ekranını internete açar; Cloudflare Access ile ek erişim kısıtlaması da tanımlanabilir.

## Kullanıcı görünüm tercihleri

Tüm sidebar sayfaları ortak `PageHeader` bileşenini kullanır: başlık, açıklama, araç çubuğu, alt ayırıcı ve sağdaki aç/kapat düğmesi. Daraltma durumu her sayfa için ayrı saklanır. Konaklayan Listesi'nde arama, kat seçimi ve başlangıç tarihi başlıkla birlikte daralır. Çizelgenin dönem gezinmesi, durum, gün sayısı ve boş birim kontrolleri görünür kalır.

Tema, arka plan, yazı boyutu, dil, ülke/para biçimi, sidebar açıklığı, takvim/konaklayan görünüm seçenekleri ve log sayfa boyutu oturumdaki kullanıcının `users.preferences` JSONB alanında tutulur. `user.preferences` (GET) ve `user.preferences.update` (PATCH) yalnızca oturum sahibini hedefler; payload'dan kullanıcı kimliği alınmaz. Kısmi güncellemeler atomik birleşir. Başka kullanıcıların tercihlerinin devralınmaması için eski ortak localStorage anahtarları içe aktarılmaz. Kaydetme hatası ortak bildirimle gösterilir; Ayarlar ekranından yeniden denenebilir. Migration normal sunucu başlangıcında uygulanır.

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

Seedler şema migrationlarından ayrıdır: `internal/infrastructure/seeding/Registry`. `go run . db:seed` veya `go run . db:seed defaults` yalnızca zorunlu ortak kataloğu yükler; demo oteli, kullanıcı, oda veya stok oluşturmaz. İlk demo kurulumu ayrıca ve açıkça istenir:

```sh
DEMO_PASSWORD='kendinizin-belirledigi-en-az-12-karakter' go run . db:seed demo
```

`Interaktif Test Otel`, otel yöneticisi `demo` (ad: Demo, soyad: Demo), üç kat, beş örnek oda, daire, hostel odası ve fiziksel yatak örnekleri oluşur. Aynı demo seed tekrar çalıştırıldığında kayıt çoğaltılmaz, şifreler ve düzenlenmiş işletme kayıtları değiştirilmez. Silinmiş demo kayıtları otomatik geri açılmaz. Demo seed sunucu açılışında çalışmaz; PostgreSQL kilidi ve tek transaction ile uygulanır.

Zorunlu katalog `internal/domain/catalog/defaults.json` içinde 20 ana kategori, alt gruplar ve 682 tanımdan oluşur. Sunucu açılışı ve `migrate` mevcut otellere, yeni otel kaydı ve ilk yönetici kurulumu yeni otele kataloğu otomatik ekler. `catalog.<kategori>.<alt_grup>.<ürün>` kodları ve `icon_key` değerleri tüm otellerde aynıdır. Türkçe ve İngilizce etiketler bulunur; arayüzde diğer diller için İngilizce yedek etiket kullanılır. Yeni çeviriler her kategori, alt grup ve tanımın `label` nesnesine mevcut `LocalizedString` dil kodlarıyla eklenir (ör. `"TR": "Duş", "EN": "Shower", "DE": "Dusche"`). Sürümlü JSON dosyası `defaults.schema.json` ile editörde doğrulanabilir; Go yükleyicisi ayrıca desteklenen dilleri, zorunlu TR/EN etiketlerini, benzersiz anahtarları ve sıraları, kategori/grup ilişkilerini, tür ve kapsam alanlarını doğrular. Anahtarlar ve `sort_order` dosyada açıkça tutulur; çevirilerden veya dosyadaki konumdan türetilmez. `db:seed defaults` aynı JSON verisini tekrar çalıştırılabilir biçimde veritabanına uygular. Standart tanımlar sistem tarafından yönetilir; oteller ayrıca kendi özelliklerini tanımlayabilir.

`amenity_categories` / `amenities` ortak var-yok tanımlarını, `inventory_categories` / `inventory_items` fiziksel ürün ve sarf tanımlarını tutar. Mevcut tenant bazlı özellik API'si korunur: oda formunda yapılan seçimler aynı transaction içinde `room_amenities` ve adetleriyle `room_inventory` tablolarına da yazılır. Tesis atamaları `property_amenities` tablosuna yansır. `inventory_assets` tekil demirbaşlar için, `inventory_movements` stok giriş/çıkışları ve oda adet değişimleri için ayrıdır. Oda adet değişiminin türü `room_assignment` olup depo stok girişi olarak değerlendirilmez. Katalog yükleme hiçbir atama, fiziksel demirbaş veya stok hareketi oluşturmaz. Güvenlik kamerası ve tesis ekipmanları `property` kapsamındadır ve oda seçiminde görünmez; API de odaya atamayı reddeder. Envanterde yatak seçmek rezervasyon kapasitesi veya fiziksel yatak yeri oluşturmaz; bunlar Yataklar ekranından yönetilir.

Giriş sırası otel → personel kartı → şifredir. `auth.people`, seçilen şubenin yetkili personelinin yalnızca adını ve kullanıcı kimliğini döndürür; soyadı, e-posta ve kullanıcı adı halka açık listeye gönderilmez. Personel tanımları otel bazında yapılır; rol ve şube erişimleri API tarafında denetlenir. Personel silme/güncelleme açık oturumları iptal eder.

## Fiziksel yatak envanteri

Kat ve oda tanımları aynı ekrandadır. Yataklar sekmesindeki her kayıt tek fiziksel yapıyı temsil eder; aynı odadaki iki ranza iki ayrı kayıttır. `single`, `double`, `queen`, `king`, `bunk_bed`, `loft_bed`, `capsule_bed`, `sofa_bed`, `futon`, `murphy_bed`, `rollaway_bed`, `crib`, `daybed` sabit tür kodlarıdır. Yapı, seviye sayısı, genişlik ve uzunluk ayrı alanlardır. `twin`, oda üzerindeki `bed_layout` değeridir.

Her `sleeping_place` mevcut rezervasyon birimine (`unit_id`) bağlanır. Seviye, alt/orta/üst konum, ölçüler, kişi kapasitesi, aktiflik ve ayrı kiralanabilirlik tutulur. Kapasite aktif yerlerden toplanır; kat sayısından hesaplanmaz. Örneğin altı çift kişilik, üstü tek kişilik ranza 3 kişidir. Pasif yatak yeri rezerve edilemez. Eski yatak birimleri migration ile aynı rezervasyon kimliği korunarak fiziksel yapıya bağlanır.

## Silme ve işlem günlükleri

Oda/birim, kat, tesis, fiziksel yatak, medya, personel ve özellik tanımı silme işlemleri soft delete kullanır. Toplu oda silme alt birimleri birlikte arşivler; aktif rezervasyonu olan birim veya üst birimi varsa batch bütünüyle reddedilir. Geçmiş rezervasyon tahsisleri, misafir geçmişi ve belge içerikleri korunur. Kayıt kodları yeniden kullanılamaz.

GORM yazma callback'leri aynı transaction içinde otel kimliği, kullanıcı, komut, kayıt kimliği, işlem ve zaman içeren audit kaydı oluşturur. Parola ve belge/misafir içerikleri log metnine yazılmaz. `audit.list` yalnızca yetkili yöneticinin erişebildiği otel için çalışır. Sistem Logları ekranı tarih/işlem filtresi, sayfa numaraları ve 25/50/100 kayıt seçimi içerir. API `page_size` verilmediğinde eski 100 kayıt davranışını korur; yanıtta `total`, `page` ve `page_size` döner. Filtre, otel veya sayfa boyutu değiştiğinde ilk sayfaya dönülür. Silinmiş kayıtların yönetim arayüzünden geri yüklenmesi henüz sunulmaz.

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

### Raporlamalar

Sol menüde **Otel Operasyonu → Raporlamalar → Sistem Ayarları** sıralaması
korunur. Raporlamalar grubundaki her rapor ayrı sayfadır; örneğin
`/?tab=report.finance.daily_revenue` veya `/?tab=report.staff.shifts`.
Sayfa başlığının daraltma tercihi `header.report.<kategori>.<rapor>` anahtarıyla
kullanıcı hesabına kaydedilir. Yönetici ve işletme yönetimi rolleri erişebilir.

- `internal/domain/reporting`: rapor sicili, ortak filtre/sonuç sözleşmesi ve
  hesaplamalar. Yeni bir uygulama `Report` arayüzü ve `Register` ile eklenebilir.
  `go run ./cmd/contracts` menü tanımlarını ve komut sözleşmesini UI'a üretir.
- `internal/application/reporting.go`: rol/otel yetkisi ve doğrulama.
- `internal/infrastructure/persistence/reporting.go`: aynı PostgreSQL okuma
  anlık görüntüsünde tesis, rezervasyon, yerleşim ve rapor kayıtlarını yükler.
- `report_records`: 019 migration ile oluşturulan, kullanıcı ve tarih bilgili
  finans/operasyon defteri. `report.record` istemci UUID'si tekrar gönderildiğinde
  ikinci tahsilat oluşturmaz. `report.void` gerekçeli iptal yapar; kayıt ve sistem
  logu korunur. Aktif rezervasyon rapor bilgisi, vardiya ve açık hesap referansları
  veritabanında tekilleştirilir.

`report.catalog`, `report.generate`, `report.record`, `report.void` ortak
`/action` API'sini kullanır. Tarihler İstanbul saat dilimindedir, bitiş günü
rapora dahildir ve bir sorgu en fazla 366 günü kapsar. Sorgular tenant/tesis
kapsamında çalışır; 50.000 rezervasyon veya 100.000 kaynak kaydı aşılırsa eksik
sonuç döndürmek yerine hata verilir. CSV dışa aktarma seçilen raporun tüm
satırlarını içerir ve elektronik tablo formüllerini etkisizleştirir.

**Veri ve hesaplama kuralları:** Konaklama geliri gerçek giriş/çıkış varsa bu
aralığın hizmet gecelerinden; gelecek satışlar mevcut rezervasyonlardan
hesaplanır. Oda/yatak değişimi aynı geceyi çoğaltmaz. Para birimleri çevrilmez
ve birleştirilmez. Eski rezervasyonlarda para birimi/kaynak saklanmadığından,
rapor bilgisi girilene kadar TRY / Belirtilmemiş kullanılır. Eski kapora bakiye
hesabından düşülür; tarihli tahsilat diye gösterilmez. Belge düzenlemek tek
başına finansal işlem oluşturmaz.

Ek gelir ve gider tahakkuku, tahsilat/ödeme/iade hareketlerinden ayrıdır.
Tahsilatlara eski kaporayı tekrar girmeyin. Açık hesaplar aynı tesis, döviz ve
referanstaki tahsilat/ödeme ile kapanır. Vardiya referansı açılış, kapanış ve
nakit hareketlerini bağlar. Stok kodu giriş/tüketim hareketlerini bağlar.
Güvence depozitosu gelir sayılmaz. Bakım/hasar maliyetinin finansal giderde de
izlenmesi isteniyorsa gider kaydı ayrıca girilir. Birim bazlı sonuç yalnızca
birime atanmış giderleri içerir; dağıtılmamış giderler ayrı gösterilir.

Tarihsel kapasite değişiklikleri önceden tutulmadığı için kapasite paydası
**mevcut fiziksel tanımlara** dayanır; geçmiş dolulukta bu sınırlama ekranda
belirtilir. Satılan fiziksel yatak sayısı kişi kapasitesinden ayrıdır. Şikâyet,
değerlendirme, bakım, görev, vardiya, stok, kontrat, rakip fiyatı ve güvence
kayıtları ilgili ekrandaki **İşlem kaydı** ile girilir. Dış değerlendirme veya
rakip fiyat platformlarına otomatik bağlantı kurulmaz; kaynak notuyla girilen
veriler raporlanır. Faaliyet sonucu vergi/finansman sonrası muhasebe kârı değildir.

Kontroller: `go test ./...` (PostgreSQL testleri için `TEST_DATABASE_URL`),
`npm --prefix ui run lint`, `npm --prefix ui run test:reports`.

### Görsel belge şablonları, rapor belgeleri ve oda folyosu

- Belge Şablonları ekranı Lexical tabanlı görsel editör kullanır. Başlık, kalın/italik/altı çizili metin, listeler, hizalama, tablo ve geri alma desteklenir. Otomatik bilgi alanları imlecin bulunduğu yere eklenir. Her dilin başlığı ve gövdesi ayrı tutulur.
- Beş belge şablonuna yönetim raporu özeti, ayrıntılı işletme raporu ve vardiya teslim raporu eklenmiştir. Rapor ekranındaki **Belge hazırla** seçeneği mevcut filtrelerin gerçek verilerini doldurur. Yönetici açıklamalarını düzenleyebilir, HTML indirebilir veya tarayıcıdan PDF yazdırabilir. Düzenlenebilir rapor belgesi en fazla 1.000 tablo satırı içerir; kesilen satır sayısı açıkça gösterilir ve tam döküm CSV'de bulunur.
- Sözleşme ve Dekontlar ana içerik alanındaki sayfa düzenleyicisinde açılır. Rezervasyon belgesinin önizlemesinden **Bu belgenin metnini düzenle** seçildiğinde yalnızca yeni oluşturulacak belgenin metni değişir; otelin şablonu ve daha önce oluşturulan belgeler değişmez.
- `document_templates.format` eski kayıtlar için `plain`, yeni görsel şablonlar için `html` değerini taşır (migration 023). Belge snapshot'ı biçimi de saklar. Eski düz metinler HTML olarak yorumlanmaz. Sunucu yalnızca yazdırılabilir etiketleri, hizalamayı ve tablo hücre boyutlarını korur; komutlar, harici kaynaklar ve olay nitelikleri temizlenir. Misafir alanları HTML'e kaçış uygulanarak tek geçişte yerleştirilir.
- Oda kartındaki **Folyo** veya rezervasyon ayrıntılarındaki **Oda folyosu / Hizmet ekle** üzerinden hizmet adı, kategori, adet, birim fiyat, para birimi ve açıklama girilebilir. `booking.folio.service` tutarı sunucuda hesaplar; `booking.folio.service.void` gerekçeli iptal yapar. Hizmet bir borç kalemidir, otomatik tahsilat oluşturmaz. Resepsiyonist yalnızca erişebildiği tesisin açık rezervasyonlarına işlem yapabilir. Kayıt kimliği tekrar gönderilirse aynı ücret ikinci kez eklenmez. Şube kilidi, hizmet/iptal ve çıkış işlemlerinin tutarlı bir folyo üzerinde çalışmasını sağlar. Migration 024 birim fiyatı rapor hareketine ekler.
- Sistem logları teknik JSON yerine işlem özeti, oda/tesis, personel ve önce/sonra alanlarını gösterir. Yeni olaylarda iptal/tadilat gerekçeleri, kapora ve yetki değişiklikleri de güvenli alan listesine dahil edilir; eski kayıtlarda bulunmayan bilgiler uydurulmaz.

Doğrulama: `npm run lint --prefix ui`, `npm run test:documents --prefix ui`, `npm run test:audit --prefix ui`, `npm run test:reports --prefix ui`, `npm run test:guests --prefix ui`. PostgreSQL entegrasyon testleri için `TEST_DATABASE_URL` ve `MIGRATION_TEST_DATABASE_URL` ile `go test ./...`; testler ayrı geçici şemalarda çalışır.


Personel ve kira giderleri: Raporlamalar altında **Personel Maaşları** (`finance.payroll`), **Kira Giderleri** (`finance.rent_expenses`) ve **Gider Dağılımı** (`finance.expenses`) ayrı ekranlardır. Maaş kaydı personel seçimi, kira kaydı kiraya veren bilgisi gerektirir. Giderin kayıt tarihi rapor dönemini belirler; açıklamada ait olduğu ay belirtilebilir. Kayıtlar mevcut `expense` hareketlerini kullanır ve genel gelir–gider/faaliyet sonucuna bir kez dahil edilir. Ödeme hareketleri ayrıca tutulur; bu ekranlar otomatik bordro veya ödeme durumu hesabı yapmaz. Eski personel seçilmemiş maaş kayıtları kaybolmaz, ayrı toplamla gösterilir. Maaş/kira dışındaki elektrik-su-doğal gaz, temizlik, bakım, komisyon, vergi ve diğer giderler dağılım raporunda görünür.

## Resepsiyon notları (Kanban)

`?tab=kanban` ekranı Otel Operasyonu menüsünden ve üstteki bildirim düğmesinden açılır. Yönetici ve resepsiyon personeli yalnızca erişebildiği tesisin ortak notlarını görür. Yapılacak / Devam ediyor / Tamamlandı sütunları, acil öncelik, arama, sütun başına 25 kayıt ve daha fazla yükleme, arşivleme ve geri alma desteklenir. Kartlar sürüklenerek veya klavye/dokunmatik kullanımına uygun durum menüsüyle taşınır. Pano görünürken 30 saniyede bir ve pencereye dönüldüğünde yenilenir.

`note.list` (GET) ve `note.save` (PUT) komutları `hotel_id` ve `branch_id` ister. Yeni kayıtta istemci UUID'si ve `version: 0`, güncellemede mevcut `version` gönderilir. Eşzamanlı değişiklikler `note_changed` (409) döndürür; aynı başarılı isteğin tekrarı ek kayıt oluşturmaz. Notun yazarı, son düzenleyen personel ve zamanları sunucuda atanır; değişiklikler sistem loguna yazılır. `20261014_025_reception_notes` migration'ı kalıcı tabloyu oluşturur. Arşivleme fiziksel silme yapmaz.

Kontroller: `npm run test:kanban --prefix ui` ve PostgreSQL test ortamında `go test ./internal/infrastructure/persistence -run TestReceptionNotesSharedBoard`.

## Üç boyutlu tesis görünümü

Otel Operasyonu → **3 Boyutlu Görünüm** (`?tab=property3d`), seçili tesisin `system.initial_sync` ve `bed.list` verilerini kullanır. `ui/src/components/property-3d/` içindeki bileşenler Hostel3D referansının kesit kat, ahşap yatak/ranza ve kamera yaklaşımını dinamik veriye uyarlar. Örnek misafir veya oda verisi eklenmez. Three.js yalnızca bu ekran açıldığında yüklenir; harici model/texture/CDN isteği yapılmaz.

- Kayıtlı ve çakışmayan kat planları korunur. Konumu eksik/çakışan birimler şematik olarak sıralanır; oda içi yatak yerleşimi otomatik yapılır. Bu görünüm mimari ölçüm veya plan düzenleyicisi değildir ve kayıtlı koordinatları değiştirmez.
- Fiziksel yatak kimliği ve seviye bilgileri ranzaları gruplar. Çift kişilik yatak tek yatak yeridir; kişi kapasitesi ayrıca gösterilir. Kat atanmamış bağımsız yataklar da görünür. Fiziksel yatak tanımı olmayan odaların açıkça seçilmiş single/double/twin düzeni şematik olarak çizilir; bu görseller ayrı rezervasyon birimi oluşturmaz. Oda üzerinde etkinleştirilmiş jakuzi/hidromasajlı küvet özellikleri de modellenir. Ortak tesis jakuzisi odalara kopyalanmaz.
- Doluluk, yaklaşan rezervasyon ve temizlik/bakım durumları ortak `roomBoardState` hesabından gelir. Filtreler, klavye ile oda/yatak seçimi ve yetkiye bağlı mevcut rezervasyon ekranlarına geçiş bulunur. Aktif ekran 60 saniyede bir, pencereye dönüldüğünde ve Yenile düğmesiyle güncellenir; kapanan ekranın istekleri iptal edilir.
- Model alanının içindeki kat düğmeleri katları tek tek gösterir; ayırma ve duvar kontrolleri aynı alandadır. Oda zeminleri farklı parke renkleri, fiziksel cam malzemeleri ve yumuşak gölgeler kullanır. Yatak seçimi cam kutu, kenar ve parıltıyla gösterilir; basma ve sürükleme ayrılır.
- Aktif konaklamalardaki misafirler nefes animasyonlu voxel karakterlerle gösterilir. Rezervasyon misafir formundaki isteğe bağlı `gender` (`female`, `male`, `unspecified`) mevcut misafir JSON kaydında korunur; eksik bilgi nötr karakter verir. İsimden cinsiyet çıkarılmaz. Oda rezervasyonundaki misafirler yataklara yalnızca şematik olarak dağıtılır, gerçek yatak ataması oluşturulmaz. Azaltılmış hareket tercihi animasyonları kapatır.
- `header.property3d`, `property3d_exploded` ve `property3d_walls` tercihleri kullanıcı hesabında saklanır. WebGL açılamadığında hata/yeniden deneme ve metinle birim seçimi kullanılabilir. Sahne değişiminde ve ekran kapanışında GPU kaynakları temizlenir.

Fiziksel Yatak Tanımı ekranındaki tek kişilik baza, çift kişilik yatak ve 2/3/4 katlı ranza kısayolları düzenlenebilir alanları doldurur; kayıt ancak **Yatağı Kaydet** ile yapılır. Kod, oda/kat ataması ve korunan seviyelerin kimlikleri korunur.

Kontroller: `npm run test:property-3d --prefix ui`, `npm run test:bed-presets --prefix ui`, `npm run lint --prefix ui`, `go test ./internal/domain/identity`.

Oda oluşturma/düzenleme formunda **Odadaki yataklar** alanından tür ve adet seçilebilir. `room.create` / `room.update` isteğindeki isteğe bağlı `beds_to_add` mevcut fiziksel yataklara ekleme yapar; oda, yataklar ve yatak yerleri aynı veritabanı işlemi içinde kaydedilir. Kimlikler, tesis, oda ve kat bağlantıları sunucuda atanır. Yeni yatak yerleri varsayılan olarak odayla birlikte kiralanır. Mevcut yatakların kimlikleri veya rezervasyonları değiştirilmez.

Oda/yatakhane formunda **Nasıl kiralanacak?** seçimi zorunludur: `room` odanın tamamını, `beds` bağlı yatak yerlerini satışa açar. `rental_mode` (migration 026) kayıtlıdır ve sonradan eklenen yataklara da uygulanır. Oda düzenleme mevcut yatakların satış ayarlarını atomik günceller; aktif/onaylı rezervasyonları etkileyen değişiklikler mevcut yapı korumasıyla reddedilir. Satış panosu ve kat planı ayrı satılmayan yatakları göstermez. Konaklayan çizelgesi gerçek geçmiş yatak konaklamalarını korur; envanter ve 3B görünüm fiziksel yatakları göstermeye devam eder. Eski kayıtların satış ayarları otomatik toplu değiştirilmez; oda formundan seçilip kaydedilir.
