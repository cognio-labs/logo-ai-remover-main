import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useRef, PointerEvent } from "react";
import {
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Upload,
  Scissors,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  SAMPLE_IMAGES,
  CATEGORY_INFO,
  type SampleCategory,
  type SampleImageItem,
} from "@/data/sampleImages";

export const Route = createFileRoute("/background-remover_/sample-images")({
  head: () => ({
    meta: [
      { title: "Background Removal Examples & Sample Results | Bellix" },
      {
        name: "description",
        content:
          "Explore Bellix background removal examples for people, products, animals, cars and graphics, then try removing your own image background.",
      },
    ],
  }),
  component: SampleImagesPage,
});

const CATEGORIES: { id: SampleCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "people", label: "People" },
  { id: "products", label: "Products" },
  { id: "animals", label: "Animals" },
  { id: "cars", label: "Cars" },
  { id: "graphics", label: "Graphics" },
];

const INITIAL_PAGE_SIZE = 10;
const PAGE_SIZE_INCREMENT = 10;

/**
 * Large Interactive Before/After Split-Screen Comparison Slider Card
 * Left: Original image with complete real background
 * Right: Exact same subject cleanly isolated on transparent checkerboard
 */
function SampleComparisonCard({ item }: { item: SampleImageItem }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const updateSlider = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSlider(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current && e.currentTarget.hasPointerCapture(e.pointerId)) {
      updateSlider(e.clientX);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // noop
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      setSliderPos((p) => Math.max(0, p - 5));
    } else if (e.key === "ArrowRight") {
      setSliderPos((p) => Math.min(100, p + 5));
    }
  };

  const cutoutSrc = item.resultImage || item.originalImage;
  const objectPosition = item.category === "people" ? "object-top" : "object-center";

  return (
    <article className="group rounded-3xl border border-gray-200/90 bg-white p-3.5 sm:p-5 shadow-md shadow-gray-200/50 hover:shadow-2xl hover:border-gray-300 transition-all duration-300 flex flex-col justify-between">
      {/* 1. LARGE INTERACTIVE COMPARISON IMAGE SLIDER */}
      <div
        ref={containerRef}
        role="slider"
        aria-label={`${item.title} Before and After Background Removal comparison`}
        aria-valuenow={Math.round(sliderPos)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative aspect-[1/1] w-full rounded-2xl overflow-hidden bg-[#FAFAFC] border border-gray-200/80 cursor-ew-resize select-none touch-none focus:outline-none focus:ring-2 focus:ring-[#E11D48]/40"
      >
        {/* BASE CHECKERBOARD PATTERN (FOR AFTER / TRANSPARENCY) */}
        <div
          className="absolute inset-0 size-full pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 22 22'%3E%3Crect width='11' height='11' fill='%23e2e8f0'/%3E%3Crect x='11' width='11' height='11' fill='%23ffffff'/%3E%3Crect y='11' width='11' height='11' fill='%23ffffff'/%3E%3Crect x='11' y='11' width='11' height='11' fill='%23e2e8f0'/%3E%3C/svg%3E")`,
            backgroundSize: "20px 20px",
          }}
        />

        {/* AFTER LAYER: Cutout on Transparent Checkerboard */}
        <img
          src={cutoutSrc}
          alt={`${item.alt} - Background Removed Cutout`}
          className={`absolute inset-0 size-full object-cover ${objectPosition} pointer-events-none select-none`}
          loading="lazy"
          decoding="async"
        />

        {/* BEFORE LAYER: Original Image with Real Background (Clipped) */}
        <div
          className="absolute inset-0 size-full overflow-hidden pointer-events-none select-none"
          style={{
            clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
            WebkitClipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
          }}
        >
          <img
            src={item.originalImage}
            alt={`${item.alt} - Original Image with Full Background`}
            className={`absolute inset-0 size-full object-cover ${objectPosition} pointer-events-none select-none`}
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* VERTICAL DIVIDER & CIRCULAR DRAG HANDLE */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white z-20 pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.4)]"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-9 sm:size-10 rounded-full bg-white/95 backdrop-blur-md border border-gray-300 shadow-xl flex items-center justify-center text-gray-800 select-none ring-4 ring-black/5 transition-transform group-hover:scale-105 active:scale-95">
            <ChevronLeft className="size-4 -mr-0.5 text-gray-800 stroke-[2.5]" />
            <ChevronRight className="size-4 -ml-0.5 text-gray-800 stroke-[2.5]" />
          </div>
        </div>

        {/* LABELS */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[10px] sm:text-[11px] font-semibold text-white uppercase tracking-wider pointer-events-none border border-white/10 shadow-sm z-10">
          BEFORE
        </span>
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-[10px] sm:text-[11px] font-semibold text-white uppercase tracking-wider pointer-events-none border border-white/10 shadow-sm z-10">
          AFTER
        </span>
      </div>

      {/* 2. CARD METADATA & QUICK CTA */}
      <div className="mt-4 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#E11D48] block">
            {item.category}
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-gray-950 tracking-tight mt-0.5 truncate">
            {item.title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-relaxed line-clamp-1">
            {item.description}
          </p>
        </div>

        <Link
          to="/background-remover"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-[#E11D48] transition-colors whitespace-nowrap self-start sm:self-center py-1 group/btn"
        >
          <span>Try on your photo</span>
          <ArrowRight className="size-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </article>
  );
}

function SampleImagesPage() {
  const [activeCategory, setActiveCategory] = useState<SampleCategory>(() => {
    if (typeof window === "undefined") return "all";
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    if (cat && CATEGORIES.some((c) => c.id === cat)) {
      return cat as SampleCategory;
    }
    return "all";
  });

  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);

  // Compute exact counts per category from the 100 images
  const categoryCounts = useMemo(() => {
    const counts: Record<SampleCategory, number> = {
      all: SAMPLE_IMAGES.length,
      people: 0,
      products: 0,
      animals: 0,
      cars: 0,
      graphics: 0,
    };
    for (const item of SAMPLE_IMAGES) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }
    return counts;
  }, []);

  // Filter items based on active category
  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return SAMPLE_IMAGES;
    return SAMPLE_IMAGES.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  const handleSelectCategory = (cat: SampleCategory) => {
    setActiveCategory(cat);
    setVisibleCount(INITIAL_PAGE_SIZE);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (cat === "all") {
        url.searchParams.delete("category");
      } else {
        url.searchParams.set("category", cat);
      }
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE_INCREMENT, filteredItems.length));
  };

  return (
    <main className="min-h-screen bg-[#FFFDFD] text-gray-900 font-sans selection:bg-[#FFE4E9] selection:text-[#E11D48]">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-14 sm:pt-16 sm:pb-18 overflow-hidden bg-radial-[at_50%_0%] from-[#FFF0F5] via-white to-white border-b border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] text-xs font-medium text-[#E11D48] mb-4 shadow-xs">
            <Sparkles className="size-3.5 text-[#E11D48]" />
            <span>AI BACKGROUND REMOVAL GALLERY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-normal text-gray-950 tracking-tight leading-[1.1] max-w-4xl mx-auto">
            See Our Background Remover{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent font-medium">
              in Action
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Explore real examples across people, products, animals, cars and graphics. See how Bellix removes complex backgrounds while preserving fine edges, hair, fur and product details.
          </p>

          <p className="mt-2 text-xs text-gray-400 font-normal">
            Explore sample results and see the quality before trying your own image.
          </p>

          {/* Quick stats strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-gray-500 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-[#E11D48]" />
              <span>5 Categories</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="size-3.5 text-[#E11D48]" />
              <span>100+ Unique Samples</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-[#E11D48]" />
              <span>Transparent PNG Output</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY TABS & HIGHLIGHT SECTION */}
      <section className="py-8 sm:py-10 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered Category Pills with dynamic count badges */}
          <div className="flex items-center justify-center">
            <div className="inline-flex p-1.5 rounded-full bg-gray-100/90 border border-gray-200/70 max-w-full overflow-x-auto scrollbar-none gap-1 sm:gap-2 shadow-2xs">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                const count = categoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-[#E11D48] text-white shadow-md shadow-rose-950/20"
                        : "text-gray-600 hover:text-gray-950 hover:bg-white/60"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-gray-200/80 text-gray-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Category Highlight Info */}
          <div className="mt-6 text-center max-w-xl mx-auto">
            <h2 className="text-sm sm:text-base font-semibold text-gray-950 tracking-tight">
              Made for More Than Portraits
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed font-normal">
              {CATEGORY_INFO[activeCategory].description}
            </p>
          </div>
        </div>
      </section>

      {/* 3. LARGE 2-COLUMN BEFORE/AFTER GALLERY GRID */}
      <section className="py-12 sm:py-16 bg-[#FFFDFD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar: Sample Count & Clear "Try your own image →" CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b border-gray-100">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Showing <span className="font-semibold text-gray-900">{displayedItems.length}</span> of{" "}
              <span className="font-semibold text-gray-900">{filteredItems.length}</span> samples in{" "}
              <span className="text-[#E11D48] font-semibold">{CATEGORY_INFO[activeCategory].label}</span>
            </p>

            <Link
              to="/background-remover"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#E11D48] hover:text-[#BE123C] transition-colors group"
            >
              <span>Try your own image</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* 2-COLUMN RESPONSIVE GRID (DESKTOP & TABLET: 2 COLS; MOBILE: 1 COL) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
            {displayedItems.map((item) => (
              <SampleComparisonCard key={item.id} item={item} />
            ))}
          </div>

          {/* LOAD MORE SAMPLES BUTTON */}
          {displayedItems.length < filteredItems.length ? (
            <div className="mt-14 sm:mt-18 text-center flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300/80 font-medium text-xs sm:text-sm shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-98"
              >
                <span>See more samples</span>
                <span className="text-gray-400 font-normal">
                  ({displayedItems.length} of {filteredItems.length})
                </span>
                <ArrowRight className="size-4 text-gray-500 group-hover:translate-x-1 group-hover:text-gray-900 transition-all" />
              </button>
              <p className="text-[11px] text-gray-400 mt-2 font-normal">
                Click to reveal 10 more high-resolution samples
              </p>
            </div>
          ) : (
            <div className="mt-12 text-center text-xs text-gray-400 font-normal">
              Showing all {filteredItems.length} {CATEGORY_INFO[activeCategory].label} samples
            </div>
          )}
        </div>
      </section>

      {/* 4. BOTTOM CALL TO ACTION */}
      <section className="py-20 sm:py-28 bg-[#FFF8FA] border-t border-[#FCE7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#FCE7EC] text-xs font-medium text-[#E11D48] mb-4 shadow-xs">
            <Scissors className="size-3.5" />
            <span>TRY WITH YOUR OWN IMAGES</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-normal text-gray-950 tracking-tight leading-tight">
            Ready to Remove Your Background?
          </h2>

          <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed font-normal max-w-xl mx-auto">
            Upload your own image and get a clean background-free result in seconds.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/background-remover"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] hover:from-[#BE123C] hover:to-[#E11D48] text-white font-medium text-sm shadow-xl shadow-rose-950/25 hover:shadow-2xl hover:scale-102 active:scale-98 transition-all cursor-pointer"
            >
              <Upload className="size-4" />
              <span>Upload Your Image</span>
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-4 font-normal">
            No design skills required.
          </p>
        </div>
      </section>
    </main>
  );
}
