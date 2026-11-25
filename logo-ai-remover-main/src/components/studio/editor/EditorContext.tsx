import React, { createContext, useContext, useReducer, type ReactNode } from "react";
import type {
  ActiveTab,
  AdjustSettings,
  BackgroundSetting,
  BrushSettings,
  CropAspect,
  EditorState,
  ShadowSetting,
  TextLayer,
} from "./types";

const INITIAL_BRUSH: BrushSettings = {
  mode: "erase",
  size: 30,
  magicBrush: true,
};

const INITIAL_BACKGROUND: BackgroundSetting = {
  type: "transparent",
  value: "",
  fit: "cover",
  blur: 0,
  blurEnabled: false,
};

const INITIAL_SHADOW: ShadowSetting = {
  enabled: false,
  opacity: 0.4,
  blur: 16,
  offsetX: 0,
  offsetY: 10,
  color: "#000000",
};

const INITIAL_ADJUST: AdjustSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  cropAspect: "free",
  borderWidth: 0,
  borderColor: "#FFFFFF",
};

type Action =
  | { type: "SET_BRUSH_SHAPE"; payload: "brush" | "rectangle" | "lasso" }
  | { type: "SET_ACTIVE_TAB"; payload: ActiveTab }
  | { type: "SET_COMPARE"; payload: boolean }
  | { type: "SET_BRUSH_MODE"; payload: "erase" | "restore" }
  | { type: "SET_BRUSH_SIZE"; payload: number }
  | { type: "TOGGLE_MAGIC_BRUSH" }
  | { type: "SET_BACKGROUND"; payload: Partial<BackgroundSetting> }
  | { type: "SET_SHADOW"; payload: Partial<ShadowSetting> }
  | { type: "SET_FILTER"; payload: string }
  | { type: "SET_ADJUST"; payload: Partial<AdjustSettings> }
  | { type: "RESET_ADJUST" }
  | { type: "RESET_ALL" }
  | { type: "PUSH_HISTORY"; pixels?: ImageData }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "SET_MASK_CANVAS"; payload: HTMLCanvasElement }
  | { type: "SET_PROCESSING"; payload: boolean }
  | { type: "SET_CUTOUT_IMAGE"; payload: string }
  | { type: "ADD_TEXT_LAYER"; payload: TextLayer }
  | { type: "UPDATE_TEXT_LAYER"; payload: { id: string; updates: Partial<TextLayer> } }
  | { type: "DELETE_TEXT_LAYER"; payload: string }
  | { type: "SELECT_TEXT_LAYER"; payload: string | null }
  | { type: "REORDER_TEXT_LAYERS"; payload: TextLayer[] };

interface HistorySnapshot {
  maskPixels?: ImageData;
  background: BackgroundSetting;
  shadow: ShadowSetting;
  activeFilter: string;
  adjust: AdjustSettings;
  textLayers: TextLayer[];
}

interface ContextType {
  state: EditorState;
  dispatch: React.Dispatch<Action>;
  undo: () => void;
  redo: () => void;
}

const EditorContext = createContext<ContextType | null>(null);

function createInitialState(
  originalUrl: string,
  cutoutUrl: string,
): EditorState & {
  historyStack: HistorySnapshot[];
  historyIndex: number;
} {
  const initialSnapshot: HistorySnapshot = {
    background: INITIAL_BACKGROUND,
    shadow: INITIAL_SHADOW,
    activeFilter: "none",
    adjust: INITIAL_ADJUST,
    textLayers: [],
  };

  return {
    originalImageUrl: originalUrl,
    cutoutImageUrl: cutoutUrl,
    maskCanvas: null,
    activeTab: null,
    isCompareActive: false,
    brush: INITIAL_BRUSH,
    background: INITIAL_BACKGROUND,
    shadow: INITIAL_SHADOW,
    activeFilter: "none",
    adjust: INITIAL_ADJUST,
    textLayers: [],
    selectedTextLayerId: null,
    canUndo: false,
    canRedo: false,
    isProcessing: false,
    historyStack: [initialSnapshot],
    historyIndex: 0,
  };
}

