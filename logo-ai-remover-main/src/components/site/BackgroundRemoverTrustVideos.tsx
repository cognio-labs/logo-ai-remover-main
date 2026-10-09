import React, { useRef, useState } from "react";
import {
  ShieldCheck,
  Upload,
  ArrowRight,
  Check,
  Play,
  Pause,
  ShoppingBag,
  UserCheck,
  Sparkles,
} from "lucide-react";

export interface PortraitTrustVideo {
  id: string;
  category: string;
  title: string;
  badge: string;
  goal: string;
  prompt: string;
  description: string;
  videoSrc: string;
  poster?: string;
  sampleCutout: string;
  icon: React.ElementType;
  highlights: string[];
}

export const PORTRAIT_TRUST_VIDEOS: PortraitTrustVideo[] = [
  {
    id: "perfume",
    category: "PRODUCTS & GLASS TRANSPARENCY",
    title: "Luxury Product & Glass Refraction",
    badge: "100% Clean Cutout · No Jagged Edges",
    goal: "Isolate complex transparent glass bottles and refraction while completely erasing background clutter.",
    prompt:
      "A vertical macro shot of a luxury glass perfume bottle on a wooden table with floral background. An AI laser scan wipes away the dark wood and flower petals, revealing a crisp checkerboard transparency with glass refractions preserved.",
    description:
      "Isolates transparent glass bottles, amber perfume liquid, and fine metal nozzle details while completely erasing cluttered floral backdrops.",
    videoSrc: "/videos/trust-perfume-portrait.mp4",
    poster: "/videos/perfume_poster.jpg",
    sampleCutout: "/upscale/new_product_cutout.png",
    icon: ShoppingBag,
    highlights: [
      "Sub-pixel transparent glass edge matting",
      "Liquid refraction & amber reflections preserved",
      "Cluttered wooden table & floral background erased",
    ],
  },
  {
    id: "pets",
    category: "PETS & COMPLEX TEXTURES",
    title: "Fluffy Puppy & Kitten Whisker Matting",
    badge: "Soft Fur & Whiskers Preserved",
    goal: "Preserve ultra-fine animal fur strands, soft whiskers, and outdoor garden separation without jagged halos.",
    prompt:
      "A close-up portrait of an adorable fluffy golden retriever puppy and a white kitten sitting together in a flower garden. The background of tulips, grass and trees smoothly wipes to a transparent cutout with individual hair strands preserved.",
    description:
      "Cleans dense outdoor flower gardens, leaves, and green grass, isolating individual golden fur strands and delicate white kitten whiskers.",
    videoSrc: "/videos/trust-pets-portrait.mp4",
    poster: "/videos/pets_poster.jpg",
    sampleCutout: "/upscale/new_wildlife_cutout.png",
    icon: Sparkles,
    highlights: [
      "Sub-pixel fur alpha matting on soft golden retriever coat",
      "Delicate kitten whiskers & ear tufts 100% intact",
      "Tulip flowers, dirt & garden backdrop wiped cleanly",
    ],
  },
  {
    id: "model",
    category: "PORTRAITS & STREET SCENE",
    title: "Fashion Model & Bustling Cafe Street",
    badge: "Crowd & Street Erased · 0 Hair Loss",
    goal: "Erase bustling urban cafe street and crowd while preserving individual hair strands and natural lighting.",
    prompt:
      "A close-up eye-level street portrait of a fashion model smiling in front of a busy Parisian cafe. An interactive comparison slider reveals a clean transparent background with zero hair loss and razor-sharp edge retention.",
    description:
      "Removes pedestrians, Parisian cafe crowds, and cobblestone buildings while keeping the model's smile, outfit, and fine hair strands intact.",
    videoSrc: "/videos/trust-model-portrait.mp4",
    poster: "/videos/model_poster.jpg",
    sampleCutout: "/upscale/new_portrait_cutout.png",
    icon: UserCheck,
    highlights: [
      "Individual wavy hair strands cleanly isolated",
      "Full crowd, tables, awning & building facade erased",
      "Natural skin tone & authentic fabric edges preserved",
    ],
  },
];

