import { createFileRoute } from "@tanstack/react-router";
import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, ArrowRight, Check, ChevronRight, Download, Feather, ImageUp, Layers3, LockKeyhole, RefreshCw, RotateCcw, ScanSearch, ShieldCheck, SlidersHorizontal, Sparkles, Upload, WandSparkles, Zap } from "lucide-react";
import { FeatureComparisonCard, type FeatureCardData } from "@/components/upscale/FeatureComparisonCard";
import { PinkScanLoader } from "@/components/site/PinkScanLoader";
import { HeroComparisonSlider } from "@/components/upscale/HeroComparisonSlider";
import { ImageUploader, type ImageFileMetadata } from "@/components/upscale/ImageUploader";
import { UPSCALE_STAGES, runPipeline } from "@/lib/pipeline";
import { upscaleImageCanvas, getImageDimensions, formatBytes } from "@/lib/upscaleEngine";
import { useUserStore } from "@/lib/userStore";
import { toast } from "sonner";

export const Route = createFileRoute("/upscale")({
  head: () => ({ meta: [{ title: "AI Upscaler — PixelRefine AI" }] }), component: UpscalePage,
});
type Scale = "2" | "4" | "8";
type Format = "PNG" | "JPG";
const PRESETS = [
  { name: "Studio Portrait", factor: "4", image: "/upscale/portrait.png" },
  { name: "Generative Art", factor: "8", image: "/upscale/artwork.png" },
  { name: "Vector & Logos", factor: "2", image: "/upscale/typography.png" },
] as const;
const SHOWCASES = [
  { id:"portrait", image:"/upscale/portrait.png", category:"SKIN · HAIR · MICRO DETAIL", title:"Cinematic Portrait Restoration", quote:"Real skin. Real texture. No plastic AI finish.", description:"Recovers eyelashes, individual hair strands, skin texture and subtle facial detail while preserving natural tones.", source:"512 × 512", output:"4096 × 4096", scale:"8", result:"Natural Detail", tone:"from-[#fff4f6] to-[#fdf7f3]" },
  { id:"art", image:"/upscale/artwork.png", category:"GENERATIVE ART · NEON · DETAIL", title:"AI Artwork Enhancement", quote:"Bring AI artwork back to life.", description:"Sharpens intricate shapes, lighting, textures and luminous details without destroying the original artistic style.", source:"1024 × 1024", output:"4096 × 4096", scale:"4", result:"Crisper Detail", tone:"from-[#fbf4ff] to-[#fff4f8]" },
  { id:"wildlife", image:"/upscale/wildlife.png", category:"FUR · FEATHERS · ORGANIC TEXTURE", title:"Wildlife & Nature Detail", quote:"Every strand becomes visible again.", description:"Restores fur, eyes and organic micro-textures while keeping nature realistic rather than artificially sharpened.", source:"800 × 800", output:"3200 × 3200", scale:"4", result:"Texture Recovery", tone:"from-[#fbf8ef] to-[#f3f8ee]" },
  { id:"type", image:"/upscale/typography.png", category:"TEXT · LOGOS · EDGES", title:"Logo & Typography Rescue", quote:"From fuzzy pixels to razor-clean edges.", description:"Refines typography, icons and graphic edges for cleaner digital assets, presentations and branded visuals.", source:"512 × 512", output:"4096 × 4096", scale:"8", result:"Crisp Edges", tone:"from-[#f2f8ff] to-[#fff5f8]" },
  { id:"interior", image:"/upscale/interior.png", category:"MATERIALS · LIGHT · STRUCTURE", title:"Architecture & Interiors", quote:"Bring spaces back to photographic clarity.", description:"Restores architectural lines, furniture textures, materials and lighting while preserving natural depth.", source:"1024 × 1024", output:"4096 × 4096", scale:"4", result:"True Detail", tone:"from-[#fffaf2] to-[#fdf7ec]" },
  { id:"product", image:"/upscale/product.png", category:"REFLECTIONS · MATERIAL · DETAIL", title:"Product Photography", quote:"Make every product feel studio-shot.", description:"Enhances glass, metal, reflections and material textures for polished e-commerce and campaign imagery.", source:"800 × 800", output:"3200 × 3200", scale:"4", result:"Studio Clarity", tone:"from-[#fff7ef] to-[#fff2f6]" },
];
const FEATURE_CARDS: FeatureCardData[] = [
  {
    id: "sub-pixel",
    icon: ScanSearch,
    centerIcon: ArrowRight,
    title: "Sub-Pixel Reconstruction",
    description: "Rebuilds fine structures such as skin pores, fabric weave, hair and natural texture.",
    lowImage: "/upscale/card_subpixel_low.jpg",
    highImage: "/upscale/card_subpixel_high.jpg",
  },
  {
    id: "zero-plastic",
    icon: Feather,
    centerIcon: ArrowRight,
    title: "Zero-Plastic Finishing",
    description: "Avoids fake, oversmoothed cartoon looks. Enhances authentic high-frequency details.",
    lowImage: "/upscale/card_skin_low.jpg",
    highImage: "/upscale/card_skin_high.jpg",
  },
  {
    id: "natural-skin",
    icon: Sparkles,
    centerIcon: Sparkles,
    title: "Natural Skin Detail",
    description: "Restores pores, eyelashes and facial texture without creating waxy AI skin.",
    lowImage: "/upscale/card_skin_low.jpg",
    highImage: "/upscale/card_skin_high.jpg",
  },
  {
    id: "texture-recovery",
    icon: Layers3,
    centerIcon: ArrowRight,
    title: "Texture Recovery",
    description: "Recovers hair, fur, fabric, wood, foliage and other high-frequency detail.",
    lowImage: "/upscale/card_fabric_low.jpg",
    highImage: "/upscale/card_fabric_high.jpg",
  },
  {
    id: "crisp-typography",
    icon: ArrowLeftRight,
    centerIcon: ArrowLeftRight,
    title: "Crisp Typography",
    description: "Improves text, logos and graphic edges for noticeably cleaner visual assets.",
    lowImage: "/upscale/card_typography_low.jpg",
    highImage: "/upscale/card_typography_high.jpg",
  },
  {
    id: "smart-edge",
    icon: Zap,
    centerIcon: Zap,
    title: "Smart Edge Restoration",
    description: "Repairs compression damage and soft edges while keeping the image visually natural.",
    lowImage: "/upscale/card_edge_low.jpg",
    highImage: "/upscale/card_edge_high.jpg",
  },
];
const FAQS = [["How does PixelRefine AI upscale an image without making it look artificial?","PixelRefine focuses on rebuilding fine visual structures such as edges, textures and micro-detail instead of simply stretching existing pixels. The goal is a sharper result that still feels natural."],["Which upscale level should I choose: 2, 4 or 8?","Use 2 for already-good images that need extra resolution, 4 for most web and creative work, and 8 when starting from smaller images or when a much larger output is required."],["Will the aspect ratio of my image change?","No. Upscaling increases resolution while preserving the original image proportions unless you intentionally crop or resize it separately."],["Does it work with AI-generated images?","Yes. The enhancement workflow can be used with AI artwork, portraits, concept art, product images, illustrations and other generated visuals."],["Can it improve faces and skin without creating a plastic look?","The portrait enhancement mode should prioritize natural skin texture, eyelashes, hair and facial detail while avoiding excessive smoothing."],["Can PixelRefine enhance logos and typography?","Yes. Graphic-focused enhancement can improve text edges, logos, symbols and other high-contrast design elements."],["Which image formats are supported?","Support common formats such as PNG, JPG, JPEG, WebP and AVIF, with the exact size limit shown beside the uploader."],["Are uploaded images private?","Images are processed according to PixelRefine's privacy policy. Review the current policy for the applicable processing, storage and deletion practices before uploading sensitive material."]];

