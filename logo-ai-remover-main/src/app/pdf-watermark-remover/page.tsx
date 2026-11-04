import type { Metadata } from "next";
import PdfWatermarkRemoverPage from "@/routes/pdf-watermark-remover";

export const metadata: Metadata = {
  title: "PDF Watermark Remover — Clean Text, Stamp & Logo Watermarks Free | Bellix.us",
  description:
    "Remove watermarks, background stamps, drafts, sample text, and logos from PDF documents online for free. Preserves layout, vector quality, and fonts. 100% private.",
};

export default function Page() {
  return <PdfWatermarkRemoverPage />;
}

