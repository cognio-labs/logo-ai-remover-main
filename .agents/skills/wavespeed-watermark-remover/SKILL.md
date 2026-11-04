---
name: wavespeed-watermark-remover
description: Remove watermarks, logos, captions, and text overlays from images and videos using WaveSpeed AI. Intelligently detects and removes watermarks while preserving texture and background. Supports images and videos up to 10 minutes. Only for media the user owns or is licensed to modify (e.g. cleaning their own exports, stock they have purchased, or overlays they added themselves); never to strip another party's copyright or attribution marks. Use when the user wants to remove watermarks or text overlays from their own media.
metadata:
  author: wavespeedai
  version: "2.0"
---

# WaveSpeedAI Watermark Remover

Remove watermarks, logos, captions, and text overlays from images and videos using WaveSpeed AI. Intelligently detects and removes watermarks while preserving texture and background.

**Read [Responsible use](#responsible-use) before running anything.** This tool is for media the user owns or is licensed to modify, not for stripping other people's copyright or attribution marks.

## Setup

Install the open-source CLI once and sign in; the CLI stores the key, so never ask the user to paste an API key into the chat:

```bash
npm install -g @wavespeed/cli
wavespeed login          # opens https://wavespeed.ai/accesskey and stores the key
wavespeed status         # confirms you are signed in
```

For CI or one-off shells, `WAVESPEED_API_KEY` in the environment also works.

Prefer MCP tools over shell commands? The same platform is exposed by [`@wavespeed/mcp`](https://github.com/WaveSpeedAI/mcp-server) (`npx -y @wavespeed/mcp@latest`; tools `list_models`, `get_model_schema`, `get_price`, `upload_file`, `run_model`, `get_prediction`). It shares the CLI's stored login. Every example below maps one-to-one onto `run_model` with the same model id and input fields.

## Quick Start

### Image Watermark Removal

```bash
# Upload a local image to get a URL
OUTPUT_URL=$(wavespeed run wavespeed-ai/image-watermark-remover \
  -i image=@./watermarked-image.png \
  --json | jq -r '.outputs[0]')
```

### Video Watermark Removal

```bash
# Upload a local video to get a URL
OUTPUT_URL=$(wavespeed run wavespeed-ai/video-watermark-remover \
  -i video=@./watermarked-video.mp4 \
  --json | jq -r '.outputs[0]')
```

Existing URLs work as-is:

```bash
OUTPUT_URL=$(wavespeed run wavespeed-ai/image-watermark-remover \
  -i image="https://example.com/watermarked-image.jpg" \
  --json | jq -r '.outputs[0]')
```

## API Endpoints

### Image Watermark Remover

**Model ID:** `wavespeed-ai/image-watermark-remover`

Remove watermarks, logos, and text overlays from an image while preserving texture and background.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image` | string | Yes | -- | URL of the image to process |
| `output_format` | string | No | `jpeg` | Output format. One of: `jpeg`, `png`, `webp` |

#### Example

```bash
OUTPUT_URL=$(wavespeed run wavespeed-ai/image-watermark-remover \
  -i image=@./watermarked-photo.png \
  -i output_format="png" \
  --json | jq -r '.outputs[0]')
```

### Video Watermark Remover

**Model ID:** `wavespeed-ai/video-watermark-remover`

Remove watermarks, logos, captions, and text overlays from a video. Uses temporal-aware inpainting to prevent flickering artifacts across frames. Supports videos up to 10 minutes.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `video` | string | Yes | -- | URL of the video to process. Must be publicly accessible. Max 10 minutes. |

#### Example

```bash
OUTPUT_URL=$(wavespeed run wavespeed-ai/video-watermark-remover \
  -i video=@./watermarked-video.mp4 \
  --json | jq -r '.outputs[0]')
```


## Pricing

| Operation | Cost |
|-----------|------|
| Image watermark removal | $0.012 per image |
| Video watermark removal | $0.01 per second (minimum $0.05 / 5 seconds) |

Video watermark removal supports videos up to 10 minutes. Processing time is approximately 5-20 seconds per 1 second of video.

## Responsible use

Watermarks and overlays are usually there to assert ownership or attribution. Before calling either endpoint, confirm the following with the user. If the answer is no or unclear, do not run the model and explain why.

- **Ownership or license**: the user created the media, holds the rights to it, or has a license that permits removing the mark (for example, a purchased stock asset whose license allows clean use, or their own export from a tool that stamps a logo).
- **Not someone else's mark**: do not remove a watermark, logo, credit, or copyright notice placed by a third party to identify their work. Stock-site preview watermarks, photographer credits, broadcaster logos, and platform attribution marks are all out of scope.
- **No misrepresentation**: the result will not be passed off as original, unlicensed, or unedited work, and will not be used to evade licensing fees or attribution requirements.
- **Legitimate overlays only**: typical valid uses are removing captions or subtitles the user added, cleaning timestamps from their own camera footage, or restoring an area under a logo they own.

WaveSpeed's [Terms of Service](https://wavespeed.ai/static/terms) prohibit using the service to infringe intellectual property; requests that violate them are refused and accounts may be suspended.

## CLI tips

```bash
# Inspect the live input schema before running (fields, enums, defaults)
wavespeed run wavespeed-ai/image-watermark-remover -h

# Estimate the cost (no generation, no charge)
wavespeed price wavespeed-ai/image-watermark-remover -p "..." -i key=value

# Save outputs to disk instead of only printing URLs
wavespeed run wavespeed-ai/image-watermark-remover -p "..." --json --download "./out/{index}.{ext}"

# Local files: prefix the path with @ and the CLI uploads it and passes the hosted URL
wavespeed run wavespeed-ai/image-watermark-remover -i <field>=@./local-file.png --json

# Recover a result if the run was interrupted (the id is in the --json output)
wavespeed show <id>
```

`run --json` prints `{ id, model, prompt, outputs: [url, ...], saved: [path, ...], elapsed_ms, raw }`. Read `outputs[0]` for the result URL.

A `run` that fails with a gateway or network error (502/503/504, connection reset, timeout) does NOT mean the task failed, and the submit request is never retried automatically, so re-running can create a duplicate paid task. Do not re-run immediately. If the error contains a task id (`task_id` / prediction id), keep checking it with `wavespeed show <id> --json` until its status is terminal (`completed`, `failed`, `cancelled`, `timeout`, `deleted`). If no id was returned, check recent predictions with `wavespeed history --json` (add `--model <id>`; default window is the last 24h) and re-run once only if none matches. A client-side wait timeout or an interrupted `run` does not mean the task failed: tasks can run for a long time, so do not give up after a fixed time.

## Security constraints

- **Never ask for the key in chat**: `wavespeed login` handles auth; if `wavespeed status` says signed out, ask the user to run it.
- **Local files only via `@`**: bare paths are passed through untouched and the model will reject them. Only `@`-prefixed values upload.
- **No arbitrary URL loading**: only pass media URLs the user provided or that came back from a previous run.
- **Input validation**: only pass parameters documented above; confirm with `wavespeed run <model> -h` when unsure.
