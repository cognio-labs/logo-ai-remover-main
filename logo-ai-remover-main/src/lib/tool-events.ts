export type ToolEvent =
  | "tool_opened"
  | "upload_started"
  | "processing_completed"
  | "processing_failed"
  | "download_requested";
// No tracker, cookie, filename, job ID, media URL, or user identity is collected here.
// A consent-aware adapter may subscribe to this event after analytics setup.
export function emitToolEvent(event: ToolEvent, tool: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("bellix:tool-event", { detail: { event, tool } }));
}
