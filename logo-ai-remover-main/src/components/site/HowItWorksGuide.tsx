"use client";

import Image from "next/image";
import { Check, Download, MousePointer2, Play, Sparkles, Upload, Video, Folder, HardDrive, Image as ImageIcon, Laptop } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GuideVisual, HowItWorksGuideData } from "@/data/howItWorksGuides";
import { VideoCompareSlider } from "./VideoCompareSlider";
import "./how-it-works-guide.css";

const IMAGE_PICKER_ITEMS = [
  { name: "portrait_model.jpg", src: "/guide/thumb_portrait.webp", size: "2.8 MB" },
  { name: "luxury_perfume.png", src: "/guide/thumb_perfume.webp", size: "1.4 MB" },
  { name: "golden_pet.jpg", src: "/guide/thumb_pets.webp", size: "3.1 MB" },
  { name: "fashion_sneaker.png", src: "/guide/thumb_sneaker.webp", size: "1.9 MB" },
  { name: "sports_car.jpg", src: "/guide/thumb_car.webp", size: "4.2 MB" },
  { name: "studio_model.jpg", src: "/guide/thumb_fashion.webp", size: "2.5 MB" },
];

const GEMINI_IMAGE_PICKER_ITEMS = [
  { name: "cyberpunk_neon_samurai.webp", src: "/guide/gemini_thumb_cyberpunk.webp", size: "3.2 MB" },
  { name: "celestial_dragon_art.webp", src: "/guide/gemini_thumb_dragon.webp", size: "2.4 MB" },
  { name: "ethereal_crystal_goddess.webp", src: "/guide/gemini_thumb_goddess.webp", size: "2.8 MB" },
  { name: "cosmic_astronaut_crystals.webp", src: "/guide/gemini_thumb_astronaut.webp", size: "4.1 MB" },
  { name: "luxury_hypercar_coastal.webp", src: "/guide/gemini_thumb_hypercar.webp", size: "3.7 MB" },
  { name: "macro_jewelry_diamond.webp", src: "/guide/gemini_thumb_diamond.webp", size: "1.9 MB" },
];

const VIDEO_PICKER_ITEMS = [
  { name: "veo_motion_01.mp4", src: "/guide/thumb_video_1.webp", duration: "00:15" },
  { name: "gemini_clip_02.mp4", src: "/guide/thumb_video_2.webp", duration: "00:30" },
  { name: "veo_pets_03.mp4", src: "/guide/thumb_video_3.webp", duration: "00:12" },
  { name: "gemini_stage_04.mp4", src: "/guide/thumb_video_4.webp", duration: "00:24" },
  { name: "veo_sports_05.mp4", src: "/guide/thumb_video_5.webp", duration: "00:18" },
  { name: "gemini_dark_06.mp4", src: "/guide/thumb_video_6.webp", duration: "00:45" },
];

