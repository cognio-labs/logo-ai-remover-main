import type { Metadata } from "next";
import ImageCleaner from "@/routes/remove.image";

export const metadata: Metadata = {
  title: "AI Image Watermark Remover — Clean Photos & Logos Free | Bellix.us",
  description:
    "Brush over any watermark, logo, date stamp, or unwanted object on photos. AI inpainting cleanly removes marks while preserving background detail. 100% free.",
};

export default function Page() {
  return <ImageCleaner />;
}

