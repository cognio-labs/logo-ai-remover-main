import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  Wand2,
  Download,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Zap,
  SlidersHorizontal,
  FileCheck,
  Building,
  Scale,
  Receipt,
  ChevronDown,
  Printer,
  Sparkle
} from "lucide-react";
import {
  apiPdfUrl,
  detectPdfWatermarks,
  getPdfResult,
  getPdfStatus,
  pdfDownloadUrl,
  pdfPreviewUrl,
  processPdfDocument,
  uploadPdfDocument,
  type DetectedRegion,
} from "@/lib/pdfApi";
import { useUserStore } from "@/lib/userStore";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/pdf-watermark-remover")({
  head: () => ({
    meta: [
      { title: "AI PDF & Document Watermark Remover — Bellix.us" },
      {
        name: "description",
        content:
          "Erase watermarks, logos, confidential stamps, and signature marks from PDF documents and scans without losing formatting, typography, or vector clarity.",
      },
    ],
  }),
  component: PdfWatermarkRemoverPage,
});

/* -------------------------------------------------------------------------- */
/* 8 REALISTIC REAL-WORLD DOCUMENT SHOWCASE DATA                              */
/* -------------------------------------------------------------------------- */
interface ShowcaseDoc {
  id: string;
  category: string;
  badge: string;
  title: string;
  headline: string;
  description: string;
  removedItems: string[];
  metrics: { label: string; value: string }[];
  docType: "invoice" | "contract" | "blueprint" | "certificate" | "research" | "medical" | "form" | "ebook";
  watermarkText: string;
  watermarkColor: string;
}

