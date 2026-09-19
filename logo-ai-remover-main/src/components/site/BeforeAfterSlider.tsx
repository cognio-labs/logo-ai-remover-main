import { useCallback, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

type Props = {
  src: string;
  beforeSrc?: string;
  beforeClassName?: string;
  labelBefore?: string;
  labelAfter?: string;
  badge?: string;
};

/** Interactive luxury before/after comparison slider. */
export function BeforeAfterSlider({
  src,
  beforeSrc,
  beforeClassName = "contrast-95 brightness-95",
  labelBefore = "Original / With Artifacts",
  labelAfter = "Enhanced / Cleaned",
  badge = "4K AI Output",
}: Props) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-[16/10] w-full cursor-ew-resize select-none overflow-hidden rounded-3xl border border-[#FCE7EC] bg-white shadow-[0_15px_45px_-10px_rgba(225,29,72,0.15)] group"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
    >
      {/* Before image (underneath) */}
      <img
        src={beforeSrc ?? src}
        alt={labelBefore}
        className={`absolute inset-0 size-full object-cover ${beforeSrc ? "" : beforeClassName}`}
        draggable={false}
      />

      {/* Simulated AI watermark and logo on before side */}
      {!beforeSrc && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          {/* Centered Watermark Tag */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-black/65 border border-white/30 text-white backdrop-blur-md shadow-2xl -rotate-6">
              <Sparkles className="size-5 text-[#E11D48]" />
              <span className="font-mono text-sm sm:text-base font-semibold tracking-wider">
                © GEMINI AI WATERMARK
              </span>
            </div>
          </div>
          {/* Corner Logo Badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 border border-white/20 text-white backdrop-blur-md shadow-md">
            <span className="size-2 rounded-full bg-[#E11D48] animate-ping" />
            <span className="text-[11px] font-bold font-mono">AI Logo Detected</span>
          </div>
        </div>
      )}

      {/* After image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden transition-none"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      >
        <img
          src={src}
          alt={labelAfter}
          className="size-full object-cover"
          draggable={false}
        />
      </div>

      {/* Slider Line & Handle */}
      <div
        className="absolute inset-y-0 w-0.5 bg-gradient-to-b from-[#E11D48] via-[#FF2E63] to-[#FF4FA3]"
        style={{ left: `${pos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white shadow-[0_4px_16px_rgba(225,29,72,0.4)] group-hover:scale-110 transition-transform">
          <span className="text-xs font-bold select-none">⇄</span>
        </div>
      </div>

      {/* Badges */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="rounded-full border border-gray-200/80 bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur-md shadow-xs">
          {labelBefore}
        </span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-[#FCE7EC] bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#E11D48] backdrop-blur-md shadow-xs">
          <Sparkles className="size-3.5" />
          {labelAfter}
        </span>
      </div>
    </div>
  );
}
