"""Export generated bed illustrations with their original alpha preserved."""
import json
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[2]
manifest = json.loads((root / 'output/bed-icons/sources.json').read_text())
target = root / 'ui/public/images/bed-icons-dott'
target.mkdir(parents=True, exist_ok=True)
for key, source in manifest.items():
    image = Image.open(source).convert('RGBA')
    # Only normalize canvas/size; the illustration and transparency come from imagegen.
    image = ImageOps.contain(image, (384, 384), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (384, 384))
    canvas.alpha_composite(image, ((384-image.width)//2, (384-image.height)//2))
    destination = target / f'{key}.avif'
    canvas.save(destination, 'AVIF', quality=85, speed=6)
    assert Image.open(destination).format == 'AVIF'
    print(f'{key}: {destination.stat().st_size} bytes')