function Comparison({ image, title }: { image: string; title: string }) {
  const [position, setPosition] = useState(48); const frame = useRef<HTMLDivElement>(null);
  const move = (x:number) => { const r=frame.current?.getBoundingClientRect(); if(r) setPosition(Math.max(8,Math.min(92,((x-r.left)/r.width)*100))); };
  const pointer = (e:PointerEvent<HTMLDivElement>)=>move(e.clientX);
  return <div ref={frame} className="up-compare" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);pointer(e)}} onPointerMove={e=>e.currentTarget.hasPointerCapture(e.pointerId)&&pointer(e)}>
    <img src={image} alt={`${title} restored`} /><div className="up-before" style={{width:`${position}%`}}><img src={image} alt={`${title} low resolution`} /><span className="up-watermark">✦ DEMO AI</span></div><span className="up-image-label before-label">BEFORE</span><span className="up-image-label after-label">AFTER</span><div className="up-divider" style={{left:`${position}%`}}><span><ChevronRight/><ChevronRight/></span></div>
  </div>;
}

function UpscalePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileMetadata, setFileMetadata] = useState<ImageFileMetadata | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [scale, setScale] = useState<Scale>("4");
  const [mode, setMode] = useState("Natural");
  const [format, setFormat] = useState<Format>("PNG");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [dimensions, setDimensions] = useState<{
    original: { width: number; height: number } | null;
    upscaled: { width: number; height: number } | null;
  }>({
    original: null,
    upscaled: null,
  });
  const [resultSize, setResultSize] = useState<string>("");
  const cancel = useRef<(() => void) | null>(null);
  const { user, deductCredit, addJob } = useUserStore();

  useEffect(() => {
    return () => {
      cancel.current?.();
    };
  }, []);

  const start = async (source?: string, sourceName?: string, targetScale?: Scale) => {
    const activeUrl = source || previewUrl;
    const activeName = sourceName || fileMetadata?.name || "image.png";
    const activeScale = targetScale || scale;

    if (!activeUrl) {
      toast.error("Please select or drop an image first.");
      return;
    }
    if (user.credits <= 0 || !deductCredit()) {
      toast.error("Insufficient credits. Please upgrade your plan or wait for the daily reset.");
      return;
    }

    setRunning(true);
    setDone(false);
    setProgress(0);

    // Concurrently trigger real canvas upscaling calculation
    const factorNum = parseInt(activeScale, 10);
    const upscalePromise = upscaleImageCanvas(activeUrl, factorNum, mode, format);

    cancel.current = runPipeline(UPSCALE_STAGES, 2800, async (u) => {
      setProgress(u.progress);
      setStage(u.stage);
      if (u.done) {
        try {
          const res = await upscalePromise;
          setResultUrl(res.blobUrl);
          setDimensions({
            original: { width: res.originalWidth, height: res.originalHeight },
            upscaled: { width: res.upscaledWidth, height: res.upscaledHeight },
          });
          setResultSize(res.fileSizeFormatted);
          setRunning(false);
          setDone(true);

          addJob({
            file_name: activeName,
            file_type: "upscale",
            status: "completed",
            quality: `${activeScale}× / ${mode} (${res.upscaledWidth}×${res.upscaledHeight})`,
            credits_used: 1,
            processing_time: "2.8s",
            file_url: activeUrl,
            result_url: res.blobUrl,
          });

          toast.success(`✦ Crystal-clear ${activeScale}× upscale complete! AI watermark removed (${res.upscaledWidth}×${res.upscaledHeight}px).`);
        } catch (err) {
          console.error("Upscaling error:", err);
          setRunning(false);
          toast.error("Upscaling processing error. Please try another image.");
        }
      }
    });
  };

  const loadDemo = async (item = PRESETS[0], autoStart = false) => {
    const demoUrl = item.image;
    const demoName = `${item.name.toLowerCase().replaceAll(" ", "-")}.png`;
    const demoScale = item.factor as Scale;

    setUploadedFile(null);
    setPreviewUrl(demoUrl);
    setScale(demoScale);
    setDone(false);
    setResultUrl(null);

    // Fetch natural dimensions of demo
    const dims = await getImageDimensions(demoUrl);
    const meta: ImageFileMetadata = {
      name: demoName,
      sizeBytes: 2 * 1024 * 1024,
      sizeFormatted: "2.1 MB",
      width: dims.width,
      height: dims.height,
      type: "image/png",
    };
    setFileMetadata(meta);
    setDimensions({ original: dims, upscaled: null });

    if (autoStart) {
      toast.info(`Starting instant demo upscale for "${item.name}"...`);
      start(demoUrl, demoName, demoScale);
    } else {
      toast.success(`Loaded demo sample "${item.name}" (${dims.width} × ${dims.height}px)`);
    }
  };

  const resetAll = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    if (resultUrl && resultUrl.startsWith("blob:")) {
      URL.revokeObjectURL(resultUrl);
    }
    setDone(false);
    setResultUrl(null);
    setUploadedFile(null);
    setPreviewUrl(null);
    setFileMetadata(null);
    setDimensions({ original: null, upscaled: null });
    setResultSize("");
  };

  const download = () => {
    const downloadTarget = resultUrl || previewUrl;
    if (!downloadTarget) return;
    const a = document.createElement("a");
    a.href = downloadTarget;
    const cleanExt = format.toLowerCase();
    const base = (fileMetadata?.name || "image").replace(/\.[^/.]+$/, "");
    a.download = `pixelrefine-${base}-${scale}x.${cleanExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded ${dimensions.upscaled ? `${dimensions.upscaled.width}×${dimensions.upscaled.height}px` : ""} high-resolution ${format}!`);
  };

  return (
    <main className="up-page">
      <section className="up-hero">
        <div className="up-shell">
          <div className="up-intro">
            <p className="up-eyebrow">AI IMAGE UPSCALER</p>
            <h1>Turn Low-Resolution Images Into <em>Crystal-Clear 4K &amp; 8K</em></h1>
            <p>Restore texture, recover fine details and upscale your images while keeping them natural, sharp and realistic.</p>
          </div>

          {/* Quick Demo Preset Pills */}
          <div className="up-presets">
            <span>TRY SAMPLES:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className={fileMetadata?.name.includes(p.name.toLowerCase().replaceAll(" ", "-")) ? "active" : ""}
                onClick={() => loadDemo(p)}
              >
                <img src={p.image} alt={p.name} />
                <b>{p.name}</b>
                <i>{p.factor}×</i>
              </button>
            ))}
          </div>

          <div className="up-tool-card">
            <div className="up-tool-copy">
              <p className="up-eyebrow">AI IMAGE UPSCALER</p>
              <h2>Turn Low-Resolution Images Into <span>Crystal-Clear 4K &amp; 8K</span></h2>
              <p>Restore texture, recover fine details and upscale your images while keeping them natural, sharp and realistic.</p>
              <div className="up-trust">
                <span><Check /> No Watermark</span>
                <span><ShieldCheck /> Private Processing</span>
                <span><Sparkles /> Natural Detail</span>
                <span><ImageUp /> 4K &amp; 8K Ready</span>
              </div>
            </div>

            {/* Center Dynamic Area: Running Loader OR Comparison Slider OR ImageUploader with Visible Preview */}
            <div className="up-center-slot">
              {running ? (
                <div className="up-running-box">
                  <PinkScanLoader progress={progress} stage={stage} />
                </div>
              ) : done && previewUrl && (resultUrl || previewUrl) ? (
                <HeroComparisonSlider
                  beforeUrl={previewUrl}
                  afterUrl={resultUrl || previewUrl}
                  beforeDims={dimensions.original}
                  afterDims={dimensions.upscaled}
                  scale={scale}
                  onChangeImage={() => {
                    setDone(false);
                    setResultUrl(null);
                  }}
                />
              ) : (
                <ImageUploader
                  onImageSelected={(file, url, meta) => {
                    setUploadedFile(file);
                    setPreviewUrl(url);
                    setFileMetadata(meta);
                    setDimensions({
                      original: { width: meta.width, height: meta.height },
                      upscaled: null,
                    });
                    setDone(false);
                    setResultUrl(null);
                  }}
                  onImageRemoved={() => {
                    resetAll();
                  }}
                  isProcessing={running}
                  initialPreviewUrl={previewUrl}
                  initialMetadata={fileMetadata}
                />
              )}
            </div>

            <aside className="up-settings">
              <div>
                <p>UPSCALE SETTINGS</p>
                <label>Scale</label>
                <div className="up-option-row">
                  {(["2", "4", "8"] as Scale[]).map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setScale(x)}
                      className={scale === x ? "selected" : ""}
                    >
                      {x}<small>×</small>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label>Enhancement mode</label>
                <div className="up-mode-grid">
                  {["Natural", "Portrait", "Art", "Product"].map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setMode(x)}
                      className={mode === x ? "selected" : ""}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label>Output</label>
                <div className="up-output">
                  {(["PNG", "JPG"] as Format[]).map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setFormat(x)}
                      className={format === x ? "selected" : ""}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>

              {done ? (
                <>
                  <div className="up-result-meta">
                    <span><b>Original:</b> {dimensions.original?.width || 512} × {dimensions.original?.height || 512}</span>
                    <span><b>Upscaled:</b> {dimensions.upscaled?.width || 2048} × {dimensions.upscaled?.height || 2048} ({scale}× HD)</span>
                    <span><b>Output:</b> {format} · {resultSize || "Ultra HD"}</span>
                  </div>
                  <button
                    type="button"
                    className="up-start"
                    onClick={download}
                  >
                    <Download /> Download {scale}× {format}
                  </button>
                  <button
                    type="button"
                    className="up-reset-btn"
                    onClick={resetAll}
                  >
                    <RotateCcw className="size-3" /> Upscale Another
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="up-start"
                  disabled={running}
                  onClick={() => start()}
                >
                  <WandSparkles /> Start Upscaling
                </button>
              )}
            </aside>
          </div>
        </div>
      </section>

      <section className="up-results up-shell">
        <header className="up-section-heading">
          <p className="up-eyebrow">REAL AI RESTORATION</p>
          <h2>See Every Detail Come Back to Life</h2>
          <p>Drag the slider to reveal how PixelRefine restores texture, clarity and detail from low-quality images.</p>
        </header>
        <div className="up-showcase-grid">
          {SHOWCASES.map(item => (
            <article className="up-showcase" key={item.id}>
              <Comparison image={item.image} title={item.title} />
              <div className={`up-showcase-copy bg-gradient-to-br ${item.tone}`}>
                <p className="up-category">{item.category}</p>
                <h3>{item.title}</h3>
                <blockquote>{item.quote}</blockquote>
                <p className="up-description">{item.description}</p>
                <div className="up-metrics">
                  <span><small>SOURCE</small>{item.source}</span>
                  <span><small>OUTPUT</small>{item.output}</span>
                  <span><small>UPSCALE</small>{item.scale}×</span>
                  <b>{item.result}</b>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="up-features">
        <div className="up-shell">
          <header className="up-section-heading">
            <p className="up-eyebrow">BUILT FOR REAL DETAIL</p>
            <h2>More Than More Pixels</h2>
            <p>PixelRefine reconstructs the visual information that ordinary resizing leaves behind.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURE_CARDS.map(card => <FeatureComparisonCard key={card.id} card={card} />)}
          </div>
        </div>
      </section>

      <section className="up-trust-strip up-shell">
        <div>
          <h2>Made for Detail. Designed for Reality.</h2>
        </div>
        {[
          [ShieldCheck, "Natural-Looking Results", "No plastic oversmoothing"],
          [LockKeyhole, "Private Image Processing", "Your uploads remain protected"],
          [SlidersHorizontal, "Multiple Upscale Levels", "Choose 2, 4 or 8"],
          [Sparkles, "AI + Photography Ready", "Portraits, art, products and graphics"]
        ].map(([Icon, title, copy]) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <article key={title as string}>
              <I />
              <span>
                <b>{title as string}</b>
                <small>{copy as string}</small>
              </span>
            </article>
          );
        })}
      </section>

      <section className="up-faq">
        <div className="up-shell">
          <header className="up-section-heading">
            <p className="up-eyebrow">UPSCALING FAQ</p>
            <h2>Everything You Want to Know</h2>
            <p>Quick answers about quality, resolution, privacy and how PixelRefine AI works.</p>
          </header>
          <div className="up-faq-list">
            {FAQS.map(([question, answer], idx) => {
              const isOpen = openFaq === idx;
              return (
                <article key={question} className="up-faq-item">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className={`up-faq-btn ${isOpen ? "open" : ""}`}
                    aria-expanded={isOpen}
                  >
                    <span>{question}</span>
                    <i>+</i>
                  </button>
                  {isOpen && (
                    <div className="up-faq-answer">
                      <p>{answer}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="up-final up-shell">
        <p className="up-eyebrow">READY TO SEE THE DIFFERENCE?</p>
        <h2>Give Your Image the Detail It Deserves.</h2>
        <p>Upload once. Compare instantly. Export in high resolution.</p>
        <div>
          <button className="up-primary" onClick={() => start()}>
            <WandSparkles /> Upscale My Image
          </button>
          <button className="up-secondary" onClick={() => loadDemo()}>
            Try a Demo <ArrowRight />
          </button>
        </div>
      </section>
    </main>
  );
}
