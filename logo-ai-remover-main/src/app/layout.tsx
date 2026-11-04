import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.bellix.us"),
  title: {
    default: "Bellix.us — AI Creative Studio",
    template: "%s | Bellix.us",
  },
  description:
    "Bellix.us is an AI creative studio with tools to remove backgrounds, clean watermarks from images and PDFs, enhance video quality, and upscale photos up to 4K.",
  authors: [{ name: "Bellix.us" }],
  openGraph: {
    siteName: "Bellix.us",
    type: "website",
    url: "https://www.bellix.us/",
    title: "Bellix.us — AI Creative Studio",
    description:
      "Bellix.us is an AI creative studio with tools to remove backgrounds, clean watermarks from images and PDFs, enhance video quality, and upscale photos up to 4K.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Bellix.us — Luxury AI Creative Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@bellix_us",
    title: "Bellix.us — AI Creative Studio",
    description:
      "Bellix.us is an AI creative studio with tools to remove backgrounds, clean watermarks from images and PDFs, enhance video quality, and upscale photos up to 4K.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  verification: {
    google: "bikuobkAr5CwX5mR65nkqvX7yUyQLeI6j2MBY58NHJ8",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="image"
          href="/hero-section-banner.webp"
          type="image/webp"
        />
      </head>
      <body className="antialiased min-h-screen bg-white text-gray-900">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

