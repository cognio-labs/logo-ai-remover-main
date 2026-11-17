import { pageMetadata } from "@/lib/seo";
import ApiReferencePage from "@/routes/api-reference";

export const metadata = pageMetadata(
  "/api-reference",
  "Bellix API Information",
  "Review Bellix API information. Confirm endpoint availability, authentication, and usage terms before planning an integration.",
  false,
);

export default function Page() {
  return <ApiReferencePage />;
}
