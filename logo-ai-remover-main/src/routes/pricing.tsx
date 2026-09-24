import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing & Plans — Bellix.us" },
      {
        name: "description",
        content:
          "Simple, transparent pricing for creators, studios, and agencies. Remove Gemini and AI watermarks with 4K clarity. Start free today.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [videoCount, setVideoCount] = useState(25);
  const [imageCount, setImageCount] = useState(80);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Credit calculation: 3 credits per video, 1 credit per image
  const totalCreditsNeeded = videoCount * 3 + imageCount;

  const tiers = [
    {
      name: "Starter Free",
      desc: "Perfect for testing watermark removal on personal clips and images.",
      priceMonthly: 0,
      priceAnnual: 0,
      credits: "5 credits / mo",
      badge: null,
      popular: false,
      features: [
        "Up to 1080p Full HD resolution",
        "Video clips up to 15 seconds",
        "Standard GPU processing queue",
        "Remove Google Gemini & Veo marks",
        "Single file upload at a time",
        "Community Discord support",
      ],
      ctaText: "Start Free",
      ctaLink: "/gemini-video-watermark-remover",
      variant: "outline" as const,
    },
    {
      name: "Creator Pro",
      desc: "Ideal for video editors, social creators, and content producers.",
      priceMonthly: 19,
      priceAnnual: 15,
      credits: "150 credits / mo",
      badge: "Most Popular",
      popular: true,
      features: [
        "Pristine 4K UHD Export resolution",
        "Videos up to 120 seconds in length",
        "Priority NVIDIA H100 Cloud GPU queue",
        "Multi-frame temporal consistency",
        "Batch processing (up to 20 files)",
        "Commercial usage license",
        "Gemini, Sora, Veo & Kling AI support",
        "Priority 24/7 email support",
      ],
      ctaText: "Get Creator Pro",
      ctaLink: "/gemini-video-watermark-remover",
      variant: "primary" as const,
    },
    {
      name: "Studio & API",
      desc: "For production studios, agencies, and high-volume automated pipelines.",
      priceMonthly: 49,
      priceAnnual: 39,
      credits: "600 credits / mo",
      badge: "Best Value",
      popular: false,
      features: [
        "8K Ultra Super-Resolution",
        "Unlimited video duration & size",
        "Dedicated cloud GPU worker pods",
        "REST API Access & Webhook alerts",
        "Unlimited batch uploads",
        "Full enterprise commercial rights",
        "Raw ProRes / Lossless exports",
        "Dedicated account manager",
      ],
      ctaText: "Get Studio Plan",
      ctaLink: "/api-reference",
      variant: "outline" as const,
    },
  ];

  const comparisonFeatures = [
    { name: "Max Resolution", free: "1080p", pro: "4K UHD", studio: "8K Ultra" },
    { name: "Max Video Duration", free: "15 seconds", pro: "120 seconds", studio: "Unlimited" },
    { name: "Batch Processing", free: "1 at a time", pro: "20 files", studio: "Unlimited" },
    { name: "Temporal Frame Inpainting", free: "Basic", pro: "Advanced 60 FPS", studio: "Studio-Grade" },
    { name: "Supported Formats", free: "MP4 only", pro: "7 Video + 5 Image Formats", studio: "All + ProRes" },
    { name: "Processing Speed", free: "Standard (~45s)", pro: "Fast (<10s)", studio: "Instant (<3s)" },
    { name: "REST API Access", free: false, pro: false, studio: true },
    { name: "Commercial License", free: false, pro: true, studio: true },
    { name: "Dedicated GPU Priority", free: false, pro: true, studio: true },
  ];

  const faqs = [
    {
      q: "How do credits work?",
      a: "Each image watermark removal or repair uses 1 credit. Each video cleanup (up to 120 seconds) uses 3 credits. Credits refresh on your monthly billing date and unused credits roll over for up to 90 days on Pro and Studio plans.",
    },
    {
      q: "Can I cancel or change my plan anytime?",
      a: "Yes, you can upgrade, downgrade, or cancel your subscription at any time with a single click in your dashboard. If you cancel, your access continues until the end of your billing cycle.",
    },
    {
      q: "Do you offer a refund if it doesn't work on my video?",
      a: "Absolutely! We offer a 100% 14-day money-back guarantee. If you're not thrilled with the reconstruction quality, just reach out to support and we'll refund your payment in full.",
    },
    {
      q: "Are my uploaded videos stored or used for AI training?",
      a: "Never. All videos and images are processed transiently in volatile GPU RAM and purged automatically upon download. We never store or train models on user data.",
    },
    {
      q: "Do you support commercial usage?",
      a: "Yes, Creator Pro and Studio plans include full commercial usage rights for all media processed with Bellix.us.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      {/* 1. Header & Billing Switch */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFF5F8] via-white to-white text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48] shadow-2xs">
            <Sparkles className="size-3.5" />
            <span>Transparent, Creator-First Pricing</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-950 tracking-tight">
            Plans that scale with your{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              creative workflow
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
            High-precision AI watermark removal with 4K clarity. Start completely free, upgrade when
            you need studio-grade volume.
          </p>

          {/* Billing Switch Toggle */}
          <div className="pt-6 flex items-center justify-center gap-4">
            <span className={`text-sm font-bold ${!isAnnual ? "text-gray-950" : "text-gray-500"}`}>
              Monthly Billing
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-8 rounded-full bg-gray-200 p-1 transition-colors hover:bg-gray-300 focus:outline-none"
              style={{ backgroundColor: isAnnual ? "#E11D48" : undefined }}
              aria-label="Toggle annual billing"
            >
              <div
                className={`size-6 rounded-full bg-white shadow-md transform transition-transform ${
                  isAnnual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-bold ${isAnnual ? "text-gray-950" : "text-gray-500"}`}>
                Annual Billing
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#FFE4E9] text-[#E11D48] text-[11px] font-semibold uppercase tracking-wider">
                Save 20%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Pricing Tiers Cards */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {tiers.map((t) => {
            const price = isAnnual ? t.priceAnnual : t.priceMonthly;
            return (
              <div
                key={t.name}
                className={`relative rounded-3xl p-8 sm:p-9 flex flex-col justify-between transition-all duration-300 ${
                  t.popular
                    ? "bg-white border-2 border-[#E11D48] shadow-[0_20px_50px_-10px_rgba(225,29,72,0.25)] scale-[1.02] z-10"
                    : "bg-[#FFFDFC] border border-[#FCE7EC] shadow-sm hover:shadow-md hover:border-[#FDA4AF]"
                }`}
              >
                {t.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#E11D48] to-[#FF4FA3] text-white text-xs font-semibold tracking-wide uppercase shadow-md">
                    {t.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-950">{t.name}</h3>
                    <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-[#FFF1F4] text-[#E11D48]">
                      {t.credits}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-2 min-h-[36px]">{t.desc}</p>

                  {/* Price */}
                  <div className="my-6 flex items-baseline gap-1">
                    <span className="text-5xl font-semibold text-gray-950">${price}</span>
                    <span className="text-xs font-semibold text-gray-500">/ month</span>
                    {isAnnual && price > 0 && (
                      <span className="text-[11px] text-gray-400 font-medium ml-2">
                        (billed ${price * 12}/yr)
                      </span>
                    )}
                  </div>

                  <PinkButton
                    size="lg"
                    variant={t.variant}
                    className="w-full font-bold shadow-xs py-3"
                    asChild
                  >
                    <Link to={t.ctaLink}>{t.ctaText}</Link>
                  </PinkButton>

                  {/* Feature Checklist */}
                  <div className="mt-8 space-y-3 pt-6 border-t border-gray-100 text-xs">
                    <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
                      Everything included:
                    </h4>
                    {t.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5 text-gray-700">
                        <Check className="size-4 text-[#E11D48] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Interactive Credit Calculator */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-[#FFF5F8] via-white to-white border border-[#FCE7EC] shadow-sm space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-serif font-normal text-gray-950">
              Estimate your monthly volume & credits
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Drag the sliders below to see your estimated monthly credit requirement and ideal plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Slider 1: Videos */}
            <div className="space-y-3 p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs">
              <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                <span>Monthly Videos to Clean:</span>
                <span className="text-[#E11D48] text-base font-semibold font-mono">
                  {videoCount} clips
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={videoCount}
                onChange={(e) => setVideoCount(Number(e.target.value))}
                className="w-full accent-[#E11D48] cursor-pointer"
              />
              <span className="text-[11px] text-gray-400 block text-right">
                Cost: {videoCount * 3} credits (3 credits/video)
              </span>
            </div>

            {/* Slider 2: Images */}
            <div className="space-y-3 p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs">
              <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                <span>Monthly Images to Clean:</span>
                <span className="text-[#E11D48] text-base font-semibold font-mono">
                  {imageCount} images
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                value={imageCount}
                onChange={(e) => setImageCount(Number(e.target.value))}
                className="w-full accent-[#E11D48] cursor-pointer"
              />
              <span className="text-[11px] text-gray-400 block text-right">
                Cost: {imageCount} credits (1 credit/image)
              </span>
            </div>
          </div>

          {/* Calculator Result Box */}
          <div className="rounded-2xl p-6 bg-[#FFF1F4] border border-[#FCE7EC] flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                Total Estimated Usage
              </p>
              <h3 className="text-3xl font-semibold text-gray-950 font-mono mt-1">
                {totalCreditsNeeded}{" "}
                <span className="text-base font-normal text-gray-600">credits / mo</span>
              </h3>
              <p className="text-xs text-[#E11D48] font-semibold mt-1">
                {totalCreditsNeeded <= 5
                  ? "✓ Covered fully under Starter Free tier!"
                  : totalCreditsNeeded <= 150
                  ? "✓ Creator Pro Plan ($19/mo) is the perfect fit!"
                  : "✓ Studio Plan ($49/mo) provides optimal high-volume pricing!"}
              </p>
            </div>

            <PinkButton size="md" className="shrink-0 font-bold" asChild>
              <Link to="/gemini-video-watermark-remover">
                <span>Start Cleaning Now</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </PinkButton>
          </div>
        </div>
      </section>

      {/* 4. Full Feature Comparison Matrix */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-serif font-normal text-gray-950">Detailed Plan Comparison</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Compare all features across Free, Creator Pro, and Studio tiers.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-[#FCE7EC] bg-white shadow-2xs">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-[#FFF8FA] border-b border-[#FCE7EC] text-gray-900">
                <th className="py-4 px-6 font-bold">Feature</th>
                <th className="py-4 px-6 font-bold text-center">Starter Free</th>
                <th className="py-4 px-6 font-bold text-center text-[#E11D48]">Creator Pro</th>
                <th className="py-4 px-6 font-bold text-center">Studio & API</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FCE7EC]/60">
              {comparisonFeatures.map((row) => (
                <tr key={row.name} className="hover:bg-[#FFFDFC] transition-colors">
                  <td className="py-3.5 px-6 font-medium text-gray-800">{row.name}</td>
                  <td className="py-3.5 px-6 text-center text-gray-600">
                    {typeof row.free === "boolean" ? (
                      row.free ? (
                        <Check className="size-4 text-green-600 mx-auto" />
                      ) : (
                        <Minus className="size-4 text-gray-300 mx-auto" />
                      )
                    ) : (
                      row.free
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-center font-bold text-[#E11D48] bg-[#FFF1F4]/20">
                    {typeof row.pro === "boolean" ? (
                      row.pro ? (
                        <Check className="size-4 text-[#E11D48] mx-auto" />
                      ) : (
                        <Minus className="size-4 text-gray-300 mx-auto" />
                      )
                    ) : (
                      row.pro
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-center font-bold text-gray-900">
                    {typeof row.studio === "boolean" ? (
                      row.studio ? (
                        <Check className="size-4 text-green-600 mx-auto" />
                      ) : (
                        <Minus className="size-4 text-gray-300 mx-auto" />
                      )
                    ) : (
                      row.studio
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Trust & Guarantee Badges */}
      <section className="py-8 px-4 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-1">
          <ShieldCheck className="size-6 text-[#E11D48] mx-auto" />
          <h4 className="text-xs font-bold text-gray-900">14-Day Money Back</h4>
          <p className="text-[11px] text-gray-500">100% refund if not satisfied with output quality</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-1">
          <Lock className="size-6 text-[#E11D48] mx-auto" />
          <h4 className="text-xs font-bold text-gray-900">256-Bit SSL Encrypted</h4>
          <p className="text-[11px] text-gray-500">Stripe payment security & instant activation</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC] space-y-1">
          <Zap className="size-6 text-[#E11D48] mx-auto" />
          <h4 className="text-xs font-bold text-gray-900">Cancel Anytime</h4>
          <p className="text-[11px] text-gray-500">No lock-in contract, pause or cancel in 1 click</p>
        </div>
      </section>

      {/* 6. Pricing FAQ Accordion */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-serif font-normal text-gray-950">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-gray-500 mt-1">Got questions? We've got clear answers.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={faq.q}
              className="rounded-2xl border border-[#FCE7EC] bg-white overflow-hidden shadow-2xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-gray-900 hover:text-[#E11D48] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`size-4 text-gray-400 transition-transform ${
                    openFaq === i ? "rotate-180 text-[#E11D48]" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
