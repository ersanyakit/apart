# Ortak durum renkleri

Tek kaynak: `ui/src/lib/status-palette.ts`. HTML kökündeki `--status-…` değişkenleri ve 3B sahne renkleri aynı tanımdan üretilir. Tema rengi dekoratiftir; durumların anlamını değiştirmez.

| Anlam | Renk |
| --- | --- |
| Giriş yapmış / dolu | Mavi |
| Rezervasyon / yaklaşan rezervasyon | Amber |
| Kirli / temizlik gerekli | Gül kurusu |
| Temiz | Yeşil |
| Boş | Gri |
| Çıkış yapmış / tamamlanmış | Nötr gri |
| İptal | Gül kırmızısı |
| Arıza | Kırmızı |
| Tadilat | Mor |
| Çıkış işlemi / bugünkü giriş-çıkış göstergesi | Pembe |

Rezervasyon durumu ve oda bakım durumu farklı boyutlardır. Örneğin kirli odada yaklaşan rezervasyon varsa, rezervasyon amber; temizlik bilgisi gül kurusu gösterilir. Renk tek bilgi taşıyıcısı değildir: durum metni daima görünür kalır.

`roomStatusKey`, `bookingStatusKey` ve `boardStatusKey` ortak eşlemeleri sağlar. `statusStyle` inline stiller için; `statusVariables` CSS için; `STATUS_PALETTE` 3B göstergeler için kullanılır. Yeni bileşenlerde yerel durum renk haritası veya doğrudan tema rengi kullanılmamalıdır.

Kalıcı rezervasyon durumunu, bugünkü giriş/çıkış vurgusu ile değiştirmeyin. Zaman çizelgesinde gün vurgusu ayrı çizgi; kayıt durumu kartın ana rengidir. Arıza/temizlik/tadilat filtre grubu tek olsa da tekil birimin göstergesi gerçek bakım durumunu kullanır.

Kontrol: `npm run test:status --prefix ui`. Tarayıcı kontrollerinde tema değişse de durum renklerinin sabit kaldığını ve aynı durumun kart, takvim, tablo, kat planı ve 3B görünümde aynı kaynaktan geldiğini doğrulayın.
