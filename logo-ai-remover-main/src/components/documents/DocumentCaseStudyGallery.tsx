import React from "react";
import {
  DOCUMENT_CASE_STUDIES,
  type DocumentCaseStudy,
} from "./documentCaseStudiesData";
import { DocumentCaseStudySlider } from "./DocumentCaseStudySlider";
import {
  ShieldCheck,
  Layers,
  FileCheck,
  Zap,
  Check,
  Sparkles,
  ArrowRight,
  FileText,
} from "lucide-react";

export function DocumentCaseStudyGallery({
  onSelectSample,
}: {
  onSelectSample?: (presetId: string) => void;
}) {
  const getBadgeIcon = (iconType: string) => {
    switch (iconType) {
      case "shield":
        return <ShieldCheck className="size-3 text-emerald-600" />;
      case "vector":
        return <Layers className="size-3 text-blue-600" />;
      case "ocr":
        return <FileCheck className="size-3 text-purple-600" />;
      case "speed":
        return <Zap className="size-3 text-amber-500" />;
      default:
        return <ShieldCheck className="size-3 text-rose-500" />;
    }
  };

  return (
    <section
      id="proven-results-section"
      className="py-20 sm:py-28 bg-white border-t border-gray-100/90 text-gray-900 overflow-hidden selection:bg-[#FFE4E9] selection:text-[#E11D48]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* SECTION HEADER */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFF1F4] border border-[#FCE7EC] text-xs font-semibold tracking-wider text-[#E11D48] uppercase mb-4 shadow-2xs">
            <Sparkles className="size-3.5 text-[#E11D48]" />
            <span>PROVEN RESULTS ACROSS REAL DOCUMENTS</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-normal tracking-tight text-gray-950 leading-tight">
            See 8 Real-World PDF &amp; Document{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent font-medium">
              Restorations
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed font-normal max-w-2xl mx-auto">
            Drag the interactive Before &amp; After sliders to inspect high-definition vector text
            preservation, stamp erasure, and zero OCR degradation across 8 distinct document types.
          </p>
        </div>

        {/* 2-COLUMN RESPONSIVE GRID (DESKTOP) / 1-COLUMN (MOBILE) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {DOCUMENT_CASE_STUDIES.map((study: DocumentCaseStudy) => (
            <div
              key={study.id}
              className="bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-7 shadow-lg shadow-gray-200/40 hover:shadow-2xl hover:border-rose-300 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Top Header: Badge, Category & Case Study Counter */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#E11D48] border border-rose-100 text-xs font-semibold tracking-wide">
                      <FileText className="size-3.5 text-[#E11D48]" />
                      <span>{study.badge}</span>
                    </span>
                    <span className="text-[11px] font-medium text-gray-400 hidden sm:inline">
                      {study.category}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-gray-400 font-mono tracking-wider">
                    CASE STUDY {study.number}
                  </span>
                </div>

                {/* Title & Problem Statement */}
                <h3 className="text-lg sm:text-xl font-bold text-gray-950 tracking-tight mb-1.5">
                  {study.title}
                </h3>
                <p className="text-xs sm:text-sm font-medium text-[#E11D48] mb-4 leading-snug">
                  "{study.problemSummary}"
                </p>

                {/* INTERACTIVE BEFORE/AFTER COMPARISON SLIDER */}
                <div className="mb-4">
                  <DocumentCaseStudySlider
                    title={study.title}
                    beforeUrl={study.beforeUrl}
                    afterUrl={study.afterUrl}
                    fallbackBeforeJpg={study.fallbackBeforeJpg}
                    fallbackAfterJpg={study.fallbackAfterJpg}
                    watermarkText={study.watermarkText}
                  />
                </div>

                {/* 4 PROFESSIONAL TRUST BADGES BELOW SLIDER */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-4">
                  {study.trustBadges.map((badge, bIdx) => (
                    <div
                      key={bIdx}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-50 border border-gray-200/70 text-[11px] font-medium text-gray-700 shadow-2xs"
                    >
                      {getBadgeIcon(badge.icon)}
                      <span className="truncate">{badge.label}</span>
                    </div>
                  ))}
                </div>

                {/* Detailed Description */}
                <p className="text-xs text-gray-600 leading-relaxed font-normal mb-4">
                  {study.description}
                </p>

                {/* Removed Elements Checklist */}
                <div className="mb-5 space-y-1.5 pt-3 border-t border-gray-100">
                  <span className="text-[11px] font-bold text-gray-900 uppercase tracking-wider block">
                    Removed Artifacts:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-700">
                    {study.removedElements.map((rem, rIdx) => (
                      <div key={rIdx} className="flex items-center gap-1.5">
                        <Check className="size-3.5 text-[#E11D48] shrink-0" />
                        <span className="leading-tight text-gray-600 font-normal">{rem}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Metrics Bar */}
              <div className="pt-3 border-t border-gray-100 bg-gray-50/70 -mx-5 -mb-5 sm:-mx-7 sm:-mb-7 p-4 sm:px-6 rounded-b-3xl grid grid-cols-3 gap-2 text-center">
                {study.metrics.map((metric, mIdx) => (
                  <div key={mIdx}>
                    <span className="text-[10px] text-gray-500 font-medium block">
                      {metric.label}
                    </span>
                    <strong className="text-xs font-bold text-gray-950">
                      {metric.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM ENTERPRISE ASSURANCE FOOTER */}
        <div className="mt-14 sm:mt-18 pt-10 border-t border-gray-200/90 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-tr from-[#E11D48] to-[#FF4FA3] text-white flex items-center justify-center shadow-md shadow-rose-950/15 shrink-0">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-950 tracking-tight">
                Enterprise Document Integrity Guarantee
              </h4>
              <p className="text-xs text-gray-600 mt-0.5 font-normal">
                Every restoration preserves native vector paths, metadata, font embeddings, and OCR tables.
              </p>
            </div>
          </div>

          <a
            href="#upload-pdf-section"
            className="group inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gray-950 hover:bg-black text-white text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer hover:scale-102"
          >
            <span>Upload Your Document Now</span>
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform text-[#E11D48]" />
          </a>
        </div>
      </div>
    </section>
  );
}
