import { toast } from "sonner";

export interface ShortcutAction {
  id: string;
  key: string;
  name: string;
  description: string;
  route?: string;
  handler?: () => void;
}

export const SHORTCUT_ACTIONS: Record<string, ShortcutAction> = {
  u: {
    id: "upscale",
    key: "U",
    name: "8K AI Upscaler",
    description: "Launch ultra-resolution 8K neural upscaling",
    route: "/upscale",
  },
  v: {
    id: "video",
    key: "V",
    name: "Video AI Remover",
    description: "Launch temporal video watermark cleanup",
    route: "/remove/video",
  },
  p: {
    id: "pdf",
    key: "P",
    name: "PDF Cleaner",
    description: "Clean watermarks and stamps from PDF documents",
    route: "/pdf-watermark-remover",
  },
  enter: {
    id: "enter",
    key: "⏎ ENTER",
    name: "Execute Neural AI",
    description: "Run primary AI watermark removal model",
    route: "/remove/image",
  },
  space: {
    id: "space",
    key: "SPACE",
    name: "Instant Inpaint",
    description: "Perform real-time inpaint fill on active canvas",
    route: "/remove/image",
  },
  esc: {
    id: "esc",
    key: "⎋ ESC",
    name: "Close / Reset",
    description: "Dismiss current palette or reset active selection",
  },
};

export function executeShortcutAction(
  actionKey: string,
  navigate?: (opts: { to: string }) => void,
  customCallbacks?: Partial<Record<string, () => void>>
) {
  const normalized = actionKey.toLowerCase();
  const action = SHORTCUT_ACTIONS[normalized];

  if (customCallbacks?.[normalized]) {
    customCallbacks[normalized]!();
    return;
  }

  if (action) {
    if (action.route && navigate) {
      toast.info(`[Hotkey ${action.key}]: Opening ${action.name}...`, {
        description: action.description,
        duration: 2000,
      });
      navigate({ to: action.route });
    } else {
      toast.success(`[Hotkey ${action.key}]: ${action.name} triggered!`, {
        duration: 1800,
      });
    }
  }
}
