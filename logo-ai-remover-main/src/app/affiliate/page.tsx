import { pageMetadata } from "@/lib/seo";
import AffiliatePage from "@/routes/affiliate";

export const metadata = pageMetadata(
  "/affiliate",
  "Bellix Partnerships",
  "Explore Bellix partnership information. Confirm current programme availability and terms with the team before participating.",
  false,
);

export default function Page() {
  return <AffiliatePage />;
}
