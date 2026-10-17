import fs from 'node:fs';
const base='ui/src/lib/i18n';
const locales=Object.keys(JSON.parse(fs.readFileSync(`${base}/application-core.json`)));
const catalog=JSON.parse(fs.readFileSync('internal/domain/catalog/defaults.json'));
const batches=[
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
for(const [file,keys]of batches){
 const seen=new Set(['tr']);
 for(const row of fs.readFileSync(`output/app-i18n/batches/${file}`,'utf8').trim().split('\n')){
  const [locale,...values]=row.split('\t');
  if(!locales.includes(locale)||seen.has(locale)||values.length!==keys.length||values.some(v=>!v.trim()))throw new Error(`Invalid translation row: ${file} ${locale} (${values.length})`);
  seen.add(locale);
  const destination=`${base}/application/${locale}.json`,dictionary=JSON.parse(fs.readFileSync(destination));
  keys.forEach((key,i)=>dictionary[key]=values[i]);
  fs.writeFileSync(destination,JSON.stringify(dictionary,null,2)+'\n');
 }
 if(seen.size!==locales.length)throw new Error(`Missing languages: ${locales.filter(l=>!seen.has(l)).join(', ')}`);
}
console.log('Imported reservation cards, setup labels and catalog categories in all 60 supported languages.');
