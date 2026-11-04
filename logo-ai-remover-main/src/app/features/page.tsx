import type { Metadata } from "next";
import FeaturesPage from "@/routes/features";

export const metadata: Metadata = {
  title: "AI Tool Features — Background Remover, Image & Video Cleaner | Bellix.us",
  description:
    "Explore all Bellix.us AI tool features: smart edge matting for background removal, brush-based watermark inpainting, PDF layer cleaning, and video frame reconstruction.",
};

export default function Page() {
  return <FeaturesPage />;
}

