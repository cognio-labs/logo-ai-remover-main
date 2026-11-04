import type { Metadata } from "next";
import SampleImagesPage from "@/routes/background-remover_.sample-images";

export const metadata: Metadata = {
  title: "Background Removal Examples & Sample Results | Bellix",
  description:
    "Explore before-and-after samples of AI background removal across portraits, products, animals, cars, and graphics.",
};

export default function Page() {
  return <SampleImagesPage />;
}