type InternalState = EditorState & {
  historyStack: HistorySnapshot[];
  historyIndex: number;
};

function editorReducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case "SET_BRUSH_SHAPE":
      return { ...state, brush: { ...state.brush, shape: action.payload } };
    case "SET_ACTIVE_TAB":
      return {
        ...state,
        activeTab: state.activeTab === action.payload ? null : action.payload,
      };

    case "SET_COMPARE":
      return {
        ...state,
        isCompareActive: action.payload,
      };

    case "SET_BRUSH_MODE":
      return {
        ...state,
        brush: { ...state.brush, mode: action.payload },
      };

    case "SET_BRUSH_SIZE":
      return {
        ...state,
        brush: { ...state.brush, size: action.payload },
      };

    case "TOGGLE_MAGIC_BRUSH":
      return {
        ...state,
        brush: { ...state.brush, magicBrush: !state.brush.magicBrush },
      };

    case "SET_BACKGROUND": {
      const nextBg = { ...state.background, ...action.payload };
      const newSnapshot: HistorySnapshot = {
        background: nextBg,
        shadow: state.shadow,
        activeFilter: state.activeFilter,
        adjust: state.adjust,
        maskPixels: state.maskPixels,
        textLayers: state.textLayers,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        background: nextBg,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "SET_SHADOW": {
      const nextShadow = { ...state.shadow, ...action.payload };
      const newSnapshot: HistorySnapshot = {
        background: state.background,
        shadow: nextShadow,
        activeFilter: state.activeFilter,
        adjust: state.adjust,
        maskPixels: state.maskPixels,
        textLayers: state.textLayers,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        shadow: nextShadow,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "SET_FILTER": {
      const nextFilter = action.payload;
      const newSnapshot: HistorySnapshot = {
        background: state.background,
        shadow: state.shadow,
        activeFilter: nextFilter,
        adjust: state.adjust,
        maskPixels: state.maskPixels,
        textLayers: state.textLayers,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        activeFilter: nextFilter,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "SET_ADJUST": {
      const nextAdjust = { ...state.adjust, ...action.payload };
      const newSnapshot: HistorySnapshot = {
        background: state.background,
        shadow: state.shadow,
        activeFilter: state.activeFilter,
        adjust: nextAdjust,
        maskPixels: state.maskPixels,
        textLayers: state.textLayers,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        adjust: nextAdjust,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "PUSH_HISTORY": {
      const newSnapshot: HistorySnapshot = {
        maskPixels: action.pixels || state.maskPixels,
        background: state.background,
        shadow: state.shadow,
        activeFilter: state.activeFilter,
        adjust: state.adjust,
        textLayers: state.textLayers,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        historyStack: newStack,
        maskPixels: newSnapshot.maskPixels,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "RESET_ADJUST": {
      const newSnapshot: HistorySnapshot = {
        background: state.background,
        shadow: state.shadow,
        activeFilter: state.activeFilter,
        adjust: INITIAL_ADJUST,
        textLayers: state.textLayers,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        adjust: INITIAL_ADJUST,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "RESET_ALL": {
      const newSnapshot: HistorySnapshot = {
        maskPixels: state.historyStack[0].maskPixels,
        background: INITIAL_BACKGROUND,
        shadow: INITIAL_SHADOW,
        activeFilter: "none",
        adjust: INITIAL_ADJUST,
        textLayers: [],
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        maskPixels: state.historyStack[0].maskPixels,
        background: INITIAL_BACKGROUND,
        shadow: INITIAL_SHADOW,
        activeFilter: "none",
        adjust: INITIAL_ADJUST,
        brush: INITIAL_BRUSH,
        textLayers: [],
        selectedTextLayerId: null,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const prevIdx = state.historyIndex - 1;
      const target = state.historyStack[prevIdx];
      return {
        ...state,
        background: target.background,
        maskPixels: state.historyStack
          .slice(0, prevIdx + 1)
          .reverse()
          .find((s) => s.maskPixels)?.maskPixels,
        shadow: target.shadow,
        activeFilter: target.activeFilter,
        adjust: target.adjust,
        textLayers: target.textLayers || [],
        historyIndex: prevIdx,
        canUndo: prevIdx > 0,
        canRedo: true,
      };
    }

    case "REDO": {
      if (state.historyIndex >= state.historyStack.length - 1) return state;
      const nextIdx = state.historyIndex + 1;
      const target = state.historyStack[nextIdx];
      return {
        ...state,
        background: target.background,
        maskPixels: state.historyStack
          .slice(0, nextIdx + 1)
          .reverse()
          .find((s) => s.maskPixels)?.maskPixels,
        shadow: target.shadow,
        activeFilter: target.activeFilter,
        adjust: target.adjust,
        textLayers: target.textLayers || [],
        historyIndex: nextIdx,
        canUndo: true,
        canRedo: nextIdx < state.historyStack.length - 1,
      };
    }

    case "SET_CUTOUT_IMAGE":
      return {
        ...state,
        cutoutImageUrl: action.payload,
      };

    case "ADD_TEXT_LAYER": {
      const updatedLayers = [...state.textLayers, action.payload];
      const newSnapshot: HistorySnapshot = {
        background: state.background,
        shadow: state.shadow,
        activeFilter: state.activeFilter,
        adjust: state.adjust,
        maskPixels: state.maskPixels,
        textLayers: updatedLayers,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        textLayers: updatedLayers,
        selectedTextLayerId: action.payload.id,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "UPDATE_TEXT_LAYER": {
      const updatedLayers = state.textLayers.map((layer) =>
        layer.id === action.payload.id ? { ...layer, ...action.payload.updates } : layer,
      );
      const newSnapshot: HistorySnapshot = {
        background: state.background,
        shadow: state.shadow,
        activeFilter: state.activeFilter,
        adjust: state.adjust,
        maskPixels: state.maskPixels,
        textLayers: updatedLayers,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        textLayers: updatedLayers,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "DELETE_TEXT_LAYER": {
      const updatedLayers = state.textLayers.filter((layer) => layer.id !== action.payload);
      const newSnapshot: HistorySnapshot = {
        background: state.background,
        shadow: state.shadow,
        activeFilter: state.activeFilter,
        adjust: state.adjust,
        maskPixels: state.maskPixels,
        textLayers: updatedLayers,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        textLayers: updatedLayers,
        selectedTextLayerId:
          state.selectedTextLayerId === action.payload ? null : state.selectedTextLayerId,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "SELECT_TEXT_LAYER":
      return {
        ...state,
        selectedTextLayerId: action.payload,
      };

    case "REORDER_TEXT_LAYERS": {
      const newSnapshot: HistorySnapshot = {
        background: state.background,
        shadow: state.shadow,
        activeFilter: state.activeFilter,
        adjust: state.adjust,
        maskPixels: state.maskPixels,
        textLayers: action.payload,
      };
      const newStack = state.historyStack.slice(0, state.historyIndex + 1);
      newStack.push(newSnapshot);
      return {
        ...state,
        textLayers: action.payload,
        historyStack: newStack,
        historyIndex: newStack.length - 1,
        canUndo: true,
        canRedo: false,
      };
    }

    case "SET_MASK_CANVAS":
      return {
        ...state,
        maskCanvas: action.payload,
        maskPixels: action.payload
          .getContext("2d")
          ?.getImageData(0, 0, action.payload.width, action.payload.height),
        historyStack: state.historyStack.map((snapshot, index) =>
          index === 0
            ? {
                ...snapshot,
                maskPixels: action.payload
                  .getContext("2d")
                  ?.getImageData(0, 0, action.payload.width, action.payload.height),
              }
            : snapshot,
        ),
      };

    case "SET_PROCESSING":
      return {
        ...state,
        isProcessing: action.payload,
      };

    default:
      return state;
  }
}

export function EditorProvider({
  originalUrl,
  cutoutUrl,
  children,
}: {
  originalUrl: string;
  cutoutUrl: string;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(editorReducer, createInitialState(originalUrl, cutoutUrl));

  const undo = () => dispatch({ type: "UNDO" });
  const redo = () => dispatch({ type: "REDO" });

  return (
    <EditorContext.Provider value={{ state, dispatch, undo, redo }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
