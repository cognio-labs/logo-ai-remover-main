import type { Metadata } from "next";
import ApiReferencePage from "@/routes/api-reference";

export const metadata: Metadata = {
  title: "REST API Reference & SDKs — Bellix.us",
  description:
    "Integrate programmatic AI watermark removal and 4K upscaling into your SaaS, CMS, or video pipeline with the Bellix.us REST API.",
};

export default function Page() {
  return <ApiReferencePage />;
}

