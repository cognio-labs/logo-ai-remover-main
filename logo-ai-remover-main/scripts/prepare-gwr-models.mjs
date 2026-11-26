import { copyFile, mkdir } from "node:fs/promises";
const sdk = import.meta.resolve("@pilio/gemini-watermark-remover");
const source = new URL("../../dist/models/allenk-fdncnn/", sdk);
const target = new URL("../public/gwr-engine/models/allenk-fdncnn/", import.meta.url);

await mkdir(target, { recursive: true });
await Promise.all(
  ["86x74", "104", "200"].map((size) => {
    const filename = `model_core_fp32_${size}.onnx`;
    return copyFile(new URL(filename, source), new URL(filename, target));
  }),
);