export function BackgroundRemoverTrustVideos({
  onUploadClick,
}: {
  onUploadClick?: () => void;
}) {
  const [playingStates, setPlayingStates] = useState<Record<string, boolean>>({
    perfume: true,
    pets: true,
    model: true,
  });

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const toggleVideoPlay = (id: string) => {
    const v = videoRefs.current[id];
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlayingStates((prev) => ({ ...prev, [id]: true }));
    } else {
      v.pause();
      setPlayingStates((prev) => ({ ...prev, [id]: false }));
    }
  };



  const handleCtaClick = () => {
    if (onUploadClick) {
      onUploadClick();
      return;
    }
    const target = document.getElementById("upload-studio-section");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <section
      id="trust-showcase-section"
      className="relative py-20 sm:py-28 bg-white border-y border-gray-100 text-gray-900 overflow-hidden selection:bg-[#FFE4E9] selection:text-[#E11D48]"
    >
      {/* Background Soft Ambient Light */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#FFF5F8] to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] text-xs font-semibold tracking-wider text-[#E11D48] uppercase mb-4 shadow-2xs">
            <ShieldCheck className="size-4 text-[#E11D48]" />
            <span>REAL-TIME AI MATTING PROOF · LIVE VIDEO SHOWCASE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-gray-950 leading-tight">
            Watch Bellix AI Matting{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent font-medium">
              in Real-Time 60 FPS
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed font-normal max-w-2xl mx-auto">
            Zero mockups. Zero pen tool clipping. Watch actual AI background removal transform
            luxury glass perfume bottles, fluffy pets & animals, and high-detail fashion portraits in vertical portrait format.
          </p>
        </div>

        {/* 3 VIDEO CARDS IN ONE HORIZONTAL ROW (PORTRAIT LAYOUT) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto items-stretch">
          {PORTRAIT_TRUST_VIDEOS.map((item) => {
            const Icon = item.icon;
            const isPlaying = playingStates[item.id] !== false;

            return (
              <div
                key={item.id}
                className="rounded-3xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:border-rose-300 transition-all duration-300 flex flex-col justify-between group max-w-sm sm:max-w-md mx-auto md:max-w-none w-full"
              >
                <div>
                  {/* PORTRAIT VIDEO FRAME (9:16 VERTICAL ASPECT RATIO) */}
                  <div
                    onClick={() => toggleVideoPlay(item.id)}
                    className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-slate-950 border border-gray-200/80 shadow-inner group/video cursor-pointer select-none"
                  >
                    <video
                      ref={(el) => {
                        videoRefs.current[item.id] = el;
                      }}
                      src={item.videoSrc}
                      poster={item.poster}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="size-full object-cover"
                    />

                    {/* Top Overlay Badges */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 text-white text-[10px] font-semibold tracking-wider backdrop-blur-md border border-white/10 shadow-xs">
                        <span className="size-1.5 rounded-full bg-[#E11D48] animate-pulse" />
                        <span>{item.category}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-[#E11D48] text-white text-[9px] font-bold tracking-wider uppercase shadow-xs">
                        9:16 HD
                      </span>
                    </div>

                    {/* Center Play/Pause Overlay Indicator on Hover */}
                    <div className="absolute inset-0 size-full flex items-center justify-center bg-black/20 opacity-0 group-hover/video:opacity-100 transition-opacity">
                      <span className="size-12 rounded-full bg-black/75 hover:bg-[#E11D48] text-white flex items-center justify-center transition-all shadow-xl backdrop-blur-md border border-white/20">
                        {isPlaying ? (
                          <Pause className="size-5" />
                        ) : (
                          <Play className="size-5 ml-0.5" />
                        )}
                      </span>
                    </div>

                    {/* Bottom Split Slider Label */}
                    <div className="absolute bottom-3 inset-x-3 pointer-events-none z-10 flex items-center justify-between text-[10px] text-white/90">
                      <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                        Original
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-600/90 text-white font-semibold backdrop-blur-md border border-white/15">
                        Clean Cutout
                      </span>
                    </div>
                  </div>

                  {/* CARD DETAILS BELOW VIDEO */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 rounded-md bg-[#FFF1F4] text-[#E11D48]">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="text-[11px] font-semibold text-[#E11D48] tracking-wider uppercase">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-semibold text-gray-950 tracking-tight">
                      {item.title}
                    </h3>

                    <p className="text-xs text-gray-600 leading-relaxed font-normal">
                      {item.description}
                    </p>

                    {/* Key Highlights Bullets */}
                    <ul className="pt-2 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                      {item.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check className="size-3.5 text-[#E11D48] shrink-0 mt-0.5" />
                          <span className="font-normal leading-snug">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* BOTTOM CTA BUTTON - ONLY UPLOAD */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCtaClick}
                    className="w-full py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] hover:from-[#BE123C] hover:to-[#E11D48] text-white text-xs sm:text-sm font-semibold shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/35 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-101 active:scale-99"
                  >
                    <Upload className="size-4" />
                    <span>Upload Your Image</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM GUARANTEE & PROOF SEAL */}
        <div className="mt-14 sm:mt-18 pt-10 border-t border-gray-200/90 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white flex items-center justify-center shadow-md shadow-rose-950/15 shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-950 tracking-tight">
                Authentic AI Output Guarantee
              </h4>
              <p className="text-xs text-gray-600 mt-0.5 font-normal">
                Every video demonstrates genuine sub-pixel neural segmentation with zero post-retouching.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCtaClick}
            className="group inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gray-950 hover:bg-black text-white text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer hover:scale-102"
          >
            <span>Upload Your Image Now</span>
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform text-[#E11D48]" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default BackgroundRemoverTrustVideos;
