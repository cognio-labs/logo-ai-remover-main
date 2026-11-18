import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "@/styles.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
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
    template: "%s | Bellix",
  },
  description:
    "Explore Bellix tools for image background removal and supported image, video, and PDF watermark cleanup.",
  authors: [{ name: "Bellix.us" }],
  openGraph: {
    siteName: "Bellix.us",
    type: "website",
    url: "https://www.bellix.us/",
    title: "Bellix.us — AI Creative Studio",
    description:
      "Explore Bellix tools for image background removal and supported image, video, and PDF watermark cleanup.",
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
    title: "Bellix.us — AI Creative Studio",
    description:
      "Explore Bellix tools for image background removal and supported image, video, and PDF watermark cleanup.",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=DM+Serif+Display:ital@0;1&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" as="image" href="/bellix-manus/image-1.webp" type="image/webp" />
      </head>
      <body className="antialiased min-h-screen bg-[#f3f4ee] text-[#10241e]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://www.bellix.us/#organization",
                  name: "Bellix",
                  url: "https://www.bellix.us/",
                },
                {
                  "@type": "WebSite",
                  "@id": "https://www.bellix.us/#website",
                  name: "Bellix",
                  url: "https://www.bellix.us/",
                  publisher: { "@id": "https://www.bellix.us/#organization" },
                },
              ],
            }),
          }}
        />
        <AppShell>{children}</AppShell>
        <Script
          id="crisp-chat-widget"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.$crisp=[];window.CRISP_WEBSITE_ID="39649944-fdcc-4448-816d-815d7d342b41";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`,
          }}
        />
        <Script
          id="datafast-analytics"
          strategy="afterInteractive"
          defer
          data-website-id="dfid_V7j5JzvHOdmUgfGYd8ynv"
          data-domain="www.bellix.us"
          src="https://datafa.st/js/script.js"
        />
      </body>
    </html>
  );
}
