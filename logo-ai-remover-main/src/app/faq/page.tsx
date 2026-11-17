import { pageMetadata } from "@/lib/seo";
import FaqPage from "@/routes/faq";

export const metadata = pageMetadata(
  "/faq",
  "Image & Video Editing Help",
  "Get help choosing Bellix tools for background removal and supported watermark cleanup. Review format requirements and output limitations.",
  true,
);

export default function Page() {
  return <FaqPage />;
}
