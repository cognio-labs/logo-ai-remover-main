import { accountApi } from "@/components/account/AccountPanel";

export async function reserveLocal(tool: string, bytes: number, width?: number, height?: number) {
  try {
    const res = await accountApi("jobs/reserve", {
      tool,
      request_key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      metadata: { bytes, width, height },
    });
    return res;
  } catch (err) {
    // If account/database is not configured or user is guest, return local reservation
    // so image and background processing are never blocked.
    return {
      id: "local-" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
      status: "reserved",
      offline: true,
    };
  }
}

export async function finishLocal(id: string, success: boolean) {
  if (!id || id.startsWith("local-")) {
    return { success: true };
  }
  try {
    return await accountApi("jobs/browser-result", { job_id: id, success });
  } catch {
    return { success: true };
  }
}
