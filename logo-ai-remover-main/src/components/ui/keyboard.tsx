"use client";
import React from "react";
import {
  InteractiveKeyboard,
  type InteractiveKeyboardProps,
} from "../keyboard/InteractiveKeyboard";

export type KeyboardProps = InteractiveKeyboardProps;

/**
 * PixelRefine Studio Keyboard — Redesigned Mac-Style Hardware Showcase
 * Complete with interactive white Mac keyboard, precision wireless mouse,
 * real routing, physical keyboard synchronization, and Web Audio click acoustics.
 */
export function Keyboard(props: KeyboardProps) {
  return <InteractiveKeyboard {...props} />;
}

export function KeyboardDemo() {
  return (
    <div className="flex w-full items-center justify-center py-6">
      <Keyboard enableSound />
    </div>
  );
}

export { InteractiveKeyboard };
export default Keyboard;