function GuideArtwork({ visual }: { visual: GuideVisual }) {
  const isVideo = visual.startsWith("video");
  const isGeminiImage = visual.startsWith("gemini-image") || visual === "sparkle-result";
  const isPicker = visual.endsWith("picker");
  const isResult = visual.endsWith("result");
  const isBgRemover = visual === "background-result";
  const isSparkle = visual === "sparkle-result";
  const sparkle = isSparkle || visual === "video-result";

  // Interactive slider position for before/after comparison
  const [sliderPos, setSliderPos] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = Math.round((x / rect.width) * 100);
    setSliderPos(pct);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!frameRef.current || !e.touches[0]) return;
    const rect = frameRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.touches[0].clientX - rect.left));
    const pct = Math.round((x / rect.width) * 100);
    setSliderPos(pct);
  };

  // STEP 2: Realistic File Picker Dialog with real photo thumbnails
  if (isPicker) {
    const items = isVideo ? VIDEO_PICKER_ITEMS : isGeminiImage ? GEMINI_IMAGE_PICKER_ITEMS : IMAGE_PICKER_ITEMS;
    const selectedIndex = isGeminiImage ? 0 : 3;
    const selectedItem = items[selectedIndex];
    const windowTitle = isVideo ? "Videos > Camera Roll" : isGeminiImage ? "Pictures > Gemini AI Creations" : "Pictures > Camera Roll";
    const activeFolder = isVideo ? "Videos" : isGeminiImage ? "Gemini AI" : "Pictures";

    return (
      <div className="guide-art guide-picker-art" role="img" aria-label="File picker illustration with real photos">
        <div className="guide-window-bar">
          <div className="guide-window-dots">
            <i className="dot-red" />
            <i className="dot-yellow" />
            <i className="dot-green" />
          </div>
          <span className="guide-window-title">{windowTitle}</span>
        </div>
        <div className="guide-picker-body">
          <div className="guide-folder-list">
            <b>Favorites</b>
            <span className="is-active">
              <ImageIcon className="folder-icon" aria-hidden="true" /> {activeFolder}
            </span>
            <span>
              <HardDrive className="folder-icon" aria-hidden="true" /> Downloads
            </span>
            <span>
              <Laptop className="folder-icon" aria-hidden="true" /> Desktop
            </span>
          </div>
          <div className="guide-thumb-grid">
            {items.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div className={`guide-file-thumb ${isSelected ? "is-selected" : ""}`} key={item.name}>
                  <div className="guide-file-thumb-media">
                    <img
                      src={item.src}
                      alt={item.name}
                      className="guide-file-thumb-img"
                      loading="lazy"
                    />
                    {isVideo && (
                      <span className="guide-file-thumb-play">
                        <Play aria-hidden="true" />
                      </span>
                    )}
                    {isSelected && (
                      <span className="guide-file-thumb-check" aria-label="Selected file">
                        <Check aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <span className="guide-file-thumb-name" title={item.name}>
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="guide-picker-footer">
          <span className="guide-picker-status">
            1 file selected: <b>{selectedItem.name}</b>
          </span>
          <span className="guide-faux-button">Open</span>
        </div>
        <span className="guide-cursor guide-cursor-click">
          <MousePointer2 aria-hidden="true" />
        </span>
      </div>
    );
  }

  // STEP 3: Real Before/After Result Comparison with interactive slider
  if (isResult) {
    if (visual === "video-result") {
      return (
        <div className="guide-art guide-result-art has-sparkle" role="img" aria-label="Before and after video cleanup result with real synchronized playback">
          <div className="guide-mini-progress"><span /></div>
          <div className="guide-result-frame is-video-frame">
            <VideoCompareSlider
              beforeSrc="/gemini-example-before.mp4"
              afterSrc="/gemini-example-after.mp4"
              beforeLabel="BEFORE (WATERMARKED)"
              afterLabel="AFTER (CLEAN)"
              aspectRatio="aspect-video"
              defaultFit="cover"
              autoPlay={true}
              loop={true}
              className="size-full rounded-[1.1rem] !border-0 !shadow-none"
            />
          </div>
          <div className="guide-result-footer">
            <span className="guide-result-meta">1080p · 60 FPS Clean MP4</span>
            <span className="guide-download-button">
              <Download aria-hidden="true" />
              Download Clean MP4
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className={`guide-art guide-result-art ${sparkle ? "has-sparkle" : ""}`} role="img" aria-label="Before and after result illustration with real images">
        <div
          ref={frameRef}
          className="guide-result-frame is-interactive"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          title="Drag to compare before and after"
        >
          {/* Base Layer: After Scene (Cutout over Checkerboard OR Clean AI Art) */}
          <div className="guide-scene guide-after-scene">
            <span className="guide-mini-label guide-label-after">After</span>
            {isBgRemover ? (
              <img
                src="/guide/bg_after_portrait.webp"
                alt="Clean cutout with transparent background"
                className="guide-scene-img"
                loading="eager"
              />
            ) : isSparkle ? (
              <img
                src="/guide/gemini_sparkle_after.webp"
                alt="Clean AI artwork without Gemini watermark"
                className="guide-scene-img"
                loading="eager"
              />
            ) : (
              <img
                src="/hero-after-clean.png"
                alt="Cleaned image without watermark"
                className="guide-scene-img"
                loading="eager"
              />
            )}
          </div>

          {/* Top Layer: Before Scene (Original with Background or Corner Watermark, clipped to slider position) */}
          <div
            className="guide-scene guide-before-scene"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <span className="guide-mini-label guide-label-before">Before</span>
            {isBgRemover ? (
              <img
                src="/guide/bg_before_portrait.webp"
                alt="Original photo with background"
                className="guide-scene-img"
                loading="eager"
              />
            ) : isSparkle ? (
              <img
                src="/guide/gemini_sparkle_before.webp"
                alt="Original AI artwork with Gemini watermark"
                className="guide-scene-img"
                loading="eager"
              />
            ) : (
              <img
                src="/hero-before-gemini.png"
                alt="Original image with watermark"
                className="guide-scene-img"
                loading="eager"
              />
            )}
            {isSparkle && (
              <div className="guide-target-box" aria-hidden="true">
                <div className="guide-target-tag">
                  <Sparkles className="size-2.5" />
                  <span>Watermark Target</span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Split Slider Line & Handle */}
          <span className="guide-compare-handle" style={{ left: `${sliderPos}%` }}>
            <span aria-hidden="true">↔</span>
          </span>
        </div>

        <div className="guide-result-footer">
          <span className="guide-result-meta">
            {isBgRemover ? "32-Bit RGBA · True Alpha PNG" : "Original Resolution Preserved"}
          </span>
          <span className="guide-download-button">
            <Download aria-hidden="true" />
            Download PNG
          </span>
        </div>
      </div>
    );
  }

  // STEP 1: Upload Drop Area with real photo card animation
  return (
    <div className="guide-art guide-upload-art" role="img" aria-label="Upload card illustration">
      <div className="guide-corner guide-corner-a" /><div className="guide-corner guide-corner-b" />
      <div className="guide-corner guide-corner-c" /><div className="guide-corner guide-corner-d" />
      <span className="guide-upload-icon">{isVideo ? <Video aria-hidden="true" /> : <Upload aria-hidden="true" />}</span>
      <p>{isVideo ? "Drop a Gemini or Veo video" : isGeminiImage ? "Drop your Gemini AI image" : "Drop your image here"}</p>
      <small><kbd>Ctrl+V</kbd> / <kbd>Cmd+V</kbd></small>
      <div className="guide-upload-actions">
        <span className="guide-faux-button">{isVideo ? "Browse Video" : "Choose image"}</span>
        {(isVideo || isGeminiImage) && <span className="guide-faux-button is-secondary">Paste</span>}
      </div>
      <em>{isVideo ? "MP4, MOV, WebM or MKV · up to 500 MB" : isGeminiImage ? "PNG, JPG, WebP and AVIF · Batch processing" : "PNG, JPG, WebP and AVIF supported"}</em>
      <div className="guide-dropping-file-card" aria-hidden="true">
        <img
          src={isVideo ? "/guide/thumb_video_1.webp" : isGeminiImage ? "/guide/gemini_thumb_upload.webp" : "/guide/thumb_portrait.webp"}
          alt="File preview being dropped"
          className="guide-dropping-thumb"
        />
        <span className="guide-dropping-badge">{isVideo ? "MP4" : isGeminiImage ? "WEBP" : "PNG"}</span>
      </div>
    </div>
  );
}

function GuideVisual({ step }: { step: HowItWorksGuideData["steps"][number] }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  return (
    <figure className={`guide-visual ${imageReady && !imageFailed ? "has-guide-image" : ""}`}>
      {Boolean(step.imageOverride) && !imageFailed && (
        <Image
          src={step.imageOverride}
          alt={step.imageAlt}
          fill
          sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1200px) 46vw, 540px"
          className="guide-override-image"
          onLoad={() => setImageReady(true)}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className="guide-code-art"><GuideArtwork visual={step.visual} /></div>
    </figure>
  );
}

export function HowItWorksGuide({ guide }: { guide: HowItWorksGuideData }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      section?.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        section.classList.add("is-visible");
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const focusUpload = () => {
    const target = document.getElementById(guide.uploadTargetId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      target.focus({ preventScroll: true });
      target.classList.remove("guide-upload-attention");
      void target.offsetWidth;
      target.classList.add("guide-upload-attention");
    }, 450);
  };

  const howToJson = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: guide.howToName,
    step: guide.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.text,
    })),
  };

  return (
    <section id="how-it-works" ref={sectionRef} className="how-it-works-guide" aria-labelledby={`${guide.id}-heading`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJson) }} />
      <div className="how-it-works-guide__inner">
        <div className="guide-heading">
          <p>{guide.label}</p>
          <h2 id={`${guide.id}-heading`}>{guide.heading}</h2>
          <span>{guide.subheading}</span>
        </div>

        <ol className="guide-steps">
          {guide.steps.map((step, index) => (
            <li className="guide-step" key={step.title}>
              <div className="guide-step-copy">
                <span className="guide-step-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>

              <GuideVisual step={step} />
            </li>
          ))}
        </ol>

        <div className="guide-tips">
          <strong>
            <Sparkles aria-hidden="true" /> Quick tips
          </strong>
          <ul>
            {guide.tips.map((tip) => (
              <li key={tip}>
                <Check aria-hidden="true" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          {guide.note && <p className="guide-note">{guide.note}</p>}
        </div>

        <div className="guide-cta-wrap">
          <button type="button" onClick={focusUpload}>
            {guide.ctaLabel} ↑
          </button>
        </div>
      </div>
    </section>
  );
}
