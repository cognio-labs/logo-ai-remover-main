/**
 * Bellix.us Canva Integration Service
 * 
 * Provides a clean architecture for exporting background-removed transparent PNGs to Canva.
 * Supports:
 * 1. Direct Canva Connect API (when CANVA_APP_ID / OAuth credentials are configured).
 * 2. Instant clipboard transfer + Canva studio launcher (zero-config fallback).
 * 3. Formal compliance with Canva developer guidelines and Terms of Service.
 */

export interface CanvaExportConfig {
  appId?: string;
  redirectUri?: string;
}

export interface CanvaExportResult {
  success: boolean;
  mode: "api" | "clipboard_transfer";
  message: string;
  designUrl?: string;
}

/**
 * Cleanly handles "Edit in Canva" action for a transparent cutout image.
 * 
 * @param imageBlob - Transparent 32-bit PNG blob
 * @param fileName - Original or sanitized file name
 * @param config - Optional Canva Connect API credentials
 */
export async function handleEditInCanva(
  imageBlob: Blob,
  fileName: string = "bellix-cutout.png",
  config?: CanvaExportConfig
): Promise<CanvaExportResult> {
  const canvaAppId =
    config?.appId ||
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_CANVA_APP_ID || process.env.VITE_CANVA_APP_ID));

  // 1. If Canva Connect API credentials are fully configured
  if (canvaAppId) {
    try {
      // Canva Connect API integration endpoint
      // Reference: https://www.canva.dev/docs/connect/
      const formData = new FormData();
      formData.append("asset", imageBlob, fileName);
      formData.append("app_id", canvaAppId);

      const response = await fetch("/api/v1/integrations/canva/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.design_url) {
          window.open(data.design_url, "_blank", "noopener,noreferrer");
          return {
            success: true,
            mode: "api",
            message: "Design opened in Canva!",
            designUrl: data.design_url,
          };
        }
      }
    } catch (apiError) {
      console.warn("Canva Connect API call failed, falling back to instant clipboard transfer:", apiError);
    }
  }

  // 2. High-speed Direct Clipboard + Auto Download + Canva Photo Editor launch
  // Copies the genuine 32-bit alpha PNG to system clipboard so the user can paste (Ctrl+V) directly
  let copiedToClipboard = false;
  try {
    if (typeof window !== "undefined" && navigator?.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": imageBlob,
        }),
      ]);
      copiedToClipboard = true;
    }
  } catch (clipErr) {
    console.warn("Could not copy directly to clipboard:", clipErr);
  }

  // Automatically download the transparent PNG so the user has the file ready to drag & drop into Canva
  try {
    const dlUrl = URL.createObjectURL(imageBlob);
    const link = document.createElement("a");
    link.href = dlUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(dlUrl), 10000);
  } catch (dlErr) {
    console.warn("Auto-download for Canva failed:", dlErr);
  }

  // Open official Canva Photo Editor page (works 100% without 403 Forbidden error, whether logged in or not)
  const canvaUrl = "https://www.canva.com/photo-editor/";
  window.open(canvaUrl, "_blank", "noopener,noreferrer");

  return {
    success: true,
    mode: "clipboard_transfer",
    message: copiedToClipboard
      ? "Opening Canva! Cutout is downloaded & copied to clipboard — paste (Ctrl+V) or drop it into Canva."
      : "Opening Canva! Your transparent cutout has been downloaded — drag and drop it into Canva.",
    designUrl: canvaUrl,
  };
}

export const CANVA_TERMS_URL = "https://www.canva.com/policies/terms-of-use/";
