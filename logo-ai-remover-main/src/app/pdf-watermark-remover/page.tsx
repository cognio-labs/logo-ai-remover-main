import { ToolDetails } from "@/components/site/ToolDetails";
import { ToolMeasurement } from "@/components/site/ToolMeasurement";
import { pageMetadata } from "@/lib/seo";
import PdfWatermarkRemoverPage from "@/routes/pdf-watermark-remover";

export const metadata = pageMetadata(
  "/pdf-watermark-remover",
  "PDF Watermark Cleanup",
  "Try PDF watermark cleanup for documents you own or may edit. Review each output page; results depend on how the watermark is stored.",
  true,
);

export default function Page() {
  return (
    <>
      <ToolMeasurement tool="pdf-watermark-remover" />
      <PdfWatermarkRemoverPage />
      <ToolDetails tool="pdf-watermark-remover" />
    </>
  );
}
