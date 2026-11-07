"use client";

import { createFileRoute } from "@tanstack/react-router";
import { PdfDocumentStudio } from "@/components/documents/PdfDocumentStudio";

export const Route = createFileRoute("/pdf-watermark-remover")({
  head: () => ({
    meta: [
      { title: "PDF Watermark Remover — Clean PDFs Online Free | Bellix.us" },
      {
        name: "description",
        content:
          "Remove watermarks, stamps, and logos from PDF documents online. Remove supported separate PDF watermark layers while preserving original text and page layout.",
      },
      { rel: "canonical", href: "https://www.bellix.us/pdf-watermark-remover" },
      { property: "og:url", content: "https://www.bellix.us/pdf-watermark-remover" },
      { property: "og:title", content: "PDF Watermark Remover — Clean PDFs Online Free" },
      {
        property: "og:description",
        content:
          "Remove watermarks, stamps, and logos from PDFs online. Preserves fonts, layout, and clarity.",
      },
      { property: "og:image", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:secure_url", content: "https://www.bellix.us/og-image.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Bellix.us — PDF Watermark Remover" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PDF Watermark Remover — Clean PDFs Online Free" },
      {
        name: "twitter:description",
        content:
          "Remove watermarks, stamps, and logos from PDFs online. Preserves fonts, layout, and clarity.",
      },
      { name: "twitter:image", content: "https://www.bellix.us/og-image.jpg" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "PDF Watermark Remover",
          url: "https://www.bellix.us/pdf-watermark-remover",
          applicationCategory: "DocumentEditor",
          operatingSystem: "Web",
          description:
            "Remove watermarks, stamps, and logos from PDF documents online while preserving fonts, layout, and vector quality.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          provider: { "@type": "Organization", name: "Bellix.us", url: "https://www.bellix.us/" },
        }),
      },
    ],
  }),
  component: PdfWatermarkRemoverPage,
});

export default function PdfWatermarkRemoverPage() {
  return <PdfDocumentStudio />;
}
