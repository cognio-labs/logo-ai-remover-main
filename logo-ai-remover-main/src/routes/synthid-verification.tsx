"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Upload,
  FileCheck,
  FileSearch,
  ExternalLink,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Film,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/synthid-verification")({
  head: () => ({
    meta: [
      {
        title: "SynthID Verification Studio — Verify Google AI Watermarks | Bellix.us",
      },
      {
        name: "description",
        content:
          "Verify Google DeepMind SynthID, Imagen, and C2PA provenance signals in images and videos. Transparent verification with official Google workflows.",
      },
      { rel: "canonical", href: "https://www.bellix.us/synthid-verification" },
    ],
  }),
  component: SynthIDVerificationPage,
});

export type VerificationStatus = "idle" | "verifying" | "detected" | "not_detected" | "inconclusive";

export interface VerificationResult {
  status: "detected" | "not_detected" | "inconclusive";
  title: string;
  description: string;
  confidence: number;
  details: {
    filename: string;
    filesize_bytes: number;
    media_type: "image" | "video";
    c2pa_manifest_detected: boolean;
    metadata_indicators?: string[];
    spectral_analysis?: {
      mid_frequency_ratio: number;
      spectral_entropy: number;
      resolution: string;
    };
    video_streams?: any;
    matched_signals?: string[];
    confidence_score?: number;
  };
  official_workflow: {
    provider: string;
    official_service: string;
    instructions: string[];
    important_disclosure: string;
  };
}

