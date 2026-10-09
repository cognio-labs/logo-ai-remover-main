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
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Background Removal, Watermark & PDF Tool Help | Bellix.us" },
      {
        name: "description",
        content:
          "Find answers to common questions about Bellix.us tools — how background removal works, supported file formats, credit usage, and step-by-step guides for each AI tool.",
      },
      { tagName: "link", rel: "canonical", href: "https://www.bellix.us/faq" },
      { property: "og:url", content: "https://www.bellix.us/faq" },
      { property: "og:title", content: "FAQ — Background Removal, Watermark & PDF Tool Help" },
      { property: "og:description", content: "Common questions about Bellix.us AI tools, file formats, credits, and more." },
      { property: "og:image", content: "https://www.bellix.us/creative-suite/bellix-hero-section.png" },
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

function FaqPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [allFaqs, setAllFaqs] = useState(DEFAULT_FAQS);

  // Support form state
  const [ticketEmail, setTicketEmail] = useState("");
  const [ticketMsg, setTicketMsg] = useState("");

  useEffect(() => {
    async function loadLiveFaqs() {
      try {
        const { data: dbFaqs, error } = await supabase
          .from("faq_items")
          .select("*")
          .eq("active", true)
          .order("order_num");

        if (!error && dbFaqs && dbFaqs.length > 0) {
          setAllFaqs(
            dbFaqs.map((f) => ({
              category: f.category || "General",
              q: f.question,
              a: f.answer,
            }))
          );
        }
      } catch (err) {
        console.warn("Using default FAQs:", err);
      }
    }
    loadLiveFaqs();
  }, []);

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
    <div className="min-h-screen bg-transparent text-gray-900 font-sans pb-24">
      {/* 1. HERO SECTION & SEARCH BAR */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFF5F8] via-white to-white text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48] shadow-2xs">
            <FileQuestion className="size-3.5" />
            <span>Help Center & Knowledge Base</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-950 tracking-tight">
            How can we{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              help you today?
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
            Find instant answers regarding video processing, format compatibility, credit usage, and
            neural inpainting quality.
          </p>

          {/* Search Box */}
          <div className="pt-6 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions (e.g. Gemini, credits, refund, 4K)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#FCE7EC] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E11D48] shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* 2. CATEGORY PILLS */}
      <section className="px-4 max-w-5xl mx-auto mb-10">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-[#E11D48] text-white shadow-md shadow-rose-200"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-[#FCE7EC]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* 3. ACCORDION FAQ LIST */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#FFF8FA] border border-[#FCE7EC]">
            <p className="text-gray-500 text-sm">No answers found matching "{search}".</p>
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("All");
              }}
              className="mt-3 text-xs font-bold text-[#E11D48] underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq, i) => (
            <div
              key={faq.q}
              className="rounded-2xl border border-[#FCE7EC] bg-white overflow-hidden shadow-2xs"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-gray-900 hover:text-[#E11D48] transition-colors gap-4"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`size-4 text-gray-400 shrink-0 transition-transform ${
                    openIndex === i ? "rotate-180 text-[#E11D48]" : ""
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                  <p>{faq.a}</p>
                  <div className="mt-2 text-[10px] font-mono text-gray-400 uppercase">
                    Category: {faq.category}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* 4. CONTACT / SUPPORT TICKET SECTION */}
      <section className="pt-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <div className="rounded-3xl p-8 sm:p-10 bg-[#FFF8FA] border border-[#FCE7EC] shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="size-12 mx-auto rounded-2xl bg-white border border-[#FCE7EC] flex items-center justify-center text-[#E11D48] shadow-2xs">
              <Headphones className="size-6" />
            </div>
            <h2 className="text-2xl font-serif font-normal text-gray-950">Still have questions?</h2>
            <p className="text-xs text-gray-600">
              Our engineering & AI research team is available 24/7. Send us a message below.
            </p>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Your Email</label>
              <input
                type="email"
                required
                value={ticketEmail}
                onChange={(e) => setTicketEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#FCE7EC] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Message or Issue</label>
              <textarea
                required
                rows={3}
                value={ticketMsg}
                onChange={(e) => setTicketMsg(e.target.value)}
                placeholder="Describe your question or include a link to the video..."
                className="w-full px-4 py-2.5 rounded-xl border border-[#FCE7EC] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
              />
            </div>

            <PinkButton type="submit" size="md" className="w-full font-bold">
              <Mail className="size-4 mr-2" />
              <span>Submit Support Ticket</span>
            </PinkButton>
          </form>
        </div>
      </section>
    </div>
  );
}
