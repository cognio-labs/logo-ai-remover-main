export type ActiveTab = "cutout" | "background" | "effects" | "adjust" | "design" | "text" | null;

export type BrushMode = "erase" | "restore";

export type BackgroundSubTab = "magic" | "photo" | "color" | "gradient";

export type BackgroundSetting = {
  type: "transparent" | "color" | "image" | "gradient";
  value: string; // hex code, gradient string, or image URL
  gradient?: string[]; // array of hex colors for linear gradient
  gradientDirection?: "to bottom" | "to right" | "to bottom right" | "radial";
  fit?: "cover" | "contain" | "fill";
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
  thumb?: string;
  url: string;
  category?: string;
};

export type ColorItem = {
  id: string;
  name: string;
  hex: string;
  badge?: string;
};

export interface TextLayer {
  id: string;
  type: "text";
  text: string;
  x: number; // 0 to 100 percentage of canvas width
  y: number; // 0 to 100 percentage of canvas height
  fontSize: number; // in px
  fontFamily: string;
  fontWeight: string | number; // e.g. "normal" | "bold" | "600" | "800"
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number; // in px
  lineHeight: number; // multiplier e.g. 1.2
  rotation: number; // -180 to 180 degrees
  opacity: number; // 0 to 1
  shadowColor?: string;
  shadowBlur?: number;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
}

export type EditorState = {
  originalImageUrl: string;
  cutoutImageUrl: string;
  maskCanvas: HTMLCanvasElement | null;
  maskPixels?: ImageData;
  activeTab: ActiveTab;
  isCompareActive: boolean;
  brush: BrushSettings;
  background: BackgroundSetting;
  shadow: ShadowSetting;
  activeFilter: string;
  adjust: AdjustSettings;
  textLayers: TextLayer[];
  selectedTextLayerId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  isProcessing: boolean;
};
