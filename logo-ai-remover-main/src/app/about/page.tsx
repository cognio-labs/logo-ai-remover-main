import { pageMetadata } from "@/lib/seo";
import AboutPage from "@/routes/about";

export const metadata = pageMetadata(
  "/about",
  "About Bellix",
  "Learn about Bellix, an online studio for image background removal and supported visible watermark cleanup.",
  true,
);

export default function Page() {
  return <AboutPage />;
}
