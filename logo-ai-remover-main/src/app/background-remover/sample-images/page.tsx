import { pageMetadata } from "@/lib/seo";
import SampleImagesPage from "@/routes/background-remover_.sample-images";

export const metadata = pageMetadata(
  "/background-remover/sample-images",
  "Background Removal Sample Images",
  "Explore sample images for trying Bellix background removal.",
  true,
);

export default function Page() {
  return <SampleImagesPage />;
}
