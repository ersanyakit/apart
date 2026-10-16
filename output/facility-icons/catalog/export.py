"""Export a generated catalog image as AVIF and atomically register its codes."""
import fcntl
import json
import os
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
record_path = Path(sys.argv[1])
record = json.loads(record_path.read_text())
destination = ROOT / "ui/public/images/catalog-icons-dott" / record["filename"]
destination.parent.mkdir(parents=True, exist_ok=True)
source = Image.open(record["source"])
mode = "RGBA" if "A" in source.getbands() else "RGB"
image = source.convert(mode).resize((256, 256), Image.Resampling.LANCZOS)
image.save(destination, format="AVIF", quality=90)
with Image.open(destination) as exported:
    assert exported.format == "AVIF" and exported.size == (256, 256)

mapping_path = ROOT / "ui/src/lib/catalog-icon-map.json"
with (ROOT / "output/facility-icons/catalog/export.lock").open("a") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    mapping = json.loads(mapping_path.read_text())
    mapping.update({code: "/images/catalog-icons-dott/" + record["filename"] for code in record["codes"]})
    temporary = mapping_path.with_suffix(".tmp.json")
    temporary.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n")
    os.replace(temporary, mapping_path)
print(record["key"])
