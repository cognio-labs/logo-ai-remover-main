import type { Metadata } from "next";
export const siteUrl = "https://www.bellix.us";
export function pageMetadata(
  path: string,
  title: string,
  description: string,
  index = true,
): Metadata {
  const url = siteUrl + (path || "/");
  const brandedTitle = /\bBellix\b/.test(title) ? title : title + " | Bellix";
  return {
    title: { absolute: brandedTitle },
    description,
    alternates: { canonical: url },
    robots: { index, follow: true },
    openGraph: {
      type: "website",
      siteName: "Bellix",
      url,
      title: brandedTitle,
      description,
      images: [
        { url: "/og-image.jpg", width: 1200, height: 630, alt: "Bellix image and video tools" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      images: ["/og-image.jpg"],
    },
  };
}
