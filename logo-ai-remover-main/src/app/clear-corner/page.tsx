import { pageMetadata } from "@/lib/seo";
import ClearCornerPage from "@/components/site/ClearCornerPage";

export const metadata = pageMetadata(
  "/clear-corner",
  "ClearCorner Video Cleanup",
  "Review supported Gemini sparkle video cleanup with ClearCorner. Test an original export and inspect the result before use.",
  false,
);

export default function Page() {
  return <ClearCornerPage />;
}
