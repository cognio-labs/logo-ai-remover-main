import type { Metadata } from "next";
import Tools from "@/routes/tools";

export const metadata: Metadata = {
  title: "All AI Tools — Background Remover, PDF Cleaner & More | Bellix.us",
  description:
    "Browse all Bellix.us AI tools: background remover, image watermark remover, PDF cleaner, and video watermark remover. All free to try.",
};

export default function Page() {
  return <Tools />;
}

