import { pageMetadata } from "@/lib/seo";
import HowItWorksPage from "@/routes/how-it-works";

export const metadata = pageMetadata(
  "/how-it-works",
  "How to Use Bellix Tools",
  "Choose a Bellix tool, select a supported file, review the processed result, and export. Learn about limitations before editing your media.",
  true,
);

export default function Page() {
  return <HowItWorksPage />;
}
