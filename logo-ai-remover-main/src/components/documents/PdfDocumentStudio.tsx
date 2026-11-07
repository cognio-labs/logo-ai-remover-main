"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  FileSearch,
  FileText,
  Image as ImageIcon,
  Layers3,
  LoaderCircle,
  RefreshCw,
  ScanText,
  ShieldCheck,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzePdfDocument,
  getPdfStatus,
  pdfDownloadUrl,
  pdfPreviewUrl,
  processPdfDocument,
  uploadPdfDocument,
  type PdfAnalysisResponse,
} from "@/lib/pdfApi";

type WorkflowState =
  | "EMPTY"
  | "UPLOADING"
  | "ANALYZING"
  | "READY"
  | "PROCESSING_FIRST_PAGE"
  | "PROCESSING_FULL_PDF"
  | "SUCCESS"
  | "ERROR";

type DocumentJob = {
  id: string;
  name: string;
  size: number;
  pages: number;
};

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 25;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ProcessingIndicator({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
      <div className="relative grid size-20 place-items-center">
        <span className="absolute inset-0 rounded-full border border-[#d0f471]/35 animate-ping motion-reduce:animate-none" />
        <span className="grid size-16 place-items-center rounded-full bg-[#10241e] shadow-xl">
          <LoaderCircle className="size-8 animate-spin text-[#d0f471] motion-reduce:animate-none" />
        </span>
      </div>
      <div>
        <p className="font-bold text-white">{label}</p>
        <p className="mt-1 text-xs text-white/65">
          Keep this window open while Bellix prepares the file.
        </p>
      </div>
    </div>
  );
}

