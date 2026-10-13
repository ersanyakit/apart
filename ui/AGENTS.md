<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Zorunlu arayüz etkileşim standardı

- Her düğme dokunmada, fare basışında ve klavyeyle etkinleştirmede görünür basılma geri bildirimi vermeli. Kapatma düğmeleri, ikon düğmeleri, sekmeler, menü satırları ve seçim tetikleyicileri buna dahildir; yalnızca hover yeterli değildir.
- `src/index.css` içindeki ortak `button` etkileşimlerini ve `--interaction-*` tokenlarını kullan. Normal düğmeler 0.98, `.nav-icon-button` ikon düğmeleri 0.92 ölçeğe iner; renk/koyuluk değişimi de korunur. Bileşen içinde farklı `active:scale`, `whileTap` veya süre tanımlayarak standardı çoğaltma.
- Modal ve bottom sheet kapatma düğmelerinde `.nav-icon-button`, erişilebilir bir `aria-label`, en az 44 × 44 px dokunma alanı ve görünür klavye odağı kullan. Eylemi `onClick` ile çalıştır; pointer-down sırasında pencereyi kaldırarak basılma tepkisini yok etme.
- `disabled` / `aria-disabled` durumunda basılma animasyonu olmamalı. `prefers-reduced-motion` açıkken ölçek animasyonu kapanmalı, renk geri bildirimi kalmalı.
- Otel/tesis gibi seçimlerde rezervasyon formunun ortak kart standardını kullan (`UniSelect variant="field"`, `FieldCard`, `FieldCaption`). Mobilde farklı görünümlü çıplak native select ekleme. Bottom sheet içindeki seçenekler kartın içinde açılmalı ve Escape önce açık seçenek listesini kapatmalı.
- Değişiklikten sonra tip kontrolünü ve ilgili mevcut kontrolleri çalıştır. Sunulan CSS'nin güncel olduğunu doğrula; kaynak dosyasının değişmesi tek başına yeterli değil. Görsel veya etkileşim kontrolü yapılamadıysa bunu yapılmış gibi raporlama.

- Her sayfanın tek ana başlık sahibi olmalı. Kendi başlığını çizen bileşenlerde (`HotelCalendar` gibi) App seviyesindeki sayfa başlığını tekrar çizme; ortak eylemleri bileşenin `headerActions` alanına aktar.
- Sistem ayarlarının oluşturma ve düzenleme formlarını ortak `SettingsEditor` ile sayfa içinde aç. Tesis, kat/birim, yatak, personel ve özellik tanımlarında sağdan açılan `Drawer` kullanma. Tek başlık, listeye dönüş, mobilde sığan alanlar ve ortak düğme geri bildirimi korunmalı; listeye dönünce filtreler sıfırlanmamalı.
- Oda durumunu `RoomBoardState` üzerinden göster; rezervasyon tarihlerinin ISO metinlerini doğrudan karşılaştırma. Tarih filtresi günün tamamını kapsamalı. Yaklaşan rezervasyon ile mevcut konaklamayı ayır; kartlarda tam durum etiketi, misafir, planlanan tarihler ve varsa gerçek giriş/çıkış bilgisi görünür olmalı.
- Genel işlem sonuçlarını `useNotifications()` üzerinden sağ üstteki ortak bildirim alanına gönder; sayfa içinde başarı banner'ı ekleme. Form doğrulama hataları ilgili formda kalabilir. Bildirimler mobil güvenli alanlara uymalı, kapatılabilmeli ve odak/hover sırasında otomatik kapanmamalı.
- Header sekmeleri ve sidebar aynı `NavigationIcon` eşlemesini kullanmalı (21 px, 1.8 çizgi kalınlığı). Header'a ayrı PNG ikon haritası ekleme; ikon düğmelerinde ortak `.nav-icon-button` standardını kullan.
