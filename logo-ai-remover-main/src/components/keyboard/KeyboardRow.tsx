import React from "react";
import { type KeyConfig } from "./keyboardLayout";
import { KeyboardKey } from "./KeyboardKey";

export interface KeyboardRowProps {
  row: KeyConfig[];
  pressedKeys: Set<string>;
  onKeyClick: (config: KeyConfig) => void;
}

export function KeyboardRow({ row, pressedKeys, onKeyClick }: KeyboardRowProps) {
  return (
    <div className="flex gap-1 sm:gap-1.5 justify-center items-center">
      {row.map((config) => (
        <KeyboardKey
          key={config.code}
          config={config}
          isPressed={pressedKeys.has(config.code)}
          onPress={onKeyClick}
        />
      ))}
    </div>
  );
}
