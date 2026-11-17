import { pageMetadata } from "@/lib/seo";
import FeaturesPage from "@/routes/features";

export const metadata = pageMetadata(
  "/features",
  "Image & Video Tool Features",
  "Explore background removal and supported visible watermark cleanup. Learn which Bellix tool fits your image, video, or document.",
  true,
);

export default function Page() {
  return <FeaturesPage />;
}
