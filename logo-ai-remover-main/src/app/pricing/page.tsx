import { PricingPanel } from "@/components/account/PricingPanel";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "/pricing",
  "Plans and Tool Credits",
  "Review Bellix published plans, separate tool allowances, limits and manual renewal terms.",
);

export default function PricingPage() {
  return <PricingPanel />;
}
