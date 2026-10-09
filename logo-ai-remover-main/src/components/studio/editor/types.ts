export type ActiveTab = "cutout" | "background" | "effects" | "adjust" | "design" | null;

export type BrushMode = "erase" | "restore";

export type BackgroundSubTab = "magic" | "photo" | "color";

export type BackgroundSetting = {
  type: "transparent" | "color" | "image";
  value: string; // hex code or image URL
  blur: number; // 0 to 40px
  blurEnabled: boolean;
};

export type ShadowSetting = {
  enabled: boolean;
  opacity: number; // 0 to 1
  blur: number; // 0 to 50
  offsetX: number;
  offsetY: number;
  color: string;
};

export type FilterPreset = {
  id: string;
  name: string;
  cssFilter: string;
  previewClass?: string;
};

export type CropAspect = "free" | "1:1" | "16:9" | "9:16" | "4:5" | "3:2";

export type AdjustSettings = {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  exposure: number; // -100 to 100
  cropAspect: CropAspect;
  borderWidth: number; // 0 to 20
  borderColor: string;
};

export type BrushSettings = {
  mode: BrushMode;
  size: number; // 5 to 100
  magicBrush: boolean;
};

export type BackgroundItem = {
  id: string;
  name: string;
  thumbnail: string;
  url: string;
  category?: string;
};

export type ColorItem = {
  id: string;
  name: string;
  hex: string;
  badge?: string;
};

export type EditorState = {
  originalImageUrl: string;
  cutoutImageUrl: string;
  maskCanvas: HTMLCanvasElement | null;
  activeTab: ActiveTab;
  isCompareActive: boolean;
  brush: BrushSettings;
  background: BackgroundSetting;
  shadow: ShadowSetting;
  activeFilter: string;
  adjust: AdjustSettings;
  canUndo: boolean;
  canRedo: boolean;
  isProcessing: boolean;
};
