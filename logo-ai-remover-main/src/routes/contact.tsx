"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  Send,
  Sparkles,
  ShieldCheck,
  Zap,
  MessageSquare,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — 24/7 Creator Support & Inquiries | Bellix.us" },
      {
        name: "description",
        content:
          "Have a question, a project idea, or need help with our AI tools? Contact the Bellix.us team 24/7 at bellixus062@gmail.com. We respond within hours.",
      },
      { property: "og:title", content: "Contact Us — Bellix.us AI Studio" },
      {
        property: "og:description",
        content:
          "Let's create something amazing together. Reach out to Bellix.us 24/7 support for custom enterprise solutions, technical help, or feedback.",
      },
      { property: "og:url", content: "https://www.bellix.us/contact" },
      { rel: "canonical", href: "https://www.bellix.us/contact" },
    ],
  }),
  component: ContactPage,
});

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: "",
    honeypot: "", // Anti-bot spam honeypot
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check honeypot (bots fill invisible fields)
    if (formData.honeypot) {
      console.warn("Spam bot detected.");
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!formData.message.trim() || formData.message.trim().length < 10) {
      toast.error("Please enter a message with at least 10 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to send message. Please try again.");
      }

      setIsSubmitted(true);
      toast.success("Message Sent Successfully! We'll be in touch soon.");

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#d0f471", "#10241e", "#10B981"],
        });
      } catch {
        // optional confetti
      }

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        subject: "General Inquiry",
        message: "",
        honeypot: "",
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message. Please email bellixus062@gmail.com directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f4ee] text-[#10241e] font-sans py-12 sm:py-20 px-4 sm:px-6 lg:px-8 pb-28">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Top Header Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#10241e]/15 shadow-sm text-xs sm:text-sm font-bold text-[#10241e] px-4 py-1.5">
            <Sparkles className="size-3.5 text-[#18362d]" />
            <span>24/7 Dedicated Support</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-[#10241e] tracking-tight leading-[1.08]">
            Let's Create Something{" "}
            <span className="text-[#10241e] underline decoration-[#d0f471] decoration-4 font-serif italic">
              Amazing Together
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-2xl text-[#37433d] font-normal leading-relaxed">
            Have a question, a project idea, or need help with our AI tools? Drop us a message.
            Our team is here to help you 24/7.
          </p>

          {/* 3 Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#10241e]/15 text-xs sm:text-sm font-semibold text-[#10241e] shadow-xs px-4 py-2">
              <Zap className="size-3.5 text-amber-500" /> 24/7 Support
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#10241e]/15 text-xs sm:text-sm font-semibold text-[#10241e] shadow-xs px-4 py-2">
              <ShieldCheck className="size-3.5 text-blue-500" /> 100% Privacy Guaranteed
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#10241e]/15 text-xs sm:text-sm font-semibold text-[#10241e] shadow-xs px-4 py-2">
              <Clock className="size-3.5 text-emerald-500" /> Quick Response Time (&lt; 2h)
            </span>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Trust Info & Direct Contact */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-[#10241e]/15 bg-white p-8 sm:p-10 shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <img
                  src="/creative-suite/bellix_mark.png"
                  alt="Bellix.us Logo"
                  className="size-11 object-contain"
                />
                <div>
                  <h2 className="text-2xl font-bold text-[#10241e] leading-none">
                    Bellix<span className="text-[#18362d]">.us</span>
                  </h2>
                  <p className="text-[10px] font-extrabold tracking-widest text-[#18362d] uppercase mt-1">
                    LUXURY AI STUDIO
                  </p>
                </div>
              </div>

              <p className="text-sm text-[#37433d] leading-relaxed">
                We empower creators, agencies, and businesses with next-generation neural image and
                video processing. Whether you need custom API integration, volume licensing, or tool
                assistance, we're at your service.
              </p>

              {/* Direct Contact Cards */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#f3f4ee] border border-[#10241e]/10">
                  <div className="size-10 rounded-xl bg-[#10241e] text-[#d0f471] flex items-center justify-center shrink-0 shadow-2xs">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E8E] block">
                      Direct Email Support
                    </span>
                    <a
                      href="mailto:bellixus062@gmail.com"
                      className="text-sm font-bold text-[#10241e] hover:text-[#18362d] transition-colors"
                    >
                      bellixus062@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#f3f4ee] border border-[#10241e]/10">
                  <div className="size-9 rounded-xl bg-[#151515] border border-[#303030] text-[#37433d] flex items-center justify-center shrink-0 shadow-2xs">
                    <MessageSquare className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E8E] block">
                      Response Guarantee
                    </span>
                    <span className="text-xs font-semibold text-[#37433d]">
                      Under 2 Hours (24/7 Availability)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-[#f3f4ee] border border-[#10241e]/10">
                  <div className="size-9 rounded-xl bg-[#151515] border border-[#303030] text-[#37433d] flex items-center justify-center shrink-0 shadow-2xs">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E8E] block">
                      Headquarters
                    </span>
                    <span className="text-xs font-semibold text-[#37433d]">
                      Digital Creator Hub • United States
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust statement */}
              <div className="p-4 rounded-2xl bg-[#f3f4ee] border border-emerald-500/40 text-[#10241e] text-xs flex items-center gap-2.5">
                <ShieldCheck className="size-5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Privacy First:</strong> We never share your email address or inquiries with
                  any third parties.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Sleek Contact Form Card */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-[#10241e]/15 bg-white p-8 sm:p-12 shadow-2xl">
              {isSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#10241e]">Message Sent Successfully!</h3>
                  <p className="text-sm text-[#37433d] max-w-md mx-auto leading-relaxed">
                    Thank you for contacting Bellix.us. We have received your inquiry and our team
                    will get back to you within 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-[#10241e] bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    <span>Send Another Message</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="border-b border-[#10241e]/10 pb-4 mb-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#10241e]">Send us a Message</h2>
                    <p className="text-sm sm:text-base text-[#637069]">
                      Fill out the form below and we'll reply right away.
                    </p>
                  </div>

                  {/* Honeypot field (hidden from humans, catches bots) */}
                  <input
                    type="text"
                    name="honeypot"
                    value={formData.honeypot}
                    onChange={handleChange}
                    className="hidden"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {/* Name fields row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#37433d]">
                        First Name <span className="text-[#18362d]">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        
                        className="w-full px-4 py-2.5 rounded-xl border border-[#10241e]/15 bg-[#f3f4ee] text-base text-[#10241e] placeholder-[#718278] py-3 focus:outline-none focus:ring-2 focus:ring-[#10241e]/20 focus:border-[#10241e] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#37433d]">
                        Last Name <span className="text-[#18362d]">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        
                        className="w-full px-4 py-2.5 rounded-xl border border-[#10241e]/15 bg-[#f3f4ee] text-base text-[#10241e] placeholder-[#718278] py-3 focus:outline-none focus:ring-2 focus:ring-[#10241e]/20 focus:border-[#10241e] transition-all"
                      />
                    </div>
                  </div>

                  {/* Email & Phone row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#37433d]">
                        Email Address <span className="text-[#18362d]">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        
                        className="w-full px-4 py-2.5 rounded-xl border border-[#10241e]/15 bg-[#f3f4ee] text-base text-[#10241e] placeholder-[#718278] py-3 focus:outline-none focus:ring-2 focus:ring-[#10241e]/20 focus:border-[#10241e] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#37433d]">
                        Phone Number <span className="text-[#8E8E8E] font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        
                        className="w-full px-4 py-2.5 rounded-xl border border-[#10241e]/15 bg-[#f3f4ee] text-base text-[#10241e] placeholder-[#718278] py-3 focus:outline-none focus:ring-2 focus:ring-[#10241e]/20 focus:border-[#10241e] transition-all"
                      />
                    </div>
                  </div>

                  {/* Subject selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#37433d]">Subject</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#10241e]/15 bg-[#f3f4ee] text-base text-[#10241e] placeholder-[#718278] py-3 focus:outline-none focus:ring-2 focus:ring-[#10241e]/20 focus:border-[#10241e] transition-all"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                                            <option value="Video Watermark Remover">Video Watermark Remover</option>
                      <option value="API & Business Enterprise">API & Business Enterprise</option>
                      <option value="Bug Report or Feedback">Bug Report or Feedback</option>
                    </select>
                  </div>

                  {/* Message field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#37433d]">
                      Message <span className="text-[#18362d]">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      required
                      value={formData.message}
                      onChange={handleChange}
                      
                      className="w-full px-4 py-3 rounded-xl border border-[#10241e]/15 bg-[#f3f4ee] text-base text-[#10241e] placeholder-[#718278] py-3 focus:outline-none focus:ring-2 focus:ring-[#10241e]/20 focus:border-[#10241e] transition-all resize-y"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-2xl text-white text-sm font-bold bg-[#10241e] hover:bg-[#18362d] text-[#d0f471] shadow-xl text-base py-4 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Sending Message...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Message 🚀</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
