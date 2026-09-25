import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MAC_KEYBOARD_ROWS, type KeyConfig } from "./keyboardLayout";
import { KeyboardRow } from "./KeyboardRow";
import { KeyboardHeader } from "./KeyboardHeader";
import { InteractiveMouse } from "./InteractiveMouse";
import { HotkeyBar } from "./HotkeyBar";
import { CustomShowcaseCursor, type ClickRipple } from "./CustomShowcaseCursor";
import { executeShortcutAction } from "./keyboardActions";
import { playKeyClickSound } from "./soundEffects";
import { Command, Search, Sparkles, X, HelpCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export interface InteractiveKeyboardProps {
  enableSound?: boolean;
  className?: string;
  onKeyPress?: (code: string) => void;
}

export function InteractiveKeyboard({
  enableSound = true,
  className = "",
  onKeyPress,
}: InteractiveKeyboardProps) {
  const navigate = useNavigate();

  // Sound preference state persisted in localStorage
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("bellix_sound_enabled");
      return stored !== null ? stored === "true" : enableSound;
    }
    return enableSound;
  });

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("bellix_sound_enabled", String(next));
      }
      return next;
    });
  };

  // Keyboard synchronized pressed keys
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [lastAction, setLastAction] = useState<string>("Ready — Click any key or type");

  // Command palette and shortcuts modal
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Virtual cursor & ripples
  const showcaseRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [ripples, setRipples] = useState<ClickRipple[]>([]);
  const rippleCountRef = useRef(0);

  // Trigger key feedback & action
  const handleKeyTrigger = useCallback(
    (config: KeyConfig) => {
      if (soundOn) {
        playKeyClickSound(config.isAccent);
      }

      onKeyPress?.(config.code);

      // Visual press state
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.add(config.code);
        return next;
      });

      // Status text
      if (config.actionHint) {
        setLastAction(`[${config.label}]: ${config.actionHint}`);
      } else {
        setLastAction(`Pressed: ${config.label}`);
      }

      // Execute connected route action
      if (config.actionKey) {
        if (config.actionKey === "command") {
          setCommandPaletteOpen(true);
        } else if (config.actionKey === "esc") {
          setCommandPaletteOpen(false);
          setShortcutsHelpOpen(false);
        } else {
          executeShortcutAction(config.actionKey, navigate);
        }
      }

      // Smooth release animation timeout
      setTimeout(() => {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(config.code);
          return next;
        });
      }, 150);
    },
    [soundOn, onKeyPress, navigate]
  );

  // Global physical keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // CMD/CTRL + K shortcut -> open command palette
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // CMD/CTRL + / shortcut -> open shortcuts help
      if ((e.metaKey || e.ctrlKey) && (e.key === "/" || e.code === "Slash")) {
        e.preventDefault();
        setShortcutsHelpOpen((prev) => !prev);
        return;
      }

      // ESC -> close modals
      if (e.key === "Escape" || e.code === "Escape") {
        setCommandPaletteOpen(false);
        setShortcutsHelpOpen(false);
      }

      const allKeys = MAC_KEYBOARD_ROWS.flat();
      const matched = allKeys.find(
        (k) => k.code === e.code || k.label.toLowerCase() === e.key.toLowerCase()
      );

      if (matched) {
        // Prevent default for Space to avoid scrolling page when triggering inpaint
        if (e.code === "Space") {
          e.preventDefault();
        }
        handleKeyTrigger(matched);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const allKeys = MAC_KEYBOARD_ROWS.flat();
      const matched = allKeys.find((k) => k.code === e.code);
      if (matched) {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(matched.code);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyTrigger]);

  // Virtual mouse pointer inside showcase container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showcaseRef.current) return;
    const rect = showcaseRef.current.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showcaseRef.current) return;
    const rect = showcaseRef.current.getBoundingClientRect();
    const rippleId = ++rippleCountRef.current;
    const newRipple: ClickRipple = {
      id: rippleId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setRipples((prev) => [...prev.slice(-4), newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 600);
  };

  // Mouse Action Handlers
  const handleMouseAction = (actionId: string) => {
    if (actionId === "left-click") {
      setLastAction("Mouse: Left Click Triggered");
      executeShortcutAction("enter", navigate);
    } else if (actionId === "right-click") {
      setLastAction("Mouse: Quick Actions Menu");
    } else if (actionId === "scroll-up") {
      setLastAction("Mouse: Wheel Scroll Up");
    } else if (actionId === "scroll-down") {
      setLastAction("Mouse: Wheel Scroll Down");
    } else {
      executeShortcutAction(actionId, navigate);
    }
  };

  // Hotkey trigger from bottom chips
  const handleHotkeyClick = (actionId: string) => {
    executeShortcutAction(actionId, navigate);
  };

  // Filtered commands for CMD+K palette
  const commandList = [
    { label: "8K AI Upscaler", shortcut: "U", route: "/upscale", desc: "Super-resolution neural upscaling" },
    { label: "AI Background Remover", shortcut: "B", route: "/background-remover", desc: "Sub-pixel alpha edge background removal" },
    { label: "Video Watermark Remover", shortcut: "V", route: "/remove/video", desc: "Clean Gemini & Veo video watermarks" },
    { label: "PDF Watermark Cleaner", shortcut: "P", route: "/pdf-watermark-remover", desc: "Clean document stamps & logos" },
    { label: "Instant Inpaint Studio", shortcut: "SPACE", route: "/remove/image", desc: "Direct neural brush & inpaint" },
    { label: "Gemini Video Cleaner", shortcut: "G", route: "/gemini-video-watermark-remover", desc: "Specialized Gemini logo remover" },
    { label: "Pricing Plans", shortcut: "$", route: "/pricing", desc: "View flexible credit tiers" },
  ].filter(
    (c) =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`w-full max-w-5xl mx-auto px-2 sm:px-4 ${className}`}>
      {/* Outer Studio Showcase Container (30px border-radius, #FFFFFF / #FAFAFA, soft silver border & shadow) */}
      <div
        ref={showcaseRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="relative rounded-[30px] bg-gradient-to-b from-[#FFFFFF] via-[#FAFAFA] to-[#FFFFFF] p-4 sm:p-6 md:p-8 border border-[#E5E5E5] shadow-[0_20px_50px_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden"
      >
        {/* Virtual Cursor & Click Ripples inside showcase */}
        <CustomShowcaseCursor cursorPos={cursorPos} ripples={ripples} />

        {/* 1. Header with Brand Dot, Uppercase Typography & Lucide Controls */}
        <KeyboardHeader
          lastAction={lastAction}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          onExecutePrimary={() => executeShortcutAction("enter", navigate)}
        />

        {/* 2. Main Hardware Showcase: White Mac Keyboard + White Wireless Mouse */}
        <div className="mt-6 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
          {/* Mac-Style White Keyboard Chassis */}
          <div className="w-full lg:flex-1 max-w-[760px] rounded-2xl sm:rounded-3xl bg-[#F5F5F5] border border-[#E5E5E5] p-2.5 sm:p-4 md:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)]">
            {/* Inner Keybed Inset Plate */}
            <div className="overflow-x-auto pb-1 pt-1 scrollbar-none rounded-xl sm:rounded-2xl bg-[#EBEBEB]/70 p-2 sm:p-3 border border-[#E0E0E0] shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
              <div className="min-w-[590px] sm:min-w-0 space-y-1 sm:space-y-1.5 select-none">
                {MAC_KEYBOARD_ROWS.map((row, idx) => (
                  <KeyboardRow
                    key={idx}
                    row={row}
                    pressedKeys={pressedKeys}
                    onKeyClick={handleKeyTrigger}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Mac-Style White Precision Mouse */}
          <div className="shrink-0 flex items-center justify-center pt-2 lg:pt-0">
            <InteractiveMouse
              enableSound={soundOn}
              onAction={handleMouseAction}
            />
          </div>
        </div>

        {/* 3. Bottom Hotkey Badges Bar */}
        <HotkeyBar onSelectHotkey={handleHotkeyClick} />

        {/* Keyboard Helper Hint */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-mono text-[#737373]">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hover:text-[#171717] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <kbd className="px-1 py-0.5 rounded bg-[#F0F0F0] border border-[#E0E0E0] text-[9px]">⌘K</kbd>
            <span>Command Palette</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setShortcutsHelpOpen(true)}
            className="hover:text-[#171717] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <kbd className="px-1 py-0.5 rounded bg-[#F0F0F0] border border-[#E0E0E0] text-[9px]">⌘/</kbd>
            <span>Keyboard Shortcuts</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CMD + K: Apple Spotlight-Style Command Palette Modal                      */}
      {/* ========================================================================= */}
      {commandPaletteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="AI Studio Command Palette"
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#FFFFFF] border border-[#E5E5E5] shadow-[0_24px_60px_rgba(0,0,0,0.18)] overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5E5E5]">
              <Search className="size-4 text-[#737373] shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search AI engines, actions or shortcuts..."
                className="w-full bg-transparent text-sm text-[#171717] placeholder:text-[#A3A3A3] focus:outline-hidden font-sans"
              />
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(false)}
                className="size-6 rounded-md hover:bg-[#F5F5F5] flex items-center justify-center text-[#737373] hover:text-[#171717]"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Command Options */}
            <div className="max-h-72 overflow-y-auto p-2 space-y-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-mono font-bold text-[#737373] uppercase tracking-wider">
                Available Studio Actions
              </div>

              {commandList.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setCommandPaletteOpen(false);
                    navigate({ to: item.route });
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#FFF5F7] hover:border-[#E11D48]/30 border border-transparent transition-all cursor-pointer text-left group"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#171717] group-hover:text-[#E11D48]">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-[#737373]">{item.desc}</span>
                  </div>
                  <kbd className="px-2 py-0.5 rounded bg-[#F5F5F5] group-hover:bg-[#FFE4E9] text-[10px] font-mono text-[#525252] group-hover:text-[#E11D48]">
                    {item.shortcut}
                  </kbd>
                </button>
              ))}

              {commandList.length === 0 && (
                <div className="text-center py-6 text-xs text-[#737373]">
                  No matching shortcuts found for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 bg-[#FAFAFA] border-t border-[#E5E5E5] flex items-center justify-between text-[10px] font-mono text-[#737373]">
              <span>Navigation: Click or press Hotkey</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#FFFFFF] border border-[#E5E5E5]">ESC to close</kbd>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CMD + /: Shortcuts Help Overlay Modal                                     */}
      {/* ========================================================================= */}
      {shortcutsHelpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard Shortcuts Guide"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShortcutsHelpOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#FFFFFF] border border-[#E5E5E5] shadow-[0_24px_60px_rgba(0,0,0,0.18)] p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-4 text-[#E11D48]" />
                <h3 className="font-bold text-sm text-[#171717]">Bellix Studio Shortcuts</h3>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsHelpOpen(false)}
                className="size-6 rounded-md hover:bg-[#F5F5F5] flex items-center justify-center text-[#737373]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#525252]">8K AI Upscale</span>
                <kbd className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5] font-mono font-bold text-[#E11D48]">U</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#525252]">Video AI Watermark Remover</span>
                <kbd className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5] font-mono font-bold text-[#E11D48]">V</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#525252]">PDF Document Cleaner</span>
                <kbd className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5] font-mono font-bold text-[#E11D48]">P</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#525252]">Instant Neural Inpaint Fill</span>
                <kbd className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5] font-mono font-bold text-[#E11D48]">SPACE</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#F0F0F0]">
                <span className="text-[#525252]">Execute Primary Model</span>
                <kbd className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5] font-mono font-bold text-[#E11D48]">ENTER</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#525252]">Open Command Palette</span>
                <kbd className="px-2 py-0.5 rounded bg-[#F5F5F5] border border-[#E5E5E5] font-mono font-bold text-[#171717]">⌘K</kbd>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShortcutsHelpOpen(false)}
              className="w-full py-2 rounded-xl bg-[#171717] hover:bg-[#262626] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveKeyboard;
