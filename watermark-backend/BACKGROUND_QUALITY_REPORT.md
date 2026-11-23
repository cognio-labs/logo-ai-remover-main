# Bellix background remover investigation — 2026-11-23

## Latest shared-pipeline investigation

**Global visual acceptance: FAILED. Do not deploy.** The previous investigation
below remains historical evidence; this section describes the current code and
new run in `scratch/shared-alpha-regression`. No separate category model pipelines
were added, and the default remains ISNet.

### Actual processing path

`src/lib/backgroundRemoverEngine.ts` sends image bytes through
`src/app/api/remove-bg/route.ts` to FastAPI's
`/api/background/remove-advanced` in `watermark-backend/main.py`.
The shared worker entry is `remove_background_pipeline` in
`bg_remover_advanced.py`. `_decode_image` handles orientation and decoding.
`predict_foreground_mask` in `bg_model_inference.py` now calls ONNX
`inner_session.run` directly for every supported model in the default chain.
Its first output's `[0, 0]` plane is the actual native-resolution raw mask.
`restore_foreground_mask` validates finite values and model output semantics,
normalizes logits/probabilities, resizes float values to the exact original
dimensions with bilinear interpolation, then quantizes once. The shared
orchestrator copies decoded original RGB, sets alpha with `putalpha`, and
`_pil_to_png_bytes` exports a genuine lossless RGBA PNG. Original RGB is never
multiplied by alpha. Existing source alpha is applied once when segmentation is
requested. The pre-existing authored-alpha preservation operation remains and
is explicitly identified as preservation rather than neural inference.

