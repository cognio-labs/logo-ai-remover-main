import type { Metadata } from "next";
import BackgroundRemoverPage from "@/routes/background-remover";

export const metadata: Metadata = {
  title: "AI Background Remover — Remove Image Background Online Free | Bellix.us",
  description:
    "Remove image backgrounds automatically in 5 seconds with AI. Free online transparent background maker for e-commerce, portraits, signatures & products. 100% free cutout tool.",
};

export default function Page() {
  return <BackgroundRemoverPage />;
}

