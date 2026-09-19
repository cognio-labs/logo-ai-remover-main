import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  FileCode,
  Key,
  Lock,
  Send,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { toast } from "sonner";

export const Route = createFileRoute("/api-reference")({
  head: () => ({
    meta: [
      { title: "REST API Reference & SDKs — PixelRefine AI" },
      {
        name: "description",
        content:
          "Integrate programmatic AI watermark removal and 4K upscaling into your SaaS, CMS, or video pipeline with the PixelRefine REST API.",
      },
    ],
  }),
  component: ApiReferencePage,
});

function ApiReferencePage() {
  const [selectedLang, setSelectedLang] = useState<"curl" | "python" | "node" | "go">("curl");
  const [copied, setCopied] = useState(false);
  const [testEndpoint, setTestEndpoint] = useState<"video" | "image">("video");

  const codeSnippets = {
    curl: {
      video: `curl -X POST "https://api.pixelrefine.ai/v1/video/remove-watermark" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "video_url": "https://storage.googleapis.com/veo-clips/sunset_mountain.mp4",
    "watermark_type": "gemini_veo",
    "target_resolution": "4K",
    "temporal_consistency": true,
    "webhook_url": "https://your-domain.com/webhooks/pixelrefine"
  }'`,
      image: `curl -X POST "https://api.pixelrefine.ai/v1/image/clean" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_url": "https://example.com/portraits/sample.png",
    "detect_mode": "auto",
    "reconstruct_skin": true
  }'`,
    },
    python: {
      video: `import requests

url = "https://api.pixelrefine.ai/v1/video/remove-watermark"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "video_url": "https://storage.googleapis.com/veo-clips/sunset_mountain.mp4",
    "watermark_type": "gemini_veo",
    "target_resolution": "4K",
    "temporal_consistency": True,
    "webhook_url": "https://your-domain.com/webhooks/pixelrefine"
}

response = requests.post(url, json=payload, headers=headers)
job = response.json()
print("Job created! ID:", job["job_id"])`,
      image: `import requests

url = "https://api.pixelrefine.ai/v1/image/clean"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "image_url": "https://example.com/portraits/sample.png",
    "detect_mode": "auto"
}

response = requests.post(url, json=payload, headers=headers)
print("Cleaned Image URL:", response.json()["output_url"])`,
    },
    node: {
      video: `const response = await fetch("https://api.pixelrefine.ai/v1/video/remove-watermark", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    video_url: "https://storage.googleapis.com/veo-clips/sunset_mountain.mp4",
    watermark_type: "gemini_veo",
    target_resolution: "4K",
    temporal_consistency: true,
    webhook_url: "https://your-domain.com/webhooks/pixelrefine",
  }),
});

const data = await response.json();
console.log("Job status:", data.status, "ID:", data.job_id);`,
      image: `const response = await fetch("https://api.pixelrefine.ai/v1/image/clean", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    image_url: "https://example.com/portraits/sample.png",
    detect_mode: "auto",
  }),
});

const result = await response.json();
console.log("Clean image:", result.output_url);`,
    },
    go: {
      video: `package main

import (
	"bytes"
	"fmt"
	"net/http"
)

func main() {
	jsonData := []byte(\`{
		"video_url": "https://storage.googleapis.com/veo-clips/sunset_mountain.mp4",
		"watermark_type": "gemini_veo",
		"target_resolution": "4K"
	}\`)

	req, _ := http.NewRequest("POST", "https://api.pixelrefine.ai/v1/video/remove-watermark", bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	fmt.Println("Response Status:", resp.Status)
}`,
      image: `package main

import (
	"bytes"
	"fmt"
	"net/http"
)

func main() {
	jsonData := []byte(\`{
		"image_url": "https://example.com/portraits/sample.png",
		"detect_mode": "auto"
	}\`)

	req, _ := http.NewRequest("POST", "https://api.pixelrefine.ai/v1/image/clean", bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, _ := client.Do(req)
	defer resp.Body.Close()

	fmt.Println("Response Status:", resp.Status)
}`,
    },
  };

  const handleCopyCode = () => {
    const text = codeSnippets[selectedLang][testEndpoint];
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied code snippet to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFF5F8] via-white to-white text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48] shadow-2xs">
            <Code2 className="size-3.5" />
            <span>Developer Documentation & REST API</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-950 tracking-tight">
            Automate Inpainting with our{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              Robust API
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
            Integrate programmatic Gemini watermark removal and 4K upscaling into your SaaS, CMS,
            mobile apps, or rendering pipelines with simple REST endpoints.
          </p>

          <div className="pt-4 flex items-center justify-center gap-4">
            <PinkButton size="lg" className="font-bold shadow-md" asChild>
              <Link to="/pricing">
                <Key className="size-4 mr-2" />
                <span>Get Instant API Key</span>
              </Link>
            </PinkButton>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE CODE PLAYGROUND */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto py-8">
        <div className="rounded-3xl overflow-hidden bg-gray-950 text-white border border-gray-800 shadow-2xl">
          {/* Header Bar */}
          <div className="p-4 bg-gray-900/90 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
            {/* Endpoint Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">Endpoint:</span>
              <button
                onClick={() => setTestEndpoint("video")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  testEndpoint === "video"
                    ? "bg-[#E11D48] text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                POST /v1/video/remove-watermark
              </button>
              <button
                onClick={() => setTestEndpoint("image")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  testEndpoint === "image"
                    ? "bg-[#E11D48] text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                POST /v1/image/clean
              </button>
            </div>

            {/* Language Switcher & Copy */}
            <div className="flex items-center gap-2">
              {(["curl", "python", "node", "go"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase transition-colors ${
                    selectedLang === lang
                      ? "bg-white/20 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              ))}

              <button
                onClick={handleCopyCode}
                className="ml-3 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-colors border border-gray-700"
              >
                {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Code Block */}
          <div className="p-6 overflow-x-auto font-mono text-xs sm:text-sm text-rose-100 leading-relaxed bg-[#0c1017]">
            <pre>{codeSnippets[selectedLang][testEndpoint]}</pre>
          </div>

          {/* Sample JSON Response */}
          <div className="p-4 bg-gray-900/60 border-t border-gray-800 text-xs font-mono text-gray-400">
            <span className="text-green-400 font-bold">HTTP 200 OK</span> · Response payload:
            <pre className="mt-2 text-[12px] text-gray-300">
              {testEndpoint === "video"
                ? JSON.stringify(
                    {
                      status: "queued",
                      job_id: "pr_vid_94a73b22e18f",
                      estimated_seconds: 8.4,
                      queue_priority: "h100_cluster",
                      webhook_registered: true,
                    },
                    null,
                    2
                  )
                : JSON.stringify(
                    {
                      status: "completed",
                      output_url: "https://cdn.pixelrefine.ai/renders/clean_883a92.png",
                      resolution: "3840x2160",
                      latency_ms: 380,
                    },
                    null,
                    2
                  )}
            </pre>
          </div>
        </div>
      </section>

      {/* 3. API ENDPOINT SPECS */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
        <h2 className="text-2xl sm:text-3xl font-serif font-normal text-gray-950">
          Core Endpoints Reference
        </h2>

        <div className="space-y-4">
          {/* Endpoint 1 */}
          <div className="p-6 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-[#E11D48] text-white font-mono text-xs font-bold">
                POST
              </span>
              <code className="text-sm font-mono font-bold text-gray-900">
                /v1/video/remove-watermark
              </code>
              <span className="text-xs text-gray-500">Asynchronous Video Removal</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Submit a video URL for spatio-temporal watermark erasure. Returns a job ID and triggers
              your webhook upon completion.
            </p>
          </div>

          {/* Endpoint 2 */}
          <div className="p-6 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-green-600 text-white font-mono text-xs font-bold">
                POST
              </span>
              <code className="text-sm font-mono font-bold text-gray-900">/v1/image/clean</code>
              <span className="text-xs text-gray-500">Synchronous Image Inpainting</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Clean images in real time under 400ms. Returns direct clean CDN URL with 100% texture
              recovery.
            </p>
          </div>

          {/* Endpoint 3 */}
          <div className="p-6 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-mono text-xs font-bold">
                GET
              </span>
              <code className="text-sm font-mono font-bold text-gray-900">
                /v1/jobs/{"{job_id}"}
              </code>
              <span className="text-xs text-gray-500">Job Status & Download</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Poll job processing progress, download link, and metadata.
            </p>
          </div>
        </div>
      </section>

      {/* 4. RATE LIMITS & AUTH */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#FCE7EC] space-y-2">
          <div className="flex items-center gap-2 text-gray-950 font-bold text-sm">
            <Lock className="size-4 text-[#E11D48]" />
            <span>Bearer Authentication</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            All API requests must pass your API secret key via the standard HTTP header:{" "}
            <code className="px-2 py-0.5 rounded bg-gray-100 font-mono text-[11px]">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#FCE7EC] space-y-2">
          <div className="flex items-center gap-2 text-gray-950 font-bold text-sm">
            <Zap className="size-4 text-[#E11D48]" />
            <span>High-Throughput Rate Limits</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Studio plans allow up to 120 concurrent processing streams with auto-scaling bursting.
            Higher limits available upon enterprise SLA request.
          </p>
        </div>
      </section>
    </div>
  );
}
