import type { Metadata } from "next";
import HowItWorksPage from "@/routes/how-it-works";

export const metadata: Metadata = {
  title: "How It Works — AI Background Removal & Watermark Cleaning | Bellix.us",
  description:
    "Learn how Bellix.us AI tools work: background removal with edge matting, watermark detection and inpainting, and video frame reconstruction — step by step.",
};

export default function Page() {
  return <HowItWorksPage />;
}

