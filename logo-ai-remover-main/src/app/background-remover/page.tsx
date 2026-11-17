import { ToolDetails } from "@/components/site/ToolDetails";
import { ToolMeasurement } from "@/components/site/ToolMeasurement";
import { pageMetadata } from "@/lib/seo";
import BackgroundRemoverPage from "@/routes/background-remover";

export const metadata = pageMetadata(
  "/background-remover",
  "Image Background Remover",
  "Remove image backgrounds for product photos and portraits. Upload a photo, review the cutout, and export a transparent PNG with Bellix.",
  true,
);

export default function Page() {
  return (
    <>
      <ToolMeasurement tool="background-remover" />
      <BackgroundRemoverPage />
      <ToolDetails tool="background-remover" />
    </>
  );
}
