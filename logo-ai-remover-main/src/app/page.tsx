import { pageMetadata } from "@/lib/seo";
import HomePage from "@/routes/index";

export const metadata = pageMetadata(
  "/",
  "AI Image & Video Editing Tools",
  "Remove image backgrounds and clean supported Gemini image, video, and PDF watermarks with Bellix. Choose a tool and review your result.",
  true,
);

export default function Page() {
  return <HomePage />;
}
