"use client";
import { useEffect } from "react";
import { emitToolEvent } from "@/lib/tool-events";
export function ToolMeasurement({ tool }: { tool: string }) {
  useEffect(() => {
    emitToolEvent("tool_opened", tool);
    const upload = (event: Event) => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.type === "file" &&
        event.target.files?.length
      )
        emitToolEvent("upload_started", tool);
    };
    const download = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[download]"))
        emitToolEvent("download_requested", tool);
    };
    document.addEventListener("change", upload);
    document.addEventListener("click", download);
    return () => {
      document.removeEventListener("change", upload);
      document.removeEventListener("click", download);
    };
  }, [tool]);
  return null;
}
