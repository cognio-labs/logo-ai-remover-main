import { pageMetadata } from "@/lib/seo";
import VideoRemoverPage from "@/routes/remove.video";

export const metadata = pageMetadata(
  "/remove/video",
  "Video Logo Cleanup Workspace",
  "Review supported visible logo cleanup for your video. Processing depends on service availability and the source file.",
);

export default function Page() {
  return <VideoRemoverPage />;
}
