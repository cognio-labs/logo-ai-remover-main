import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
MANIFEST_PATH = PUBLIC_DIR / "samples" / "manifest.json"

def check_manifest():
    if not MANIFEST_PATH.exists():
        print(f"[FAIL] manifest.json not found at {MANIFEST_PATH}")
        sys.exit(1)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    if len(data) != 8:
        print(f"[FAIL] Expected 8 case studies in manifest, found {len(data)}")
        sys.exit(1)

    missing = []
    for item in data:
        for key in ["beforeUrl", "afterUrl", "zoomUrl", "fallbackBeforeJpg", "fallbackAfterJpg"]:
            rel_url = item.get(key, "").lstrip("/")
            file_path = PUBLIC_DIR / rel_url
            if not file_path.exists():
                missing.append((item["id"], key, str(file_path)))

    if missing:
        print(f"[FAIL] Found {len(missing)} missing sample assets:")
        for doc_id, k, p in missing:
            print(f"  - {doc_id} -> {k}: {p}")
        sys.exit(1)

    print(f"[SUCCESS] All 8 case study assets verified! ({len(data)} documents, 0 missing files)")
    sys.exit(0)

if __name__ == "__main__":
    check_manifest()
