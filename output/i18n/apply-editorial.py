import json
from pathlib import Path
root=Path(__file__).resolve().parents[2];dest=root/'ui/src/lib/i18n/marketing';keys=json.loads((root/'output/i18n/source-index.json').read_text())
edits={}
for filename,indices in [('headlines.txt',[28,352,140,94,85,367,321,234,383,365,390]),('navigation.txt',[111,70,387,249,74])]:
 for line in (root/'output/i18n'/filename).read_text().splitlines():
  if not line or line.startswith('#'):continue
  locale,*values=line.split('|');locale=locale.strip();assert len(values)==len(indices),(locale,filename)
  edits.setdefault(locale,{}).update(dict(zip(indices,values)))
p=root/'output/i18n/corrections.json'
if p.exists():
 for locale,values in json.loads(p.read_text()).items():edits.setdefault(locale,{}).update({int(k):v for k,v in values.items()})
for locale,values in edits.items():
 p=dest/f'{locale}.json'
 if not p.exists():continue
 data=json.loads(p.read_text())
 for index,value in values.items():data[keys[index]]=value
 for index,label in [(84,85),(95,94),(369,367)]:data[keys[index]]=data[keys[label]]+' | Interactiveotel'
 for index,label in [(82,85),(98,94),(364,367)]:data[keys[index]]=data[keys[label]]
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 print(locale,len(values))
