import { pageMetadata } from "@/lib/seo";
import SynthIDVerificationPage from "@/routes/synthid-verification";

export const metadata = pageMetadata(
  "/synthid-verification",
  "SynthID Verification Studio",
  "Verify Google DeepMind SynthID, Imagen, and C2PA digital provenance signals in images and videos. Check official verification workflows.",
  true,
);

export default function Page() {
  return <SynthIDVerificationPage />;
}