The old default `session.predict` hid native masks: it divided input RGB by its
own maximum, stretched each prediction to its own minimum/maximum, quantized,
then resized with Lanczos. ISNet input now uses fixed `/255` and mean `.5`,
consistent with the [official DIS training loader](https://github.com/xuebinqin/DIS/blob/main/IS-Net/data_loader_cache.py).
U2Net retains its model-specific input preprocessing. Probability output is
kept on its declared `[0,1]` scale; BiRefNet logits use sigmoid. No dynamic
polarity guessing, contrast stretching, thresholding, erosion, dilation,
hole filling, RGB repair or edge decontamination is performed. These changes
remove processing distortions; they do not repair wrong semantic predictions.

### Saved diagnostics and validation

Run from workspace root:

```powershell
watermark-backend/.venv/Scripts/python.exe -m pytest watermark-backend/test_bg_alpha_contract.py watermark-backend/test_bg_remover_unit.py -q
watermark-backend/.venv/Scripts/python.exe watermark-backend/tools/regress_shared_alpha.py
```

The pytest run completed with **21 passed**, including actual ISNet inference and
fallback coverage. Added cases exercise fixed input scaling, constant masks,
invalid probabilities, asymmetric non-square alignment, real raw-mask exports,
and end-to-end diagnostic names/PNG alpha round-trip. Existing tests cover
source alpha applied once, exact RGB, thin soft details and natural holes.

Every case under `scratch/shared-alpha-regression/<case>` has `original.png`,
`raw_mask.png`, `normalized_mask.png`, `refined_mask.png`, `final_output.png`,
`diagnostics.json`, `report.json`, and `comparison.png`. Comparisons show original
and output over white, dark and checkerboard backgrounds. Native neural float
tensors are also saved as `raw_mask.npy`; raw/normalized PNGs encode `[0,1]`
probabilities as 16-bit grayscale. BiRefNet raw PNG previews encode clipped
`[-20,20]` logits, with the exact logits retained in NPY. Authored-alpha cases
explicitly record that no neural raw mask exists and show the source alpha in
the diagnostic mask images. `refined_mask` is the final alpha; its name does
not imply morphology was applied.

Metadata records original/native/restored dimensions, minimum, maximum, mean,
percentiles, foreground percentage (`alpha >128` for measurement only), exact
transparent percentage (`alpha ==0`), soft percentage and inference providers.
Worker logs include session/provider exceptions and fallback error metadata.
This run used **CPUExecutionProvider**, with no GPU inference attempted and no
inference failures. GPU behavior is untested. Earlier BiRefNet memory failures
described below were not rerun or relabeled as passes.

Known image polarity probes in `polarity-probes.json`: portrait face `(500,500)`
and family foreground `(465,200)` both have alpha 255, while background `(20,20)`
is 0 in each. The asymmetric numeric test independently verifies alignment and
high-value foreground polarity. These checks establish that inversion would
be wrong; they do not certify all subject boundaries.

### Visual comparison verdicts

All nine cases passed exact decoded RGB equality, resolution equality, genuine
RGBA PNG and existence of transparent pixels. These are structural passes only.
Each comparison was inspected visually; no overall quality pass is claimed.

| Case | Visual finding |
|---|---|
| portrait | Face and clothing retained; residual material/softness around hair remains. Strict edge acceptance pending. |
| family-outdoor | Four people and clothing retained at comparison scale, field removed. Full-resolution edge certification pending. |
| product | **Fail:** shoe becomes translucent. Native raw probability maximum is only `0.81300044`, resulting in alpha maximum 207. Damage already exists before alpha composition. |
| logo | Exact authored RGBA preserved, including lettering/tagline and original glow. This is preservation, not neural removal. |
| opaque-logo | Derived by flattening the authored logo on white. Main lettering and tagline retained at comparison scale; thin-edge/shadow acceptance pending. |
| graphics | **Fail:** shapes and textures become translucent or disappear in native mask and final output. |
| outdoor-wildlife | **Fail:** terrain remains around the leopard and lower body. |
| poster | **Fail for isolated person:** this fixture is a screenshot of the poster cutout, not a clean source poster. Rings remain; its bottom fade already exists in the source screenshot. |
| reported-example | Exact existing RGBA preserved. The attached PNG already has faded text/background/rings. Existing damage is not restored or claimed fixed. |

Fixture warning: the local file named `banner1.png` actually shows the family;
it was excluded as a poster after visual inspection. The poster case uses
`samples/input/dupatta_fashion.png`, whose actual content is a poster screenshot.
The report records real source paths. A pristine opaque source poster and
reference masks for semantic evaluation remain absent. No previous output is
treated as ground truth for new segmentation.

The shared numerical/composition corrections are implemented and tested.
The global request remains **incomplete** because model-native masks still fail
product, graphics and outdoor acceptance. Raising alpha globally, filling holes,
or deleting thin components would conceal uncertainty and damage other inputs;
those operations were not added. `quality_pass` remains false. No deployment,
model promotion, or frontend changes were performed in this investigation.

Deployment: **blocked**. No production changes or model-default promotion performed.
The code fixes below are tested; professional-quality segmentation across all categories is not established.

## Root causes and evidence

1. **Model prediction failures, not PNG corruption.** The ISNet raw masks already suppress the dark “Bellix” letters, make the abstract graphics partially transparent, keep rings around the screenshot subject, and retain terrain around the wildlife subject. The same structures appear in final alpha and exported PNG. White means foreground in the inspected masks; inversion would erase the people and retain the scene. No evidence supports flipping polarity.
2. **Alpha extracted from a composite rather than from segmentation.** Previously `rembg.remove` generated an RGBA cutout, whose alpha could already include source alpha. The pipeline extracted that alpha and multiplied by source alpha again. An existing alpha of 128 with a fully foreground mask could become approximately 64. Direct mask prediction on RGB, followed by exactly one source-alpha multiplication, fixes this independently of model quality.
3. **Already-transparent graphics were segmented again.** Both Bellix logo originals have authored RGBA transparency. ISNet treats dark lettering and the small tagline as background. The new auto/graphics path preserves this alpha exactly and reports `preserved-existing-transparency`, with `isRealAi: false` in the browser result. This is an explicit preservation operation, not a claim of new AI removal. Portrait/product mode can explicitly request fresh segmentation of a transparent source. Opaque graphics still need segmentation; this branch does not solve them.
4. **BiRefNet adapter preprocessing mismatch.** Installed rembg divides RGB by the image maximum and min/max stretches predicted sigmoid values. The author's example uses ToTensor (fixed /255), ImageNet channel normalization and sigmoid output without per-image stretching: https://huggingface.co/ZhengPeng7/BiRefNet . The new adapter uses those operations, resizes float probabilities to source dimensions before 8-bit quantization, and rejects nonfinite or unexpected tensor shapes. This adapter has numeric regression coverage; successful full-model inference remains unverified on this machine.
5. **Model selection was overridden in two frontend layers.** Both the browser and Next proxy forced ISNet. The proxy now forwards explicit model/image-type choices and otherwise leaves selection to the worker. Worker default remains ISNet; `BELLIX_BACKGROUND_MODEL` can select an evaluated alternative later. ISNet remains first fallback when an explicitly selected BiRefNet fails. Portrait-only fallback is not applied to arbitrary graphics.
6. **Memory is an independent operational failure.** Local ONNX exposes CPU/Azure, without CUDA. Physical RAM is about 8.50 billion bytes (7.92 GiB). BiRefNet Lite and General loaded but failed on decoder intermediates; an isolated retry requested an 822,083,584-byte buffer. The full General attempt exhausted system commit enough to prevent another PowerShell process starting. These are recorded runtime failures, not visual passes. Overlapping evaluation runs were stopped; the worker now serializes inference. Existing unrelated processes were not stopped, and system paging/GPU settings were not changed.

The previous turn removed destructive thresholding, hole filling, thin-component pruning and OCR rejection from the active orchestration. Those legacy helper functions remain in the file but are not called. This turn does not add erosion, feathering, RGB decontamination or blur. Color decontamination changes RGB and therefore is not silently enabled under the exact-RGB contract.

## Actual model comparison

The reproducible manifest contains 12 cases spanning portraits, family, pets, glass, shoes, wildlife, logos, abstract graphics and screenshots. Source SHA-256 values in the JSON reports identify paired inputs. The earlier 20-source run remains in `scratch/bg-quality`; several of its misleading fixture names actually identify screenshots. It is not a 20-image paired BiRefNet benchmark.

| Model/adapter | Completed predictions | Result |
|---|---:|---|
| ISNet / rembg mask-only | 12 of 12 | All exported with exact source RGB, dimensions and alpha round-trip. Semantic failures below. |
| BiRefNet General Lite / installed rembg | 1 portrait | Cleaner outline around raised hand than ISNet at review scale; not enough evidence for general promotion. 144.597 s under memory pressure. Next hair case failed allocation; run stopped. |
| BiRefNet Lite / corrected adapter | 0 | Portrait attempt failed allocation. Isolated logo retry also failed allocating 822,083,584 bytes. No corrected-adapter visual pass claimed. |
| BiRefNet General / corrected adapter | 0 | Loaded in 11.42 s; portrait inference failed on the same decoder buffer allocation. |
| Auto/graphics authored-alpha preservation | 2 logos | Exact RGBA match to authored originals; no lost letters, tagline or soft alpha. |

The request to compare both models visually on every category could not be completed with the available CPU memory. Blank/error rows in montages mean **no output**, not an acceptable cutout or a hidden fallback. The default was not switched based on the single Lite portrait result.

## Per-image visual review

“Preview pass” describes inspection at montage scale only; it does not certify every hair strand. “Fail” means visible problems prevent professional-quality acceptance. Structural export checks passed on all 12 ISNet outputs, independently of these visual verdicts.

| Case | ISNet visual verdict | Evidence / improved-path result |
|---|---|---|
| portrait | Fail for strict quality | Soft/remnant material around raised-hand outline; Lite appears cleaner on that paired source. Source also includes UI labels, so it is not a pristine portrait fixture. |
| portrait-hair | Needs detailed edge review | Main face/shoulders retained; edge-color contamination is not corrected under the unchanged-RGB contract. No production pass. |
| family | Preview pass | All four people remain and field/fence removed in the reviewed montage. No ground-truth alpha available for strand-level certification. |
| pets | Fail for strict quality | Cat body has uneven/soft coverage; fine fur not certified. |
| glass-product | Needs detailed material review | Bottle silhouette retained. Source has baked checkerboard imagery; true glass/background separation is ambiguous in a flattened source. No production pass. |
| shoe | Fail | Subject becomes substantially translucent in raw ISNet mask. |
| wildlife | Fail | Mountain/terrain retained around leopard in raw prediction. |
| graphics | Fail | Logo shapes, gradients and texture become translucent; no reliable single foreground selected. |
| logo | Fail in ISNet; preservation pass | “Bellix” and tagline disappear in model mask. Auto/graphics preserves original RGBA exactly. |
| logo-transparent | Fail in ISNet; preservation pass | Same text/detail failure; preservation restores the authored mask exactly. |
| screenshot-rings | Fail | Decorative rings remain in raw mask and result. |
| screenshot-cards | Fail as subject-only extraction | Predicted foreground includes card/image rectangles and fragments of text. Intended subject selection needs explicit user guidance; no rectangle bypass is used. |

### Quantified logo regression

Against the authored source alpha (valid ground truth for preservation, not invented segmentation ground truth):

| Logo | ISNet alpha MAE, 0–255 | Source pixels with alpha >=250 reduced below128 by ISNet | Fixed alpha MAE | Fixed RGBA exact |
|---|---:|---:|---:|---|
| navbar-logo-original | 16.672520 | 42,215 | 0 | Yes |
| navbar-logo | 19.064504 | 38,341 | 0 | Yes |

The authored original contains a soft glow below its symbol. Preservation intentionally retains that glow; it is source artwork, not newly introduced gray noise. Removing it would require an explicit edit to the authored mask.

## Artifacts and reproduction

From workspace root:

```powershell
watermark-backend/.venv/Scripts/python.exe watermark-backend/tools/compare_bg_models.py --model isnet-general-use
watermark-backend/.venv/Scripts/python.exe watermark-backend/tools/compare_bg_models.py --model birefnet-general-lite
watermark-backend/.venv/Scripts/python.exe watermark-backend/tools/compare_bg_models.py --model birefnet-general-lite --fixed
watermark-backend/.venv/Scripts/python.exe watermark-backend/tools/compare_bg_models.py --model birefnet-general --fixed
watermark-backend/.venv/Scripts/python.exe watermark-backend/tools/review_graphics_preservation.py
watermark-backend/.venv/Scripts/python.exe watermark-backend/tools/compare_bg_models.py --montage
```

Run model evaluations **sequentially** on a worker with sufficient memory; do not repeat the full runs on this constrained machine without more headroom. `--case portrait` isolates a fixture. A single-case rerun merges its result into the manifest report rather than discarding previous cases.

Artifacts: `scratch/bg-model-comparison/<case>/<model>/original.png`, `raw-mask.png`, `alpha.png`, `result.png`; aggregate JSON per model and `<case>-compare.jpg`. Raw masks are the adapter's decoded foreground masks; the float tensor is not represented as an RGBA cutout. The corrected BiRefNet adapter logs logit range in metadata if inference succeeds. RGB is copied from the decoded, orientation-corrected source; only inference tensors and mask restoration are resized. PNG export is lossless; no JPEG recompression is introduced.

## Checks and remaining acceptance

- Nine focused pytest cases passed: soft alpha/fine details/holes, exact RGB and non-square dimensions, both degenerate-mask failures, source alpha applied once, RGB mask-only input, fixed BiRefNet numeric normalization, auto and explicit graphics preservation, and BiRefNet-to-ISNet fallback.
- TypeScript `tsc --noEmit` passed from the application directory.
- Python compilation passed for changed inference, backend and comparison files.
- `quality_pass` remains false. `mask_valid` records structural alpha validity only. The proxy forwards operation/model/quality headers and disables response caching.
- Existing erase/restore brush UI and other features were retained; no UI redesign or production deployment.
- Still required before model promotion: successful paired BiRefNet runs across all categories on sufficient hardware; opaque-logo/text and real product reference masks; full-resolution hair/glass edge review. Portrait/product hints currently request fresh general-model segmentation; they are not claims of category-specialized trained models.
