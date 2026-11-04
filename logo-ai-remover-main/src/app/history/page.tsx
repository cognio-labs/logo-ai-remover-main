import type { Metadata } from "next";
import HistoryPage from "@/routes/history";

export const metadata: Metadata = {
  title: "Project History — Bellix.us",
  description: "Browse, search and re-download all your processed images, videos and upscaled assets.",
};

export default function Page() {
  return <HistoryPage />;
}

