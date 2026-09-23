"use client";
import React, { useEffect, useRef, useState } from "react";
import { MotionValue, motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, Command, Video, FileText, Layers, ShieldCheck, Play } from "lucide-react";

export interface MacbookScrollProps {
  src?: string;
  showGradient?: boolean;
  title?: string | React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const MacbookScroll: React.FC<MacbookScrollProps> = ({
  src,
  showGradient = true,
  title,
  badge,
  className = "",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const scaleX = useTransform(scrollYProgress, [0, 0.3], [1.2, isMobile ? 1 : 1.5]);
  const scaleY = useTransform(scrollYProgress, [0, 0.3], [0.6, isMobile ? 1 : 1.5]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, 1500]);
  const rotate = useTransform(scrollYProgress, [0.1, 0.12, 0.3], [-28, -28, 0]);
  const textTransform = useTransform(scrollYProgress, [0, 0.3], [0, 100]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div
      ref={ref}
      className={`min-h-[200vh] flex flex-col items-center py-0 md:py-20 justify-start flex-shrink-0 [perspective:800px] transform md:scale-100 scale-[0.42] sm:scale-[0.65] relative overflow-hidden bg-gradient-to-b from-[#FFF5F8] via-white to-white dark:from-[#090204] dark:via-[#0E0609] dark:to-[#0B0B0F] ${className}`}
    >
      {/* Title Header with Fade out on scroll */}
      <motion.div
        style={{
          translateY: textTransform,
          opacity: textOpacity,
        }}
        className="text-center px-4 max-w-4xl mx-auto mb-10 md:mb-16 pt-8 z-30"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-white/10 border border-[#FCE7EC] dark:border-white/15 text-xs font-bold text-[#E11D48] dark:text-[#FF4FA3] shadow-xs mb-4 backdrop-blur-md">
          <Sparkles className="size-3.5 text-[#E11D48]" />
          <span>Interactive 3D Studio Display</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-gray-950 dark:text-white tracking-tight leading-tight">
          {title || (
            <span>
              Erase Gemini, Veo & AI Watermarks in{" "}
              <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
                Seconds
              </span>
            </span>
          )}
        </h1>

        <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
          Scroll down to unfold the Macbook and inspect the 4K neural video & image studio.
        </p>
      </motion.div>

      {/* 3D Macbook Scroll Container */}
      <div className="relative">
        {/* Lid Screen */}
        <Lid
          src={src}
          scaleX={scaleX}
          scaleY={scaleY}
          rotate={rotate}
          translate={translate}
          showGradient={showGradient}
          badge={badge}
        />

        {/* Base Chassis & Keyboard */}
        <Base />
      </div>
    </div>
  );
};

export const Lid = ({
  scaleX,
  scaleY,
  rotate,
  translate,
  src,
  showGradient,
  badge,
}: {
  scaleX: MotionValue<number>;
  scaleY: MotionValue<number>;
  rotate: MotionValue<number>;
  translate: MotionValue<number>;
  src?: string;
  showGradient?: boolean;
  badge?: React.ReactNode;
}) => {
  return (
    <div className="relative [perspective:800px]">
      <div
        style={{
          transform: "perspective(800px) rotateX(-25deg) translateZ(0px)",
          transformOrigin: "bottom",
          transformStyle: "preserve-3d",
        }}
        className="h-[12rem] w-[32rem] bg-[#010101] p-1 relative"
      >
        <div
          style={{
            boxShadow: "0px 2px 0px 2px #272729 inset",
          }}
          className="h-full w-full bg-[#050505] rounded-t-2xl flex flex-col items-center justify-center relative overflow-hidden"
        >
          {badge && <div className="absolute top-4 left-4 z-40">{badge}</div>}
        </div>
      </div>

      <motion.div
        style={{
          scaleX: scaleX,
          scaleY: scaleY,
          rotateX: rotate,
          translateY: translate,
          transformStyle: "preserve-3d",
          transformOrigin: "bottom",
        }}
        className="h-96 w-[32rem] bg-[#010101] p-2 absolute inset-0 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.5)] border border-gray-800"
      >
        <div className="h-full w-full bg-[#050505] rounded-xl flex flex-col items-center justify-center relative overflow-hidden border border-gray-900">
          {/* Top Notch Camera */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/80 border border-white/10 z-40 shadow-sm">
            <span className="size-1.5 rounded-full bg-[#1e88e5]" />
            <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Screen Content Preview */}
          {src ? (
            <img
              src={src}
              alt="PixelRefine AI Neural Studio Preview"
              className="size-full object-cover object-center"
            />
          ) : (
            <div className="size-full bg-gradient-to-br from-[#18090E] via-[#0D0407] to-[#050203] flex flex-col justify-between p-5 text-white relative">
              {/* Studio Mockup Interface */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-lg bg-[#E11D48] flex items-center justify-center text-white font-bold text-xs">
                    ✦
                  </div>
                  <span className="font-bold text-xs text-white">PixelRefine Studio v2.6</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Neural GPU 60 FPS</span>
                </div>
              </div>

              {/* Central Visual Showcase */}
              <div className="grid grid-cols-2 gap-3 my-auto">
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 aspect-[16/10] group">
                  <img src="/creative-suite/watermark_remover_city.jpg" alt="Before watermark" className="size-full object-cover" />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-black/80 text-white border border-white/10">
                    BEFORE (Marked)
                  </span>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-[#E11D48]/50 bg-black/60 aspect-[16/10] shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                  <img src="/creative-suite/upscaler_macro_8k.jpg" alt="After clean 4K" className="size-full object-cover" />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-[#E11D48] text-white">
                    AFTER (100% Clean)
                  </span>
                </div>
              </div>

              {/* Bottom status bar */}
              <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-white/10 pt-2 font-mono">
                <span>Optical Flow: Lock Synchronized</span>
                <span className="text-[#FF4FA3]">Temporal Recovery: 99.8%</span>
              </div>
            </div>
          )}

          {showGradient && (
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const Base = () => {
  return (
    <div className="h-[14rem] w-[32rem] bg-gradient-to-b from-[#272729] to-[#121214] rounded-2xl relative shadow-[0_30px_70px_rgba(0,0,0,0.8)] border border-[#3A3A3D] p-3 flex flex-col justify-between">
      {/* Speaker grills on sides */}
      <div className="absolute left-2 top-8 bottom-8 w-2 flex flex-col justify-between opacity-30">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="h-0.5 w-full bg-white rounded-full" />
        ))}
      </div>
      <div className="absolute right-2 top-8 bottom-8 w-2 flex flex-col justify-between opacity-30">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="h-0.5 w-full bg-white rounded-full" />
        ))}
      </div>

      {/* Keyboard Grid Plate */}
      <div className="mx-auto w-[27rem] h-[7.5rem] bg-[#0E0E10] rounded-xl p-1.5 border border-white/5 flex flex-col justify-between shadow-inner">
        {/* Row 1: Function Keys */}
        <div className="flex gap-1 justify-between">
          <Key label="esc" className="w-6" />
          {Array.from({ length: 12 }).map((_, i) => (
            <Key key={i} label={`F${i + 1}`} className="w-4.5" />
          ))}
          <Key label="⌽" className="w-6" />
        </div>

        {/* Row 2: Numbers */}
        <div className="flex gap-1 justify-between">
          <Key label="~" className="w-5" />
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="].map((k) => (
            <Key key={k} label={k} className="w-5" />
          ))}
          <Key label="delete" className="w-8" />
        </div>

        {/* Row 3: QWERTY */}
        <div className="flex gap-1 justify-between">
          <Key label="tab" className="w-7" />
          {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"].map((k) => (
            <Key key={k} label={k} className="w-5" />
          ))}
          <Key label="\\" className="w-6" />
        </div>

        {/* Row 4: ASDF */}
        <div className="flex gap-1 justify-between">
          <Key label="caps" className="w-8" />
          {["A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'"].map((k) => (
            <Key key={k} label={k} className="w-5" />
          ))}
          <Key label="return" className="w-9" />
        </div>

        {/* Row 5: ZXCV */}
        <div className="flex gap-1 justify-between">
          <Key label="shift" className="w-10" />
          {["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"].map((k) => (
            <Key key={k} label={k} className="w-5" />
          ))}
          <Key label="shift" className="w-10" />
        </div>

        {/* Row 6: Spacebar */}
        <div className="flex gap-1 justify-between items-center">
          <Key label="fn" className="w-5" />
          <Key label="control" className="w-6" />
          <Key label="option" className="w-6" />
          <Key label="command" className="w-7" />
          <Key label="" className="flex-1 bg-[#1A1A1E]" />
          <Key label="command" className="w-7" />
          <Key label="option" className="w-6" />
          <div className="flex gap-0.5">
            <Key label="◀" className="w-4 h-2.5" />
            <div className="flex flex-col gap-0.5">
              <Key label="▲" className="w-4 h-1" />
              <Key label="▼" className="w-4 h-1" />
            </div>
            <Key label="▶" className="w-4 h-2.5" />
          </div>
        </div>
      </div>

      {/* Glass Trackpad */}
      <div className="mx-auto w-32 h-14 bg-[#18181B] rounded-xl border border-white/5 shadow-inner mt-1" />

      {/* Thumb Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-[#121214] rounded-b-md border-b border-white/10" />
    </div>
  );
};

const Key = ({ label, className = "" }: { label: string; className?: string }) => {
  return (
    <div
      className={`h-2.5 bg-[#1C1C20] rounded-[2px] border-b border-black text-[6px] font-mono text-gray-400 flex items-center justify-center select-none shadow-xs ${className}`}
    >
      {label}
    </div>
  );
};
