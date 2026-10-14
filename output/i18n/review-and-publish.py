"""Apply authored headlines and terminology corrections to completed local AI drafts."""
import json,re,time,sys
from pathlib import Path
import ctranslate2,sentencepiece
from opencc import OpenCC
root=Path(__file__).resolve().parents[2];stage=root/'output/i18n/generated';dest=root/'ui/src/lib/i18n/marketing'
keys=json.loads((root/'output/i18n/source-index.json').read_text());en=json.loads((dest/'en.json').read_text())
indices=[28,352,140,94,85,367,321,234,383,365,390]
headlines={}
for line in (root/'output/i18n/headlines.txt').read_text().splitlines():
 if not line or line.startswith('#'):continue
 code,*values=line.split('|');assert len(values)==len(indices),(code,len(values));headlines[code]=dict(zip(indices,values))
pattern=re.compile(r'(\{\w+\}|Interactiveotel|Mavi Avlu Hotel|ADR|RevPAR|\bPDF\b|\bPWA\b|[↑↗]|\n| \| | · |: |(?<=\.) (?=[A-Z])|(?<=\?) (?=[A-Z])|^\d{2} / )')
sp=sentencepiece.SentencePieceProcessor(model_file='/tmp/otel-localization-model/spm.128k.model')
model=None
traditional=OpenCC('s2twp')

def improve(text):
 if text.isupper():text=text.capitalize()
 text=re.sub(r'room board','hotel room status dashboard',text,flags=re.I)
 text=re.sub(r'\bbunks\b','two-level beds',text,flags=re.I)
 text=re.sub(r'\bbunk beds\b','two-level beds',text,flags=re.I)
 text=re.sub(r'\bstays?\b','guest accommodation',text,flags=re.I)
 text=re.sub(r'\bproperty\b','hotel',text,flags=re.I)
 text=text.replace('Aparthotel','Apartment hotel').replace('aparthotel','apartment hotel')
 return text

def publish(locale):
 segments=json.loads((stage/f'{locale}.segments.json').read_text())
 fixes=[s for s in segments if s.isupper() or re.search(r'\b(contract|contracts|bunk|bunks)\b|room board',s,re.I)]
 target='zh' if locale.startswith('zh-') else locale
 data={}
 for key in keys:
  pieces=pattern.split(en[key]);translated=[]
  for piece in pieces:
   if piece.strip() not in segments:translated.append(piece);continue
   value=segments[piece.strip()]
   translated.append((' ' if piece.startswith(' ') else '')+value+(' ' if piece.endswith(' ') else ''))
  data[key]=''.join(translated)
 data[keys[0]]='('+segments['Not required']+')'
 data[keys[348]]='{reports} '+segments['Reports']+' · {categories} '+segments['Categories']
 data[keys[349]]=segments['Click to enlarge this screenshot']+' — {title}'
 for index,value in headlines.get(locale,{}).items():data[keys[index]]=value
 for index,label in [(84,85),(95,94),(369,367)]:data[keys[index]]=data[keys[label]]+' | Interactiveotel'
 data[keys[350]]='{title}: '+data[keys[319]]+' — Mavi Avlu Hotel ('+data[keys[326]]+')'
 suspicious=[]
 for i,key in enumerate(keys):
  value=data[key]
  assert value.strip(),(locale,i,'empty')
  assert sorted(re.findall(r'\{\w+\}',value))==sorted(re.findall(r'\{\w+\}',key)),(locale,i,'placeholder')
  if (value==en[key] and len(value.split())>3) or re.search(r'(.{4,40})\1{3}',value) or value.count('¦')>1:suspicious.append(i)
 (stage/f'{locale}.reviewed.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 if suspicious:
  print('REVIEW REQUIRED',locale,suspicious,flush=True);return
 temp=dest/f'{locale}.json.tmp';temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temp.replace(dest/f'{locale}.json')
 # Publish only complete dictionaries; imports remain literal for Next's bundler.
 p=dest.parent/'marketing.ts';text=p.read_text()
 entry=f' "{locale}": () => import("./marketing/{locale}.json"),'
 if f'./marketing/{locale}.json' not in text:text=text.replace('\n};', '\n'+entry+'\n};',1);p.write_text(text)
 print('PUBLISHED',locale,len(data),'keys','validated keys',flush=True)

done=set();deadline=time.time()+6*3600
while time.time()<deadline:
 for path in sorted(stage.glob('*.json')):
  if '.' in path.stem:continue
  locale=path.stem
  if locale in done or not (stage/f'{locale}.segments.json').exists():continue
  if locale in ['dz','te']:continue
  publish(locale);done.add(locale)
 if len(list(dest.glob('*.json')))>=60:break
 time.sleep(5)
