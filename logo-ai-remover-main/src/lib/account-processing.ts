export async function reserveLocal(tool: string, bytes: number, width?: number, height?: number) {
  return {
    id: "local-" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
    status: "reserved",
    offline: true,
  };
}

export async function finishLocal(id: string, success: boolean) {
  return { success: true };
}
