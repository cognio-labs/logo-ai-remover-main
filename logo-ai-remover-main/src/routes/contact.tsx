"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BrandLogo } from "@/components/site/BrandLogo";
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
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] font-mono uppercase">
            <Sparkles className="size-4 text-[#0b0f0d]" />
            <span>24/7 Dedicated Support</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#0b0f0d] tracking-tight leading-[1.06]">
            Let's Create Something Amazing Together
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-2xl text-[#26302b] font-semibold leading-relaxed">
            Have a question, a project idea, or need help with our AI tools? Drop us a message.
            Our team is here to help you 24/7.
          </p>

          {/* 3 Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
              <Zap className="size-4 text-[#0b0f0d]" /> 24/7 Support
            </span>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-white border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
              <ShieldCheck className="size-4 text-[#0b0f0d]" /> 100% Privacy Guaranteed
            </span>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#a8e6cf] border-2 border-[#0b0f0d] text-xs sm:text-sm font-black text-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d]">
              <Clock className="size-4 text-[#0b0f0d]" /> Quick Response Time (&lt; 2h)
            </span>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Trust Info & Direct Contact */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-xl border-[2.5px] border-[#0b0f0d] bg-white p-8 sm:p-10 shadow-[6px_6px_0px_#0b0f0d] space-y-6">
              <div className="flex items-center">
                <BrandLogo href="/" size="lg" variant="dark" />
              </div>

              <p className="text-sm text-[#26302b] font-medium leading-relaxed">
                We empower creators, agencies, and businesses with next-generation neural image and
                video processing. Whether you need custom API integration, volume licensing, or tool
                assistance, we're at your service.
              </p>

              {/* Direct Contact Cards */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3.5 p-4 rounded-lg bg-[#f7f5ee] border-2 border-[#0b0f0d]">
                  <div className="size-10 rounded-md bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0b0f0d]">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#26302b] block font-mono">
                      Direct Email Support
                    </span>
                    <a
                      href="mailto:bellixus062@gmail.com"
                      className="text-sm font-black text-[#0b0f0d] hover:underline"
                    >
                      bellixus062@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-lg bg-[#f7f5ee] border-2 border-[#0b0f0d]">
                  <div className="size-10 rounded-md bg-[#ffe500] border-2 border-[#0b0f0d] text-[#0b0f0d] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0b0f0d]">
                    <MessageSquare className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#26302b] block font-mono">
                      Response Guarantee
                    </span>
                    <span className="text-xs font-bold text-[#0b0f0d]">
                      Under 2 Hours (24/7 Availability)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-lg bg-[#f7f5ee] border-2 border-[#0b0f0d]">
                  <div className="size-10 rounded-md bg-[#a8e6cf] border-2 border-[#0b0f0d] text-[#0b0f0d] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#0b0f0d]">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#26302b] block font-mono">
                      Headquarters
                    </span>
                    <span className="text-xs font-bold text-[#0b0f0d]">
                      Digital Creator Hub • United States
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust statement */}
              <div className="p-4 rounded-lg bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d] text-xs flex items-center gap-2.5 shadow-[3px_3px_0px_#0b0f0d]">
                <ShieldCheck className="size-5 text-[#0b0f0d] shrink-0 stroke-[2.4]" />
                <span>
                  <strong>Privacy First:</strong> We never share your email address or inquiries with
                  any third parties.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form Card */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border-[3px] border-[#0b0f0d] bg-white p-8 sm:p-12 shadow-[7px_7px_0px_#0b0f0d]">
              {isSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="size-16 rounded-xl bg-[#d0f471] border-2 border-[#0b0f0d] text-[#0b0f0d] flex items-center justify-center mx-auto shadow-[4px_4px_0px_#0b0f0d]">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="text-2xl font-black text-[#0b0f0d]">Message Sent Successfully!</h3>
                  <p className="text-sm font-medium text-[#26302b] max-w-md mx-auto leading-relaxed">
                    Thank you for contacting Bellix.us. We have received your inquiry and our team
                    will get back to you within 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black text-[#0b0f0d] bg-[#ffe500] border-2 border-[#0b0f0d] shadow-[3px_3px_0px_#0b0f0d] hover:bg-[#d0f471] transition-colors cursor-pointer"
                  >
                    <span>Send Another Message</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="border-b-2 border-[#0b0f0d] pb-4 mb-3">
                    <h2 className="text-2xl sm:text-3xl font-black text-[#0b0f0d]">Send us a Message</h2>
                    <p className="text-sm sm:text-base font-medium text-[#26302b]">
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
                      <label className="text-xs font-black text-[#0b0f0d] uppercase font-mono">
                        First Name <span>*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] text-base font-semibold text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#0b0f0d] uppercase font-mono">
                        Last Name <span>*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] text-base font-semibold text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                      />
                    </div>
                  </div>

                  {/* Email & Phone row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#0b0f0d] uppercase font-mono">
                        Email Address <span>*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] text-base font-semibold text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#0b0f0d] uppercase font-mono">
                        Phone Number <span className="text-[#26302b] font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] text-base font-semibold text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                      />
                    </div>
                  </div>

                  {/* Subject selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0b0f0d] uppercase font-mono">Subject</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] text-base font-bold text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d]"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Video Watermark Remover">Video Watermark Remover</option>
                      <option value="API & Business Enterprise">API &amp; Business Enterprise</option>
                      <option value="Bug Report or Feedback">Bug Report or Feedback</option>
                    </select>
                  </div>

                  {/* Message field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#0b0f0d] uppercase font-mono">
                      Message <span>*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      required
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border-2 border-[#0b0f0d] bg-[#f7f5ee] text-base font-semibold text-[#0b0f0d] shadow-[2px_2px_0px_#0b0f0d] resize-y"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-lg text-[#0b0f0d] text-base font-black bg-[#d0f471] hover:bg-[#ffe500] border-[2.5px] border-[#0b0f0d] shadow-[5px_5px_0px_#0b0f0d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_#0b0f0d] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
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