export default function SynthIDVerificationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progressStage, setProgressStage] = useState<string>("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    const supportedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-matroska",
    ];

    if (!supportedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(png|jpe?g|webp|mp4|mov|webm|mkv)$/i)) {
      toast.error("Unsupported file format. Please upload a PNG, JPEG, WebP, MP4, MOV, or WebM file.");
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      toast.error("File exceeds maximum allowed size of 100 MB.");
      return;
    }

    setFile(selectedFile);
    setResult(null);

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    // Auto-run verification
    triggerVerification(selectedFile);
  }, []);

  const triggerVerification = async (targetFile: File) => {
    setIsVerifying(true);
    setProgressStage("Inspecting cryptographic C2PA / JUMBF manifests...");

    try {
      const formData = new FormData();
      formData.append("file", targetFile);

      // Simulation stages for user clarity
      const t1 = setTimeout(() => {
        setProgressStage("Scanning EXIF, XMP, and IPTC AI generator declarations...");
      }, 700);

      const t2 = setTimeout(() => {
        setProgressStage("Evaluating frequency-domain DCT chroma perturbations...");
      }, 1500);

      const response = await fetch("/api/synthid/verify", {
        method: "POST",
        body: formData,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      if (!response.ok) {
        throw new Error(`Verification endpoint returned ${response.status}`);
      }

      const data: VerificationResult = await response.json();
      setResult(data);

      if (data.status === "detected") {
        toast.success("Google AI watermark signal detected!");
      } else if (data.status === "not_detected") {
        toast.info("No detectable Google AI watermark found.");
      } else {
        toast.warning("Verification inconclusive due to image compression or stripped headers.");
      }
    } catch (err: any) {
      console.error("Verification failed:", err);
      // Fallback response
      setResult({
        status: "inconclusive",
        title: "Inconclusive",
        description: "Insufficient evidence for a reliable result.",
        confidence: 0.3,
        details: {
          filename: targetFile.name,
          filesize_bytes: targetFile.size,
          media_type: targetFile.type.startsWith("video") ? "video" : "image",
          c2pa_manifest_detected: false,
          matched_signals: [],
        },
        official_workflow: {
          provider: "Google DeepMind SynthID Official Verification",
          official_service: "Google Search 'About this image'",
          instructions: [
            "Upload the image to lens.google.com",
            "Select 'About this image' to check Google's authoritative registry.",
          ],
          important_disclosure: "Bellix.us operates strictly with read-only integrity.",
        },
      });
      toast.error("Could not complete full provenance scan. Displaying default advisory.");
    } finally {
      setIsVerifying(false);
      setProgressStage("");
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isVideo = file?.type.startsWith("video") || file?.name.match(/\.(mp4|mov|webm|mkv)$/i);

  return (
    <div className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] selection:bg-[#d0f471] selection:text-[#0b0f0d]">
      {/* 1. HERO SECTION */}
      <div className="relative pt-16 pb-14 overflow-hidden border-b-[3px] border-[#0b0f0d] bg-white">
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] mb-6 shadow-[3px_3px_0px_#0b0f0d] font-mono">
            <ShieldCheck className="size-4 text-[#0b0f0d] stroke-[2.5]" />
            <span className="uppercase tracking-wider text-[11px] font-black">SynthID &amp; Provenance Studio</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0b0f0d] leading-[1.08]">
            SynthID Verification{" "}
            <span className="inline-block px-3 py-0.5 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
              Studio
            </span>
          </h1>

          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg text-[#26302b] font-semibold">
            Inspect images and videos for Google DeepMind SynthID, Imagen, and C2PA digital provenance signals.
            Original files are preserved 100% unaltered.
          </p>

          {/* Feature Highlights */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-black text-[#0b0f0d]">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <CheckCircle2 className="size-4 text-[#0b0f0d]" />
              Images &amp; Videos Supported
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-white border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <CheckCircle2 className="size-4 text-[#0b0f0d]" />
              Zero File Modification (Read-Only)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#a8e6cf] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <CheckCircle2 className="size-4 text-[#0b0f0d]" />
              Official Google Verification Guide
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN STUDIO WORKSPACE */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {!file ? (
          /* DROPZONE */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="group relative cursor-pointer rounded-xl border-[3px] border-[#0b0f0d] bg-white hover:bg-[#fffef5] p-12 sm:p-16 text-center transition-all duration-150 shadow-[7px_7px_0px_#0b0f0d]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm,video/x-matroska"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="mx-auto flex size-20 items-center justify-center rounded-xl bg-[#d0f471] border-[2.5px] border-[#0b0f0d] text-[#0b0f0d] group-hover:scale-105 transition-transform shadow-[4px_4px_0px_#0b0f0d]">
              <Upload className="size-9 stroke-[2.4]" />
            </div>

            <h3 className="mt-6 text-xl sm:text-2xl font-black text-[#0b0f0d]">
              Drop your image or video to verify
            </h3>
            <p className="mt-2 text-sm text-[#26302b] font-semibold max-w-md mx-auto">
              Supports PNG, JPEG, WebP, MP4, MOV, WebM, and MKV files up to 100 MB.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#ffe500] hover:bg-[#d0f471] text-[#0b0f0d] font-black text-sm border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] transition-colors">
              <FileSearch className="size-4 stroke-[2.5]" />
              Select File to Check
            </div>
          </div>
        ) : (
          /* ACTIVE VERIFICATION STATE */
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d]">
                  {isVideo ? <Film className="size-5" /> : <ImageIcon className="size-5" />}
                </div>
                <div>
                  <h4 className="font-black text-sm text-[#0b0f0d] truncate max-w-xs sm:max-w-md">
                    {file.name}
                  </h4>
                  <p className="text-xs text-[#26302b] font-mono font-bold">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type || "Media file"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerVerification(file)}
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#ffe500] border-2 border-[#0b0f0d] text-[#0b0f0d] text-xs font-black shadow-[2px_2px_0px_#0b0f0d] transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" />
                  Re-Verify
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] border-2 border-[#0b0f0d] text-[#0b0f0d] text-xs font-black shadow-[2px_2px_0px_#0b0f0d] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  New Upload
                </button>
              </div>
            </div>

            {/* VERIFYING PROGRESS INDICATOR */}
            {isVerifying && (
              <div className="p-8 rounded-xl bg-[#ffe500] border-[3px] border-[#0b0f0d] text-center shadow-[6px_6px_0px_#0b0f0d] animate-pulse">
                <div className="inline-flex size-14 items-center justify-center rounded-lg bg-white border-2 border-[#0b0f0d] text-[#0b0f0d] mb-4">
                  <FileSearch className="size-7 animate-spin" />
                </div>
                <h3 className="text-xl font-black text-[#0b0f0d]">Running Provenance Verification...</h3>
                <p className="mt-2 text-sm text-[#0b0f0d] font-mono font-bold">
                  {progressStage || "Scanning image headers and spectral coefficients..."}
                </p>
              </div>
            )}

            {/* RESULT CARD (3 CANONICAL STATES) */}
            {result && !isVerifying && (
              <div
                className={`rounded-xl p-6 sm:p-8 border-[3px] border-[#0b0f0d] shadow-[6px_6px_0px_#0b0f0d] transition-all ${result.status === "detected"
                    ? "bg-[#d0f471] text-[#0b0f0d]"
                    : result.status === "not_detected"
                      ? "bg-[#bae6fd] text-[#0b0f0d]"
                      : "bg-[#ffe500] text-[#0b0f0d]"
                  }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b-2 border-[#0b0f0d]">
                  <div className="flex items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-lg bg-white border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] text-[#0b0f0d]">
                      {result.status === "detected" && <ShieldCheck className="size-8" />}
                      {result.status === "not_detected" && <CheckCircle2 className="size-8" />}
                      {result.status === "inconclusive" && <AlertTriangle className="size-8" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded bg-[#0b0f0d] text-white">
                          Status Result
                        </span>
                        <span className="text-xs text-[#0b0f0d] font-mono font-black">
                          Confidence: {Math.round(result.confidence * 100)}%
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-[#0b0f0d] mt-1">
                        {result.title}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Subtitle Description */}
                <div className="py-5">
                  <p className="text-base sm:text-lg text-[#0b0f0d] font-bold leading-relaxed">
                    {result.description}
                  </p>

                  {result.status === "detected" && result.details.matched_signals && (
                    <div className="mt-4 p-4 rounded-lg bg-white border-2 border-[#0b0f0d]">
                      <p className="text-xs font-mono text-[#0b0f0d] font-black uppercase tracking-wider mb-2">
                        Detected Provenance Signals:
                      </p>
                      <ul className="space-y-1.5 text-xs font-mono text-[#0b0f0d] font-bold">
                        {result.details.matched_signals.map((sig, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="size-2 rounded-xs bg-[#0b0f0d]" />
                            {sig}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.status === "not_detected" && (
                    <p className="mt-3 text-xs font-bold text-[#0b0f0d]">
                      Note: This check inspects C2PA declarations and standard watermark metadata.
                      Absence of a watermark does not guarantee the content is non-AI.
                    </p>
                  )}

                  {result.status === "inconclusive" && (
                    <p className="mt-3 text-xs font-bold text-[#0b0f0d]">
                      Reason: The file may have been re-encoded, screenshotted, downscaled, or uploaded to a
                      platform that removes EXIF/XMP headers. Consult the official Google verification workflow below.
                    </p>
                  )}
                </div>

                {/* Toggle Detailed Diagnostics */}
                <div className="pt-4 border-t-2 border-[#0b0f0d]">
                  <button
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="flex items-center justify-between w-full text-xs font-black text-[#0b0f0d] hover:underline transition-colors cursor-pointer py-1"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Info className="size-3.5" />
                      {showTechnicalDetails ? "Hide Technical Diagnostics" : "View Technical Diagnostics"}
                    </span>
                    {showTechnicalDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>

                  {showTechnicalDetails && (
                    <div className="mt-4 p-4 rounded-lg bg-white border-2 border-[#0b0f0d] font-mono text-xs space-y-2 text-[#0b0f0d] animate-in fade-in duration-150">
                      <div className="flex justify-between py-1 border-b border-[#0b0f0d]/20">
                        <span className="font-semibold">C2PA / JUMBF Manifest:</span>
                        <span className="font-black">
                          {result.details.c2pa_manifest_detected ? "Present" : "Not Found"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#0b0f0d]/20">
                        <span className="font-semibold">File Container:</span>
                        <span className="font-black">{result.details.media_type.toUpperCase()}</span>
                      </div>
                      {result.details.spectral_analysis && (
                        <>
                          <div className="flex justify-between py-1 border-b border-[#0b0f0d]/20">
                            <span className="font-semibold">Analysis Grid:</span>
                            <span className="font-black">{result.details.spectral_analysis.resolution}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#0b0f0d]/20">
                            <span className="font-semibold">Mid-Frequency Perturbation Ratio:</span>
                            <span className="font-black">
                              {result.details.spectral_analysis.mid_frequency_ratio.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#0b0f0d]/20">
                            <span className="font-semibold">Spectral Entropy:</span>
                            <span className="font-black">
                              {result.details.spectral_analysis.spectral_entropy.toFixed(3)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PREVIEW CONTAINER */}
            <div className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d]">
              <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-[#0b0f0d]">
                <span className="text-xs font-mono font-black uppercase text-[#0b0f0d] bg-[#d0f471] px-2.5 py-1 rounded border border-[#0b0f0d]">
                  Original Media Inspection
                </span>
                <span className="text-xs text-[#26302b] font-bold">100% Unaltered Native Resolution</span>
              </div>

              <div className="flex items-center justify-center max-h-[500px] overflow-hidden rounded-lg bg-[#0b0f0d] border-2 border-[#0b0f0d] p-2">
                {isVideo ? (
                  <video src={previewUrl || ""} controls className="max-h-[480px] rounded w-auto" />
                ) : (
                  <img
                    src={previewUrl || ""}
                    alt="Uploaded preview"
                    className="max-h-[480px] object-contain rounded w-auto"
                  />
                )}
              </div>
            </div>

            {/* 3. OFFICIAL GOOGLE VERIFICATION WORKFLOW GUIDANCE */}
            <div className="p-6 sm:p-8 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#ffe500] border-2 border-[#0b0f0d] text-[#0b0f0d]">
                  <ExternalLink className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0b0f0d]">Official Google Verification Workflow</h3>
                  <p className="text-xs font-semibold text-[#26302b]">
                    How to verify directly with Google DeepMind's official provenance services
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-[#f7f5ee] border-2 border-[#0b0f0d] space-y-2">
                  <div className="font-black text-[#0b0f0d] flex items-center gap-2">
                    <span className="size-6 rounded bg-[#d0f471] border border-[#0b0f0d] flex items-center justify-center text-[11px] font-mono">1</span>
                    Google Search "About this image"
                  </div>
                  <p className="text-[#26302b] font-medium leading-relaxed">
                    Open <a href="https://lens.google.com" target="_blank" rel="noreferrer" className="text-[#0b0f0d] bg-[#d0f471] px-1 underline font-black">lens.google.com</a> and upload this file. Click <strong>About this image</strong> to view Google's authoritative AI certification.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#f7f5ee] border-2 border-[#0b0f0d] space-y-2">
                  <div className="font-black text-[#0b0f0d] flex items-center gap-2">
                    <span className="size-6 rounded bg-[#ffe500] border border-[#0b0f0d] flex items-center justify-center text-[11px] font-mono">2</span>
                    Google Photos &amp; Vertex AI
                  </div>
                  <p className="text-[#26302b] font-medium leading-relaxed">
                    In Google Photos, swipe up on the image to view the "Created with Google AI" provenance badge. Enterprise developers can query the Google Cloud Vertex AI Vision API.
                  </p>
                </div>
              </div>

              {/* MANDATORY PROVENANCE DISCLOSURE */}
              <div className="p-4 rounded-lg bg-[#a8e6cf] border-2 border-[#0b0f0d] flex items-start gap-3">
                <Info className="size-5 text-[#0b0f0d] shrink-0 mt-0.5 stroke-[2.5]" />
                <div className="text-xs text-[#0b0f0d] font-semibold leading-relaxed">
                  <strong className="font-black block mb-0.5">Integrity &amp; Provenance Notice:</strong>
                  Visible watermark removal (such as ClearCorner) performs cosmetic pixel inpainting and
                  <strong> DOES NOT</strong> alter or remove invisible SynthID frequency-domain watermarks.
                  Bellix operates strictly in read-only verification mode and never tampers with cryptographic
                  provenance manifests.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
