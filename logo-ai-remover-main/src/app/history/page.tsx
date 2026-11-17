import { pageMetadata } from "@/lib/seo";
import HistoryPage from "@/routes/history";

export const metadata = pageMetadata(
  "/history",
  "Project History",
  "Review your Bellix editing history on this device.",
  false,
);

export default function Page() {
  return <HistoryPage />;
}
