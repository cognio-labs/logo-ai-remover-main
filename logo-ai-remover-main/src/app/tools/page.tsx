import { pageMetadata } from "@/lib/seo";
import Tools from "@/routes/tools";

export const metadata = pageMetadata(
  "/tools",
  "Online Image & Video Tools",
  "Choose Bellix background removal, Gemini image and video cleanup, or PDF watermark cleanup. Find the right tool for your source file.",
  true,
);

export default function Page() {
  return <Tools />;
}
