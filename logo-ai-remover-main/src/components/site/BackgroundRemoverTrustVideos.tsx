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
      v.play().catch(() => { });
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
      className="relative py-20 sm:py-24 bg-white border-y-[3px] border-[#0b0f0d] text-[#0b0f0d] overflow-hidden font-sans"
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER SECTION */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black tracking-wider text-[#0b0f0d] uppercase mb-4 shadow-[3px_3px_0px_#0b0f0d] font-mono">
            <ShieldCheck className="size-4 text-[#0b0f0d]" />
            <span>Real-Time Neural Matting Showcase</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0b0f0d] leading-tight">
            Tested on Glass, Fur &amp; Street Portraits
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#26302b] leading-relaxed font-medium max-w-2xl mx-auto">
            Zero mockups. Zero pen tool clipping. Watch actual AI background removal transform
            luxury glass perfume bottles, fluffy pets &amp; animals, and high-detail fashion portraits in vertical portrait format.
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
                className="rounded-xl border-[2.5px] border-[#0b0f0d] bg-[#f7f5ee] p-5 sm:p-6 shadow-[6px_6px_0px_#0b0f0d] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0px_#0b0f0d] transition-all duration-150 flex flex-col justify-between group max-w-sm sm:max-w-md mx-auto md:max-w-none w-full"
              >
                <div>
                  {/* PORTRAIT VIDEO FRAME (9:16 VERTICAL ASPECT RATIO) */}
                  <div
                    onClick={() => toggleVideoPlay(item.id)}
                    className="relative aspect-[9/16] w-full rounded-lg overflow-hidden bg-[#0b0f0d] border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] group/video cursor-pointer select-none"
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
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none z-10">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#ffe500] text-[#0b0f0d] text-[10px] font-black tracking-wider border-2 border-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]">
                        <span>{item.category}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded bg-[#d0f471] text-[#0b0f0d] border-2 border-[#0b0f0d] text-[9px] font-black tracking-wider uppercase shrink-0">
                        9:16 HD
                      </span>
                    </div>

                    {/* Center Play/Pause Overlay Indicator on Hover */}
                    <div className="absolute inset-0 size-full flex items-center justify-center bg-black/20 opacity-0 group-hover/video:opacity-100 transition-opacity">
                      <span className="size-12 rounded-lg bg-[#d0f471] text-[#0b0f0d] flex items-center justify-center transition-all border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
                        {isPlaying ? (
                          <Pause className="size-5" />
                        ) : (
                          <Play className="size-5 ml-0.5" />
                        )}
                      </span>
                    </div>

                    {/* Bottom Split Slider Label */}
                    <div className="absolute bottom-3 inset-x-3 pointer-events-none z-10 flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-black text-white font-bold border border-white/40">
                        Original
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#d0f471] text-[#0b0f0d] font-black border-2 border-[#0b0f0d]">
                        Clean Cutout
                      </span>
                    </div>
                  </div>

                  {/* CARD DETAILS BELOW VIDEO */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d]">
                        <Icon className="size-3.5 stroke-[2.5]" />
                      </span>
                      <span className="text-[11px] font-black text-[#0b0f0d] tracking-wider uppercase font-mono">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-[#0b0f0d] tracking-tight">
                      {item.title}
                    </h3>

                    <p className="text-sm text-[#26302b] leading-relaxed font-medium">
                      {item.description}
                    </p>

                    {/* Key Highlights Bullets */}
                    <ul className="pt-2.5 border-t-2 border-[#0b0f0d] space-y-1.5 text-xs text-[#0b0f0d] font-semibold">
                      {item.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2">
                          <Check className="size-4 text-[#0b0f0d] stroke-[2.5] shrink-0 mt-0.5" />
                          <span className="leading-snug">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* BOTTOM CTA BUTTON - ONLY UPLOAD */}
                <div className="mt-4 pt-3 border-t-2 border-[#0b0f0d]">
                  <button
                    type="button"
                    onClick={handleCtaClick}
                    className="w-full py-3 rounded-lg bg-[#d0f471] hover:bg-[#ffe500] text-[#0b0f0d] text-xs sm:text-sm font-black border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#0b0f0d] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="size-4 stroke-[2.5]" />
                    <span>Upload Your Image</span>
                    <ArrowRight className="size-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM GUARANTEE & PROOF SEAL */}
        <div className="mt-12 sm:mt-16 p-6 rounded-xl border-[2.5px] border-[#0b0f0d] bg-[#ffe500] shadow-[5px_5px_0px_#0b0f0d] flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-lg bg-white border-2 border-[#0b0f0d] text-[#0b0f0d] flex items-center justify-center shadow-[3px_3px_0px_#0b0f0d] shrink-0">
              <ShieldCheck className="size-6 stroke-[2.4]" />
            </div>
            <div>
              <h4 className="text-base font-black text-[#0b0f0d] tracking-tight">
                Authentic AI Output Guarantee
              </h4>
              <p className="text-xs sm:text-sm text-[#0b0f0d] mt-0.5 font-semibold">
                Every video demonstrates genuine sub-pixel neural segmentation with zero post-retouching.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCtaClick}
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white hover:bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d] text-xs sm:text-sm font-black shadow-[3px_3px_0px_#0b0f0d] transition-all cursor-pointer shrink-0"
          >
            <span>Upload Your Image Now</span>
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform text-[#0b0f0d] stroke-[2.5]" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default BackgroundRemoverTrustVideos;
