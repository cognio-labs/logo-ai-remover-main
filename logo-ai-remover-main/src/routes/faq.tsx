"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ArrowRight,
  ChevronDown,
  FileQuestion,
  Headphones,
  HelpCircle,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { toast } from "sonner";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Background Removal, Watermark & PDF Tool Help | Bellix.us" },
      {
        name: "description",
        content:
          "Find answers to common questions about Bellix.us tools — how background removal works, supported file formats, credit usage, and step-by-step guides for each AI tool.",
      },
      { rel: "canonical", href: "https://www.bellix.us/faq" },
      { property: "og:url", content: "https://www.bellix.us/faq" },
      { property: "og:title", content: "FAQ — Background Removal, Watermark & PDF Tool Help" },
      { property: "og:image", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://www.bellix.us/og-image.jpg" },
    ],
  }),
  component: FaqPage,
});

const DEFAULT_FAQS = [
  {
    category: "Video Watermarks",
    q: "How does the AI remove Google Gemini and Veo video watermarks?",
    a: "Bellix.us utilizes a multi-frame spatio-temporal deep neural network. It detects the 4-point Gemini star and timestamp coordinates, analyzes optical flow across adjacent video frames, and inlays the covered pixel area with photorealistic texture that matches native motion and lighting.",
  },
  {
    category: "Video Watermarks",
    q: "Will the video suffer from edge flickering or blur in the watermark area?",
    a: "No! Unlike simple blur filters or spatial-only inpainters, our temporal alignment model maintains strict consistency between consecutive frames at up to 60 FPS, eliminating edge flickering, boiling artifacts, and hazy discoloration.",
  },
  {
    category: "Billing & Credits",
    q: "How do credits work across different tools?",
    a: "Each image watermark removal or background removal uses 1 credit. High-resolution video cleanups use 3 credits. Credits refresh on your monthly billing date and unused credits roll over up to 90 days on Creator and Studio plans.",
  },
  {
    category: "Billing & Credits",
    q: "Can I cancel or change my plan anytime?",
    a: "Yes, you can upgrade, downgrade, or cancel your subscription at any time with a single click in your dashboard. If you cancel, your access continues until the end of your billing cycle.",
  },
  {
    category: "Privacy & Storage",
    q: "Are my uploaded media files stored or used for AI training?",
    a: "Never. All videos and images are processed transiently in volatile GPU RAM and purged automatically upon download. We never store or train models on user data.",
  },
];

export default function FaqPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [allFaqs] = useState(DEFAULT_FAQS);

  // Support form state
  const [ticketEmail, setTicketEmail] = useState("");
  const [ticketMsg, setTicketMsg] = useState("");

  const categories = [
    "All",
    "Video Watermarks",
    "Image Cleaning",
    "Upscaling & Quality",
    "Billing & Credits",
    "Privacy & Storage",
  ];

  const filteredFaqs = useMemo(() => {
    return allFaqs.filter((f) => {
      const matchesCat = activeCategory === "All" || f.category === activeCategory;
      const matchesSearch =
        !search ||
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [allFaqs, activeCategory, search]);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketEmail || !ticketMsg) return;
    toast.success("Support ticket received! Our engineering team will respond within 4 hours.");
    setTicketEmail("");
    setTicketMsg("");
  };

  return (
    <div className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] font-sans pb-24">
      {/* 1. HERO SECTION & SEARCH BAR */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-white border-b-[3px] border-[#0b0f0d] text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] font-mono uppercase">
            <FileQuestion className="size-4 text-[#0b0f0d]" />
            <span>Help Center &amp; Knowledge Base</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-[#0b0f0d] tracking-tight">
            How can we{" "}
            <span className="inline-block px-3 py-0.5 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
              help you today?
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#26302b] font-semibold leading-relaxed">
            Find instant answers regarding video processing, format compatibility, credit usage, and
            neural inpainting quality.
          </p>

          {/* Search Box */}
          <div className="pt-6 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 translate-y-1 size-5 text-[#0b0f0d] z-10 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions (e.g. Gemini, credits, refund, 4K)..."
              style={{ paddingLeft: "2.85rem" }}
              className="search-input-field w-full pr-4 py-3.5 rounded-lg border-2 border-[#0b0f0d] bg-white text-sm font-bold text-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]"
            />
          </div>
        </div>
      </section>

      {/* 2. CATEGORY PILLS */}
      <section className="px-4 max-w-5xl mx-auto mt-10 mb-10">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-md text-xs font-black border-2 border-[#0b0f0d] transition-all cursor-pointer ${activeCategory === cat
                  ? "bg-[#d0f471] text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
                  : "bg-white text-[#0b0f0d] hover:bg-[#ffe500] shadow-[2px_2px_0px_#0b0f0d]"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* 3. ACCORDION FAQ LIST */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d]">
            <p className="text-[#26302b] font-bold text-sm">No answers found matching "{search}".</p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("All");
              }}
              className="mt-4 px-4 py-2 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq, i) => (
            <div
              key={faq.q}
              className="rounded-xl border-[2.5px] border-[#0b0f0d] bg-white overflow-hidden shadow-[4px_4px_0px_#0b0f0d]"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-black text-[#0b0f0d] hover:bg-[#fffef5] transition-colors gap-4 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`size-5 text-[#0b0f0d] shrink-0 transition-transform ${openIndex === i ? "rotate-180" : ""}`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-xs sm:text-sm font-medium text-[#26302b] leading-relaxed border-t-2 border-[#0b0f0d] pt-4 bg-[#f7f5ee]">
                  <p>{faq.a}</p>
                  <div className="mt-3 inline-block px-2.5 py-0.5 rounded bg-[#ffe500] border border-[#0b0f0d] text-[10px] font-mono font-black text-[#0b0f0d] uppercase">
                    Category: {faq.category}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* 4. CONTACT / SUPPORT TICKET SECTION */}
      <section className="pt-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="rounded-xl p-8 sm:p-10 bg-[#ffe500] border-[3px] border-[#0b0f0d] shadow-[7px_7px_0px_#0b0f0d] space-y-6">
          <div className="text-center space-y-2">
            <div className="size-12 mx-auto rounded-lg bg-white border-2 border-[#0b0f0d] flex items-center justify-center text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
              <Headphones className="size-6 stroke-[2.4]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0b0f0d]">Still have questions?</h2>
            <p className="text-xs sm:text-sm font-semibold text-[#0b0f0d]">
              Our engineering &amp; AI research team is available 24/7. Send us a message below.
            </p>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="text-xs font-black text-[#0b0f0d] block mb-1.5 uppercase font-mono">Your Email</label>
              <input
                type="email"
                required
                value={ticketEmail}
                onChange={(e) => setTicketEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full px-4 py-2.5 rounded-lg border-2 border-[#0b0f0d] bg-white text-sm font-bold text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
              />
            </div>

            <div>
              <label className="text-xs font-black text-[#0b0f0d] block mb-1.5 uppercase font-mono">Message or Issue</label>
              <textarea
                required
                rows={3}
                value={ticketMsg}
                onChange={(e) => setTicketMsg(e.target.value)}
                placeholder="Describe your question or include a link to the video..."
                className="w-full px-4 py-2.5 rounded-lg border-2 border-[#0b0f0d] bg-white text-sm font-bold text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-lg bg-[#d0f471] hover:bg-white text-[#0b0f0d] font-black text-sm border-2 border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <Mail className="size-4 stroke-[2.4]" />
              <span>Submit Support Ticket</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
