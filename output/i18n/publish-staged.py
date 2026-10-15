"""Publish completed static dictionaries after structural validation."""
import json,re,sys,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2];stage=root/'output/i18n/generated';dest=root/'ui/src/lib/i18n/marketing'
source=json.loads((dest/'tr.json').read_text());module=dest.parent/'marketing.ts'
for locale in sys.argv[1:]:
 data=json.loads((stage/f'{locale}.json').read_text())
 assert set(data)==set(source),(locale,'coverage')
 for key,value in data.items():
  assert isinstance(value,str) and value.strip(),(locale,key,'empty')
  assert sorted(re.findall(r'\{\w+\}',key))==sorted(re.findall(r'\{\w+\}',value)),(locale,key,'interpolation')
 p=dest/f'{locale}.json';p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 text=module.read_text()
 if f'./marketing/{locale}.json' not in text:
  text=text.replace('\n};',f'\n "{locale}": () => import("./marketing/{locale}.json"),\n}};',1);module.write_text(text)
 print('Published',locale,len(data))
subprocess.run([sys.executable,str(root/'output/i18n/apply-editorial.py')],check=True)
