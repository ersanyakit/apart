"""Offline AI translation for Dzongkha and Telugu, with protected interpolation."""
import json,re,time
from pathlib import Path
import ctranslate2,sentencepiece
root=Path(__file__).resolve().parents[2];stage=root/'output/i18n/generated';dest=root/'ui/src/lib/i18n/marketing'
keys=json.loads((root/'output/i18n/source-index.json').read_text());en=json.loads((dest/'en.json').read_text())
segments=list(json.loads((stage/'ru.segments.json').read_text()))
pattern=re.compile(r'(\{\w+\}|Interactiveotel|Mavi Avlu Hotel|ADR|RevPAR|\bPDF\b|\bPWA\b|[↑↗]|\n| \| | · |: |(?<=\.) (?=[A-Z])|(?<=\?) (?=[A-Z])|^\d{2} / )')
while not Path('/tmp/otel-localization-madlad/model.bin').exists():time.sleep(5)
sp=sentencepiece.SentencePieceProcessor(model_file='/tmp/otel-localization-madlad/spiece.model')
model=ctranslate2.Translator('/tmp/otel-localization-madlad',device='cpu',compute_type='int8',inter_threads=1,intra_threads=2)
def normalize(text):
 if text.isupper():text=text.capitalize()
 text=re.sub(r'room board','hotel room status dashboard',text,flags=re.I)
 text=re.sub(r'\bbunks\b|\bbunk beds\b','two-level beds',text,flags=re.I)
 text=re.sub(r'\bstays?\b','guest accommodation',text,flags=re.I)
 text=re.sub(r'\bproperty\b','hotel',text,flags=re.I)
 return text
for locale in ['ne','te','dz']:
 print('START',locale,flush=True); cache=stage/f'{locale}.madlad-segments.json'
 translated=json.loads(cache.read_text()) if cache.exists() else {}
 todo=[s for s in segments if s not in translated]
 for start in range(0,len(todo),48):
  batch=todo[start:start+48]
  source=[sp.encode(f'<2{locale}> '+normalize(s),out_type=str)+['</s>'] for s in batch]
  results=model.translate_batch(source,beam_size=1,max_batch_size=2048,batch_type='tokens',max_decoding_length=256,no_repeat_ngram_size=4,disable_unk=True)
  for s,result in zip(batch,results):translated[s]=sp.decode(result.hypotheses[0]).strip()
  cache.write_text(json.dumps(translated,ensure_ascii=False,indent=2)+'\n')
  print(locale,start+len(batch),'/',len(todo),list(translated.items())[-1],flush=True)
 data={}
 for key in keys:
  pieces=[]
  for piece in pattern.split(en[key]):
   if piece.strip() not in translated:pieces.append(piece);continue
   value=translated[piece.strip()]
   pieces.append((' ' if piece.startswith(' ') else '')+value+(' ' if piece.endswith(' ') else ''))
  data[key]=''.join(pieces)
 data[keys[0]]='('+translated['Not required']+')'
 data[keys[348]]='{reports} '+translated['Reports']+' · {categories} '+translated['Categories']
 data[keys[349]]=translated['Click to enlarge this screenshot']+' — {title}'
 data[keys[350]]='{title}: '+data[keys[319]]+' — Mavi Avlu Hotel ('+data[keys[326]]+')'
 for key,value in data.items():
  assert value.strip(),(locale,key,'empty')
  assert sorted(re.findall(r'\{\w+\}',key))==sorted(re.findall(r'\{\w+\}',value)),(locale,key,'placeholder')
 (stage/f'{locale}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 (stage/f'{locale}.segments.json').write_text(json.dumps(translated,ensure_ascii=False,indent=2)+'\n')
 print('DONE',locale,len(data),flush=True)
