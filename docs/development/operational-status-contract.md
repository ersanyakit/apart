# Ortak oda ve rezervasyon durum sözleşmesi

Tek kaynak `constants/Status.go` dosyasıdır. Go modelleri `RoomStatus` ve `BookingStatus` tiplerini kullanır. `go run ./cmd/contracts` komutu frontend için `statuses.generated.ts` ve `contracts.generated.json` üretir. Üretilen dosyalar elle değiştirilmez. `cmd/contracts` testi dosyaların kaynakla aynı olduğunu denetler.

Oda durumu, rezervasyon durumu ve ekranda türetilen doluluk birbirinden ayrıdır. API/veritabanındaki mevcut değerler korunmuştur; İngilizce sabit adları üzerinden erişilir. `Dolu` ve `Rezervli` yalnızca eski ekran görünüm tipinin değerleridir; oda durumunu kaydetme API'si bunları kabul etmez.

## Mevcut destek

| Kavram | Destek |
| --- | --- |
| Temiz/kirli | Oda operasyon durumu, temizleyen personel kimliği, not ve tamamlanma zamanı |
| Arızalı/tadilatta | Rezervasyon ve giriş engeli; zorunlu açıklama |
| Konaklama | Onaylandı, giriş yaptı, tamamlandı, iptal edildi; gerçek giriş/çıkış ve işlem yapan kişi |
| Doluluk | Rezervasyon tahsisleri ve gerçek konaklamadan türetilir; oda, apart ve yatak hiyerarşisi dikkate alınır |
| Erken giriş/geciken çıkış | Gerçek/planlanan zamanlar üzerinden davranış; bağımsız rezervasyon durumları değildir |
| No-show | Rapor ek kaydında bulunabilir; ana rezervasyon durum makinesinde bağımsız geçiş değildir |
| Teknik servis | Arıza kaydı ve genel kayıt durumları vardır; yedek parça/onarım aşamaları için özel durum makinesi yoktur |

`CLEANING`, kontrol bekliyor/kontrol edildi, geçici satış kapatma, DND, temizlik/çarşaf talepleri, detaylı temizlik, opsiyon süresi, bekleme listesi, değişiklik onayı ve erken ayrılma için bağımsız iş akışları henüz yoktur. Sabit eklemek bu özellikleri çalışır hale getirmez.

Gelecekte uygunluk, temizlik, teknik durum ve misafir tercihleri ayrı kalıcı alanlara ayrılmalıdır. Doluluk ve bugünkü giriş/çıkış işaretleri tahsis/zaman bilgisinden hesaplanmalıdır. Bu değişiklik geçmiş verilerin dönüşümünü, geçiş yetkilerini, audit kayıtlarını, kapasite/çakışma kurallarını ve ekran/rapor güncellemelerini birlikte gerektirir.

## İş kuralları

`BlocksReservation`, `BlocksCheckIn`, `RequiresReason`, `IsHousekeeping` ortak tanımlardan okunur. Bilinmeyen oda durumları rezervasyona/girişe açılmaz. Kirli oda gelecekteki rezervasyonu engellemez; giriş yapılmasını engeller. Arızalı/tadilatta birimler ve ilgili üst/alt birimler rezervasyona kapalıdır. Temizlik, bakım nedeniyle kapalı alt birimi yeniden açamaz. Backend son karar merciidir.

Frontend durum metinleri ve kurallarını `ui/src/lib/statuses.ts`, semantik renkleri `status-palette.ts` üzerinden tüketir. Yeni durum eklenirken tek kaynak ve iş akışı güncellenir, sözleşme yeniden üretilir.

## Rapor tercihlerinin doğrulanması

Rapor gruplarının kaynağı `constants/ReportGroups.go` dosyasıdır. Frontend rapor menüleri ve backend `header.report-group.<key>` doğrulaması aynı tanımları kullanır. Grup başlığı tercihlerinin reddedilmesi ve tekrar kuyruğunda log sayfası tercihlerine taşınması böylece giderilmiştir. Bilinmeyen grup adları ve boolean olmayan başlık tercihleri reddedilir.
