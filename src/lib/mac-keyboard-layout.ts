/** Width/role variant for a Magic Keyboard keycap slot. */
export type MacKeyCapSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "space"
  | "touch"
  | "arrows";

/** Immutable descriptor for a single ANSI Magic Keyboard keycap. */
export interface MacKeyCap {
  readonly id: string;
  readonly label?: string;
  readonly sub?: string;
  readonly size?: MacKeyCapSize;
  readonly homing?: boolean;
}

/** Canonical 6-row ANSI 78-key Magic Keyboard layout (with full-height function row and Touch ID). */
export const MAC_KEYBOARD_ROWS: readonly (readonly MacKeyCap[])[] = [
  [
    { id: "esc", label: "esc", size: "sm" },
    { id: "f1", label: "F1" },
    { id: "f2", label: "F2" },
    { id: "f3", label: "F3" },
    { id: "f4", label: "F4" },
    { id: "f5", label: "F5" },
    { id: "f6", label: "F6" },
    { id: "f7", label: "F7" },
    { id: "f8", label: "F8" },
    { id: "f9", label: "F9" },
    { id: "f10", label: "F10" },
    { id: "f11", label: "F11" },
    { id: "f12", label: "F12" },
    { id: "touch", size: "touch" },
  ],
  [
    { id: "grave", sub: "~", label: "`" },
    { id: "1", sub: "!", label: "1" },
    { id: "2", sub: "@", label: "2" },
    { id: "3", sub: "#", label: "3" },
    { id: "4", sub: "$", label: "4" },
    { id: "5", sub: "%", label: "5" },
    { id: "6", sub: "^", label: "6" },
    { id: "7", sub: "&", label: "7" },
    { id: "8", sub: "*", label: "8" },
    { id: "9", sub: "(", label: "9" },
    { id: "0", sub: ")", label: "0" },
    { id: "minus", sub: "_", label: "-" },
    { id: "equal", sub: "+", label: "=" },
    { id: "delete", label: "⌫", size: "md" },
  ],
  [
    { id: "tab", label: "⇥", size: "md" },
    { id: "q", label: "Q" },
    { id: "w", label: "W" },
    { id: "e", label: "E" },
    { id: "r", label: "R" },
    { id: "t", label: "T" },
    { id: "y", label: "Y" },
    { id: "u", label: "U" },
    { id: "i", label: "I" },
    { id: "o", label: "O" },
    { id: "p", label: "P" },
    { id: "lbracket", sub: "{", label: "[" },
    { id: "rbracket", sub: "}", label: "]" },
    { id: "backslash", sub: "|", label: "\\" },
  ],
  [
    { id: "caps", label: "⇪", size: "lg" },
    { id: "a", label: "A" },
    { id: "s", label: "S" },
    { id: "d", label: "D" },
    { id: "f", label: "F", homing: true },
    { id: "g", label: "G" },
    { id: "h", label: "H" },
    { id: "j", label: "J", homing: true },
    { id: "k", label: "K" },
    { id: "l", label: "L" },
    { id: "semicolon", sub: ":", label: ";" },
    { id: "quote", sub: "\"", label: "'" },
    { id: "return", label: "⏎", size: "lg" },
  ],
  [
    { id: "lshift", label: "⇧", size: "xl" },
    { id: "z", label: "Z" },
    { id: "x", label: "X" },
    { id: "c", label: "C" },
    { id: "v", label: "V" },
    { id: "b", label: "B" },
    { id: "n", label: "N" },
    { id: "m", label: "M" },
    { id: "comma", sub: "<", label: "," },
    { id: "period", sub: ">", label: "." },
    { id: "slash", sub: "?", label: "/" },
    { id: "rshift", label: "⇧", size: "xl" },
  ],
  [
    { id: "fn", label: "fn" },
    { id: "ctrl", label: "⌃" },
    { id: "lopt", label: "⌥" },
    { id: "lcmd", label: "⌘", size: "sm" },
    { id: "space", label: "", size: "space" },
    { id: "rcmd", label: "⌘", size: "sm" },
    { id: "ropt", label: "⌥" },
    { id: "left", label: "◀" },
    { id: "updown", sub: "▲", label: "▼", size: "arrows" },
    { id: "right", label: "▶" },
  ],
];
