export interface KeyConfig {
  code: string;
  label: string;
  sub?: string;
  macSymbol?: string;
  width?: string;
  isSpecial?: boolean;
  isAccent?: boolean;
  actionKey?: "u" | "v" | "p" | "enter" | "space" | "esc" | "command";
  actionHint?: string;
  ariaLabel?: string;
}

export const MAC_KEYBOARD_ROWS: KeyConfig[][] = [
  // Row 1: Function / Number Row
  [
    { code: "Escape", label: "ESC", macSymbol: "⎋", width: "w-8 sm:w-10 md:w-12", isSpecial: true, actionKey: "esc", actionHint: "Reset / Close", ariaLabel: "Escape key" },
    { code: "Digit1", label: "1", sub: "!", ariaLabel: "1 key" },
    { code: "Digit2", label: "2", sub: "@", ariaLabel: "2 key" },
    { code: "Digit3", label: "3", sub: "#", ariaLabel: "3 key" },
    { code: "Digit4", label: "4", sub: "$", ariaLabel: "4 key" },
    { code: "Digit5", label: "5", sub: "%", ariaLabel: "5 key" },
    { code: "Digit6", label: "6", sub: "^", ariaLabel: "6 key" },
    { code: "Digit7", label: "7", sub: "&", ariaLabel: "7 key" },
    { code: "Digit8", label: "8", sub: "*", ariaLabel: "8 key" },
    { code: "Digit9", label: "9", sub: "(", ariaLabel: "9 key" },
    { code: "Digit0", label: "0", sub: ")", ariaLabel: "0 key" },
    { code: "Minus", label: "-", sub: "_", ariaLabel: "Minus key" },
    { code: "Equal", label: "=", sub: "+", ariaLabel: "Equal key" },
    { code: "Backspace", label: "DELETE", macSymbol: "⌫", width: "w-10 sm:w-12 md:w-14", isSpecial: true, ariaLabel: "Delete key" },
  ],
  // Row 2: QWERTY + U (Upscale) + P (PDF)
  [
    { code: "Tab", label: "TAB", macSymbol: "⇥", width: "w-9 sm:w-11 md:w-13", isSpecial: true, ariaLabel: "Tab key" },
    { code: "KeyQ", label: "Q", ariaLabel: "Q key" },
    { code: "KeyW", label: "W", ariaLabel: "W key" },
    { code: "KeyE", label: "E", ariaLabel: "E key" },
    { code: "KeyR", label: "R", ariaLabel: "R key" },
    { code: "KeyT", label: "T", ariaLabel: "T key" },
    { code: "KeyY", label: "Y", ariaLabel: "Y key" },
    { code: "KeyU", label: "U", isAccent: true, actionKey: "u", actionHint: "8K AI Upscaler", ariaLabel: "U key - 8K Upscale" },
    { code: "KeyI", label: "I", ariaLabel: "I key" },
    { code: "KeyO", label: "O", ariaLabel: "O key" },
    { code: "KeyP", label: "P", isAccent: true, actionKey: "p", actionHint: "PDF Watermark Cleaner", ariaLabel: "P key - PDF Cleaner" },
    { code: "BracketLeft", label: "[", sub: "{", ariaLabel: "Left bracket" },
    { code: "BracketRight", label: "]", sub: "}", ariaLabel: "Right bracket" },
    { code: "Backslash", label: "\\", sub: "|", width: "w-8 sm:w-10 md:w-12", ariaLabel: "Backslash" },
  ],
  // Row 3: ASDF + ENTER (Neural Inpaint)
  [
    { code: "CapsLock", label: "CAPS", macSymbol: "⇪", width: "w-10 sm:w-12 md:w-14", isSpecial: true, ariaLabel: "Caps Lock key" },
    { code: "KeyA", label: "A", ariaLabel: "A key" },
    { code: "KeyS", label: "S", ariaLabel: "S key" },
    { code: "KeyD", label: "D", ariaLabel: "D key" },
    { code: "KeyF", label: "F", ariaLabel: "F key" },
    { code: "KeyG", label: "G", ariaLabel: "G key" },
    { code: "KeyH", label: "H", ariaLabel: "H key" },
    { code: "KeyJ", label: "J", ariaLabel: "J key" },
    { code: "KeyK", label: "K", ariaLabel: "K key" },
    { code: "KeyL", label: "L", ariaLabel: "L key" },
    { code: "Semicolon", label: ";", sub: ":", ariaLabel: "Semicolon" },
    { code: "Quote", label: "'", sub: '"', ariaLabel: "Quote" },
    { code: "Enter", label: "ENTER", macSymbol: "⏎", width: "w-12 sm:w-16 md:w-18", isAccent: true, actionKey: "enter", actionHint: "Execute Neural AI", ariaLabel: "Enter key - Execute Neural AI" },
  ],
  // Row 4: ZXCV + V (Video AI)
  [
    { code: "ShiftLeft", label: "SHIFT", macSymbol: "⇧", width: "w-12 sm:w-15 md:w-17", isSpecial: true, ariaLabel: "Left Shift key" },
    { code: "KeyZ", label: "Z", ariaLabel: "Z key" },
    { code: "KeyX", label: "X", ariaLabel: "X key" },
    { code: "KeyC", label: "C", ariaLabel: "C key" },
    { code: "KeyV", label: "V", isAccent: true, actionKey: "v", actionHint: "Video AI Remover", ariaLabel: "V key - Video AI" },
    { code: "KeyB", label: "B", ariaLabel: "B key" },
    { code: "KeyN", label: "N", ariaLabel: "N key" },
    { code: "KeyM", label: "M", ariaLabel: "M key" },
    { code: "Comma", label: ",", sub: "<", ariaLabel: "Comma" },
    { code: "Period", label: ".", sub: ">", ariaLabel: "Period" },
    { code: "Slash", label: "/", sub: "?", ariaLabel: "Slash" },
    { code: "ShiftRight", label: "SHIFT", macSymbol: "⇧", width: "w-12 sm:w-15 md:w-17", isSpecial: true, ariaLabel: "Right Shift key" },
  ],
  // Row 5: Mac Modifiers & Space
  [
    { code: "ControlLeft", label: "CTRL", macSymbol: "⌃", width: "w-8 sm:w-10 md:w-12", isSpecial: true, ariaLabel: "Control key" },
    { code: "AltLeft", label: "OPTION", macSymbol: "⌥", width: "w-8 sm:w-10 md:w-12", isSpecial: true, ariaLabel: "Option key" },
    { code: "MetaLeft", label: "COMMAND", macSymbol: "⌘", width: "w-10 sm:w-13 md:w-15", isSpecial: true, actionKey: "command", actionHint: "Command Palette", ariaLabel: "Command key" },
    { code: "Space", label: "SPACE — INSTANT INPAINT", macSymbol: "␣", width: "flex-1 min-w-[120px] sm:min-w-[180px] md:min-w-[240px]", isAccent: true, actionKey: "space", actionHint: "Instant Inpaint Trigger", ariaLabel: "Spacebar - Instant Inpaint" },
    { code: "MetaRight", label: "COMMAND", macSymbol: "⌘", width: "w-10 sm:w-13 md:w-15", isSpecial: true, ariaLabel: "Right Command key" },
    { code: "AltRight", label: "OPTION", macSymbol: "⌥", width: "w-8 sm:w-10 md:w-12", isSpecial: true, ariaLabel: "Right Option key" },
    { code: "ControlRight", label: "CTRL", macSymbol: "⌃", width: "w-8 sm:w-10 md:w-12", isSpecial: true, ariaLabel: "Right Control key" },
  ],
];
