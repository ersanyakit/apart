import json
from pathlib import Path
rows=[l.split('|') for l in Path('output/app-i18n/core.tsv').read_text().splitlines() if l and not l.startswith('#')]
assert len(rows)==60 and all(len(r)==45 for r in rows)
tr=rows[0][1:]
aliases={'REZERV':'Rezerve','Personel Tanımları':'Personel','Durum':'Oda durumu','İptal':'Vazgeç','İptal et':'Vazgeç','Geri dön':'Geri','Temiz':'Temiz','Kirli':'Kirli','Arizali':'Arızalı','Tadilat':'Tadilatta','Bos':'Boş','Rezervli':'Rezerve','Seç':'Seçin','Hepsi':'Tümü','Sorgula':'Ara','Güncelle':'Yenile','Kaydediliyor…':'Yükleniyor…','Yükleniyor...':'Yükleniyor…','Yükleniyor':'Yükleniyor…','Kapatın':'Kapat','İşlem':'İşlemler','MİSAFİR':'Misafir','Sonuç yok':'Sonuç bulunamadı'}
result={}
for code,*values in rows:
 d=dict(zip(tr,values))
 for alias,key in aliases.items():
  if key in d:d[alias]=d[key]
 result[code]=d
nav=[l.split('|') for l in Path('output/app-i18n/navigation.tsv').read_text().splitlines() if l and not l.startswith('#')]
assert len(nav)==60 and all(len(r)==17 for r in nav)
for code,*values in nav:result[code].update(dict(zip(nav[0][1:],values)))
status=[l.split('|') for l in Path('output/app-i18n/statuses.tsv').read_text().splitlines() if l and not l.startswith('#')]
assert len(status)==60 and all(len(r)==9 for r in status)
for code,*values in status:result[code].update(dict(zip(status[0][1:],values)))
for code in result:
 for alias,key in aliases.items():
  if key in result[code]:result[code][alias]=result[code][key]
for alias in aliases:result['tr'][alias]=alias
Path('ui/src/lib/i18n/application-core.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Saved',len(result),'application core locales')
