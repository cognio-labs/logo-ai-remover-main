# Gemini image and video engine attribution

Bellix uses the browser image and video runtimes from
[`GargantuaX/gemini-watermark-remover`](https://github.com/GargantuaX/gemini-watermark-remover).
The vendored source and browser bundles come from the local checkout at
version `1.0.47`, commit `c596ae7`.

The upstream runtime and the calibrated reverse-alpha work derived from AllenK
(Kwyshell) are licensed under the MIT License. The required copyright and
permission notice is distributed with the deployed runtime at
`public/gwr-engine/LICENSE.txt`.

Included upstream runtime assets:

- `src/lib/gwr-engine/` — calibrated image SDK, image worker source, video
  processor source and their shared dependencies.
- `workers/watermark-worker.js` — browser image processing bundle.
- `video-preview.html` and `video-app.js` — WebCodecs/MediaBunny detection,
  per-frame restoration, encoding, audio packet passthrough, and MP4 muxing.
- `models/allenk-fdncnn/*.onnx` — optional fixed-shape FDnCNN cleanup models.
- `onnxruntime/*` — ONNX Runtime Web WASM runtime and its upstream notices.

The image and video bundles are served from `public/gwr-engine/`. The development
and production build scripts copy the three model weights into this directory
from the pinned `@pilio/gemini-watermark-remover` package. The calibrated catalog,
anchor search and temporal voting locate video marks. FDnCNN runs in the
supported cleanup stage.

Run `npm run build:gwr-engine` in the Bellix frontend after editing the vendored
runtime. The original checkout, release files, scripts and fixtures were copied
into the workspace's `vendor/gemini-watermark-remover/` for local reference.
Its pnpm lockfile defines the source project's dependencies.
