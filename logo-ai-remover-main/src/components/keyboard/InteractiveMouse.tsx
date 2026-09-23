import React, { useState, useRef } from "react";
import { MouseButton } from "./MouseButton";
import { MouseWheel } from "./MouseWheel";
import { playMouseClickSound, playWheelTickSound } from "./soundEffects";
import { Sparkles, Zap, Video, Image, FileText, Check, Volume2, VolumeX } from "lucide-react";

export interface InteractiveMouseProps {
  enableSound?: boolean;
  onAction?: (actionId: string) => void;
  className?: string;
}

export function InteractiveMouse({
  enableSound = true,
  onAction,
  className = "",
}: InteractiveMouseProps) {
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [soundOn, setSoundOn] = useState(enableSound);
  const mouseRef = useRef<HTMLDivElement>(null);

  // Subtle 3D tilt when hovering mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mouseRef.current) return;
    const rect = mouseRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 6, y: y * 6 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setLeftPressed(false);
    setRightPressed(false);
  };

  // Left click trigger
  const handleLeftClick = () => {
    if (soundOn) playMouseClickSound(false);
    setLeftPressed(true);
    setShowContextMenu(false);
    onAction?.("left-click");
    setTimeout(() => setLeftPressed(false), 120);
  };

  // Right click trigger
  const handleRightClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (soundOn) playMouseClickSound(true);
    setRightPressed(true);
    setContextPos({ x: 60, y: 30 });
    setShowContextMenu((prev) => !prev);
    onAction?.("right-click");
    setTimeout(() => setRightPressed(false), 140);
  };

  // Scroll wheel trigger
  const handleWheelScroll = (deltaY: number) => {
    if (soundOn) playWheelTickSound();
    onAction?.(deltaY > 0 ? "scroll-down" : "scroll-up");
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D Apple-style White Wireless Mouse */}
      <div
        ref={mouseRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => {
          e.preventDefault();
          handleRightClick(e);
        }}
        style={{
          transform: `perspective(600px) rotateX(${-tilt.y}deg) rotateY(${tilt.x}deg)`,
        }}
        className="relative w-28 sm:w-32 h-44 sm:h-48 rounded-[38px] bg-gradient-to-b from-[#FFFFFF] via-[#FAFAFA] to-[#F0F0F0] border border-[#E5E5E5] shadow-[0_12px_28px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] transition-transform duration-150 ease-out flex flex-col items-center justify-between p-1.5"
      >
        {/* Top Click Zones with Center Seam & Wheel */}
        <div className="relative w-full h-24 flex items-stretch border-b border-[#E8E8E8]/70">
          {/* Left Click Area */}
          <MouseButton
            side="left"
            isPressed={leftPressed}
            onPress={handleLeftClick}
          />

          {/* Central Scroll Wheel Slot */}
          <div className="absolute left-1/2 top-4 -translate-x-1/2 z-20 flex flex-col items-center">
            <MouseWheel onScroll={handleWheelScroll} />
          </div>

          {/* Right Click Area */}
          <MouseButton
            side="right"
            isPressed={rightPressed}
            onPress={() => handleRightClick()}
          />
        </div>

        {/* Minimal Palm Rest with Brand Dot */}
        <div className="flex-1 w-full flex flex-col items-center justify-end pb-4 pt-2">
          {/* Subtle Apple-style aluminum logo mark */}
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <span className="size-1.5 rounded-full bg-[#E11D48]" />
            <span className="text-[8px] font-mono tracking-widest text-[#737373] uppercase font-bold">
              Bellix.us
            </span>
          </div>

          {/* Optical sensor status indicator */}
          <span className="mt-1 text-[7px] font-mono text-[#A3A3A3]">
            {leftPressed ? "ACTIVE CLICK" : rightPressed ? "CONTEXT MENU" : "4K OPTICAL"}
          </span>
        </div>
      </div>

      {/* Mouse caption */}
      <span className="mt-2.5 text-[10px] font-mono font-medium text-[#737373] tracking-tight">
        Precision Wireless Mouse
      </span>

      {/* Right-Click Premium Context Menu */}
      {showContextMenu && (
        <div
          role="menu"
          aria-label="AI Studio Quick Actions"
          className="absolute z-50 -top-6 -right-2 sm:-right-8 w-48 rounded-2xl bg-[#FFFFFF] border border-[#E5E5E5] shadow-[0_16px_36px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.06)] p-1.5 text-xs text-[#171717] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 border-b border-[#F0F0F0] text-[10px] font-bold text-[#737373] uppercase tracking-wider flex items-center justify-between">
            <span>Quick Studio Actions</span>
            <span className="size-1.5 rounded-full bg-[#E11D48]" />
          </div>

          <div className="space-y-0.5 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onAction?.("space");
                setShowContextMenu(false);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#F5F5F5] transition-colors cursor-pointer text-left text-xs"
            >
              <div className="flex items-center gap-2">
                <Zap className="size-3 text-[#E11D48]" />
                <span className="font-medium">Instant Inpaint</span>
              </div>
              <span className="text-[9px] font-mono text-[#737373] bg-[#F0F0F0] px-1 rounded">␣</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onAction?.("u");
                setShowContextMenu(false);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#F5F5F5] transition-colors cursor-pointer text-left text-xs"
            >
              <div className="flex items-center gap-2">
                <Image className="size-3 text-[#E11D48]" />
                <span className="font-medium">8K AI Upscale</span>
              </div>
              <span className="text-[9px] font-mono text-[#737373] bg-[#F0F0F0] px-1 rounded">U</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onAction?.("v");
                setShowContextMenu(false);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#F5F5F5] transition-colors cursor-pointer text-left text-xs"
            >
              <div className="flex items-center gap-2">
                <Video className="size-3 text-[#E11D48]" />
                <span className="font-medium">Video AI Clean</span>
              </div>
              <span className="text-[9px] font-mono text-[#737373] bg-[#F0F0F0] px-1 rounded">V</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onAction?.("p");
                setShowContextMenu(false);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#F5F5F5] transition-colors cursor-pointer text-left text-xs"
            >
              <div className="flex items-center gap-2">
                <FileText className="size-3 text-[#E11D48]" />
                <span className="font-medium">PDF Cleaner</span>
              </div>
              <span className="text-[9px] font-mono text-[#737373] bg-[#F0F0F0] px-1 rounded">P</span>
            </button>
          </div>

          <div className="pt-1 border-t border-[#F0F0F0]">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSoundOn((v) => !v);
                setShowContextMenu(false);
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#F5F5F5] transition-colors cursor-pointer text-left text-xs text-[#737373]"
            >
              <div className="flex items-center gap-2">
                {soundOn ? <Volume2 className="size-3" /> : <VolumeX className="size-3" />}
                <span>Toggle Acoustics</span>
              </div>
              <span className="text-[9px] font-mono text-[#A3A3A3]">{soundOn ? "ON" : "OFF"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
