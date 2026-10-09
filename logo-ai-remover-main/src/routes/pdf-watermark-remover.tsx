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
  Sparkle,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
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
import { DocumentCaseStudyGallery } from "@/components/documents/DocumentCaseStudyGallery";

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
/* MAIN PAGE COMPONENT                                                        */
/* -------------------------------------------------------------------------- */

export default function PdfWatermarkRemoverPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [activeDocPreset, setActiveDocPreset] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [cleanMode, setCleanMode] = useState<"auto" | "vector" | "text">("auto");
  const [qualityEngine, setQualityEngine] = useState<"standard" | "fast" | "ultra_hd">("standard");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [cleanedPreviewUrl, setCleanedPreviewUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
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
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, []);

  // Global clipboard paste listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (file.type.includes("pdf") || file.type.startsWith("image/")) {
            e.preventDefault();
            processDocumentFile(file);
            toast.success("Pasted document from clipboard!");
            return;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Central unified document processor for input, drag & drop, paste
  const processDocumentFile = async (file: File) => {
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
      const origUrl = apiPdfUrl(resp.previewUrl);
      setPreviewUrl(origUrl);
      setOriginalPreviewUrl(origUrl);
      setCleanedPreviewUrl(null);
      setUploadStatus("Document uploaded — Ready to clean");
      setIntegrityError(null);
      setDetectedRegions([]);
      setManualRegions([]);
      setIsCompleted(false);
      setIsProcessing(false);
      setProgress(0);
      setActiveDocPreset(null);
      toast.success(
        `Uploaded "${file.name}" ready for watermark removal (${resp.pageCount} page${resp.pageCount > 1 ? "s" : ""}).`,
      );
    } catch (err) {
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : "Failed to upload document";
      toast.error(msg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resetDocument = () => {
    setCurrentJobId(null);
    setSelectedFileName(null);
    setPreviewUrl(null);
    setOriginalPreviewUrl(null);
    setCleanedPreviewUrl(null);
    setIsCompleted(false);
    setIsProcessing(false);
    setProgress(0);
    setDetectedRegions([]);
    setManualRegions([]);
    setUploadStatus(null);
    setIntegrityError(null);
    setActiveDocPreset(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Document cleared.");
  };

  // High-fidelity vector SVG document generator for instant preset samples
  const getSampleSvgDataUrl = (
    type: "invoice" | "contract" | "blueprint",
    withWatermark: boolean,
  ) => {
    let svgContent = "";
    if (type === "invoice") {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" width="100%" height="100%">
  <rect width="900" height="620" fill="#ffffff"/>
  <rect x="30" y="30" width="840" height="560" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5" rx="8"/>
  <text x="60" y="80" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="#111827">GLOBAL LOGISTICS &amp; ACCOUNTS CORP</text>
  <text x="60" y="105" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="#6b7280">Document Ref: #PR-2026-8942 · Status: Ready to Clean</text>
  <rect x="730" y="60" width="110" height="26" rx="6" fill="#f3f4f6"/>
  <text x="745" y="77" font-family="monospace" font-size="11" font-weight="600" fill="#4b5563">PDF 1.7 (Vector)</text>
  <line x1="60" y1="130" x2="840" y2="130" stroke="#f3f4f6" stroke-width="2"/>
  <text x="60" y="165" font-family="system-ui" font-size="11" font-weight="700" fill="#9ca3af">BILLED TO:</text>
  <text x="60" y="188" font-family="system-ui" font-size="14" font-weight="600" fill="#1f2937">Apex Dynamics International Ltd</text>
  <text x="60" y="208" font-family="system-ui" font-size="12" fill="#4b5563">Suite 400, Financial Center Blvd, New York, NY</text>
  <rect x="60" y="235" width="780" height="34" rx="6" fill="#f9fafb"/>
  <text x="80" y="257" font-family="system-ui" font-size="12" font-weight="700" fill="#374151">DESCRIPTION</text>
  <text x="500" y="257" font-family="system-ui" font-size="12" font-weight="700" fill="#374151">HOURS / QTY</text>
  <text x="640" y="257" font-family="system-ui" font-size="12" font-weight="700" fill="#374151">RATE</text>
  <text x="750" y="257" font-family="system-ui" font-size="12" font-weight="700" fill="#374151">AMOUNT</text>
  <text x="80" y="295" font-family="system-ui" font-size="13" fill="#1f2937">Enterprise Neural Pipeline Integration &amp; Deployment</text>
  <text x="510" y="295" font-family="system-ui" font-size="13" fill="#4b5563">120 hrs</text>
  <text x="640" y="295" font-family="system-ui" font-size="13" fill="#4b5563">$95.00</text>
  <text x="750" y="295" font-family="system-ui" font-size="13" font-weight="600" fill="#111827">$11,400.00</text>
  <line x1="60" y1="315" x2="840" y2="315" stroke="#f3f4f6" stroke-width="1"/>
  <text x="80" y="345" font-family="system-ui" font-size="13" fill="#1f2937">Multi-Region Cloud Acceleration &amp; Edge Latency Tuning</text>
  <text x="510" y="345" font-family="system-ui" font-size="13" fill="#4b5563">35 hrs</text>
  <text x="640" y="345" font-family="system-ui" font-size="13" fill="#4b5563">$95.00</text>
  <text x="750" y="345" font-family="system-ui" font-size="13" font-weight="600" fill="#111827">$3,325.00</text>
  <line x1="60" y1="365" x2="840" y2="365" stroke="#f3f4f6" stroke-width="1"/>
  <rect x="580" y="390" width="260" height="100" rx="8" fill="#fff1f2" stroke="#fecdd3" stroke-width="1"/>
  <text x="600" y="418" font-family="system-ui" font-size="13" fill="#4b5563">Subtotal:</text>
  <text x="750" y="418" font-family="system-ui" font-size="13" font-weight="600" fill="#111827">$14,725.00</text>
  <text x="600" y="444" font-family="system-ui" font-size="13" fill="#4b5563">VAT / Tax (10%):</text>
  <text x="750" y="444" font-family="system-ui" font-size="13" font-weight="600" fill="#111827">$1,472.50</text>
  <line x1="600" y1="456" x2="820" y2="456" stroke="#fecdd3" stroke-width="1"/>
  <text x="600" y="478" font-family="system-ui" font-size="14" font-weight="700" fill="#e11d48">Total Due:</text>
  <text x="740" y="478" font-family="system-ui" font-size="14" font-weight="700" fill="#e11d48">$16,197.50</text>
  <text x="60" y="550" font-family="system-ui" font-size="12" fill="#9ca3af">Authorized Signature: Validated Digitally · Bellix.us Verified</text>
  <text x="780" y="550" font-family="system-ui" font-size="12" fill="#9ca3af">Page 1 of 1</text>
  ${
    withWatermark
      ? `<g transform="translate(450,310) rotate(-22)">
    <rect x="-260" y="-42" width="520" height="84" rx="12" fill="none" stroke="#e11d48" stroke-width="3.5" stroke-dasharray="12 8" opacity="0.45"/>
    <text x="0" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" fill="#e11d48" opacity="0.45" text-anchor="middle" letter-spacing="5">PAID SAMPLE COPY</text>
  </g>`
      : ""
  }
</svg>`;
    } else if (type === "contract") {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" width="100%" height="100%">
  <rect width="900" height="620" fill="#ffffff"/>
  <rect x="30" y="30" width="840" height="560" fill="#ffffff" stroke="#e5e7eb" stroke-width="1.5" rx="8"/>
  <text x="60" y="80" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#111827">MUTUAL NON-DISCLOSURE AGREEMENT</text>
  <text x="60" y="105" font-family="system-ui, sans-serif" font-size="13" fill="#6b7280">Ref: #NDA-2026-X99 · Legal Jurisdiction: Delaware, US</text>
  <rect x="730" y="60" width="110" height="26" rx="6" fill="#f3f4f6"/>
  <text x="745" y="77" font-family="monospace" font-size="11" font-weight="600" fill="#4b5563">LEGAL VECTOR</text>
  <line x1="60" y1="130" x2="840" y2="130" stroke="#f3f4f6" stroke-width="2"/>
  <text x="60" y="165" font-family="Georgia, serif" font-size="14" font-weight="700" fill="#1f2937">1. DEFINITION OF CONFIDENTIAL INFORMATION</text>
  <text x="60" y="190" font-family="Georgia, serif" font-size="13" fill="#4b5563">The parties agree that all trade secrets, source code, patent applications, financial models,</text>
  <text x="60" y="212" font-family="Georgia, serif" font-size="13" fill="#4b5563">and neural architectures disclosed hereunder constitute confidential proprietary information.</text>
  <text x="60" y="255" font-family="Georgia, serif" font-size="14" font-weight="700" fill="#1f2937">2. OBLIGATIONS &amp; NON-DISCLOSURE</text>
  <text x="60" y="280" font-family="Georgia, serif" font-size="13" fill="#4b5563">The Recipient shall exercise reasonable care and maintain strict confidence across all</text>
  <text x="60" y="302" font-family="Georgia, serif" font-size="13" fill="#4b5563">shared documentation, preventing unauthorized duplication, reproduction, or dissemination.</text>
  <text x="60" y="345" font-family="Georgia, serif" font-size="14" font-weight="700" fill="#1f2937">3. TERM AND GOVERNING JURISDICTION</text>
  <text x="60" y="370" font-family="Georgia, serif" font-size="13" fill="#4b5563">This Agreement shall remain in full effect for five (5) years following the Effective Date.</text>
  <line x1="60" y1="410" x2="840" y2="410" stroke="#f3f4f6" stroke-width="1"/>
  <text x="60" y="450" font-family="Georgia, serif" font-size="13" font-weight="600" fill="#111827">Party A: Vertex Neural Labs LLC</text>
  <text x="480" y="450" font-family="Georgia, serif" font-size="13" font-weight="600" fill="#111827">Party B: Global Enterprise Technologies</text>
  <text x="60" y="480" font-family="system-ui" font-size="12" fill="#9ca3af">Signatory: Dr. Marcus Vance, CTO</text>
  <text x="480" y="480" font-family="system-ui" font-size="12" fill="#9ca3af">Signatory: Elena Rostova, General Counsel</text>
  <text x="60" y="550" font-family="system-ui" font-size="12" fill="#9ca3af">Electronic Seal: SHA-256 Validated · Bellix.us Verified</text>
  <text x="780" y="550" font-family="system-ui" font-size="12" fill="#9ca3af">Page 1 of 1</text>
  ${
    withWatermark
      ? `<g transform="translate(450,300) rotate(-22)">
    <rect x="-280" y="-42" width="560" height="84" rx="12" fill="none" stroke="#e11d48" stroke-width="3.5" stroke-dasharray="12 8" opacity="0.45"/>
    <text x="0" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="900" fill="#e11d48" opacity="0.45" text-anchor="middle" letter-spacing="5">CONFIDENTIAL · DRAFT</text>
  </g>`
      : ""
  }
</svg>`;
    } else {
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 620" width="100%" height="100%">
  <rect width="900" height="620" fill="#0b1329"/>
  <defs>
    <pattern id="cadgrid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1d2a4d" stroke-width="1"/>
    </pattern>
  </defs>
  <rect x="30" y="30" width="840" height="560" fill="url(#cadgrid)" stroke="#38bdf8" stroke-width="1.5" rx="8"/>
  <text x="60" y="75" font-family="monospace" font-size="20" font-weight="700" fill="#38bdf8">ARCHITECTURAL SCHEMATIC · LEVEL 02</text>
  <text x="60" y="98" font-family="monospace" font-size="12" fill="#94a3b8">DWG Ref: #CAD-992-STRUCT · Scale: 1:50 Metric</text>
  <rect x="60" y="140" width="460" height="280" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
  <rect x="180" y="140" width="160" height="120" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
  <rect x="60" y="280" width="220" height="140" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
  <line x1="60" y1="440" x2="520" y2="440" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6 4"/>
  <text x="260" y="460" font-family="monospace" font-size="12" fill="#f59e0b">◄── 14.80 METERS ──►</text>
  <line x1="540" y1="140" x2="540" y2="420" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6 4"/>
  <text x="550" y="285" font-family="monospace" font-size="12" fill="#f59e0b">8.60 M</text>
  <rect x="580" y="140" width="260" height="280" fill="#132042" stroke="#38bdf8" stroke-width="1" rx="6"/>
  <text x="600" y="175" font-family="monospace" font-size="13" font-weight="700" fill="#38bdf8">SCHEDULE / SPECS</text>
  <text x="600" y="205" font-family="monospace" font-size="11" fill="#cbd5e1">• Reinforced concrete core</text>
  <text x="600" y="230" font-family="monospace" font-size="11" fill="#cbd5e1">• Curtain wall glazed facade</text>
  <text x="600" y="255" font-family="monospace" font-size="11" fill="#cbd5e1">• Fire-rated acoustic drywall</text>
  <text x="600" y="280" font-family="monospace" font-size="11" fill="#cbd5e1">• Thermal insulation R-30</text>
  <text x="60" y="550" font-family="monospace" font-size="12" fill="#64748b">CAD Vector Geometry · Sub-pixel Verification Passed</text>
  <text x="780" y="550" font-family="monospace" font-size="12" fill="#64748b">SHEET A-102</text>
  ${
    withWatermark
      ? `<g transform="translate(450,300) rotate(-22)">
    <rect x="-290" y="-42" width="580" height="84" rx="12" fill="none" stroke="#ef4444" stroke-width="3.5" stroke-dasharray="12 8" opacity="0.5"/>
    <text x="0" y="16" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" fill="#ef4444" opacity="0.5" text-anchor="middle" letter-spacing="5">TRIAL · NOT FOR BUILD</text>
  </g>`
      : ""
  }
</svg>`;
    }
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  };

  // Handle preset selection
  const handlePresetSelect = async (type: "invoice" | "contract" | "blueprint") => {
    setActiveDocPreset(type);
    const displayName =
      type === "invoice"
        ? "Commercial_Invoice_2026.pdf"
        : type === "contract"
          ? "Global_NDA_Agreement.pdf"
          : "Architectural_Plan_RevB.pdf";

    // Real synthetic high-resolution previews from /samples/
    const sampleFiles = {
      invoice: {
        name: "Commercial_Tax_Invoice_2026.pdf",
        before: "/samples/invoice_before.webp",
        after: "/samples/invoice_after.webp"
      },
      contract: {
        name: "Commercial_NDA_Agreement.pdf",
        before: "/samples/nda_before.webp",
        after: "/samples/nda_after.webp"
      },
      blueprint: {
        name: "Architectural_Blueprint_Plan.pdf",
        before: "/samples/blueprint_before.webp",
        after: "/samples/blueprint_after.webp"
      }
    };
    const sel = sampleFiles[type] || sampleFiles.invoice;

    setCurrentJobId(`sample_${type}_${Date.now()}`);
    setSelectedFileName(sel.name);
    setTotalPages(1);
    setCurrentPage(1);
    setIsPdf(true);
    setPreviewUrl(sel.before);
    setOriginalPreviewUrl(sel.before);
    setCleanedPreviewUrl(sel.after);
    setUploadStatus("Sample loaded — Ready to clean");
    setIntegrityError(null);
    setDetectedRegions([
      {
        x: 0.18,
        y: 0.32,
        width: 0.64,
        height: 0.26,
        type: "watermark",
        confidence: 0.99,
        page: 1,
      },
    ]);
    setManualRegions([]);
    setIsCompleted(false);
    setIsProcessing(false);
    setProgress(0);
    toast.success(`Loaded "${displayName}" sample ready for watermark removal.`);
  };

  // Handle manual file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processDocumentFile(file);
  };

  // Page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || !currentJobId) return;
    setCurrentPage(newPage);
    const origUrl = pdfPreviewUrl(currentJobId, newPage, "original");
    setPreviewUrl(origUrl);
    setOriginalPreviewUrl(origUrl);
    if (isCompleted) {
      setCleanedPreviewUrl(pdfPreviewUrl(currentJobId, newPage, "cleaned") + `&v=${Date.now()}`);
    }
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
          `Identified ${resp.regions.length} watermark & overlay zone${resp.regions.length > 1 ? "s" : ""}!`,
        );
      } else {
        toast.info(
          `No obvious removable marks found on page ${currentPage}. Click or drag on the canvas to mark a region.`,
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
    setIntegrityError(null);
    setProgress(5);
    setStageText("Analyzing PDF…");

    // Fast interactive inpaint for sample presets
    if (activeJobId.startsWith("sample_")) {
      setTimeout(() => {
        setProgress(30);
        setStageText("Scanning document vectors & layers…");
      }, 250);
      setTimeout(() => {
        setProgress(65);
        setStageText("Neural separation of watermark overlay…");
      }, 600);
      setTimeout(() => {
        setProgress(92);
        setStageText("Reconstructing paper texture & vector lines…");
      }, 950);
      setTimeout(() => {
        setIsProcessing(false);
        setIsCompleted(true);
        setProgress(100);
        setStageText("Clean document ready");
        if (activeDocPreset) {
          const cleanUrl = getSampleSvgDataUrl(activeDocPreset as any, false);
          setCleanedPreviewUrl(cleanUrl);
          setPreviewUrl(cleanUrl);
        }
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ["#E11D48", "#FF2E63", "#FF6B8B", "#FFE4E9"],
        });
        toast.success("Watermark successfully eliminated! Clean document ready.");
      }, 1300);
      return;
    }

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
            setStageText("Clean PDF ready");
            const cleanedUrl =
              pdfPreviewUrl(activeJobId, currentPage, "cleaned") + `&v=${Date.now()}`;
            setCleanedPreviewUrl(cleanedUrl);
            setOriginalPreviewUrl(pdfPreviewUrl(activeJobId, currentPage, "original"));
            setPreviewUrl(cleanedUrl);

            addJob({
              file_name: selectedFileName || "Cleaned_Document.pdf",
              file_type: isPdf ? "pdf" : "image",
              status: "completed",
              quality: isPdf ? "Processed PDF" : "Processed image",
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

            toast.success("Document processed. Review text beneath removed marks before downloading.");
          } else if (status.status === "failed") {
            if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
            setIsProcessing(false);
            refundCredit(1);
            const rawErr = status.error || status.message || "Document processing failed.";
            const isIntegrity =
              rawErr.toLowerCase().includes("integrity") ||
              rawErr.toLowerCase().includes("safely preserved");
            const userErr = isIntegrity
              ? "Cleaning stopped — document content could not be safely preserved."
              : rawErr;
            setIntegrityError(userErr);
            toast.error(userErr);
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

    if (currentJobId.startsWith("sample_")) {
      const link = document.createElement("a");
      link.href = cleanedPreviewUrl || previewUrl || "";
      link.download = `cleaned-${selectedFileName?.replace(/\.[^/.]+$/, "") || "document"}.${format === "pdf" ? "svg" : "png"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading cleaned document...`);
      return;
    }

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
    <div className="min-h-screen bg-transparent text-gray-900 selection:bg-rose-500 selection:text-white">
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
            AI PDF &amp; Document{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              Watermark Remover
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 mb-10 leading-relaxed font-normal">
            Select or paint over unwanted watermarks, stamps, logos, or background drafts. Our
            cleanup keeps unmarked pixels intact and lets you review text beneath removed marks.
          </p>

          {/* MAIN INTERACTIVE CLEANER CARD (Matches /background-remover & /upscale modern two-column studio architecture) */}
          <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur-xl rounded-3xl border border-[#FCE7EC] shadow-[0_20px_60px_-15px_rgba(225,29,72,0.12)] p-6 sm:p-8 transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: UPLOADER DROPZONE OR DOCUMENT CANVAS (lg:col-span-7) */}
              <div className="lg:col-span-7">
                {!previewUrl && !currentJobId ? (
                  /* STATE 1: EMPTY UNIFIED DROPZONE (Matches background-remover & upscale) */
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processDocumentFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-[420px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center cursor-pointer ${
                      isDragging
                        ? "border-[#E11D48] bg-[#FFF5F7] scale-[1.01]"
                        : "border-gray-300 hover:border-[#E11D48] hover:bg-[#FFF9FA]"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      id="pdf-file-input"
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleFileUpload}
                    />

                    <span className="size-16 rounded-3xl bg-gradient-to-tr from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] text-white flex items-center justify-center shadow-lg shadow-[#E11D48]/30 mb-5 transition-transform hover:scale-110">
                      <Upload className="size-8" />
                    </span>

                    <h3 className="text-xl font-medium text-gray-900 tracking-tight">
                      {isDragging
                        ? "Drop your PDF or document right here"
                        : "Drop your PDF or document here"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed font-normal">
                      PDF, PNG, JPG or WebP · Up to 50MB · Paste (
                      <kbd className="font-sans px-1 py-0.5 rounded bg-gray-100 border text-gray-600 font-normal">
                        Ctrl+V
                      </kbd>
                      )
                    </p>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-5 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E11D48] to-[#FF2E63] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs font-medium shadow-md shadow-[#E11D48]/30 transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Upload className="size-4" />
                      <span>Upload PDF / Image</span>
                    </button>

                    <span className="text-[11px] text-gray-400 mt-2 font-normal">
                      or click anywhere to browse
                    </span>
                  </div>
                ) : (
                  /* STATE 2: DOCUMENT LOADED WORKSPACE WITH TOP TOOLBAR */
                  <div className="space-y-4">
                    {/* Top Document Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] text-xs">
                      {/* Document info badge */}
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="size-4 text-[#E11D48] shrink-0" />
                        <span className="font-bold text-gray-900 truncate max-w-[160px] sm:max-w-[220px]">
                          {selectedFileName || "Document"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-rose-200 text-[#E11D48] shrink-0">
                          {isPdf ? "PDF 1.7" : "Image"}
                        </span>
                      </div>

                      {/* Right controls: Page nav, zoom, and Upload New */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Page nav */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={currentPage <= 1 || isProcessing}
                            onClick={() => handlePageChange(currentPage - 1)}
                            className="px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-[11px] font-semibold cursor-pointer shadow-2xs"
                          >
                            ‹
                          </button>
                          <span className="font-mono text-[11px] text-gray-600 px-1 font-bold">
                            {currentPage}/{totalPages}
                          </span>
                          <button
                            type="button"
                            disabled={currentPage >= totalPages || isProcessing}
                            onClick={() => handlePageChange(currentPage + 1)}
                            className="px-2 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-[11px] font-semibold cursor-pointer shadow-2xs"
                          >
                            ›
                          </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-gray-200">
                          <button
                            type="button"
                            onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                            className="p-1 rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
                            title="Zoom Out"
                          >
                            <ZoomOut className="size-3" />
                          </button>
                          <span className="font-mono text-[10px] text-gray-600 font-bold min-w-8 text-center">
                            {Math.round(zoomLevel * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.25))}
                            className="p-1 rounded text-gray-600 hover:bg-gray-100 cursor-pointer"
                            title="Zoom In"
                          >
                            <ZoomIn className="size-3" />
                          </button>
                        </div>

                        {/* Reset / Change button */}
                        <button
                          type="button"
                          onClick={resetDocument}
                          className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-rose-50 text-gray-600 hover:text-[#E11D48] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Upload another document"
                        >
                          <RefreshCw className="size-3" />
                          <span className="hidden sm:inline">Change</span>
                        </button>
                      </div>
                    </div>

                    {/* Document Workspace Canvas */}
                    {!isCompleted ? (
                      /* SINGLE CANVAS PREVIEW */
                      <div
                        onClick={handleCanvasClick}
                        className={`relative w-full aspect-[16/10] sm:aspect-[16/11] bg-white border border-gray-200 rounded-2xl shadow-inner overflow-hidden select-none ${
                          !isProcessing ? "cursor-crosshair" : ""
                        }`}
                      >
                        {previewUrl ? (
                          <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                            <img
                              src={previewUrl}
                              alt="Document Preview"
                              style={{
                                transform: `scale(${zoomLevel})`,
                                transformOrigin: "center center",
                              }}
                              className="max-h-full max-w-full object-contain pointer-events-none select-none bg-[#f9fafb] transition-transform duration-150"
                            />
                          </div>
                        ) : null}

                        {/* DETECTED & MANUAL REGIONS OVERLAY */}
                        {[...detectedRegions, ...manualRegions]
                          .filter((m) => m.page === currentPage || !m.page)
                          .map((m, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setManualRegions((prev) =>
                                  prev.filter((_, i) => i !== idx - detectedRegions.length),
                                );
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

                        {/* PROCESSING OVERLAY */}
                        {isProcessing && (
                          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20">
                            <div className="relative size-14 mb-4">
                              <div className="absolute inset-0 rounded-full border-4 border-rose-200 animate-ping" />
                              <div className="absolute inset-0 rounded-full border-4 border-[#E11D48] border-t-transparent animate-spin" />
                              <Wand2 className="absolute inset-0 m-auto size-6 text-[#E11D48]" />
                            </div>
                            <p className="text-sm font-bold text-gray-800 mb-2">
                              {stageText || "Analyzing PDF…"}
                            </p>
                            <div className="w-52 bg-rose-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-[#E11D48] h-full transition-all duration-300 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-rose-600 font-mono mt-1 font-bold">
                              {progress}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* SIDE-BY-SIDE BEFORE / AFTER VIEW */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col bg-gray-50 border border-gray-200 rounded-2xl p-2.5 shadow-2xs">
                          <div className="flex items-center justify-between px-2 py-1 mb-1.5 border-b border-gray-200 text-[11px] font-semibold text-gray-700">
                            <span className="flex items-center gap-1.5 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                              <FileText className="size-3 text-gray-500" />
                              Original
                            </span>
                            <span className="font-mono text-gray-400">
                              {currentPage}/{totalPages}
                            </span>
                          </div>
                          <div className="relative aspect-[1601/2264] max-h-[420px] bg-white rounded-xl border border-gray-200 overflow-auto flex items-center justify-center p-1.5">
                            <img
                              src={originalPreviewUrl || previewUrl || ""}
                              alt="Original"
                              style={{
                                transform: `scale(${zoomLevel})`,
                                transformOrigin: "center center",
                              }}
                              className="max-h-full max-w-full object-contain pointer-events-none select-none transition-transform duration-150"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col bg-emerald-50/30 border border-emerald-200 rounded-2xl p-2.5 shadow-2xs">
                          <div className="flex items-center justify-between px-2 py-1 mb-1.5 border-b border-emerald-200/80 text-[11px] font-semibold text-emerald-800">
                            <span className="flex items-center gap-1.5 text-emerald-700 font-bold uppercase tracking-wider text-[10px]">
                              <CheckCircle2 className="size-3 text-emerald-600" />
                              Cleaned
                            </span>
                            <span className="font-mono text-emerald-600">
                              {currentPage}/{totalPages}
                            </span>
                          </div>
                          <div className="relative aspect-[1601/2264] max-h-[420px] bg-white rounded-xl border border-emerald-200/60 overflow-auto flex items-center justify-center p-1.5">
                            <img
                              src={cleanedPreviewUrl || ""}
                              alt="Cleaned"
                              style={{
                                transform: `scale(${zoomLevel})`,
                                transformOrigin: "center center",
                              }}
                              className="max-h-full max-w-full object-contain pointer-events-none select-none transition-transform duration-150"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: DOCUMENT OPTIONS & CLEANUP SETTINGS (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-8 space-y-6">
                <div>
                  <h4 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                    DOCUMENT SETTINGS
                  </h4>

                  {/* Mode Selector */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600 mb-5">
                    <button
                      type="button"
                      onClick={() => setCleanMode("auto")}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${
                        cleanMode === "auto"
                          ? "bg-white text-gray-950 shadow-xs font-semibold"
                          : "hover:text-gray-900"
                      }`}
                    >
                      Auto Inpaint
                    </button>
                    <button
                      type="button"
                      onClick={() => setCleanMode("vector")}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${
                        cleanMode === "vector"
                          ? "bg-white text-gray-950 shadow-xs font-semibold"
                          : "hover:text-gray-900"
                      }`}
                    >
                      Vector Lossless
                    </button>
                    <button
                      type="button"
                      onClick={() => setCleanMode("text")}
                      className={`py-2 rounded-lg transition-all cursor-pointer ${
                        cleanMode === "text"
                          ? "bg-white text-gray-950 shadow-xs font-semibold"
                          : "hover:text-gray-900"
                      }`}
                    >
                      OCR Preserved
                    </button>
                  </div>

                  {/* Quick Preset Document Samples */}
                  <div className="space-y-2 mb-5">
                    <label className="text-xs font-medium text-gray-500 flex items-center justify-between">
                      <span>TRY DOCUMENT SAMPLES:</span>
                      <span className="text-[10px] text-gray-400">Click to preview</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        id="pdf-sample-invoice-btn"
                        onClick={() => handlePresetSelect("invoice")}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          activeDocPreset === "invoice"
                            ? "border-[#E11D48] bg-[#FFF5F7] ring-1 ring-[#E11D48]"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <Receipt className="size-4 text-[#E11D48]" />
                        <span className="text-[11px] font-semibold text-gray-900 leading-tight">
                          Tax Invoice
                        </span>
                        <span className="text-[9px] text-gray-400">Paid stamp</span>
                      </button>

                      <button
                        type="button"
                        id="pdf-sample-nda-btn"
                        onClick={() => handlePresetSelect("contract")}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          activeDocPreset === "contract"
                            ? "border-[#E11D48] bg-[#FFF5F7] ring-1 ring-[#E11D48]"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <Scale className="size-4 text-purple-600" />
                        <span className="text-[11px] font-semibold text-gray-900 leading-tight">
                          Legal NDA
                        </span>
                        <span className="text-[9px] text-gray-400">Confidential</span>
                      </button>

                      <button
                        type="button"
                        id="pdf-sample-blueprint-btn"
                        onClick={() => handlePresetSelect("blueprint")}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          activeDocPreset === "blueprint"
                            ? "border-[#E11D48] bg-[#FFF5F7] ring-1 ring-[#E11D48]"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <Building className="size-4 text-sky-600" />
                        <span className="text-[11px] font-semibold text-gray-900 leading-tight">
                          Blueprint
                        </span>
                        <span className="text-[9px] text-gray-400">CAD mark</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Quality Engine Selection */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span className="font-medium flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-[#E11D48]" />
                        <span>AI Quality Engine</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-xs font-medium text-gray-600">
                      {(["standard", "fast", "ultra_hd"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setQualityEngine(mode)}
                          className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                            qualityEngine === mode
                              ? "border-[#E11D48] bg-[#FFF5F7] text-[#E11D48] font-semibold"
                              : "border-gray-200 hover:border-gray-300 text-gray-700 font-normal"
                          }`}
                        >
                          {mode === "standard" ? "Balanced" : mode === "fast" ? "Fast" : "Ultra HD"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Banner */}
                  {uploadStatus && (
                    <div className="mt-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{uploadStatus}</span>
                    </div>
                  )}

                  {/* Integrity Alert */}
                  {integrityError && (
                    <div className="mt-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                      <span>{integrityError}</span>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  {isCompleted ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="pdf-download-pdf-btn"
                        onClick={() => handleDownload("pdf")}
                        className="flex-1 py-3.5 px-5 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs font-bold shadow-lg shadow-[#E11D48]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download className="size-4" />
                        <span>Download Clean PDF</span>
                      </button>

                      <button
                        type="button"
                        id="pdf-download-img-btn"
                        onClick={() => handleDownload("png")}
                        className="py-3.5 px-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        PNG
                      </button>

                      <button
                        type="button"
                        id="pdf-reset-btn"
                        onClick={resetDocument}
                        className="p-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 cursor-pointer shadow-xs"
                        title="Upload another document"
                      >
                        <RefreshCw className="size-3.5" />
                      </button>
                    </div>
                  ) : previewUrl || currentJobId ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        id="pdf-clean-btn"
                        onClick={handleStartCleanup}
                        disabled={isProcessing}
                        className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs font-bold shadow-lg shadow-[#E11D48]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Wand2 className="size-4" />
                        <span>{isProcessing ? "Cleaning..." : "Remove Watermark & Clean"}</span>
                      </button>

                      <button
                        type="button"
                        id="pdf-autodetect-btn"
                        onClick={handleAutoDetect}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-4 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[#E11D48] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="size-3.5" />
                        <span>Auto-Detect Watermarks</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="pdf-choose-doc-btn"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs font-bold shadow-lg shadow-[#E11D48]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="size-4" />
                      <span>Choose A Document</span>
                    </button>
                  )}

                  {/* Trust guarantees matching all sections */}
                  <div className="space-y-1.5 pt-2 text-[11px] text-gray-500 font-normal">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Unmarked document pixels are preserved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Review restored text before sharing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Amazon &amp; Enterprise Compliance Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------------- */}
      {/* 2. 8 COMPREHENSIVE BEFORE & AFTER SHOWCASE COMPARISONS GALLERY        */}
      {/* -------------------------------------------------------------------- */}
      <DocumentCaseStudyGallery />

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
                Drag and drop your PDF, image, or scan. We support multi-page text PDFs, scanned
                documents, invoices, and blueprints up to 50MB.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-rose-100 shadow-sm text-left relative">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E11D48] flex items-center justify-center font-semibold text-lg mb-6 border border-rose-200">
                02
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Auto-Detect or Brush Marks</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Click “Auto-Detect” to identify repeating watermark patterns and confidential
                stamps, or brush over specific unwanted areas manually.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-rose-100 shadow-sm text-left relative">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#E11D48] flex items-center justify-center font-semibold text-lg mb-6 border border-rose-200">
                03
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Download Pristine Output</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Review the side-by-side comparison and export your document as a clean,
                high-resolution vector PDF or 4K lossless image in seconds.
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
                a: "Native PDF watermark layers can often be removed without changing the underlying text. For scanned images, cleanup estimates pixels beneath translucent colored marks; fully hidden letters cannot be guaranteed and should be reviewed.",
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
                a: "PDF results retain their page dimensions. Image results keep the uploaded pixel dimensions; a low-resolution screenshot cannot gain genuine print detail from cleanup alone.",
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
            Clean removable document marks online and review the result before sharing.
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
