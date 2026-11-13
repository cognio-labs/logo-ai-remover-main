# Gemini/Veo browser video engine attribution

Bellix's browser-local Gemini/Veo video workflow includes the packaged browser
runtime from [`GargantuaX/gemini-watermark-remover`](https://github.com/GargantuaX/gemini-watermark-remover),
version `1.0.45`, installed as `@pilio/gemini-watermark-remover`.

The upstream runtime and the calibrated reverse-alpha work derived from AllenK
(Kwyshell) are licensed under the MIT License. The required copyright and
permission notice is distributed with the deployed runtime at
`public/gwr-engine/LICENSE.txt`.

Included upstream runtime assets:

- `video-preview.html` and `video-app.js` — WebCodecs/MediaBunny detection,
  per-frame restoration, encoding, audio packet passthrough, and MP4 muxing.
- `models/allenk-fdncnn/*.onnx` — optional fixed-shape FDnCNN cleanup models.
- `onnxruntime/*` — ONNX Runtime Web WASM runtime and its upstream notices.

Bellix does not represent the FDnCNN model as a coordinate detector. Watermark
candidate detection is performed by the upstream calibrated catalog, anchor
search, temporal voting, and validation logic; ONNX is used only for the
supported cleanup stage.
