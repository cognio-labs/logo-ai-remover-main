import type { Metadata } from "next";
import VideoRemoverPage from "@/routes/remove.video";

export const metadata: Metadata = {
  title: "AI Video Logo Remover — Bellix.us",
  description: "Remove visible AI logos from the exact uploaded video with job-isolated frame restoration.",
};

export default function Page() {
  return <VideoRemoverPage />;
}

