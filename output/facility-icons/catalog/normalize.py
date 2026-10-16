"""Give the catalog a 256px copy of any larger shared illustration."""
import fcntl
import json
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
mapping_path = ROOT / "ui/src/lib/catalog-icon-map.json"
with (ROOT / "output/facility-icons/catalog/export.lock").open("a") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    mapping = json.loads(mapping_path.read_text())
    bed_variants = {'Single bed':'single', 'Double bed':'double', 'Twin beds':'twin', 'Bunk bed':'bunk2', 'Triple bunk bed':'bunk3', 'Fold-out sofa bed':'sofa', 'Folding bed':'folding', 'Baby cot':'crib', 'Murphy bed':'murphy', 'Loft bed':'loft'}
    catalog = json.loads((ROOT / 'internal/domain/catalog/defaults.json').read_text())
    bed_sources = json.loads((ROOT / 'output/bed-icons/sources.json').read_text())
    exported_beds = set()
    for category in catalog['categories']:
        for group in category['groups']:
            for item in group['entries']:
                variant = bed_variants.get(item['label']['EN'])
                if not variant or item['key'] not in mapping:
                    continue
                name = 'shared-bed-' + variant + '.avif'
                if variant not in exported_beds:
                    with Image.open(bed_sources[variant]) as image:
                        image.convert('RGBA').resize((256, 256), Image.Resampling.LANCZOS).save(ROOT / 'ui/public/images/catalog-icons-dott' / name, format='AVIF', quality=90)
                    exported_beds.add(variant)
                mapping[item['key']] = '/images/catalog-icons-dott/' + name
    changes = {}
    for code, url in mapping.items():
        if url in changes:
            continue
        with Image.open(ROOT / ("ui/public" + url)) as image:
            if image.format == "AVIF" and image.size == (256, 256):
                continue
            name = "shared-" + code.replace(".", "-") + ".avif"
            destination = ROOT / "ui/public/images/catalog-icons-dott" / name
            mode = 'RGBA' if 'A' in image.getbands() else 'RGB'
            image.convert(mode).resize((256, 256), Image.Resampling.LANCZOS).save(destination, format="AVIF", quality=90)
            changes[url] = "/images/catalog-icons-dott/" + name
    mapping = {code: changes.get(url, url) for code, url in mapping.items()}
    temporary = mapping_path.with_suffix(".tmp.json")
    temporary.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n")
    os.replace(temporary, mapping_path)
print(json.dumps({"normalized_images": len(changes)}))
