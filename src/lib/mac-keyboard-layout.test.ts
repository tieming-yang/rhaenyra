import { describe, expect, it } from "vitest";
import { MAC_KEYBOARD_ROWS } from "./mac-keyboard-layout";

describe("MAC_KEYBOARD_ROWS", () => {
  it("defines 6 ANSI rows representing a 78-key Magic Keyboard with Touch ID", () => {
    expect(MAC_KEYBOARD_ROWS).toHaveLength(6);
    const allKeys = MAC_KEYBOARD_ROWS.flat();
    // 77 visual slots where up/down half-height arrows share one stacked slot = 78 physical keys
    expect(allKeys).toHaveLength(77);

    const ids = allKeys.map((key) => key.id);
    expect(new Set(ids).size).toBe(allKeys.length);
  });

  it("includes full-height function row with esc, F1-F12, and Touch ID key", () => {
    const fnRow = MAC_KEYBOARD_ROWS[0];
    expect(fnRow).toHaveLength(14);
    expect(fnRow[0]).toMatchObject({ id: "esc", label: "esc", size: "sm" });
    expect(fnRow.at(-1)).toMatchObject({ id: "touch", size: "touch" });
  });

  it("marks tactile homing bars exclusively on F and J", () => {
    const homingIds = MAC_KEYBOARD_ROWS.flat()
      .filter((key) => key.homing)
      .map((key) => key.id);
    expect(homingIds).toEqual(["f", "j"]);
  });
});
