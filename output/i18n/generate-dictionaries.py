"""One-time local neural-model translation of public marketing copy.
No external translation API and no runtime application dependency.
Model: facebook/m2m100_1.2B (MIT), int8 CTranslate2 conversion.
Results are staged for review before publication.
"""
import json,re,time,sys
from pathlib import Path
import ctranslate2,sentencepiece
from opencc import OpenCC
root=Path(__file__).resolve().parents[2]
keys=json.loads((root/'output/i18n/source-index.json').read_text())
en=json.loads((root/'ui/src/lib/i18n/marketing/en.json').read_text())
langs=[x.lower().replace('zh-cn','zh-CN').replace('zh-tw','zh-TW') for x in json.loads((root/'ui/src/lib/contracts.generated.json').read_text())['languages']]
langs=[c for c in (sys.argv[1:] or langs) if c not in ['dz','yue','ky','ku','te'] and not (root/f'ui/src/lib/i18n/marketing/{c}.json').exists()]
out=root/'output/i18n/generated';out.mkdir(exist_ok=True)
sp=sentencepiece.SentencePieceProcessor(model_file='/tmp/otel-localization-model/spm.128k.model')
model=ctranslate2.Translator('/tmp/otel-localization-model',device='cpu',compute_type='int8',inter_threads=2,intra_threads=4)
traditional=OpenCC('s2twp')
# Clarify ambiguous short labels for a model without conversational context.
clarify={
 'Sign in':'Log in to your account','Occupancy':'Hotel occupancy','Price performance':'Hotel pricing performance',
 'Unit performance':'Hotel room performance','Room status board':'Hotel room status dashboard',
 'Receivables and payables':'Amounts receivable and amounts payable',
 'Reservations':'Room reservations','Reservations & calendar':'Room reservations and calendar',
 'Reservations for 1–7 nights.':'Accommodation bookings for 1–7 nights.',
 'Reservations for 28 nights or more.':'Accommodation bookings for 28 nights or more.',
 'Receipts':'Payments received','Receipts & business records':'Payments received and business records',
 'Property':'Accommodation property','Property name':'Name of the accommodation property',
 'Unit performance':'Performance of accommodation units','Unit revenue':'Accommodation unit revenue',
 'Security deposits':'Refundable security deposits','Deposits':'Advance payments',
 'Aparthotel':'Apartment hotel','Vacation Rental':'Vacation rental apartment','Guesthouse':'Guest house',
 'In-house guest list':'List of guests currently staying at the hotel',
 'Less bustle.':'Less hustle and bustle.','More guests.':'More hotel guests.',
 'Stay calendar':'Calendar of guest accommodation', 'Stays':'Guest accommodation',
 'Group stays':'Accommodation for groups','Bed readiness':'Readiness of guest beds',
}
def normalize(text):
 text=clarify.get(text,text)
 if text.isupper():text=text.capitalize()
 text=re.sub(r'room board','hotel room status dashboard',text,flags=re.I)
 text=re.sub(r'\bbunk beds\b|\bbunks\b','two-level beds',text,flags=re.I)
 text=re.sub(r'\boccupancy\b','hotel occupancy',text,flags=re.I)
 text=re.sub(r'\bstays?\b','guest accommodation',text,flags=re.I)
 if not re.search(r'contract|document|print|download|signature',text,re.I):text=re.sub(r'\breceipts\b','payments received',text,flags=re.I)
 text=re.sub(r'\bbunks\b','bunk beds',text,flags=re.I)
 text=re.sub(r'\bunits\b','accommodation units',text,flags=re.I)
 text=re.sub(r'\bproperty\b','accommodation facility',text,flags=re.I)
 if text.isupper():text=text.capitalize()
 text=text.replace('Aparthotel','Apartment hotel').replace('aparthotel','apartment hotel')
 return text
# Keep dynamic data, product names and arrows out of the model entirely.
pattern=re.compile(r'(\{\w+\}|Interactiveotel|Mavi Avlu Hotel|ADR|RevPAR|\bPDF\b|\bPWA\b|[↑↗]|\n| \| | · |: |(?<=\.) (?=[A-Z])|(?<=\?) (?=[A-Z])|^\d{2} / )')
parts={}
segments=[]
for key in keys:
 text=en[key];pieces=pattern.split(text);parts[key]=pieces
 for piece in pieces:
  if not piece or pattern.fullmatch(piece) or not re.search(r'[A-Za-z]',piece):continue
  part=piece.strip()
  if part not in segments:segments.append(part)
# Additional small fragments for safe structured interpolation.
for s in ['Reports','Categories','Enlarge screen','Real application screen with sample hotel records','Optional','Not required','Click to enlarge this screenshot']:
 if s not in segments:segments.append(s)
source=[['__en__']+sp.encode(normalize(s),out_type=str) for s in segments]
for locale in langs:
 target='zh' if locale.startswith('zh-') else locale
 start=time.time();print('START',locale,len(segments),'segments',flush=True)
 cached=out/f'{locale}.segments.json'
 if cached.exists():translated=json.loads(cached.read_text())
 elif locale=='zh-TW' and (out/'zh-CN.segments.json').exists():
  translated={k:traditional.convert(v) for k,v in json.loads((out/'zh-CN.segments.json').read_text()).items()}
 else:
  results=model.translate_batch(source,target_prefix=[[f'__{target}__']]*len(source),beam_size=1,max_batch_size=2048,batch_type='tokens',max_decoding_length=256,no_repeat_ngram_size=4,disable_unk=True)
  translated={s:sp.decode([token for token in result.hypotheses[0] if not token.startswith('__')]).strip() for s,result in zip(segments,results)}
  if locale=='zh-TW':translated={k:traditional.convert(v) for k,v in translated.items()}
 cached.write_text(json.dumps(translated,ensure_ascii=False,indent=2)+'\n')
 dictionary={}
 for key,pieces in parts.items():
  result=[]
  for piece in pieces:
   if piece.strip() not in translated:result.append(piece);continue
   value=translated[piece.strip()]
   if piece.startswith(' '):value=' '+value
   if piece.endswith(' '):value+=' '
   result.append(value)
  dictionary[key]=''.join(result)
 # Compose the report counter without asking a neural model to translate identifiers.
 dictionary[keys[348]]='{reports} '+translated['Reports']+' · {categories} '+translated['Categories']
 dictionary[keys[349]]=translated['Click to enlarge this screenshot']+' — {title}'
 dictionary[keys[0]]='('+translated['Not required']+')'
 dictionary[keys[350]]='{title}: '+dictionary[keys[319]]+' — Mavi Avlu Hotel ('+dictionary[keys[326]]+')'
 for key,value in dictionary.items():
  assert value.strip(),(locale,key,'empty')
  assert sorted(re.findall(r'\{\w+\}',key))==sorted(re.findall(r'\{\w+\}',value)),(locale,key,'placeholder')
 (out/f'{locale}.json').write_text(json.dumps(dictionary,ensure_ascii=False,indent=2)+'\n')
 print('DONE',locale,len(dictionary),'seconds',round(time.time()-start,1),flush=True)
