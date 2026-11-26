import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const project = fileURLToPath(new URL("../", import.meta.url));
const options = {
  absWorkingDir: project,
  bundle: true,
  minify: true,
  platform: "browser",
  alias: { "onnxruntime-web": "gwr-onnxruntime-web" },
  loader: { ".png": "dataurl" },
  banner: { js: "/*! Gemini Watermark Remover v1.0.47, MIT. See /gwr-engine/LICENSE.txt. */" },
};

await Promise.all([
  build({
    ...options,
    entryPoints: ["src/lib/gwr-engine/video-app.js"],
    outfile: "public/gwr-engine/video-app.js",
    format: "iife",
    target: "es2022",
  }),
  build({
    ...options,
    entryPoints: ["src/lib/gwr-engine/workers/watermarkWorker.js"],
    outfile: "public/gwr-engine/workers/watermark-worker.js",
    format: "esm",
    target: "es2020",
  }),
]);
