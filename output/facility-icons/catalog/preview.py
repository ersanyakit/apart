"""Make labelled AVIF contact sheets for visual catalog review."""
import json
import math
from pathlib import Path
import sys
import textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
catalog = json.loads((ROOT / "internal/domain/catalog/defaults.json").read_text())
mapping = json.loads((ROOT / "ui/src/lib/catalog-icon-map.json").read_text())
category = next(c for c in catalog["categories"] if c["key"] == sys.argv[1])
entries = [item for group in category["groups"] for item in group["entries"] if item["key"] in mapping]
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 14)
destination = ROOT / "output/facility-icons/catalog/previews"
destination.mkdir(exist_ok=True)
for page in range(math.ceil(len(entries) / 20)):
    rows = entries[page * 20:(page + 1) * 20]
    sheet = Image.new("RGB", (1100, 250 * math.ceil(len(rows) / 5)), "#f9f9f9")
    draw = ImageDraw.Draw(sheet)
    for index, item in enumerate(rows):
        with Image.open(ROOT / ("ui/public" + mapping[item["key"]])) as icon:
            assert icon.format == "AVIF" and icon.size == (256, 256), (item["key"], mapping[item["key"]], icon.size)
            resized = icon.resize((196, 196))
            mask = resized.getchannel('A') if 'A' in resized.getbands() else None
            sheet.paste(resized, ((index % 5) * 220 + 12, (index // 5) * 250), mask)
        for line_number, line in enumerate(textwrap.wrap(item["label"]["TR"], 27)):
            draw.text(((index % 5) * 220 + 12, (index // 5) * 250 + 199 + line_number * 17), line, font=font, fill="#131313")
    name = f"{category['key']}-{page + 1:02d}"
    sheet.save(destination / (name + ".avif"), quality=90)
    sheet.save(Path("/tmp") / ("catalog-" + name + ".png"))
print(json.dumps({"category": category["key"], "ready": len(entries), "pages": math.ceil(len(entries) / 20)}))