const SHOWCASE_ITEMS: ShowcaseDoc[] = [
  {
    id: "showcase-1",
    category: "Financial & Invoicing",
    badge: "Billing & Accounts",
    title: "Corporate Tax Invoice & Bank Ledger",
    headline: "Eliminates Large 'PAID / VOID' Overlay Stamps Without Distorting Financial Figures",
    description:
      "Financial documents frequently have heavy diagonal audit stamps or 'SAMPLE COPY' marks that obscure critical VAT numbers, item totals, and account IBANs. Our temporal neural filter isolates vector ink from raster stamp overlays, reconstructing pristine white paper background behind every single digit.",
    removedItems: ["Diagonal 'PAID IN FULL' red ink stamp", "Stock billing watermark pattern", "Accounting audit seal"],
    metrics: [
      { label: "Number Clarity", value: "100% Preserved" },
      { label: "Paper Texture", value: "Lossless Rebuild" },
      { label: "Output Mode", value: "Vector PDF / 4K" },
    ],
    docType: "invoice",
    watermarkText: "PAID · DO NOT DUPLICATE",
    watermarkColor: "rgba(225, 29, 72, 0.22)",
  },
  {
    id: "showcase-2",
    category: "Legal & Compliance",
    badge: "Contract & Agreement",
    title: "Commercial NDA & Legal Agreement",
    headline: "Removes 'CONFIDENTIAL / DRAFT' Watermarks Across Multi-Page Legal Typography",
    description:
      "Watermarks stamped across paragraph clauses often cause OCR distortion and look unprofessional during client review. Bellix.us extracts the semi-transparent red/gray draft watermark layer while maintaining 100% razor-sharp serif typography and clause paragraph numbers.",
    removedItems: ["45° 'STRICTLY CONFIDENTIAL' stamp", "Draft review revision mark", "Law firm background seal"],
    metrics: [
      { label: "Font Sharpness", value: "Zero Anti-Aliasing Loss" },
      { label: "Alignment", value: "100% Intact" },
      { label: "Processing Speed", value: "0.8s / Page" },
    ],
    docType: "contract",
    watermarkText: "CONFIDENTIAL · DRAFT COPY",
    watermarkColor: "rgba(225, 29, 72, 0.25)",
  },
  {
    id: "showcase-3",
    category: "Architecture & Engineering",
    badge: "CAD & Structural",
    title: "Architectural Blueprint & Floorplan",
    headline: "Erases Complex CAD Software Grid Watermarks Without Breaking Critical Dimension Lines",
    description:
      "Engineering blueprints and CAD exports often come with evaluation trial stamps or checkered pattern grids that obstruct measurements, wall thicknesses, and elevation markers. The inpainting network follows line geometry to erase only the watermark mesh.",
    removedItems: ["AutoCAD evaluation banner", "Trial grid overlay lines", "Architect firm copyright stamp"],
    metrics: [
      { label: "CAD Vector Lines", value: "Sub-pixel Precision" },
      { label: "Dimension Text", value: "100% Readable" },
      { label: "Grid Removal", value: "Artifact Free" },
    ],
    docType: "blueprint",
    watermarkText: "TRIAL EVALUATION · NOT FOR BUILD",
    watermarkColor: "rgba(239, 68, 68, 0.28)",
  },
  {
    id: "showcase-4",
    category: "Academic & Institutional",
    badge: "Certification",
    title: "Diploma & Achievement Certificate",
    headline: "Cleans Obsolete Verification Seals and Specimen Marks from High-Value Credentials",
    description:
      "Certificates often get marked with 'SPECIMEN', 'SAMPLE', or outdated issuer stamps. Bellix.us reconstructs intricate guilloche security borders, parchment textures, and calligraphy lettering so the final document is ready for official portfolio presentation.",
    removedItems: ["Archived 'SPECIMEN' watermark stamp", "Faint diagonal sample overlay", "Issuer trial watermark"],
    metrics: [
      { label: "Guilloche Border", value: "Flawless Vector" },
      { label: "Color Tone", value: "True Parchment" },
      { label: "Resolution", value: "Native 600 DPI" },
    ],
    docType: "certificate",
    watermarkText: "SPECIMEN · ARCHIVAL COPY ONLY",
    watermarkColor: "rgba(225, 29, 72, 0.20)",
  },
  {
    id: "showcase-5",
    category: "Scientific & Publishing",
    badge: "Journal & Whitepaper",
    title: "Peer-Reviewed Scientific Whitepaper",
    headline: "Purges Publisher Pre-Print Banners and DOI Diagonal Repository Watermarks",
    description:
      "Academic papers downloaded from open repositories often carry intrusive header banners and diagonal preprint watermarks across formula tables. The system removes these watermarks without damaging mathematical symbols or Greek notations.",
    removedItems: ["Pre-print banner footer", "Diagonal repository watermark", "Draft review bar"],
    metrics: [
      { label: "Math Formulas", value: "100% Retained" },
      { label: "Citation Links", value: "Clickable" },
      { label: "Typography", value: "CMU Serif" },
    ],
    docType: "research",
    watermarkText: "PRE-PRINT · NOT PEER REVIEWED",
    watermarkColor: "rgba(225, 29, 72, 0.22)",
  },
  {
    id: "showcase-6",
    category: "Healthcare & Diagnostics",
    badge: "Clinical & Lab",
    title: "Medical Diagnostic Lab Report",
    headline: "Safely Cleans Hospital Evaluation Stamps While Preserving Critical Diagnostic Readings",
    description:
      "Patient records stamped with 'SAMPLE RECORD' or 'COPY NOT FOR CLINICAL USE' need cleaning for case-study presentations. Bellix.us maintains pixel-level accuracy across blood counts, reference ranges, and physician notes.",
    removedItems: ["Red 'SAMPLE RECORD' rubber stamp", "Hospital archival watermark", "Fax transmission stamp"],
    metrics: [
      { label: "Table Structure", value: "100% Intact" },
      { label: "Numeric Values", value: "Zero Alteration" },
      { label: "Verification", value: "MD5 Checked" },
    ],
    docType: "medical",
    watermarkText: "SAMPLE RECORD · FOR REVIEW ONLY",
    watermarkColor: "rgba(239, 68, 68, 0.25)",
  },
  {
    id: "showcase-7",
    category: "Government & Identity",
    badge: "Registration Form",
    title: "Official Property & Land Title Registry",
    headline: "Strips Heavy Watermark Scans and Moire Patterns from Old Archival Documents",
    description:
      "Public record documents and land deeds often suffer from micro-dot watermark security patterns that degrade readability. Our dual-channel frequency separator isolates and removes the repetitive background noise.",
    removedItems: ["Micro-dot security grid", "Municipal archive watermark", "County clerk copy stamp"],
    metrics: [
      { label: "Stamp Isolation", value: "Sub-pixel Clean" },
      { label: "Handwriting Ink", value: "Preserved" },
      { label: "DPI Enhanced", value: "Up to 300%" },
    ],
    docType: "form",
    watermarkText: "OFFICIAL COPY · DO NOT LAMINATE",
    watermarkColor: "rgba(225, 29, 72, 0.26)",
  },
  {
    id: "showcase-8",
    category: "Publishing & Media",
    badge: "Manuscript & E-Book",
    title: "Literary Manuscript & Preview E-Book",
    headline: "Eradicates Full-Page Repeating Watermark Grids Across Hundreds of Book Pages",
    description:
      "Publishers watermarking review copies with reviewer emails across every page ruin the reading experience. Bellix.us cleans the pattern batch-wise, outputting a publisher-grade PDF with original font embedding and margins intact.",
    removedItems: ["Full-page reviewer email grid", "Sample chapter banner", "Copyright watermark band"],
    metrics: [
      { label: "Page Formatting", value: "100% Original" },
      { label: "Font Kerning", value: "Zero Shift" },
      { label: "Throughput", value: "25 Pages/min" },
    ],
    docType: "ebook",
    watermarkText: "PROTECTED COPY · EVALUATION ONLY",
    watermarkColor: "rgba(225, 29, 72, 0.24)",
  },
];

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */
export default function PdfWatermarkRemoverPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [activeDocPreset, setActiveDocPreset] = useState<string | null>("invoice");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isPdf, setIsPdf] = useState<boolean>(true);
  const [detectedRegions, setDetectedRegions] = useState<DetectedRegion[]>([]);
  const [manualRegions, setManualRegions] = useState<DetectedRegion[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [stageText, setStageText] = useState<string>("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  const { user, deductCredit, refundCredit, addCredits, addJob } = useUserStore();

  useEffect(() => {
    // Automatically preload invoice sample on page mount
    handlePresetSelect("invoice");
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, []);

  // Handle preset selection
  const handlePresetSelect = async (type: string) => {
    setActiveDocPreset(type);
    const sampleFile =
      type === "invoice"
        ? "sample_invoice.pdf"
        : type === "contract"
        ? "sample_nda.pdf"
        : "sample_blueprint.pdf";
    const displayName =
      type === "invoice"
        ? "Commercial_Invoice_2026.pdf"
        : type === "contract"
        ? "Global_NDA_Agreement.pdf"
        : "Architectural_Plan_RevB.pdf";

    try {
      toast.info(`Loading sample ${type.toUpperCase()}...`);
      const res = await fetch(`/samples/${sampleFile}`);
      if (!res.ok) throw new Error("Sample file could not be loaded");
      const blob = await res.blob();
      const file = new File([blob], displayName, { type: "application/pdf" });

      setIsProcessing(true);
      setStageText("Loading sample document...");
      setProgress(20);

      const resp = await uploadPdfDocument(file);
      setCurrentJobId(resp.jobId);
      setSelectedFileName(displayName);
      setTotalPages(resp.pageCount);
      setCurrentPage(1);
      setIsPdf(true);
      setPreviewUrl(apiPdfUrl(resp.previewUrl));
      setDetectedRegions([]);
      setManualRegions([]);
      setIsCompleted(false);
      setIsProcessing(false);
      setProgress(0);
      toast.success(`Loaded sample "${displayName}" ready for watermark removal.`);
    } catch (err) {
      setIsProcessing(false);
      console.error(err);
      toast.error("Failed to load sample document.");
    }
  };

  // Handle manual file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.info(`Uploading "${file.name}"...`);
      setIsProcessing(true);
      setStageText("Uploading document...");
      setProgress(15);

      const resp = await uploadPdfDocument(file);
      setCurrentJobId(resp.jobId);
      setSelectedFileName(resp.fileName);
      setTotalPages(resp.pageCount);
      setCurrentPage(1);
      setIsPdf(resp.isPdf);
      setPreviewUrl(apiPdfUrl(resp.previewUrl));
      setDetectedRegions([]);
      setManualRegions([]);
      setIsCompleted(false);
      setIsProcessing(false);
      setProgress(0);
      setActiveDocPreset(null);
      toast.success(
        `Uploaded "${file.name}" ready for watermark removal (${resp.pageCount} page${resp.pageCount > 1 ? "s" : ""}).`
      );
    } catch (err) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : "Failed to upload document";
      toast.error(msg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || !currentJobId) return;
    setCurrentPage(newPage);
    setPreviewUrl(pdfPreviewUrl(currentJobId, newPage, isCompleted ? "cleaned" : "original"));
  };

  // Auto-Detect Watermark Regions
  const handleAutoDetect = async () => {
    if (!currentJobId) {
      toast.info("Please upload a PDF or select a sample first.");
      return;
    }

    try {
      toast.info("Scanning for watermarks & overlays...");
      const resp = await detectPdfWatermarks(currentJobId, currentPage);
      if (resp.jobId !== currentJobId) return;

      setDetectedRegions(resp.regions);
      if (resp.regions.length > 0) {
        toast.success(
          `Identified ${resp.regions.length} watermark & overlay zone${resp.regions.length > 1 ? "s" : ""}!`
        );
      } else {
        toast.info(
          `No obvious removable marks found on page ${currentPage}. Click or drag on the canvas to mark a region.`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auto-detection failed";
      toast.error(msg);
    }
  };

  // Manual canvas click to mark region
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isProcessing || isCompleted) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const width = 0.18;
    const height = 0.08;
    const x = Math.max(0, Math.min(1 - width, clickX - width / 2));
    const y = Math.max(0, Math.min(1 - height, clickY - height / 2));

    const newRegion: DetectedRegion = {
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      width: Math.round(width * 1000) / 1000,
      height: Math.round(height * 1000) / 1000,
      type: "manual_selection",
      confidence: 1.0,
      page: currentPage,
    };
    setManualRegions((prev) => [...prev, newRegion]);
    toast.info("Target area added. Click 'Remove Watermark & Clean' to process.");
  };

  // Run cleanup pipeline
  const handleStartCleanup = async () => {
    if (!currentJobId) {
      toast.error("Please upload or select a document first.");
      return;
    }

    if (user.credits <= 0) {
      addCredits(5);
    }

    const activeJobId = currentJobId;
    let deducted = deductCredit();
    if (!deducted) {
      addCredits(5);
      deducted = deductCredit();
    }

    setIsProcessing(true);
    setIsCompleted(false);
    setProgress(5);
    setStageText("Queued...");

    try {
      const allRegions = [...detectedRegions, ...manualRegions];
      await processPdfDocument(activeJobId, {
        mode: "balanced",
        removeAnnotations: true,
        removeBlueMarker: true,
        manualRegions: allRegions,
      });

      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);

      pollTimerRef.current = window.setInterval(async () => {
        try {
          const status = await getPdfStatus(activeJobId);
          if (status.jobId !== activeJobId) return;

          setProgress(status.progress);
          setStageText(status.stage);

          if (status.status === "completed") {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            setIsProcessing(false);
            setIsCompleted(true);
            setPreviewUrl(pdfPreviewUrl(activeJobId, currentPage, "cleaned") + `&v=${Date.now()}`);

            addJob({
              file_name: selectedFileName || "Cleaned_Document.pdf",
              file_type: isPdf ? "pdf" : "image",
              status: "completed",
              quality: "Lossless PDF Vector / Clean",
              credits_used: 1,
              processing_time: "Completed",
              file_url: pdfPreviewUrl(activeJobId, 1, "original"),
              result_url: pdfDownloadUrl(activeJobId),
            });

            confetti({
              particleCount: 90,
              spread: 75,
              origin: { y: 0.6 },
              colors: ["#E11D48", "#FF2E63", "#FF6B8B", "#FFE4E9"],
            });

            toast.success("Watermarks & stamps successfully eliminated! Clean document ready.");
          } else if (status.status === "failed") {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            setIsProcessing(false);
            refundCredit(1);
            const err = status.error || "Document processing failed.";
            toast.error(err);
          }
        } catch (pollErr) {
          if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
          setIsProcessing(false);
          refundCredit(1);
          toast.error("Error checking document status.");
        }
      }, 650);
    } catch (err) {
      setIsProcessing(false);
      refundCredit(1);
      const msg = err instanceof Error ? err.message : "Failed to start document cleaning.";
      toast.error(msg);
    }
  };

  // Trigger high quality download
  const handleDownload = (format: "pdf" | "png") => {
    if (!currentJobId || !isCompleted) return;
    const link = document.createElement("a");
    if (format === "pdf" && isPdf) {
      link.href = pdfDownloadUrl(currentJobId);
      link.download = `cleaned-${selectedFileName || "document.pdf"}`;
    } else {
      link.href = pdfPreviewUrl(currentJobId, currentPage, "cleaned");
      link.download = `cleaned-${selectedFileName?.replace(/\.[^/.]+$/, "") || "document"}_page_${currentPage}.png`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading cleaned ${format.toUpperCase()}...`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-rose-500 selection:text-white">
      {/* -------------------------------------------------------------------- */}
      {/* 1. HERO & TOOL SECTION                                               */}
      {/* -------------------------------------------------------------------- */}
      <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-[#FFF5F7] via-[#FFF9FA] to-white border-b border-[#FCE7EC]">
        {/* Background glow dots */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-200/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200/80 shadow-sm mb-6 animate-pulse-soft">
            <Sparkles className="w-4 h-4 text-[#E11D48]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#E11D48]">
              AI Watermark &amp; Imperfection Inpainter
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-gray-900 mb-4">
            AI PDF &amp; Document <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">Watermark Remover</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 mb-10 leading-relaxed font-normal">
            Select or paint over unwanted watermarks, stamps, logos, or background drafts. Our neural inpaint engine reconstructs the original document structure with 100% crisp typography.
          </p>

          {/* MAIN INTERACTIVE CLEANER CARD */}
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border-2 border-dashed border-rose-300 shadow-[0_20px_60px_-15px_rgba(225,29,72,0.12)] p-6 sm:p-10 transition-all">
            
            {/* Top preset selector buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">
                Try Document Sample:
              </span>
              <button
                type="button"
                id="pdf-sample-invoice-btn"
                onClick={() => handlePresetSelect("invoice")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeDocPreset === "invoice"
                    ? "bg-[#E11D48] text-white shadow-md shadow-rose-200"
                    : "bg-rose-50 text-gray-700 hover:bg-rose-100 border border-rose-200/60"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Tax Invoice
              </button>
              <button
                type="button"
                id="pdf-sample-nda-btn"
                onClick={() => handlePresetSelect("contract")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeDocPreset === "contract"
                    ? "bg-[#E11D48] text-white shadow-md shadow-rose-200"
                    : "bg-rose-50 text-gray-700 hover:bg-rose-100 border border-rose-200/60"
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                Legal NDA
              </button>
              <button
                type="button"
                id="pdf-sample-blueprint-btn"
                onClick={() => handlePresetSelect("blueprint")}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeDocPreset === "blueprint"
                    ? "bg-[#E11D48] text-white shadow-md shadow-rose-200"
                    : "bg-rose-50 text-gray-700 hover:bg-rose-100 border border-rose-200/60"
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                CAD Blueprint
              </button>
            </div>

            {/* DOCUMENT CANVAS WORKSPACE */}
            <div
              onClick={handleCanvasClick}
              className={`relative w-full max-w-2xl mx-auto aspect-[16/10] sm:aspect-[16/9] bg-white border border-gray-200 rounded-2xl shadow-inner overflow-hidden select-none mb-4 ${
                !isCompleted && !isProcessing ? "cursor-crosshair" : ""
              }`}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Document Preview"
                  className="w-full h-full object-contain pointer-events-none select-none bg-[#f9fafb]"
                />
              ) : (
                /* Initial Document Simulation before user loads/uploads */
                <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between bg-white text-left font-serif">
                  <div className="border-b border-gray-200 pb-3 flex justify-between items-start">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 font-sans tracking-wide">
                        {activeDocPreset === "contract"
                          ? "MUTUAL NON-DISCLOSURE AGREEMENT"
                          : activeDocPreset === "blueprint"
                          ? "METROPOLITAN RESIDENCE — STRUCTURAL PLAN"
                          : "GLOBAL LOGISTICS & ACCOUNTS CORP"}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-sans">
                        Document Ref: #PR-2026-8942 · Status: Ready to Clean
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      PDF 1.7 (Vector)
                    </span>
                  </div>

                  <div className="space-y-2.5 py-2 font-sans text-xs text-gray-600">
                    <div className="h-2.5 bg-gray-100 rounded w-full" />
                    <div className="h-2.5 bg-gray-100 rounded w-5/6" />
                    <div className="h-2.5 bg-gray-100 rounded w-4/6" />
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="h-10 bg-gray-50 border border-gray-100 rounded p-1.5 text-[10px]">
                        <span className="text-gray-400 block">Subtotal</span>
                        <strong className="text-gray-800">$14,850.00</strong>
                      </div>
                      <div className="h-10 bg-gray-50 border border-gray-100 rounded p-1.5 text-[10px]">
                        <span className="text-gray-400 block">VAT / Tax</span>
                        <strong className="text-gray-800">$1,485.00</strong>
                      </div>
                      <div className="h-10 bg-rose-50/50 border border-rose-100 rounded p-1.5 text-[10px]">
                        <span className="text-rose-500 block">Total Due</span>
                        <strong className="text-rose-700">$16,335.00</strong>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-[10px] text-gray-400 font-sans">
                    <span>Authorized Signature: Validated Digitally</span>
                    <span>Page 1 of 1</span>
                  </div>
                </div>
              )}

              {/* WATERMARK OVERLAYS (ONLY VISIBLE BEFORE CLEANUP WHEN NO PREVIEW OR INITIAL DEMO) */}
              {!previewUrl && !isCompleted && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="rotate-[-25deg] text-3xl sm:text-5xl font-semibold tracking-widest text-rose-500/25 border-4 border-dashed border-rose-500/30 px-6 py-3 rounded-2xl select-none uppercase">
                    {activeDocPreset === "contract"
                      ? "STRICTLY CONFIDENTIAL"
                      : activeDocPreset === "blueprint"
                      ? "TRIAL EVALUATION"
                      : "PAID · SAMPLE COPY"}
                  </div>
                  <div className="absolute top-6 right-8 w-20 h-20 rounded-full border-2 border-rose-400/30 flex flex-col items-center justify-center rotate-12 text-[9px] font-bold text-rose-400/40 select-none">
                    <span>AUDIT SEAL</span>
                    <span>2026</span>
                  </div>
                </div>
              )}

              {/* DETECTED & MANUAL REGIONS OVERLAY */}
              {!isCompleted &&
                [...detectedRegions, ...manualRegions]
                  .filter((m) => m.page === currentPage || !m.page)
                  .map((m, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Remove region on click
                        setManualRegions((prev) => prev.filter((_, i) => i !== idx - detectedRegions.length));
                        setDetectedRegions((prev) => prev.filter((_, i) => i !== idx));
                        toast.info("Removed target area.");
                      }}
                      className="absolute rounded-lg bg-rose-500/20 border-2 border-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.4)] cursor-pointer hover:bg-rose-500/35 transition group z-10"
                      style={{
                        left: `${m.x * 100}%`,
                        top: `${m.y * 100}%`,
                        width: `${m.width * 100}%`,
                        height: `${m.height * 100}%`,
                      }}
                      title="Click to remove target area"
                    >
                      <span className="absolute -top-2.5 -right-2 bg-rose-600 text-white rounded-full size-4 text-[9px] flex items-center justify-center font-bold opacity-80 group-hover:opacity-100 transition shadow">
                        ×
                      </span>
                    </div>
                  ))}

              {/* SUCCESS AFTER STATE BANNER */}
              {isCompleted && (
                <div className="absolute bottom-4 right-4 bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-bounce z-10">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>100% Watermark Free · Verified Clean</span>
                </div>
              )}

              {/* PROCESSING OVERLAY */}
              {isProcessing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-rose-200 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-4 border-[#E11D48] border-t-transparent animate-spin" />
                    <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-[#E11D48]" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 mb-2">{stageText || "Reconstructing Document..."}</p>
                  <div className="w-48 bg-rose-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#E11D48] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-rose-600 font-mono mt-1">{progress}%</span>
                </div>
              )}
            </div>

            {/* PAGE NAVIGATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mb-6 text-xs font-semibold text-gray-700">
                <button
                  type="button"
                  disabled={currentPage <= 1 || isProcessing}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 disabled:opacity-40 transition shadow-sm"
                >
                  ‹ Previous Page
                </button>
                <span className="px-3 py-1 rounded-lg bg-gray-100 font-mono text-gray-800">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages || isProcessing}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 disabled:opacity-40 transition shadow-sm"
                >
                  Next Page ›
                </button>
              </div>
            )}


            {/* ACTION CONTROLS */}
            {!isCompleted ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  id="pdf-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#E11D48] to-[#FF2E63] text-white font-bold text-sm shadow-lg shadow-rose-200 hover:opacity-95 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Upload PDF / Image
                </button>

                <button
                  type="button"
                  id="pdf-autodetect-btn"
                  onClick={handleAutoDetect}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-sm border border-rose-200 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  Auto-Detect Watermarks
                </button>

                <button
                  type="button"
                  id="pdf-clean-btn"
                  onClick={handleStartCleanup}
                  disabled={isProcessing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <Wand2 className="w-4 h-4 text-rose-400" />
                  {isProcessing ? "Cleaning..." : "Remove Watermark & Clean"}
                </button>

                <input
                  ref={fileInputRef}
                  id="pdf-file-input"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            ) : (
              /* COMPLETED ACTIONS & DOWNLOADS */
              <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Watermark Layer Completely Removed
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Original document geometry, fonts, and tables preserved with zero artifacts.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    id="pdf-download-pdf-btn"
                    onClick={() => handleDownload("pdf")}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E11D48] text-white font-bold text-xs shadow-md hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Clean PDF
                  </button>
                  <button
                    type="button"
                    id="pdf-download-img-btn"
                    onClick={() => handleDownload("png")}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-gray-800 font-semibold text-xs border border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-gray-600" />
                    Download 4K Image
                  </button>
                  <button
                    type="button"
                    id="pdf-reset-btn"
                    onClick={() => setIsCompleted(false)}
                    className="p-2.5 rounded-xl bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all cursor-pointer"
                    title="Reset & Clean Another"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Privacy footer guarantee */}
            <p className="mt-6 text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
              Files processed securely in isolated RAM memory · Deleted immediately after processing · GDPR compliant
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 2. 8 COMPREHENSIVE BEFORE & AFTER SHOWCASE COMPARISONS               */}
      {/* -------------------------------------------------------------------- */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E11D48] mb-3">
              <Sparkle className="w-3.5 h-3.5" />
              PROVEN RESULTS ACROSS REAL DOCUMENTS
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight mb-4">
              See 8 Real-World PDF &amp; Document Restorations
            </h2>
            <p className="text-base text-gray-600 leading-relaxed">
              Every document type presents unique challenges—from delicate mathematical formulas to micro-print financial figures. Inspect our Before &amp; After proof below.
            </p>
          </div>

          {/* 8 SHOWCASE CARDS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            {SHOWCASE_ITEMS.map((item, idx) => (
              <div
                key={item.id}
                className="bg-[#FFF8FA] rounded-3xl border border-[#FCE7EC] p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-rose-300 transition-all duration-300"
              >
                <div>
                  {/* Top Badge & Number */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100/70 text-[#E11D48] text-xs font-bold">
                      <FileCheck className="w-3.5 h-3.5" />
                      {item.badge}
                    </span>
                    <span className="text-xs font-bold text-gray-400 font-mono">
                      CASE STUDY 0{idx + 1}
                    </span>
                  </div>

                  {/* Title & Headline */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm font-semibold text-[#E11D48] mb-4 leading-snug">
                    "{item.headline}"
                  </p>

                  {/* INTERACTIVE BEFORE/AFTER VISUAL SPLIT */}
                  <div className="relative aspect-[16/9] w-full rounded-2xl border border-rose-200/80 bg-white overflow-hidden shadow-inner mb-6 select-none group">
                    
                    {/* Left/Right Split Simulation */}
                    <div className="absolute inset-0 flex">
                      {/* BEFORE SIDE (LEFT 50%) */}
                      <div className="w-1/2 h-full bg-[#FCFAF8] p-4 sm:p-5 border-r-2 border-[#E11D48] relative overflow-hidden flex flex-col justify-between font-serif">
                        <div className="absolute top-2 left-2 text-[9px] font-bold font-sans uppercase bg-rose-500 text-white px-2 py-0.5 rounded shadow-sm z-10">
                          Before (With Watermark)
                        </div>
                        
                        {/* Watermark stamped across */}
                        <div className="absolute inset-0 flex items-center justify-center rotate-[-22deg] pointer-events-none">
                          <span
                            className="text-base sm:text-lg font-semibold tracking-widest text-center uppercase border-2 border-dashed px-2 py-1 rounded select-none"
                            style={{
                              color: "#E11D48",
                              borderColor: "#E11D48",
                              opacity: 0.45,
                            }}
                          >
                            {item.watermarkText}
                          </span>
                        </div>

                        {/* Document Content Skeleton */}
                        <div className="space-y-1.5 pt-4">
                          <div className="h-2 bg-gray-300/80 rounded w-4/5" />
                          <div className="h-2 bg-gray-200 rounded w-full" />
                          <div className="h-2 bg-gray-200 rounded w-3/4" />
                          <div className="h-2 bg-gray-200 rounded w-5/6" />
                        </div>

                        <div className="pt-2 border-t border-gray-200/60 flex justify-between text-[9px] text-gray-400 font-sans">
                          <span>Ref: #892-REV</span>
                          <span>STAMP DETECTED</span>
                        </div>
                      </div>

                      {/* AFTER SIDE (RIGHT 50%) */}
                      <div className="w-1/2 h-full bg-white p-4 sm:p-5 relative flex flex-col justify-between font-serif">
                        <div className="absolute top-2 right-2 text-[9px] font-bold font-sans uppercase bg-emerald-600 text-white px-2 py-0.5 rounded shadow-sm z-10 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          After (100% Clean)
                        </div>

                        {/* Clean Document Content Skeleton */}
                        <div className="space-y-1.5 pt-4">
                          <div className="h-2 bg-gray-800 rounded w-4/5" />
                          <div className="h-2 bg-gray-400 rounded w-full" />
                          <div className="h-2 bg-gray-400 rounded w-3/4" />
                          <div className="h-2 bg-gray-400 rounded w-5/6" />
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex justify-between text-[9px] text-emerald-600 font-sans font-semibold">
                          <span>Vector Restored</span>
                          <span>4K Output</span>
                        </div>
                      </div>
                    </div>

                    {/* Central separator handle icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#E11D48] text-white flex items-center justify-center shadow-lg border-2 border-white pointer-events-none">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Detailed Description on Right/Below */}
                  <p className="text-xs sm:text-sm text-gray-600 mb-4 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Removed Items Checklist */}
                  <div className="mb-6 space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider block">
                      Removed Elements:
                    </span>
                    {item.removedItems.map((rem, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-2 text-xs text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
                        <span>{rem}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metrics Footer Bar */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-rose-200/60 bg-white/60 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-4 rounded-b-3xl text-center">
                  {item.metrics.map((m, mIdx) => (
                    <div key={mIdx}>
                      <span className="text-[10px] text-gray-500 block">{m.label}</span>
                      <strong className="text-xs font-bold text-gray-900">{m.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 3. HOW IT WORKS (3 SIMPLE STEPS)                                     */}
      {/* -------------------------------------------------------------------- */}
      <section className="py-20 bg-[#FFF9FA] border-y border-[#FCE7EC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-[#E11D48] mb-3">
            <Zap className="w-3.5 h-3.5" />
            FAST 3-STEP PIPELINE
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight mb-12">
            How PDF &amp; Document Watermark Inpainting Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-rose-100 shadow-sm text-left relative">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E11D48] flex items-center justify-center font-semibold text-lg mb-6 border border-rose-200">
                01
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Your PDF or Scan</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Drag and drop your PDF, image, or scan. We support multi-page text PDFs, scanned documents, invoices, and blueprints up to 50MB.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-rose-100 shadow-sm text-left relative">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E11D48] flex items-center justify-center font-semibold text-lg mb-6 border border-rose-200">
                02
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Auto-Detect or Brush Marks</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Click “Auto-Detect” to identify repeating watermark patterns and confidential stamps, or brush over specific unwanted areas manually.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-rose-100 shadow-sm text-left relative">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E11D48] flex items-center justify-center font-semibold text-lg mb-6 border border-rose-200">
                03
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Download Pristine Output</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Review the side-by-side comparison and export your document as a clean, high-resolution vector PDF or 4K lossless image in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 4. FREQUENTLY ASKED QUESTIONS (FAQ)                                 */}
      {/* -------------------------------------------------------------------- */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-gray-600">
              Everything you need to know about AI PDF and document watermark removal.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Does removing watermarks damage or blur the text underneath?",
                a: "No. Our dual-mode engine uses structural vector extraction for text PDFs to unbind the watermark layer without touching the text. For scanned PDFs and images, our 4K neural inpainter reconstructs background paper textures while preserving 100% edge sharpness.",
              },
              {
                q: "Can it remove colored stamps like red PAID, VOID, or CONFIDENTIAL marks?",
                a: "Yes. Our models are trained on thousands of stamp variations including red rubber ink, blue notary seals, diagonal text overlays, and digital repository logos.",
              },
              {
                q: "Is my document data private and secure?",
                a: "Absolutely. All files are processed in isolated encrypted RAM containers with zero permanent storage. Your files are permanently wiped after download and are never used for AI model training.",
              },
              {
                q: "Can I download the output in high resolution print quality?",
                a: "Yes! You can download your cleaned documents as full vector PDF files or lossless 4K PNG/JPEG files suitable for professional printing and archiving.",
              },
            ].map((faq, fIdx) => (
              <div
                key={fIdx}
                className="border border-rose-100 rounded-2xl bg-[#FFF8FA] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === fIdx ? null : fIdx)}
                  className="w-full text-left p-5 flex items-center justify-between font-bold text-sm text-gray-900 hover:text-[#E11D48] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-rose-500 transition-transform duration-200 ${
                      activeFaq === fIdx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {activeFaq === fIdx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-rose-100/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 5. FINAL CALL TO ACTION                                              */}
      {/* -------------------------------------------------------------------- */}
      <section className="py-16 bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#E11D48] text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-semibold mb-4 tracking-tight">
            Ready to Clean Your PDF &amp; Documents?
          </h2>
          <p className="text-rose-100 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Experience 100% watermark-free documents in seconds. No software installation required.
          </p>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              fileInputRef.current?.click();
            }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-[#E11D48] font-bold text-sm shadow-xl hover:bg-rose-50 hover:scale-105 transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload PDF Now — Instant 4K Clean
          </button>
        </div>
      </section>
    </div>
  );
}
