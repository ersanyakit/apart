import fs from 'node:fs';
const base='ui/src/lib/i18n';
const locales=Object.keys(JSON.parse(fs.readFileSync(`${base}/application-core.json`)));
const catalog=JSON.parse(fs.readFileSync('internal/domain/catalog/defaults.json'));
const batches=[
 ['report-accommodation.tsv',["Daire giderleri", "Daire geliri", "Daire bakımı", "Daire doluluğu", "Daire faaliyet sonucu", "Ranza kapasitesi", "Ortak alan kullanımı", "Ek hizmet gelirleri", "Grup konaklama", "Yatak ve oda değişimleri", "Yatak doluluğu", "Yatak hazırlığı", "Yatak başına gelir", "Kısa süreli konaklama", "Yatakhane performansı"]],
 ['report-headings-detail.tsv',["Misafir profili", "Tekrar gelen misafirler", "Misafir memnuniyeti", "Şikâyetler", "Kapasite kullanımı", "Günlük doluluk", "Gelecek doluluk", "Geçmiş doluluk", "Birim performansı", "Rakip fiyatları", "Gelir tahmini", "ADR ve RevPAR", "Fiyat performansı", "Müşteri Listesi", "Kontrat bitişleri", "Güvence depozitoları", "Kira ve tahsilat", "Uzun dönem konaklama"]],
 ['report-headings.tsv',["Yönetim özeti", "Tesis karşılaştırması", "İşlem kayıtları", "Günlük gelir ve tahsilat", "Gider Dağılımı", "Gelir–gider", "Ödeme yöntemleri", "Personel Maaşları", "Birim bazında faaliyet sonucu", "Alacak ve borç", "İptal ve iadeler", "Kira Giderleri", "Fatura Giderleri", "Kayıp ve hasar", "Temizlik", "Stok ve tüketim", "Arıza ve bakım", "Personel performansı", "Vardiya ve kasa", "Görev tamamlama"]],
 ['shared-controls.tsv',["Kayıt yok", "İşlemi onaylayın", "Onayla", "Listeye dön", "Giriş şifresi", "Yeni şifre (değiştirmek için)", "Çeviriyi kaldır", "Dil ekle", "Hazır kat seçin", "Kat seçimi", "Özel kat / Elle gir", "İsimsiz misafir", "Konaklayanlar", "Seçimi temizle", "Tümünü seç", "Önceki ay", "Sonraki ay", "Bildirimi kapat", "Bildirimler", "Müsait"]],
 ['screen-options.tsv',["Aktif", "Devam ediyor", "Diğer", "Görünüm", "Erken giriş", "Gerçek giriş", "Gerçek çıkış", "Kapasite", "Menü", "Ölçü birimi", "Tüm durumlar", "Onaylı", "Gelmedi", "Konaklıyor", "Bitiş", "Kayıt", "Gider", "Şikâyet", "İnternet", "Kahvaltı"]],
 ['screen-shared.tsv',["Ek gelir", "İade", "Kişi", "Personel kaydedilmemiş", "Rezervasyon notu", "Bilgi kaydedilmemiş", "Çamaşırhane", "Kat atanmamış", "Konaklama geliri", "Misafiri kaldır", "Pencereyi kapat", "Satış tutarı", "Başlangıç", "Birim türü", "Çıkış işlemi", "Değerlendirme", "Detay", "Dönem", "Filtreleri temizle", "Not"]],
 ['unit-types.tsv',["Daire", "Koğuş", "Yatak"]],
 ['action-contexts.tsv',["Durum", "Güncelle", "Kaydediliyor…", "İptal edildi"]],
 ['country-interface.tsv',["Dil", "Ülke adlarının ve ülke seçim alanlarının dilini seç.", "Ülke", "Varsayılan ülke", "Yeni misafirlerin uyruğu bu ülkeyle başlar. Ülkenin para birimi varsayılan para birimi olur.", "Ülke seçin", "Ülke ara", "Ülke adı veya kodu yazın…", "Ülkeler", "Bu aramaya uygun ülke yok", "{label} seçin. Seçili: {name}", "yok", "Seçin", "Uyruk", "{number}. Misafir Uyruk"], {preserveExisting:true}],
 ['shell-labels.tsv',["Sistem Ayarları", "YÖNETİM SİSTEMİ", "Yeni rezervasyon", "Sistem"]],
 ['shared-options.tsv',["Ad", "Soyad", "Kullanıcı adı", "E-posta", "Rol", "Şifre", "Yeni", "Açık", "Bekliyor", "Düşük", "Yüksek", "Acil", "Adet", "Nakit", "Kredi kartı", "Banka havalesi", "Ödeme yöntemi", "Görev", "Tüm tesisler", "Varsayılan", "Klasik", "Sistem yöneticisi", "Yönetici", "Resepsiyonist", "Muhasebe", "Kat hizmetleri", "Teknik servis", "Bakım", "Sorumlu", "Normal"]],
 ['shared-fields.tsv',["Para birimi", "Çıkış", "Açıklama", "Belirtilmemiş", "Birim", "Gecelik fiyat", "Giriş", "İptal gerekçesi", "Başlık", "Öncelik", "Tamamlandı", "Tekrar dene", "Tür", "Planlanan giriş", "Planlanan çıkış", "Tüm katlar"]],
 ['catalog-interface.tsv',["Olanakları ve kategorileri tanımlayın, tesis kataloğunu düzenleyin.", "Standart olanak ve envanter kataloğu", "Olanaklar ve oda envanteri", "Tesis olanakları ve envanteri", "Tüm otellerin ortak kataloğu. Odaya ait ürün ve olanaklar oda formunda seçilir.", "Tesisin ortak alanlarında sunulan olanakları seçin. Fiziksel ürünlerde adedi belirtin.", "Yalnızca bu odada bulunanları seçin. Fiziksel ürünlerde adedi belirtin.", "Havlu, Wi-Fi, mutfak…"]],
 ['setup-controls.tsv',["Kurulum adımları", "Kurulum tamamlandı", "Kurulum kaydediliyor…", "Kurulumu tamamla", "Tesis açılıyor…", "Tesise geç", "Kat listesini hazırla", "Zemin kattan başla", "Kullanılacak kat sayısı", "Personel ekle", "Personeli kaldır", "Şimdilik tek başıma kullanacağım"]],
 ['setup-descriptions.tsv',["İşletme türünüzü seçin ve ticari bilgileri girin. Sonraki adımlarda farklı konaklama türlerini aynı tesiste birleştirebilirsiniz.", "Misafirlerin konaklayacağı otelin veya tesisin bilgileri. Şirket birden fazla tesis yönetebilir.", "Tesisin ortak alanlarında sunulan olanakları seçin. Odalara özel olanakları konaklama adımında belirleyebilirsiniz.", "Kaç kat kullanıyorsunuz? Hazır kat adları tüm dillerde doldurulur. Katları tek tek düzenleyebilir, bodrum veya çatı ekleyebilirsiniz.", "Bir odanın özelliklerini seçin; aynı odalardan istediğiniz kadar hazırlayalım. Her oda için yeniden bilgi girmeniz gerekmez.", "Personeli ve görevlerini ekleyin. Her personel kendi kullanıcı adı ve şifresiyle giriş yapar.", "Oluşturulacak kayıtları kontrol edin. Kurulumu tamamlayana kadar hiçbir kayıt değiştirilmez."]],
 ['facility-form.tsv',['Şirket unvanı','Şirket adresi','Vergi numarası','Vergi dairesi','Otel / tesis adı','Otel / tesis adresi','Özel odalar','Daireler ve odalar','Dairenin tamamı','Paylaşımlı ve özel odalar','Karma tesis','Birden fazla konaklama türü']],
 ['catalog-categories.tsv',catalog.categories.map(c=>c.label.TR)],
 ['setup-labels.tsv',['İşletme','Tesis','Olanaklar','Katlar','Odalar','Kontrol','İleri','Özellik Ekle','Kategori Ekle','Katalogda ara']],
 ['reservation-titles.tsv',['Rezervasyon kaynakları','Satış dönüşümü','Giriş ve çıkış listesi','Konaklama süresi','Rezervasyon özeti','Raporu görüntüle','rapor']],
 ['reservation-descriptions.tsv',['Rezervasyon akışını, giriş ve çıkışları, iptalleri takip edin.','Kanal geliri, iptal oranı ve komisyon sonrası satış.','Talep, teklif, kazanılan ve kaybedilen satışlar.','Seçilen dönemin planlanan giriş ve çıkışları.','Gece sayısı ve kısa / uzun konaklama dağılımı.','Oluşturulma tarihine göre rezervasyon durumları.']],
];
for(const [file,keys,options={}]of batches){
 const seen=new Set(['tr']);
 for(const row of fs.readFileSync(`output/app-i18n/batches/${file}`,'utf8').trim().split('\n')){
  const [locale,...values]=row.split('\t');
  if(!locales.includes(locale)||seen.has(locale)||values.length!==keys.length||values.some(v=>!v.trim()))throw new Error(`Invalid translation row: ${file} ${locale} (${values.length})`);
  seen.add(locale);
  const destination=`${base}/application/${locale}.json`,dictionary=JSON.parse(fs.readFileSync(destination));
  keys.forEach((key,i)=>{if(!options.preserveExisting||!Object.hasOwn(dictionary,key))dictionary[key]=values[i]});
  fs.writeFileSync(destination,JSON.stringify(dictionary,null,2)+'\n');
 }
 if(seen.size!==locales.length)throw new Error(`Missing languages: ${locales.filter(l=>!seen.has(l)).join(', ')}`);
}
console.log('Imported reservation cards, setup labels and catalog categories in all 60 supported languages.');
