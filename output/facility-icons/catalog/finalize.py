"""Validate and package the completed catalog without including source PNGs."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / 'output/facility-icons/catalog'
catalog = json.loads((ROOT / 'internal/domain/catalog/defaults.json').read_text())
entries = [item for category in catalog['categories'] for group in category['groups'] for item in group['entries']]
records = [json.loads(p.read_text()) for p in sorted((OUTPUT / 'records').glob('*.json'))]
plan = json.loads((OUTPUT / 'plan-summary.json').read_text())
assert len(records) == plan['pending_concepts'], (len(records), plan['pending_concepts'])
mapping_path = ROOT / 'ui/src/lib/catalog-icon-map.json'
with (OUTPUT / 'export.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    mapping = json.loads(mapping_path.read_text())
    for record in records:
        mapping.update({code: record['output'] for code in record['codes']})
    canonical = {}
    for item in entries:
        assert item['key'] in mapping, item['key']
        canonical.setdefault(item['label']['EN'], mapping[item['key']])
        mapping[item['key']] = canonical[item['label']['EN']]
    assert set(mapping) == {item['key'] for item in entries}
    temporary = mapping_path.with_suffix('.tmp.json')
    temporary.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + '\n')
    os.replace(temporary, mapping_path)

images = {}
content = {}
for url in sorted(set(mapping.values())):
    file = ROOT / ('ui/public' + url)
    with Image.open(file) as image:
        assert image.format == 'AVIF' and image.size == (256, 256), (url, image.format, image.size)
    digest = hashlib.sha256(file.read_bytes()).hexdigest()
    assert digest not in content, (url, content.get(digest))
    content[digest] = url
    images[url] = {'bytes': file.stat().st_size, 'sha256': digest}
assert len(images) == plan['unique_concepts'], (len(images), plan['unique_concepts'])

review = json.loads((OUTPUT / 'review.json').read_text())
for category in catalog['categories']:
    assert review.get(category['key'], {}).get('status') == 'reviewed', category['key']
    assert review[category['key']]['entries'] == sum(len(group['entries']) for group in category['groups']), category['key']

urls = set(images)
urls.update('/images/facility-icons-dott/' + c['icon_key'] + '.avif' for c in catalog['categories'])
archive = OUTPUT / 'catalog-icons-dott-avif.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_STORED) as package:
    for url in sorted(urls):
        file = ROOT / ('ui/public' + url)
        with Image.open(file) as image:
            assert image.format == 'AVIF' and image.size == (256, 256)
        package.write(file, url.removeprefix('/images/'))
manifest = {
    'generator': 'built-in image_gen', 'format': 'AVIF', 'dimensions': [256, 256],
    'entries': len(entries), 'unique_item_illustrations': len(images), 'new_illustrations': len(records),
    'category_illustrations': len(catalog['categories']), 'mapping': mapping, 'images': images,
    'style_brief': json.loads((OUTPUT / 'style-brief.json').read_text()), 'generation_records': records,
    'visual_review': review,
}
(OUTPUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'entries': len(entries), 'unique_item_images': len(images), 'new_images': len(records), 'archive_images': len(urls), 'archive_bytes': archive.stat().st_size}))
