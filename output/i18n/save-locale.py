import json,sys,re
from pathlib import Path
locale=sys.argv[1]
keys=json.loads(Path('output/i18n/source-index.json').read_text())
rows=Path('output/i18n/'+locale+'.txt').read_text().splitlines()
values={}
for row in rows:
 if not row.strip():continue
 index,value=row.split('|',1);index=int(index)
 if index in values:raise ValueError('Duplicate '+str(index))
 values[index]=value.replace('\\n','\n')
assert set(values)==set(range(len(keys))),f'{locale} missing {set(range(len(keys)))-set(values)}'
for i,key in enumerate(keys):
 assert sorted(re.findall(r'\{\w+\}',key))==sorted(re.findall(r'\{\w+\}',values[i])),(locale,i,'placeholders')
 assert values[i].strip(),(locale,i)
Path('ui/src/lib/i18n/marketing/'+locale+'.json').write_text(json.dumps({key:values[i] for i,key in enumerate(keys)},ensure_ascii=False,indent=2)+'\n')
print(locale,len(values),'complete')
