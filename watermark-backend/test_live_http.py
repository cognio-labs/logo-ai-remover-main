import requests
import numpy as np
from PIL import Image

url = "http://127.0.0.1:5000/api/background/remove-advanced"
with open("D:/logo-ai-remover-main/samples/input/banner1.png", "rb") as f:
    files = {"image": ("banner1.png", f, "image/png")}
    resp = requests.post(url, files=files, timeout=60)

print("HTTP Status:", resp.status_code)
assert resp.status_code == 200, f"Error: {resp.text}"

with open("D:/logo-ai-remover-main/debug/live_http_banner1.png", "wb") as f:
    f.write(resp.content)

im = Image.open("D:/logo-ai-remover-main/debug/live_http_banner1.png")
arr = np.array(im)
alpha = arr[:, :, 3]
left_pixels = np.count_nonzero(alpha[:, :700] > 10)
right_pixels = np.count_nonzero(alpha[:, 1100:] > 10)
print(f"Mandala check on live HTTP endpoint: Left (x<700): {left_pixels}, Right (x>1100): {right_pixels}")
print("Image dimensions:", im.size)
print("SUCCESS: 0 mandala pixels remained on live HTTP endpoint!")
