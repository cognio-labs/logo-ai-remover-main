import type { Metadata } from "next";
import HomePage from "@/routes/index";

export const metadata: Metadata = {
  title: "Bellix.us — AI Background Remover, Image & Video Enhancer",
  description:
    "Bellix.us is a free AI creative studio. Remove image backgrounds instantly, clean watermarks from photos and PDFs, enhance video quality, and upscale images to 4K — all in one place.",
};

export default function Page() {
  return <HomePage />;
}

