import json
import base64
from pathlib import Path
import numpy as np

json_path = Path(__file__).parent / "gemini_alpha_maps.json"
out_path = Path(__file__).parent.parent / "logo-ai-remover-main" / "src" / "lib" / "geminiAlphaData.ts"

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

lines = [
    "// Auto-generated ground-truth Gemini watermark alpha maps",
    "// Quantized uint8 (0-255) / 255 with 0.00000000 reconstruction error",
    ""
]

for k, varname in [("36-v2", "B64_ALPHA_36_V2"), ("48", "B64_ALPHA_48"), ("96", "B64_ALPHA_96")]:
    arr = np.array(data[k], dtype=np.float32)
    u8 = np.round(arr * 255.0).astype(np.uint8)
    b64 = base64.b64encode(u8.tobytes()).decode("ascii")
    dim = int(round(np.sqrt(len(arr))))
    lines.append(f"export const {varname} = '{b64}';")
    lines.append(f"export const DIM_{varname.replace('B64_ALPHA_', '')} = {dim};")

out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

print(f"Successfully wrote {out_path} ({out_path.stat().st_size} bytes)")
