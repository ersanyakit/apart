"""Prepare and validate static public-page translations; no production model dependency."""
import json,re,time,sys
from pathlib import Path
import ctranslate2,sentencepiece
root=Path(__file__).resolve().parents[2];dest=root/'ui/src/lib/i18n/marketing';stage=root/'output/i18n/revised';stage.mkdir(exist_ok=True)
keys=json.loads((root/'output/i18n/source-index.json').read_text());en=json.loads((dest/'en.json').read_text())
codes='tr:tur_Latn en:eng_Latn de:deu_Latn fr:fra_Latn ru:rus_Cyrl ar:arb_Arab ne:npi_Deva th:tha_Thai zh-CN:zho_Hans zh-TW:zho_Hant hi:hin_Deva km:khm_Khmr si:sin_Sinh ta:tam_Taml yue:yue_Hant ur:urd_Arab bn:ben_Beng dz:dzo_Tibt es:spa_Latn it:ita_Latn pt:por_Latn nl:nld_Latn pl:pol_Latn cs:ces_Latn hu:hun_Latn ro:ron_Latn el:ell_Grek uk:ukr_Cyrl bg:bul_Cyrl sr:srp_Cyrl hr:hrv_Latn sk:slk_Latn sl:slv_Latn fi:fin_Latn sv:swe_Latn da:dan_Latn no:nob_Latn ms:zsm_Latn id:ind_Latn vi:vie_Latn ja:jpn_Jpan ko:kor_Hang fa:pes_Arab he:heb_Hebr sw:swh_Latn am:amh_Ethi mr:mar_Deva pa:pan_Guru te:tel_Telu my:mya_Mymr lo:lao_Laoo ka:kat_Geor hy:hye_Armn az:azj_Latn kk:kaz_Cyrl uz:uzn_Latn ky:kir_Cyrl mn:khk_Cyrl ps:pbt_Arab ku:kmr_Latn'
code_map=dict(s.split(':') for s in codes.split())
vocabulary=set(Path('/tmp/otel-localization-nllb/shared_vocabulary.txt').read_text().splitlines())
assert set(code_map.values()) <= vocabulary, 'Unknown model language token'
manual={'tr','en','de','fr','ar','ky','ku','yue'}
priority=['ne','km','si','ta','dz','te']
locales=sys.argv[1:] or priority+[c for c in code_map if c not in manual and c not in priority]
pattern=re.compile(r'(\{\w+\}|Interactiveotel|Mavi Avlu Hotel|ADR|RevPAR|\bPDF\b|\bPWA\b|[↑↗]|\n| \| | · |: |(?<=\.) (?=[A-Z])|(?<=\?) (?=[A-Z])|^\d{2} / )')
segments=list(json.loads((root/'output/i18n/generated/ru.segments.json').read_text()))
sp=sentencepiece.SentencePieceProcessor(model_file='/tmp/otel-localization-nllb/sentencepiece.bpe.model')
model=ctranslate2.Translator('/tmp/otel-localization-nllb',device='cpu',compute_type='int8',inter_threads=2,intra_threads=4)
def normalize(s):
 if s.isupper():s=s.capitalize()
 s=re.sub(r'room board','room status dashboard',s,flags=re.I)
 s=re.sub(r'\bstays?\b','guest stays',s,flags=re.I)
 if not re.search(r'contract|document|print|download|signature',s,re.I):s=re.sub(r'\breceipts\b','payments received',s,flags=re.I)
 s=re.sub(r'\bbunks\b','bunk beds',s,flags=re.I)
 s=re.sub(r'bed occupancy','proportion of beds in use',s,flags=re.I)
 s=re.sub(r'\boccupancy\b','proportion of rooms in use',s,flags=re.I)
 s=re.sub(r'\bproperty\b','accommodation property',s,flags=re.I)
 if s=='Sign in':s='Log in to your account'
 if s=='Occupancy':s='Room occupancy rate'
 return s
source={s:['eng_Latn']+sp.encode(normalize(s),out_type=str)+['</s>'] for s in segments}
def editorial(locale,data):
 for filename,indices in [('headlines.txt',[28,352,140,94,85,367,321,234,383,365,390]),('navigation.txt',[111,70,387,249,74])]:
  for line in (root/'output/i18n'/filename).read_text().splitlines():
   if not line or line.startswith('#'):continue
   code,*values=line.split('|')
   if code.strip()==locale:
    assert len(values)==len(indices)
    for i,v in zip(indices,values):data[keys[i]]=v
 p=root/'output/i18n/corrections.json'
 if p.exists():
  for i,v in json.loads(p.read_text()).get(locale,{}).items():data[keys[int(i)]]=v
 for i,label in [(84,85),(95,94),(369,367)]:data[keys[i]]=data[keys[label]]+' | Interactiveotel'
 for i,label in [(82,85),(98,94),(364,367)]:data[keys[i]]=data[keys[label]]
 return data
for locale in locales:
 if (stage/f'{locale}.published').exists():continue
 start=time.time();print('START',locale,flush=True)
 cache=stage/f'{locale}.segments.json';translated=json.loads(cache.read_text()) if cache.exists() else {}
 todo=[s for s in segments if s not in translated]
 for offset in range(0,len(todo),512):
  batch=todo[offset:offset+512]
  results=model.translate_batch([source[s] for s in batch],target_prefix=[[code_map[locale]]]*len(batch),beam_size=2,max_batch_size=1024,batch_type='tokens',max_decoding_length=256,no_repeat_ngram_size=4,disable_unk=True)
  for s,r in zip(batch,results):translated[s]=sp.decode(r.hypotheses[0][1:]).strip()
  cache.write_text(json.dumps(translated,ensure_ascii=False,indent=2)+'\n')
  print('PROGRESS',locale,offset+len(batch),'/',len(todo),flush=True)
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
 data=editorial(locale,data);issues=[]
 for i,key in enumerate(keys):
  v=data[key]
  if not v.strip():issues.append((i,'empty'))
  if sorted(re.findall(r'\{\w+\}',key))!=sorted(re.findall(r'\{\w+\}',v)):issues.append((i,'placeholder'))
  if v==en[key] and len(v.split())>3:issues.append((i,'English copy'))
  if re.search(r'(.{6,40})\1{3}',v):issues.append((i,'repetition'))
 (stage/f'{locale}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 if issues:
  print('REVIEW',locale,issues,flush=True);continue
 temp=dest/f'{locale}.json.tmp';temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');temp.replace(dest/f'{locale}.json')
 p=dest.parent/'marketing.ts';text=p.read_text()
 if f'./marketing/{locale}.json' not in text:
  text=text.replace('\n};',f'\n "{locale}": () => import("./marketing/{locale}.json"),\n}};',1);p.write_text(text)
 (stage/f'{locale}.published').write_text('391 keys validated\n')
 print('PUBLISHED',locale,len(data),'seconds',round(time.time()-start,1),flush=True)
print('COMPLETE',flush=True)
