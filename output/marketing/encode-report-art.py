"""Resize generated originals for report cards; no recoloring or artwork manipulation."""
import json
from pathlib import Path
from PIL import Image
sources=json.loads(Path('output/report-art-sources.json').read_text())
out=Path('ui/public/images/reports');out.mkdir(parents=True,exist_ok=True)
for key,source in sources.items():
    slug=key.replace('.','-')
    with Image.open(source) as image:
        for width,suffix in [(768,''),(384,'-small')]:
            dest=out/(slug+suffix+'.avif')
            if dest.exists() and dest.stat().st_mtime>=Path(source).stat().st_mtime:continue
            height=round(image.height*width/image.width)
            image.convert('RGB').resize((width,height),Image.Resampling.LANCZOS).save(dest,format='AVIF',quality=76,speed=6)
print(f'{len(sources)} report illustrations encoded at two sizes')

manifest='/** Unique DOTT report illustrations, generated with the built-in image tool. */\nexport const reportArtwork: Record<string, {src: string; small: string}> = {\n'
for key in sources:
    slug=key.replace('.','-')
    manifest+=f'  "{key}": {{src: "/images/reports/{slug}.avif", small: "/images/reports/{slug}-small.avif"}},\n'
manifest+='};\n'
Path('ui/src/components/reports/artwork.ts').write_text(manifest)
