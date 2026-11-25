"use client";

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

export default function AffiliatePage() {
  const [referredUsers, setReferredUsers] = useState(60);

  // Form state
  const [partnerName, setPartnerName] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerChannel, setPartnerChannel] = useState("");

  // Average Creator Pro subscription: $39/mo * 30% commission = $11.70 / user / month
  const monthlyEarnings = Math.round(referredUsers * 39 * 0.3);
  const annualEarnings = monthlyEarnings * 12;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName || !partnerEmail) return;
    toast.success(
      "Affiliate application received! We will send your referral link within 24 hours.",
    );
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
    <div className="min-h-screen bg-[#f7f5ee] text-[#0b0f0d] font-sans pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 bg-[#f7f5ee] border-b-[3px] border-[#0b0f0d] text-center">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-xs font-black uppercase tracking-wider text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
            <HeartHandshake className="size-3.5" />
            <span>Bellix.us Partner & Affiliate Program</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-[#0b0f0d] tracking-tight">
            Earn{" "}
            <span className="inline-block bg-[#d0f471] px-3 py-0.5 border-[3px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] text-[#0b0f0d]">
              30% Lifetime Recurring
            </span>{" "}
            Commission
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#1f2924] font-medium leading-relaxed">
            Partner with the #1 AI watermark remover. Introduce your audience of creators, video
            editors, and designers to pristine 4K frame cleaning.
          </p>
        </div>
      </section>

      {/* 2. INTERACTIVE EARNINGS CALCULATOR */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-12">
        <div className="rounded-xl p-6 sm:p-10 bg-white border-[3px] border-[#0b0f0d] shadow-[8px_8px_0px_#0b0f0d] space-y-8">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0b0f0d]">
              Calculate Your Earning Potential
            </h2>
            <p className="text-xs sm:text-sm text-[#1f2924] font-medium">
              Drag the slider to calculate your estimated monthly & annual recurring commissions.
            </p>
          </div>

          {/* Slider */}
          <div className="p-6 rounded-xl bg-[#f7f5ee] border-2 border-[#0b0f0d] space-y-3">
            <div className="flex justify-between items-center text-sm font-black text-[#0b0f0d]">
              <span>Active Paid Subscribers:</span>
              <span className="bg-[#ffe500] border-2 border-[#0b0f0d] px-2.5 py-0.5 rounded-md text-[#0b0f0d] text-lg font-black font-mono shadow-[2px_2px_0px_#0b0f0d]">
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
              className="w-full accent-[#0b0f0d] cursor-pointer"
            />
          </div>

          {/* Dynamic Payout Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
            <div className="p-6 rounded-xl bg-[#d0f471] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
              <span className="text-xs font-black text-[#0b0f0d] uppercase tracking-wider block">
                Estimated Monthly Income
              </span>
              <h3 className="text-4xl font-black text-[#0b0f0d] font-mono mt-2">
                ${monthlyEarnings.toLocaleString()}
                <span className="text-xs text-[#0b0f0d] font-bold"> / mo</span>
              </h3>
              <p className="text-[11px] font-bold text-[#1f2924] mt-1">Paid automatically every month</p>
            </div>

            <div className="p-6 rounded-xl bg-[#a8e6cf] border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
              <span className="text-xs font-black text-[#0b0f0d] uppercase tracking-wider block">
                Estimated Annual Income
              </span>
              <h3 className="text-4xl font-black text-[#0b0f0d] font-mono mt-2">
                ${annualEarnings.toLocaleString()}
                <span className="text-xs text-[#0b0f0d] font-bold"> / yr</span>
              </h3>
              <p className="text-[11px] font-bold text-[#1f2924] mt-1">Passive recurring revenue</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROGRAM PERKS */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {perks.map((p) => (
            <div
              key={p.title}
              className="p-6 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d] space-y-3 hover:translate-y-[-2px] transition-transform"
            >
              <div className="size-12 rounded-lg bg-[#d0f471] border-2 border-[#0b0f0d] flex items-center justify-center shadow-[2px_2px_0px_#0b0f0d] text-[#0b0f0d]">
                {p.icon}
              </div>
              <h4 className="text-base font-black text-[#0b0f0d]">{p.title}</h4>
              <p className="text-xs text-[#1f2924] font-medium leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 4-STEP ROADMAP */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center space-y-8">
        <h2 className="text-2xl sm:text-3xl font-black text-[#0b0f0d]">
          How the Partner Program Works
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
          {[
            {
              step: "01",
              title: "Join Free",
              desc: "Submit the quick form below. Instant approval.",
            },
            {
              step: "02",
              title: "Share Link",
              desc: "Post your link on YouTube, TikTok, X, or blog.",
            },
            {
              step: "03",
              title: "Track Sales",
              desc: "Live dashboard tracking clicks, trials, and sales.",
            },
            {
              step: "04",
              title: "Get Paid",
              desc: "Receive 30% payouts every month via Stripe or PayPal.",
            },
          ].map((item) => (
            <div key={item.step} className="p-5 rounded-xl bg-white border-[2.5px] border-[#0b0f0d] shadow-[4px_4px_0px_#0b0f0d]">
              <span className="inline-block px-2 py-0.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-sm font-black text-[#0b0f0d] font-mono">{item.step}</span>
              <h4 className="text-sm font-black text-[#0b0f0d] mt-3">{item.title}</h4>
              <p className="text-xs text-[#1f2924] font-medium mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. APPLICATION FORM */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <div className="rounded-xl p-8 bg-white border-[3px] border-[#0b0f0d] shadow-[8px_8px_0px_#0b0f0d] space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-black text-[#0b0f0d]">Apply for Partner Access</h3>
            <p className="text-xs text-[#1f2924] font-medium">Takes less than 60 seconds to get your link.</p>
          </div>

          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#0b0f0d] block mb-1.5">Your Name</label>
              <input
                type="text"
                required
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="Alex Creator"
                className="w-full px-4 py-2.5 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] text-xs font-bold text-[#0b0f0d] focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#0b0f0d] block mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={partnerEmail}
                onChange={(e) => setPartnerEmail(e.target.value)}
                placeholder="alex@youtube.com"
                className="w-full px-4 py-2.5 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] text-xs font-bold text-[#0b0f0d] focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-[#0b0f0d] block mb-1.5">
                Your Channel / Website / Social URL
              </label>
              <input
                type="text"
                value={partnerChannel}
                onChange={(e) => setPartnerChannel(e.target.value)}
                placeholder="https://youtube.com/@alexai or https://x.com/alex"
                className="w-full px-4 py-2.5 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] text-xs font-bold text-[#0b0f0d] focus:outline-none focus:bg-white"
              />
            </div>

            <PinkButton type="submit" size="lg" className="w-full font-black">
              <Send className="size-4 mr-2" />
              <span>Submit Partner Application</span>
            </PinkButton>
          </form>
        </div>
      </section>
    </div>
  );
}
