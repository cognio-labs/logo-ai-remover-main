import urllib.request
from pathlib import Path
import sys
import time

WEIGHTS_DIR = Path(__file__).resolve().parent.parent / "backend" / "models" / "weights"
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

MODELS = {
    "u2net.onnx": "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx",
    "silueta.onnx": "https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx",
}

def download_file(url: str, dest_path: Path):
    if dest_path.exists() and dest_path.stat().st_size > 1000000:
        print(f"[OK] {dest_path.name} already exists ({dest_path.stat().st_size / 1024 / 1024:.1f} MB)")
        return

    print(f"[DOWNLOADING] {dest_path.name} from {url}...")
    temp_path = dest_path.with_suffix(".tmp")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    
    start_time = time.time()
    with urllib.request.urlopen(req) as resp, open(temp_path, "wb") as f:
        total = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        chunk_size = 1024 * 512
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            if total > 0:
                percent = (downloaded / total) * 100
                speed = (downloaded / (time.time() - start_time + 0.001)) / 1024 / 1024
                sys.stdout.write(f"\r  -> {percent:.1f}% ({downloaded / 1024 / 1024:.1f}/{total / 1024 / 1024:.1f} MB) at {speed:.1f} MB/s")
                sys.stdout.flush()
    print()
    temp_path.replace(dest_path)
    print(f"[DONE] Saved {dest_path.name} ({dest_path.stat().st_size / 1024 / 1024:.1f} MB)")

if __name__ == "__main__":
    for name, url in MODELS.items():
        try:
            download_file(url, WEIGHTS_DIR / name)
        except Exception as e:
            print(f"[ERROR] Could not download {name}: {e}")
