# Rezervasyon kanalı altyapısı

Bu altyapı kanal bilgilerini saklar; Booking.com, Agoda, Expedia, Airbnb, Otelz veya başka bir platformla canlı bağlantı kurmaz. Kanal adı bulunması bir entegrasyonun etkin olduğu anlamına gelmez.

## Kimlik modeli

- `branch_id`: Uygulamanın kendi tesis UUID'si. Yetkilendirme ve veri ayrımı bu alan üzerinden devam eder.
- `source`: Küçük harfli, en fazla 64 karakterli kanal kodu. Örnekler: `manual`, `booking_com`, `agoda`, `expedia`, `airbnb`, `otelz`. Yeni kanallar veri tabanı değişmeden eklenebilir.
- `external_property_id`: Kanalın tesis kimliği. Uygulamanın `branch_id` alanıyla aynı şey değildir.
- `external_reservation_id`: Kanalın rezervasyon kimliği. Baştaki sıfırlar korunur; sayıya çevrilmez.

İki dış kimlik birlikte verilir, en fazla 255 bayttır ve başta/sonda boşluk ya da kontrol karakteri içeremez. `manual` kaynaklı kayıtta dış kimlik kullanılamaz. Dış kimliksiz kanal kodu, personelin elle kaydettiği bir kanal rezervasyonunun kaynağını belirtebilir.

Yeni kayıtta kaynak belirtilmezse `manual` kullanılır. Migration mevcut kayıtların kaynağını tahmin etmez; yeni alanı `unknown` olarak doldurur. Eski raporlardaki kaynak bilgileri kendiliğinden değiştirilmez.

## API sözleşmesi

Mevcut yetkilendirilmiş `booking.create` komutuna normal rezervasyon alanlarıyla birlikte şu alanlar gönderilebilir:

```json
{
  "branch_id": "uygulamadaki-tesis-uuid",
  "source": "booking_com",
  "external_property_id": "hotel-0123",
  "external_reservation_id": "00000456789"
}
```

Bu yalnızca ek alanları gösterir; oda, misafir ve tarih gibi mevcut zorunlu rezervasyon alanları da gönderilmelidir. `booking.list`, tesis kapsamı içinde `source`, `external_property_id`, `external_reservation_id` filtrelerini kabul eder.

`(branch_id, source, external_property_id, external_reservation_id)` dış kimlikli kayıtlar için benzersizdir. Aynı kaydı tekrar oluşturmak `external_booking_exists` hatası verir; sessizce üzerine yazılmaz. İptal edilen kayıt da bu kimliği korur. Bu, tam bir webhook tekrar işleme sistemi değil, veri tabanındaki son mükerrer kayıt korumasıdır.

Dış kimliği bulunan rezervasyonun kaynak/kimlik üçlüsü standart güncellemede değiştirilemez. Eski istemci bu alanları hiç göndermediğinde değerler korunur. Güncelleme, oda taşıma, giriş ve çıkış işlemleri mevcut kimliği taşır.

## Gelecekteki bağlayıcının sorumlulukları

1. Yetkili kanal hesabını ve dış tesis/oda/fiyat planlarını yerel tesis ve birimlerle eşleştirmek.
2. Yeni rezervasyonu oluşturmadan önce dış kimlikle aramak; değişiklik ve iptalleri mevcut kayda uygulamak.
3. Webhook imzası veya sağlayıcı kimliğini doğrulamak; sır saklama ve erişim yetkilerini yönetmek.
4. Tekrar gelen ve sıra dışı gelen olaylar için olay kimliği, sürüm, kuyruk, yeniden deneme ve hata kayıtları eklemek.
5. Oda müsaitliği, fiyat ve kısıtların iki yönlü senkronizasyonunu sağlamak.
6. Kanal erişimi ve test/sandbox süreçlerini tamamlamak.

Bunlar henüz uygulanmış değildir. Bu değişiklik sağlayıcı API'si, otomatik rezervasyon çekme, kanal kimlik bilgisi veya fiyat/müsaitlik gönderimi eklemez. Yeni bağlayıcılar mevcut müsaitlik, folyo ve giriş/çıkış kurallarını atlamamalıdır.
