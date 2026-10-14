import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[2]
keys=json.loads((root/'output/i18n/source-index.json').read_text())
en=json.loads((root/'ui/src/lib/i18n/marketing/en.json').read_text())
issues=[]
for p in sorted((root/'output/i18n/generated').glob('*.json')):
 if p.name.endswith('.segments.json'):continue
 data=json.loads(p.read_text())
 for i,k in enumerate(keys):
  v=data.get(k,'');reason=[]
  if not v.strip():reason.append('empty')
  if re.findall(r'\{\w+\}',v)!=re.findall(r'\{\w+\}',k):reason.append('placeholders')
  if v==en[k] and len(v.split())>3:reason.append('English copy')
  if len(v)>max(150,len(en[k])*4):reason.append('long')
  if re.search(r'(.{4,40})\1{3}',v):reason.append('repetition')
  if v.count('¦')>1 or '\ufffd' in v:reason.append('corrupt')
  if reason:issues.append({'locale':p.stem,'index':i,'reason':reason,'source':en[k],'translation':v})
(root/'output/i18n/audit.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2)+'\n')
print('files',len(list((root/'output/i18n/generated').glob('*.json'))),'issues',len(issues))
for item in issues[:30]:print(item)
