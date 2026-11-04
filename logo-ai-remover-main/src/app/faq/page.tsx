import type { Metadata } from "next";
import FaqPage from "@/routes/faq";

export const metadata: Metadata = {
  title: "FAQ — Background Removal, Watermark & PDF Tool Help | Bellix.us",
  description:
    "Find answers to common questions about Bellix.us tools — how background removal works, supported file formats, credit usage, and step-by-step guides for each AI tool.",
};

export default function Page() {
  return <FaqPage />;
}

