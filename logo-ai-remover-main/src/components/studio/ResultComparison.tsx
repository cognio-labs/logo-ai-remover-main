import { useState } from "react";

export function ResultComparison({ original, result }: { original: string; result: string }) {
  const [position, setPosition] = useState(50);
  return (
    <section
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-4"
      aria-label="Original and processed result"
    >
      <div className="flex justify-between text-xs text-slate-500">
        <span>Original</span>
        <span>Processed image · transparency preview</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <img
          src={original}
          alt="Original image"
          className="w-full h-36 sm:h-48 object-contain rounded-xl bg-slate-50"
        />
        <img
          src={result}
          alt="Processed transparent image"
          className="w-full h-36 sm:h-48 object-contain rounded-xl"
          style={{
            backgroundImage: "conic-gradient(#edf1ef 25%,white 0 50%,#edf1ef 0 75%,white 0)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          backgroundImage: "conic-gradient(#edf1ef 25%,white 0 50%,#edf1ef 0 75%,white 0)",
          backgroundSize: "20px 20px",
        }}
      >
        <img src={result} alt="After comparison" className="block w-full max-h-96 object-contain" />
        <img
          src={original}
          alt="Before comparison"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-px bg-emerald-600"
          style={{ left: `${position}%` }}
        />
      </div>
      <label className="block text-xs text-slate-600">
        Before / After comparison
        <input
          type="range"
          aria-label="Before and after comparison"
          min="0"
          max="100"
          value={position}
          onChange={(e) => setPosition(+e.target.value)}
          className="block w-full mt-3 accent-emerald-600"
        />
      </label>
      <p className="text-xs text-slate-500">
        Comparison shows the initial processed result. Download includes your changes in the editor
        above.
      </p>
    </section>
  );
}