export function PdfDocumentStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(0);
  const [state, setState] = useState<WorkflowState>("EMPTY");
  const [job, setJob] = useState<DocumentJob | null>(null);
  const [analysis, setAnalysis] = useState<PdfAnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [scope, setScope] = useState<"first" | "full">("first");
  const [page, setPage] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [slider, setSlider] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [resultVersion, setResultVersion] = useState(0);

  const busy = ["UPLOADING", "ANALYZING", "PROCESSING_FIRST_PAGE", "PROCESSING_FULL_PDF"].includes(
    state,
  );
  const processing = state === "PROCESSING_FIRST_PAGE" || state === "PROCESSING_FULL_PDF";
  const resultPages = scope === "first" ? 1 : (job?.pages ?? 1);
  const originalPdfUrl = job ? pdfPreviewUrl(job.id, page, "original") : null;
  const processedPdfUrl =
    job && state === "SUCCESS"
      ? `${pdfPreviewUrl(job.id, page, "cleaned")}&v=${resultVersion}`
      : null;

  useEffect(() => {
    if (!processing || !job) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const status = await getPdfStatus(job.id);
        if (cancelled) return;
        setProgress(status.progress);
        setStage(status.stage || "Processing your PDF…");
        if (status.status === "completed") {
          setState("SUCCESS");
          setProgress(100);
          setStage("Clean PDF ready to review.");
          setPage(1);
          setSlider(50);
          setResultVersion(Date.now());
          toast.success(
            scope === "first" ? "Your clean first page is ready." : "Your clean PDF is ready.",
          );
          return;
        }
        if (status.status === "failed") {
          setState("ERROR");
          setError(status.error || "Bellix could not safely remove this watermark.");
          return;
        }
        timer = setTimeout(poll, 650);
      } catch (caught) {
        if (!cancelled) {
          setState("ERROR");
          setError(
            caught instanceof Error ? caught.message : "Processing status could not be checked.",
          );
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [job, processing, scope]);

  const reset = () => {
    epochRef.current += 1;
    setState("EMPTY");
    setJob(null);
    setAnalysis(null);
    setError("");
    setStage("");
    setProgress(null);
    setPage(1);
    setZoom(1);
    if (inputRef.current) inputRef.current.value = "";
  };

  const upload = async (file: File) => {
    const token = ++epochRef.current;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setState("ERROR");
      setError("Choose a valid PDF file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setState("ERROR");
      setError("This PDF is larger than the 50 MB limit.");
      return;
    }
    setState("UPLOADING");
    setJob(null);
    setAnalysis(null);
    setError("");
    setStage("Uploading your PDF…");
    setProgress(null);
    try {
      const uploaded = await uploadPdfDocument(file);
      if (token !== epochRef.current) return;
      const nextJob = {
        id: uploaded.jobId,
        name: uploaded.fileName,
        size: uploaded.fileSize,
        pages: uploaded.pageCount,
      };
      setJob(nextJob);
      setState("ANALYZING");
      setStage("Analyzing your PDF…");
      const inspected = await analyzePdfDocument(uploaded.jobId);
      if (token !== epochRef.current) return;
      setAnalysis(inspected);
      setState("READY");
      setStage("Analysis complete.");
      setPage(1);
      toast.success(`${uploaded.pageCount}-page PDF analyzed.`);
    } catch (caught) {
      if (token === epochRef.current) {
        setState("ERROR");
        setError(caught instanceof Error ? caught.message : "The PDF could not be uploaded.");
      }
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const process = async (nextScope: "first" | "full") => {
    if (!job || busy) return;
    setScope(nextScope);
    setError("");
    setProgress(null);
    setStage("Detecting watermarks…");
    setState(nextScope === "first" ? "PROCESSING_FIRST_PAGE" : "PROCESSING_FULL_PDF");
    try {
      await processPdfDocument(job.id, { scope: nextScope });
    } catch (caught) {
      setState("ERROR");
      setError(caught instanceof Error ? caught.message : "Watermark removal could not start.");
    }
  };

  const retry = () => {
    if (job && analysis) void process(scope);
    else reset();
  };

  const changePage = (next: number) => {
    setPage(Math.max(1, Math.min(state === "SUCCESS" ? resultPages : (job?.pages ?? 1), next)));
  };

  return (
    <main className="min-h-screen bg-[#f3f4ee] text-[#10241e]">
      <section className="px-4 pb-20 pt-12 sm:pt-16">
        <div className="mx-auto max-w-6xl">
          <header className="mx-auto mb-10 max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#10241e]/15 bg-white px-4 py-1.5 text-xs font-bold">
              <FileText className="size-3.5" /> Bellix PDF Watermark Remover
            </div>
            <h1 className="text-4xl font-bold tracking-[-0.045em] sm:text-6xl">
              A clean PDF, without rebuilding the page.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#5d6c62] sm:text-lg">
              Bellix inspects each page, removes supported watermark objects automatically, and lets
              you verify the real processed PDF before downloading it.
            </p>
          </header>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            aria-label="Choose PDF"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />

          <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-[#10241e]/15 bg-white shadow-[0_24px_70px_rgba(16,36,30,.10)]">
            {state === "EMPTY" && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const file = event.dataTransfer.files[0];
                  if (file) void upload(file);
                }}
                className={`m-5 flex min-h-[420px] w-[calc(100%-2.5rem)] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed p-8 transition sm:m-8 sm:w-[calc(100%-4rem)] ${
                  dragging
                    ? "border-[#10241e] bg-[#eef7d7]"
                    : "border-[#10241e]/20 bg-[#fafbf7] hover:border-[#10241e]/50"
                }`}
              >
                <span className="grid size-20 place-items-center rounded-3xl bg-[#10241e] text-[#d0f471] shadow-xl">
                  <Upload className="size-9" />
                </span>
                <span className="mt-6 text-2xl font-bold sm:text-3xl">Drop your PDF here</span>
                <span className="mt-2 text-sm text-[#68756c]">
                  or choose a file from your device
                </span>
                <span className="mt-6 rounded-xl bg-[#d0f471] px-7 py-3.5 text-sm font-bold text-[#10241e]">
                  Upload PDF
                </span>
                <span className="mt-5 text-xs text-[#7a857d]">
                  PDF only · up to 50 MB · up to 25 pages
                </span>
              </button>
            )}

            {state !== "EMPTY" && !job && (
              <div className="grid min-h-[420px] place-items-center p-8">
                {state === "ERROR" ? (
                  <div className="max-w-md text-center" role="alert">
                    <X className="mx-auto size-10 text-rose-600" />
                    <h2 className="mt-4 text-xl font-bold">This PDF could not be opened</h2>
                    <p className="mt-2 text-sm leading-6 text-[#68756c]">{error}</p>
                    <button
                      type="button"
                      onClick={reset}
                      className="mt-6 rounded-xl bg-[#10241e] px-6 py-3 text-sm font-bold text-white"
                    >
                      Choose another PDF
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-[#10241e]" role="status">
                    <LoaderCircle className="mx-auto size-10 animate-spin" />
                    <p className="mt-4 font-bold">{stage}</p>
                    <p className="mt-1 text-xs text-[#758078]">
                      Validating file structure and page count
                    </p>
                  </div>
                )}
              </div>
            )}

            {job && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#10241e]/10 px-5 py-4 sm:px-7">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eef3e7]">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{job.name}</p>
                      <p className="text-xs text-[#6d7971]">
                        {formatBytes(job.size)} · {job.pages} page{job.pages === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => inputRef.current?.click()}
                      className="rounded-lg border border-[#10241e]/15 px-3 py-2 text-xs font-bold disabled:opacity-40"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={reset}
                      aria-label="Remove uploaded PDF"
                      className="rounded-lg p-2 hover:bg-[#f3f4ee] disabled:opacity-40"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>

                {state === "ANALYZING" ? (
                  <div className="grid min-h-[500px] place-items-center bg-[#10241e] p-8">
                    <ProcessingIndicator label="Analyzing your PDF…" />
                  </div>
                ) : processing ? (
                  <div className="grid min-h-[520px] bg-[#101916] lg:grid-cols-[1.3fr_.7fr]">
                    <div className="relative grid place-items-center overflow-hidden border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
                      <img
                        src={pdfPreviewUrl(job.id, 1, "original")}
                        alt="Original first PDF page"
                        className="max-h-[470px] max-w-full rounded-lg bg-white shadow-2xl"
                      />
                      <div className="absolute inset-0 grid place-items-center bg-black/45 backdrop-blur-[2px]">
                        <ProcessingIndicator label={stage || "Removing watermark…"} />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center p-7 text-white sm:p-10">
                      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#d0f471]">
                        {scope === "first" ? "Free first page" : `Full PDF · ${job.pages} pages`}
                      </p>
                      <h2 className="mt-3 text-3xl font-bold tracking-tight">
                        Preparing your clean PDF
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-white/65">
                        The preview remains the original until the backend returns and verifies a
                        processed file.
                      </p>
                      <div className="mt-8" aria-live="polite">
                        <p className="text-sm font-semibold">{stage}</p>
                        {progress === null ? (
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-1/3 animate-[pulse_1.3s_ease-in-out_infinite] rounded-full bg-[#d0f471] motion-reduce:animate-none" />
                          </div>
                        ) : (
                          <>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-[#d0f471] transition-[width]"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-white/50">{progress}%</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : state === "SUCCESS" && processedPdfUrl ? (
                  <div className="p-5 sm:p-7">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#647269]">
                          Verified backend result
                        </p>
                        <h2 className="mt-1 text-2xl font-bold">Compare before and after</h2>
                      </div>
                      <div className="flex items-center gap-1 rounded-xl border border-[#10241e]/15 bg-[#f5f6f1] p-1">
                        <button
                          type="button"
                          onClick={() => setZoom(Math.max(0.7, zoom - 0.15))}
                          aria-label="Zoom out"
                          className="rounded-lg p-2 hover:bg-white"
                        >
                          <ZoomOut className="size-4" />
                        </button>
                        <span className="min-w-12 text-center text-xs font-bold">
                          {Math.round(zoom * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoom(Math.min(2, zoom + 0.15))}
                          aria-label="Zoom in"
                          className="rounded-lg p-2 hover:bg-white"
                        >
                          <ZoomIn className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void comparisonRef.current?.requestFullscreen()}
                          aria-label="Full screen preview"
                          className="rounded-lg p-2 hover:bg-white"
                        >
                          <Expand className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div
                      ref={comparisonRef}
                      className="relative mx-auto aspect-[1/1.25] max-h-[670px] max-w-3xl overflow-auto rounded-2xl border border-[#10241e]/15 bg-[#e8ebe3] shadow-inner"
                    >
                      <div className="relative h-full min-h-full w-full overflow-hidden">
                        <img
                          src={originalPdfUrl ?? ""}
                          alt={`Original PDF page ${page}`}
                          className="absolute inset-0 m-auto max-h-full max-w-full origin-center object-contain transition-transform"
                          style={{ transform: `scale(${zoom})` }}
                        />
                        <div
                          className="absolute inset-0 overflow-hidden"
                          style={{ clipPath: `inset(0 0 0 ${slider}%)` }}
                        >
                          <img
                            src={processedPdfUrl}
                            alt={`Watermark removed PDF page ${page}`}
                            className="absolute inset-0 m-auto max-h-full max-w-full origin-center object-contain transition-transform"
                            style={{ transform: `scale(${zoom})` }}
                          />
                        </div>
                        <div
                          className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#d0f471] shadow"
                          style={{ left: `${slider}%` }}
                        >
                          <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#10241e] text-[#d0f471]">
                            <ArrowLeftRight className="size-4" />
                          </span>
                        </div>
                        <span className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-[10px] font-bold text-white">
                          ORIGINAL
                        </span>
                        <span className="absolute right-3 top-3 rounded-full bg-[#10241e] px-3 py-1 text-[10px] font-bold text-[#d0f471]">
                          WATERMARK REMOVED
                        </span>
                        <input
                          aria-label="Before and after comparison"
                          type="range"
                          min="0"
                          max="100"
                          value={slider}
                          onChange={(event) => setSlider(Number(event.target.value))}
                          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                        />
                      </div>
                    </div>
                    {resultPages > 1 && (
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          disabled={page === 1}
                          onClick={() => changePage(page - 1)}
                          className="rounded-lg border p-2 disabled:opacity-30"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <span className="text-xs font-bold">
                          Page {page} of {resultPages}
                        </span>
                        <button
                          type="button"
                          disabled={page === resultPages}
                          onClick={() => changePage(page + 1)}
                          className="rounded-lg border p-2 disabled:opacity-30"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    )}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <a
                        href={pdfDownloadUrl(job.id)}
                        download
                        className="inline-flex items-center gap-2 rounded-xl bg-[#10241e] px-6 py-3.5 text-sm font-bold text-[#d0f471]"
                      >
                        <Download className="size-4" /> Download Clean PDF
                      </a>
                      <a
                        href={pdfDownloadUrl(job.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-[#10241e]/20 px-5 py-3.5 text-sm font-bold"
                      >
                        <Expand className="size-4" /> Preview Clean PDF
                      </a>
                      <button
                        type="button"
                        onClick={reset}
                        className="inline-flex items-center gap-2 px-4 py-3 text-sm font-bold underline underline-offset-4"
                      >
                        <RefreshCw className="size-4" /> Process another document
                      </button>
                    </div>
                    <p className="mt-4 text-center text-xs text-[#6f7b73]">
                      {scope === "first"
                        ? "This free download contains only the processed first page."
                        : `This download contains all ${job.pages} processed pages in their original order.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-[1.25fr_.75fr]">
                    <div className="border-b border-[#10241e]/10 bg-[#eef0e9] p-5 lg:border-b-0 lg:border-r sm:p-7">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-[.14em] text-[#627068]">
                          Original document
                        </span>
                        <span className="text-xs font-bold">Page 1 of {job.pages}</span>
                      </div>
                      <div className="grid min-h-[430px] place-items-center overflow-hidden rounded-2xl bg-[#dfe3d9] p-5">
                        <img
                          src={pdfPreviewUrl(job.id, 1, "original")}
                          alt="Uploaded PDF first page"
                          className="max-h-[500px] max-w-full rounded-md bg-white shadow-xl"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center p-6 sm:p-8">
                      {state === "ERROR" ? (
                        <div role="alert">
                          <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                            Processing stopped
                          </span>
                          <h2 className="mt-4 text-2xl font-bold">No clean file was created</h2>
                          <p className="mt-3 text-sm leading-6 text-[#66736a]">{error}</p>
                          <div className="mt-6 flex gap-3">
                            <button
                              type="button"
                              onClick={retry}
                              className="rounded-xl bg-[#10241e] px-5 py-3 text-sm font-bold text-white"
                            >
                              Retry
                            </button>
                            <button
                              type="button"
                              onClick={reset}
                              className="rounded-xl border px-5 py-3 text-sm font-bold"
                            >
                              Choose another PDF
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e9f5ce] px-3 py-1 text-xs font-bold">
                            <Check className="size-3.5" /> Analysis complete
                          </span>
                          <h2 className="mt-4 text-2xl font-bold">Choose what to process</h2>
                          <p className="mt-2 text-sm leading-6 text-[#66736a]">
                            Bellix found {analysis?.watermarkCount ?? 0} likely watermark object
                            {analysis?.watermarkCount === 1 ? "" : "s"}. No manual selection is
                            required.
                          </p>
                          <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-xl bg-[#f4f5f0] p-3">
                              <ScanText className="mb-2 size-4" />
                              <b>
                                {analysis?.selectableText ? "Selectable text" : "Scanned pages"}
                              </b>
                            </div>
                            <div className="rounded-xl bg-[#f4f5f0] p-3">
                              <Layers3 className="mb-2 size-4" />
                              <b>
                                {analysis?.method === "native"
                                  ? "Native cleanup"
                                  : "Pixel reconstruction"}
                              </b>
                            </div>
                            <div className="rounded-xl bg-[#f4f5f0] p-3">
                              <ImageIcon className="mb-2 size-4" />
                              <b>
                                {analysis?.embeddedImages ?? 0} embedded image
                                {analysis?.embeddedImages === 1 ? "" : "s"}
                              </b>
                            </div>
                            <div className="rounded-xl bg-[#f4f5f0] p-3">
                              <FileSearch className="mb-2 size-4" />
                              <b>
                                {analysis?.scannedPages ?? 0} scanned page
                                {analysis?.scannedPages === 1 ? "" : "s"}
                              </b>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => void process("first")}
                            className="mt-6 rounded-xl bg-[#10241e] px-5 py-4 text-sm font-bold text-[#d0f471] shadow-lg"
                          >
                            Get First Page for Free
                          </button>
                          <button
                            type="button"
                            onClick={() => void process("full")}
                            className="mt-2 rounded-xl border border-[#10241e]/20 bg-white px-5 py-3.5 text-sm font-bold"
                          >
                            Process Full PDF
                          </button>
                          <p className="mt-3 text-center text-[11px] leading-5 text-[#7a857d]">
                            No credit or payment is charged by this workflow. Review the result
                            before sharing.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium text-[#647168]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4" /> Original PDF stays unchanged
            </span>
            <span className="inline-flex items-center gap-2">
              <ScanText className="size-4" /> Automatic detection by default
            </span>
            <span className="inline-flex items-center gap-2">
              <FileSearch className="size-4" /> Output verified before success
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export { MAX_BYTES, MAX_PAGES };
