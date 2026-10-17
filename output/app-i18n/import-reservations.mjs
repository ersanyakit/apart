import fs from 'node:fs';
const base='ui/src/lib/i18n';
const locales=Object.keys(JSON.parse(fs.readFileSync(`${base}/application-core.json`)));
const batches=[
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
console.log('Imported reservation report cards in all 60 supported languages.');
