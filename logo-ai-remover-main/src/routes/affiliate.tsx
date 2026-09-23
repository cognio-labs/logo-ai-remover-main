import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Gift,
  HeartHandshake,
  Percent,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PinkButton } from "@/components/site/PinkButton";
import { toast } from "sonner";

export const Route = createFileRoute("/affiliate")({
  head: () => ({
    meta: [
      { title: "Affiliate & Partner Program — Bellix.us" },
      {
        name: "description",
        content:
          "Earn 30% lifetime recurring commissions by introducing video editors, designers, and creators to Bellix.us.",
      },
    ],
  }),
  component: AffiliatePage,
});

function AffiliatePage() {
  const [referredUsers, setReferredUsers] = useState(60);

  // Form state
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerChannel, setPartnerChannel] = useState("");

  // Average subscription: $19/mo * 30% commission = $5.70 / user / month
  const monthlyEarnings = Math.round(referredUsers * 19 * 0.3);
  const annualEarnings = monthlyEarnings * 12;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName || !partnerEmail) return;
    toast.success("Affiliate application received! We will send your referral link within 24 hours.");
    setPartnerName("");
    setPartnerEmail("");
    setPartnerChannel("");
  };

  const perks = [
    {
      icon: <Percent className="size-6 text-[#E11D48]" />,
      title: "30% Lifetime Recurring",
      desc: "Receive monthly payouts for as long as your referred customer remains active. No caps or expiration.",
    },
    {
      icon: <TrendingUp className="size-6 text-[#E11D48]" />,
      title: "60-Day Cookie Window",
      desc: "Generous tracking cookie ensures you get full credit even if a user signs up weeks after clicking your link.",
    },
    {
      icon: <Wallet className="size-6 text-[#E11D48]" />,
      title: "Monthly Reliable Payouts",
      desc: "Fast, automated monthly payments directly to your PayPal, Stripe, or bank account on the 1st of every month.",
    },
    {
      icon: <Gift className="size-6 text-[#E11D48]" />,
      title: "Creator Asset Kit",
      desc: "High-converting banner ads, demo comparison videos, animated logos, and swipe copy provided for your channels.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#FFF5F8] via-white to-white text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#FCE7EC] text-xs font-bold text-[#E11D48] shadow-2xs">
            <HeartHandshake className="size-3.5" />
            <span>Bellix.us Partner & Affiliate Program</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold text-gray-950 tracking-tight">
            Earn{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent">
              30% Lifetime Recurring
            </span>{" "}
            Commission
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
            Partner with the #1 AI watermark remover. Introduce your audience of creators, video
            editors, and designers to pristine 4K frame cleaning.
          </p>
        </div>
      </section>

      {/* 2. INTERACTIVE EARNINGS CALCULATOR */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-8">
        <div className="rounded-3xl p-8 sm:p-12 bg-[#FFF8FA] border-2 border-[#FCE7EC] shadow-sm space-y-8">
          <div className="text-center space-y-1">
            <h2 className="text-2xl sm:text-3xl font-serif font-normal text-gray-950">
              Calculate Your Earning Potential
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Drag the slider to calculate your estimated monthly & annual recurring commissions.
            </p>
          </div>

          {/* Slider */}
          <div className="p-6 rounded-2xl bg-white border border-[#FCE7EC] space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-gray-900">
              <span>Active Paid Subscribers:</span>
              <span className="text-[#E11D48] text-xl font-semibold font-mono">
                {referredUsers} creators
              </span>
            </div>

            <input
              type="range"
              min="5"
              max="500"
              step="5"
              value={referredUsers}
              onChange={(e) => setReferredUsers(Number(e.target.value))}
              className="w-full accent-[#E11D48] cursor-pointer"
            />
          </div>

          {/* Dynamic Payout Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-white border border-[#FCE7EC] shadow-2xs">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Estimated Monthly Income
              </span>
              <h3 className="text-4xl font-semibold text-[#E11D48] font-mono mt-2">
                ${monthlyEarnings.toLocaleString()}
                <span className="text-xs text-gray-500 font-normal"> / mo</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Paid automatically every month</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-[#FCE7EC] shadow-2xs">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Estimated Annual Income
              </span>
              <h3 className="text-4xl font-semibold text-gray-950 font-mono mt-2">
                ${annualEarnings.toLocaleString()}
                <span className="text-xs text-gray-500 font-normal"> / yr</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-1">Passive recurring revenue</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROGRAM PERKS */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {perks.map((p) => (
            <div
              key={p.title}
              className="p-6 rounded-3xl bg-white border border-[#FCE7EC] space-y-3 hover:border-[#FDA4AF] transition-colors"
            >
              <div className="size-12 rounded-2xl bg-[#FFF1F4] flex items-center justify-center">
                {p.icon}
              </div>
              <h4 className="text-base font-bold text-gray-900">{p.title}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 4-STEP ROADMAP */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center space-y-8">
        <h2 className="text-2xl sm:text-3xl font-serif font-normal text-gray-950">
          How the Partner Program Works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
          {[
            { step: "1", title: "Join Free", desc: "Submit the quick form below. Instant approval." },
            { step: "2", title: "Share Link", desc: "Post your link on YouTube, TikTok, X, or blog." },
            { step: "3", title: "Track Sales", desc: "Live dashboard tracking clicks, trials, and sales." },
            { step: "4", title: "Get Paid", desc: "Receive 30% payouts every month via Stripe or PayPal." },
          ].map((item) => (
            <div key={item.step} className="p-5 rounded-2xl bg-[#FFF8FA] border border-[#FCE7EC]">
              <span className="text-2xl font-semibold text-[#E11D48] font-mono">{item.step}</span>
              <h4 className="text-sm font-bold text-gray-900 mt-2">{item.title}</h4>
              <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. APPLICATION FORM */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <div className="rounded-3xl p-8 bg-white border-2 border-[#E11D48] shadow-lg space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-bold text-gray-950">Apply for Partner Access</h3>
            <p className="text-xs text-gray-500">Takes less than 60 seconds to get your link.</p>
          </div>

          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Your Name</label>
              <input
                type="text"
                required
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="Alex Creator"
                className="w-full px-4 py-2.5 rounded-xl border border-[#FCE7EC] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="alex@youtube.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#FCE7EC] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Your Channel / Website / Social URL
              </label>
              <input
                type="text"
                value={partnerChannel}
                onChange={(e) => setPartnerChannel(e.target.value)}
                placeholder="https://youtube.com/@alexai or https://x.com/alex"
                className="w-full px-4 py-2.5 rounded-xl border border-[#FCE7EC] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
              />
            </div>

            <PinkButton type="submit" size="lg" className="w-full font-bold">
              <Send className="size-4 mr-2" />
              <span>Submit Partner Application</span>
            </PinkButton>
          </form>
        </div>
      </section>
    </div>
  );
}
