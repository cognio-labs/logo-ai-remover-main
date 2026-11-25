"use client";

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
      { title: "REST API Reference & SDKs — Bellix.us" },
      {
        name: "description",
        content:
          "Integrate programmatic AI watermark removal and 4K upscaling into your SaaS, CMS, or video pipeline with the Bellix.us REST API.",
      },
    ],
  }),
  component: ApiReferencePage,
});

export default function ApiReferencePage() {
  const [selectedLang, setSelectedLang] = useState<"curl" | "python" | "node" | "go">("curl");
  const [copied, setCopied] = useState(false);
  const [testEndpoint, setTestEndpoint] = useState<"video" | "image">("video");

  const codeSnippets = {
    curl: {
      video: `curl -X POST "https://api.bellix.ai/v1/video/remove-watermark" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "video_url": "https://storage.googleapis.com/veo-clips/sunset_mountain.mp4",
    "watermark_type": "gemini_veo",
    "target_resolution": "4K",
    "temporal_consistency": true,
    "webhook_url": "https://your-domain.com/webhooks/bellix"
  }'`,
      image: `curl -X POST "https://api.bellix.ai/v1/image/clean" \\
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

url = "https://api.bellix.ai/v1/video/remove-watermark"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "video_url": "https://storage.googleapis.com/veo-clips/sunset_mountain.mp4",
    "watermark_type": "gemini_veo",
    "target_resolution": "4K",
    "temporal_consistency": True,
    "webhook_url": "https://your-domain.com/webhooks/bellix"
}

response = requests.post(url, json=payload, headers=headers)
job = response.json()
print("Job created! ID:", job["job_id"])`,
      image: `import requests

url = "https://api.bellix.ai/v1/image/clean"
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
      video: `const response = await fetch("https://api.bellix.ai/v1/video/remove-watermark", {
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
    webhook_url: "https://your-domain.com/webhooks/bellix",
  }),
});

const data = await response.json();
console.log("Job status:", data.status, "ID:", data.job_id);`,
      image: `const response = await fetch("https://api.bellix.ai/v1/image/clean", {
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

	req, _ := http.NewRequest("POST", "https://api.bellix.ai/v1/video/remove-watermark", bytes.NewBuffer(jsonData))
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

	req, _ := http.NewRequest("POST", "https://api.bellix.ai/v1/image/clean", bytes.NewBuffer(jsonData))
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
    <div className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] font-sans pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-white border-b-[3px] border-[#0b0f0d] text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] font-mono uppercase">
            <Code2 className="size-3.5" />
            <span>Developer Documentation &amp; REST API</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-[#0b0f0d] tracking-tight">
            Automate Inpainting with our{" "}
            <span className="inline-block px-3 py-0.5 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
              Robust API
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#26302b] font-semibold leading-relaxed">
            Integrate programmatic Gemini watermark removal and 4K upscaling into your SaaS, CMS,
            mobile apps, or rendering pipelines with simple REST endpoints.
          </p>

          <div className="pt-4 flex items-center justify-center gap-4">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] font-black text-sm border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]"
            >
              <Key className="size-4" />
              <span>Get Instant API Key</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE CODE PLAYGROUND */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto py-10">
        <div className="rounded-xl overflow-hidden bg-[#0b0f0d] text-white border-[3px] border-[#0b0f0d] shadow-[7px_7px_0px_#0b0f0d]">
          {/* Header Bar */}
          <div className="p-4 bg-[#161b18] border-b-2 border-[#d0f471]/30 flex flex-wrap items-center justify-between gap-4">
            {/* Endpoint Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black font-mono text-[#d0f471]">Endpoint:</span>
              <button
                onClick={() => setTestEndpoint("video")}
                className={`px-3 py-1 rounded-md text-xs font-black border transition-colors cursor-pointer ${
                  testEndpoint === "video"
                    ? "bg-[#d0f471] text-[#0b0f0d] border-[#d0f471]"
                    : "bg-zinc-900 text-white border-zinc-700 hover:border-[#d0f471]"
                }`}
              >
                POST /v1/video/remove-watermark
              </button>
              <button
                onClick={() => setTestEndpoint("image")}
                className={`px-3 py-1 rounded-md text-xs font-black border transition-colors cursor-pointer ${
                  testEndpoint === "image"
                    ? "bg-[#d0f471] text-[#0b0f0d] border-[#d0f471]"
                    : "bg-zinc-900 text-white border-zinc-700 hover:border-[#d0f471]"
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
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-black uppercase transition-colors cursor-pointer ${
                    selectedLang === lang
                      ? "bg-[#ffe500] text-[#0b0f0d]"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {lang}
                </button>
              ))}

              <button
                onClick={handleCopyCode}
                className="ml-2 flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-800 hover:bg-[#d0f471] hover:text-[#0b0f0d] text-white text-xs font-bold transition-colors border border-zinc-600 cursor-pointer"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Code Block */}
          <div className="p-6 overflow-x-auto font-mono text-xs sm:text-sm text-[#d0f471] leading-relaxed bg-[#0b0f0d]">
            <pre>{codeSnippets[selectedLang][testEndpoint]}</pre>
          </div>

          {/* Sample JSON Response */}
          <div className="p-4 bg-[#161b18] border-t-2 border-zinc-800 text-xs font-mono text-zinc-300">
            <span className="text-[#d0f471] font-black">HTTP 200 OK</span> · Response payload:
            <pre className="mt-2 text-[12px] text-white">
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
                    2,
                  )
                : JSON.stringify(
                    {
                      status: "completed",
                      output_url: "https://cdn.bellix.ai/renders/clean_883a92.png",
                      resolution: "3840x2160",
                      latency_ms: 380,
                    },
                    null,
                    2,
                  )}
            </pre>
          </div>
        </div>
      </section>

      {/* 3. API ENDPOINT SPECS */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
        <h2 className="text-2xl sm:text-3xl font-black text-[#0b0f0d]">
          Core Endpoints Reference
        </h2>

        <div className="space-y-4">
          <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-[#ffe500] border-2 border-[#0b0f0d] text-[#0b0f0d] font-mono text-xs font-black">
                POST
              </span>
              <code className="text-sm font-mono font-black text-[#0b0f0d]">
                /v1/video/remove-watermark
              </code>
              <span className="text-xs font-bold text-[#26302b]">Asynchronous Video Removal</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#26302b] leading-relaxed">
              Submit a video URL for spatio-temporal watermark erasure. Returns a job ID and
              triggers your webhook upon completion.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d] font-mono text-xs font-black">
                POST
              </span>
              <code className="text-sm font-mono font-black text-[#0b0f0d]">/v1/image/clean</code>
              <span className="text-xs font-bold text-[#26302b]">Synchronous Image Inpainting</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#26302b] leading-relaxed">
              Clean images in real time under 400ms. Returns direct clean CDN URL with 100% texture
              recovery.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-[#a8e6cf] border-2 border-[#0b0f0d] text-[#0b0f0d] font-mono text-xs font-black">
                GET
              </span>
              <code className="text-sm font-mono font-black text-[#0b0f0d]">
                /v1/jobs/{"{job_id}"}
              </code>
              <span className="text-xs font-bold text-[#26302b]">Job Status &amp; Download</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#26302b] leading-relaxed">
              Poll job processing progress, download link, and metadata.
            </p>
          </div>
        </div>
      </section>

      {/* 4. RATE LIMITS & AUTH */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] space-y-2">
          <div className="flex items-center gap-2 text-[#0b0f0d] font-black text-sm">
            <Lock className="size-4" />
            <span>Bearer Authentication</span>
          </div>
          <p className="text-xs text-[#26302b] font-medium leading-relaxed">
            All API requests must pass your API secret key via the standard HTTP header:{" "}
            <code className="px-2 py-0.5 rounded bg-[#ffe500] border border-[#0b0f0d] font-mono text-[11px] text-[#0b0f0d] font-bold">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </p>
        </div>

        <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] space-y-2">
          <div className="flex items-center gap-2 text-[#0b0f0d] font-black text-sm">
            <Zap className="size-4" />
            <span>High-Throughput Rate Limits</span>
          </div>
          <p className="text-xs text-[#26302b] font-medium leading-relaxed">
            Studio plans allow up to 120 concurrent processing streams with auto-scaling bursting.
            Higher limits available upon enterprise SLA request.
          </p>
        </div>
      </section>
    </div>
  );
}
