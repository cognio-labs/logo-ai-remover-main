"use client";

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
    <article className="group rounded-xl border-[3px] border-[#0b0f0d] bg-white p-3.5 sm:p-5 shadow-[6px_6px_0px_#0b0f0d] hover:-translate-y-1 transition-all duration-150 flex flex-col justify-between">
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
        className="relative aspect-[1/1] w-full rounded-lg overflow-hidden bg-[#f7f5ee] border-2 border-[#0b0f0d] cursor-ew-resize select-none touch-none focus:outline-none"
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

        {/* VERTICAL DIVIDER & DRAG HANDLE */}
        <div
          className="absolute top-0 bottom-0 w-[3px] bg-[#0b0f0d] z-20 pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-9 sm:size-10 rounded-lg bg-[#d0f471] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] flex items-center justify-center text-[#0b0f0d] select-none transition-transform group-hover:scale-105 active:scale-95">
            <ChevronLeft className="size-4 -mr-0.5 text-[#0b0f0d] stroke-[2.5]" />
            <ChevronRight className="size-4 -ml-0.5 text-[#0b0f0d] stroke-[2.5]" />
          </div>
        </div>

        {/* LABELS */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white text-[10px] sm:text-[11px] font-black text-[#0b0f0d] uppercase tracking-wider pointer-events-none border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] z-10">
          BEFORE
        </span>
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-[#d0f471] text-[10px] sm:text-[11px] font-black text-[#0b0f0d] uppercase tracking-wider pointer-events-none border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] z-10">
          AFTER
        </span>
      </div>

      {/* 2. CARD METADATA & QUICK CTA */}
      <div className="mt-4 px-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="inline-block px-2 py-0.5 rounded bg-[#ffe500] border border-[#0b0f0d] text-[10px] font-black uppercase tracking-widest text-[#0b0f0d]">
            {item.category}
          </span>
          <h3 className="text-base sm:text-lg font-black text-[#0b0f0d] tracking-tight mt-1.5 truncate">
            {item.title}
          </h3>
          <p className="text-xs sm:text-sm text-[#26302b] font-medium mt-0.5 leading-relaxed line-clamp-1">
            {item.description}
          </p>
        </div>

        <Link
          to="/background-remover"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] text-xs font-black text-[#0b0f0d] transition-colors whitespace-nowrap self-start sm:self-center group/btn"
        >
          <span>Try on your photo</span>
          <ArrowRight className="size-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </article>
  );
}

export default function SampleImagesPage() {
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
    <main className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] font-sans">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-14 sm:pt-16 sm:pb-18 overflow-hidden bg-[#f7f5ee] border-b-[3px] border-[#0b0f0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black uppercase tracking-wider text-[#0b0f0d] mb-4 shadow-[3px_3px_0px_#0b0f0d]">
            <Sparkles className="size-3.5 text-[#0b0f0d]" />
            <span>AI BACKGROUND REMOVAL GALLERY</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0b0f0d] tracking-tight leading-[1.1] max-w-4xl mx-auto">
            See Our Background Remover{" "}
            <span className="inline-block bg-[#d0f471] px-3 py-0.5 border-[3px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] text-[#0b0f0d]">
              in Action
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base lg:text-lg text-[#1f2924] leading-relaxed max-w-2xl mx-auto font-medium">
            Explore real examples across people, products, animals, cars and graphics. See how
            Bellix removes complex backgrounds while preserving fine edges, hair, fur and product
            details.
          </p>

          <p className="mt-2 text-xs text-[#37433d] font-bold">
            Explore sample results and see the quality before trying your own image.
          </p>

          {/* Quick stats strip */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-[#0b0f0d] font-black">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <CheckCircle2 className="size-3.5 text-[#0b0f0d]" />
              <span>5 Categories</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <Zap className="size-3.5 text-[#0b0f0d]" />
              <span>100+ Unique Samples</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
              <ShieldCheck className="size-3.5 text-[#0b0f0d]" />
              <span>Transparent PNG Output</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY TABS & HIGHLIGHT SECTION */}
      <section className="py-8 sm:py-10 bg-white border-b-[3px] border-[#0b0f0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered Category Pills with dynamic count badges */}
          <div className="flex items-center justify-center">
            <div className="inline-flex p-1.5 rounded-xl bg-[#f7f5ee] border-[2.5px] border-[#0b0f0d] max-w-full overflow-x-auto scrollbar-none gap-1 sm:gap-2 shadow-[4px_4px_0px_#0b0f0d]">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                const count = categoryCounts[cat.id];
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-black transition-all duration-150 cursor-pointer whitespace-nowrap border-2 ${
                      isActive
                        ? "bg-[#d0f471] text-[#0b0f0d] border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                        : "border-transparent text-[#0b0f0d] hover:bg-white"
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-black border border-[#0b0f0d] ${
                        isActive ? "bg-white text-[#0b0f0d]" : "bg-[#ffe500] text-[#0b0f0d]"
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
            <h2 className="text-sm sm:text-base font-black text-[#0b0f0d] tracking-tight">
              Made for More Than Portraits
            </h2>
            <p className="text-xs sm:text-sm text-[#1f2924] mt-1 leading-relaxed font-medium">
              {CATEGORY_INFO[activeCategory].description}
            </p>
          </div>
        </div>
      </section>

      {/* 3. LARGE 2-COLUMN BEFORE/AFTER GALLERY GRID */}
      <section className="py-12 sm:py-16 bg-[#f7f5ee]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar: Sample Count & Clear "Try your own image →" CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-4 border-b-2 border-[#0b0f0d]">
            <p className="text-xs sm:text-sm text-[#1f2924] font-bold">
              Showing <span className="font-black text-[#0b0f0d]">{displayedItems.length}</span>{" "}
              of <span className="font-black text-[#0b0f0d]">{filteredItems.length}</span> samples
              in{" "}
              <span className="inline-block bg-[#ffe500] border border-[#0b0f0d] px-2 py-0.5 rounded text-[#0b0f0d] font-black">
                {CATEGORY_INFO[activeCategory].label}
              </span>
            </p>

            <Link
              to="/background-remover"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-[#0b0f0d] underline decoration-2 underline-offset-4 hover:bg-[#d0f471] px-2 py-1 rounded transition-colors group"
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
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-lg bg-white hover:bg-[#ffe500] text-[#0b0f0d] border-[2.5px] border-[#0b0f0d] font-black text-xs sm:text-sm shadow-[4px_4px_0px_#0b0f0d] transition-all cursor-pointer"
              >
                <span>See more samples</span>
                <span className="text-[#37433d] font-bold">
                  ({displayedItems.length} of {filteredItems.length})
                </span>
                <ArrowRight className="size-4 text-[#0b0f0d] group-hover:translate-x-1 transition-all" />
              </button>
              <p className="text-[11px] text-[#37433d] mt-2 font-bold">
                Click to reveal 10 more high-resolution samples
              </p>
            </div>
          ) : (
            <div className="mt-12 text-center text-xs text-[#37433d] font-bold">
              Showing all {filteredItems.length} {CATEGORY_INFO[activeCategory].label} samples
            </div>
          )}
        </div>
      </section>

      {/* 4. BOTTOM CALL TO ACTION */}
      <section className="py-20 sm:py-28 bg-[#a8e6cf] border-t-[3px] border-[#0b0f0d]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-white border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] mb-4 shadow-[3px_3px_0px_#0b0f0d]">
            <Scissors className="size-3.5" />
            <span>TRY WITH YOUR OWN IMAGES</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-[#0b0f0d] tracking-tight leading-tight">
            Ready to Remove Your Background?
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#0b0f0d] leading-relaxed font-bold max-w-xl mx-auto">
            Upload your own image and get a clean background-free result in seconds.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/background-remover"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#ffe500] hover:bg-[#d0f471] text-[#0b0f0d] border-[3px] border-[#0b0f0d] font-black text-sm shadow-[5px_5px_0px_#0b0f0d] transition-all cursor-pointer"
            >
              <Upload className="size-4" />
              <span>Upload Your Image</span>
            </Link>
          </div>

          <p className="text-xs text-[#0b0f0d] mt-4 font-bold">No design skills required.</p>
        </div>
      </section>
    </main>
  );
}
