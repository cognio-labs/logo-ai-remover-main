import cv2
import numpy as np
from PIL import Image, PngImagePlugin
import io
from synthid_verifier import verify_synthid_provenance

# 1. Natural test image
img = np.random.randint(50, 200, (400, 400, 3), dtype=np.uint8)
_, buf = cv2.imencode('.png', img)
res1 = verify_synthid_provenance(buf.tobytes(), 'sample.png')
print("Natural image:", res1["status"], "->", res1["title"], "-", res1["description"])

# 2. Image with simulated Google AI metadata tag
pil_img = Image.fromarray(img)
meta = PngImagePlugin.PngInfo()
meta.add_text("Software", "Google Imagen 3 / Gemini")
bio = io.BytesIO()
pil_img.save(bio, format="PNG", pnginfo=meta)
res2 = verify_synthid_provenance(bio.getvalue(), "gemini_test.png")
print("AI metadata image:", res2["status"], "->", res2["title"], "-", res2["description"])

# 3. Tiny thumbnail (inconclusive resolution)
tiny = np.zeros((32, 32, 3), dtype=np.uint8)
_, tiny_buf = cv2.imencode('.png', tiny)
res3 = verify_synthid_provenance(tiny_buf.tobytes(), "tiny.png")
print("Tiny image:", res3["status"], "->", res3["title"], "-", res3["description"])
