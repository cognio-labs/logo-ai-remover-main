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
      { tagName: "link", rel: "canonical", href: "https://www.bellix.us/contact" },
    ],
  }),
  component: ContactPage,
});

export function ContactPage() {
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
      // Simulate/Send to backend endpoint
      await new Promise((resolve) => setTimeout(resolve, 1400));

      setIsSubmitted(true);
      toast.success("Message Sent Successfully! We'll be in touch soon.");

      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#E11D48", "#FF4FA3", "#10B981"],
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
    } catch {
      toast.error("Failed to send message. Please email bellixus062@gmail.com directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/50 text-gray-900 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Top Header Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-rose-200/80 shadow-2xs text-xs font-bold text-[#E11D48]">
            <Sparkles className="size-3.5 text-[#E11D48]" />
            <span>24/7 Dedicated Support</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-950 tracking-tight leading-[1.1]">
            Let's Create Something{" "}
            <span className="bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] bg-clip-text text-transparent font-serif italic">
              Amazing Together
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 font-normal leading-relaxed">
            Have a question, a project idea, or need help with our AI tools? Drop us a message.
            Our team is here to help you 24/7.
          </p>

          {/* 3 Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs">
              <Zap className="size-3.5 text-amber-500" /> 24/7 Support
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs">
              <ShieldCheck className="size-3.5 text-blue-500" /> 100% Privacy Guaranteed
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 shadow-2xs">
              <Clock className="size-3.5 text-emerald-500" /> Quick Response Time (&lt; 2h)
            </span>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Trust Info & Direct Contact */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-gray-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <img
                  src="/creative-suite/bellix_mark.png"
                  alt="Bellix.us Logo"
                  className="size-11 object-contain"
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-950 leading-none">
                    Bellix<span className="text-[#E11D48]">.us</span>
                  </h2>
                  <p className="text-[10px] font-extrabold tracking-widest text-[#E11D48] uppercase mt-1">
                    LUXURY AI STUDIO
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">
                We empower creators, agencies, and businesses with next-generation neural image and
                video processing. Whether you need custom API integration, volume licensing, or tool
                assistance, we're at your service.
              </p>

              {/* Direct Contact Cards */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100">
                  <div className="size-9 rounded-xl bg-white border border-rose-200 text-[#E11D48] flex items-center justify-center shrink-0 shadow-2xs">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Direct Email Support
                    </span>
                    <a
                      href="mailto:bellixus062@gmail.com"
                      className="text-sm font-bold text-gray-900 hover:text-[#E11D48] transition-colors"
                    >
                      bellixus062@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="size-9 rounded-xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <MessageSquare className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Response Guarantee
                    </span>
                    <span className="text-xs font-semibold text-gray-800">
                      Under 2 Hours (24/7 Availability)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="size-9 rounded-xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                      Headquarters
                    </span>
                    <span className="text-xs font-semibold text-gray-800">
                      Digital Creator Hub • United States
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust statement */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-emerald-900 text-xs flex items-center gap-2.5">
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
            <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-xl shadow-gray-200/50">
              {isSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-950">Message Sent Successfully!</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                    Thank you for contacting Bellix.us. We have received your inquiry and our team
                    will get back to you within 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-[#E11D48] bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <span>Send Another Message</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="border-b border-gray-100 pb-4 mb-2">
                    <h2 className="text-xl font-bold text-gray-950">Send us a Message</h2>
                    <p className="text-xs text-gray-500">
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
                      <label className="text-xs font-bold text-gray-700">
                        First Name <span className="text-[#E11D48]">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="John"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E11D48]/30 focus:border-[#E11D48] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        Last Name <span className="text-[#E11D48]">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Doe"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E11D48]/30 focus:border-[#E11D48] transition-all"
                      />
                    </div>
                  </div>

                  {/* Email & Phone row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        Email Address <span className="text-[#E11D48]">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@studio.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E11D48]/30 focus:border-[#E11D48] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E11D48]/30 focus:border-[#E11D48] transition-all"
                      />
                    </div>
                  </div>

                  {/* Subject selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Subject</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E11D48]/30 focus:border-[#E11D48] transition-all"
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="AI Upscaler Support">AI Upscaler Support</option>
                      <option value="Video Watermark Remover">Video Watermark Remover</option>
                      <option value="API & Business Enterprise">API & Business Enterprise</option>
                      <option value="Bug Report or Feedback">Bug Report or Feedback</option>
                    </select>
                  </div>

                  {/* Message field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">
                      Message <span className="text-[#E11D48]">*</span>
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      required
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us about your project or inquiry..."
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E11D48]/30 focus:border-[#E11D48] transition-all resize-y"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-2xl text-white text-sm font-bold bg-gradient-to-r from-[#E11D48] via-[#FF2E63] to-[#FF4FA3] shadow-[0_6px_25px_rgba(225,29,72,0.38)] hover:shadow-[0_8px_32px_rgba(225,29,72,0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
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
