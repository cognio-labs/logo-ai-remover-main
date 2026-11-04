import urllib.request
from pathlib import Path

boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
img_path = Path("d:/logo-ai-remover-main/watermark-backend/test_images/test_plain.jpg")
img_bytes = img_path.read_bytes()

parts = [
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"test.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n".encode("latin-1"),
    img_bytes,
    f"\r\n--{boundary}--\r\n".encode("latin-1")
]
body = b"".join(parts)

endpoints = [
    "https://watermark-backend-weld.vercel.app/api/health",
    "https://watermark-backend-weld.vercel.app/api/gemini-image/clean",
    "https://watermark-backend-weld.vercel.app/api/remove",
]

for ep in endpoints:
    if "health" in ep:
        req = urllib.request.Request(ep, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            print(f"{ep} -> {resp.status}: {resp.read().decode('utf-8')[:100]}")
    else:
        req = urllib.request.Request(
            ep,
            data=body,
            headers={
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "User-Agent": "Mozilla/5.0"
            }
        )
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            print(f"{ep} -> {resp.status}, X-Box: {resp.headers.get('X-Box')}, bytes: {len(data)}")

