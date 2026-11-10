import { describe, expect, it } from "vitest";
import {
  MOUNTAIN_PEAK_KINDS,
  MOUNTAIN_VIEWBOX,
  MOUNTAIN_VIEWBOX_HEIGHT,
  MOUNTAIN_VIEWBOX_WIDTH,
  buildMountainCardProfile,
  getMountainCardProfile,
  type MountainPeakKind,
  type MountainValleyFlank,
} from "./mountain-card-shape";

function extractPathCoordinates(pathData: string): Array<{ readonly x: number; readonly y: number }> {
  const numbers = pathData.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  expect(numbers.length).toBeGreaterThan(0);
  expect(numbers.length % 2).toBe(0);

  const pairs: Array<{ readonly x: number; readonly y: number }> = [];
  for (let index = 0; index < numbers.length; index += 2) {
    pairs.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return pairs;
}

describe("getMountainCardProfile and buildMountainCardProfile", () => {
  it("rotates deterministically across all four Hokkaido peak kinds and alternates valley flanks", () => {
    const profiles = Array.from({ length: 8 }, (_, index) => getMountainCardProfile(index));

    expect(profiles.map((profile) => profile.kind)).toEqual([
      "yotei-cone",
      "annupuri-twin",
      "asahidake-ridge",
      "moiwa-shoulder",
      "yotei-cone",
      "annupuri-twin",
      "asahidake-ridge",
      "moiwa-shoulder",
    ]);

    expect(profiles.map((profile) => profile.flank)).toEqual([
      "left",
      "right",
      "left",
      "right",
      "left",
      "right",
      "left",
      "right",
    ]);
  });

  it("produces closed silhouettes and bounded finite SVG coordinates across all peak and flank variants", () => {
    const flanks: readonly MountainValleyFlank[] = ["left", "right"];

    for (const kind of MOUNTAIN_PEAK_KINDS) {
      for (const flank of flanks) {
        const profile = buildMountainCardProfile(kind, flank);
        expect(profile.viewBox).toBe(MOUNTAIN_VIEWBOX);

        expect(profile.silhouettePath.startsWith("M ")).toBe(true);
        expect(profile.silhouettePath.endsWith(" Z")).toBe(true);
        expect(profile.snowcapPath.endsWith(" Z")).toBe(true);
        expect(profile.sunlitFacetPath.endsWith(" Z")).toBe(true);
        expect(profile.ridgeCrestPath.endsWith(" Z")).toBe(false);
        expect(profile.snowlipPath.endsWith(" Z")).toBe(false);

        const allPaths = [
          profile.silhouettePath,
          profile.snowcapPath,
          profile.sunlitFacetPath,
          profile.ridgeCrestPath,
          profile.snowlipPath,
        ];

        for (const pathData of allPaths) {
          const coords = extractPathCoordinates(pathData);
          for (const { x, y } of coords) {
            expect(Number.isFinite(x)).toBe(true);
            expect(Number.isFinite(y)).toBe(true);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(MOUNTAIN_VIEWBOX_WIDTH);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(MOUNTAIN_VIEWBOX_HEIGHT);
          }
        }
      }
    }
  });

  it("mirrors horizontal coordinates across MOUNTAIN_VIEWBOX_WIDTH on the right valley flank while preserving elevation", () => {
    for (const kind of MOUNTAIN_PEAK_KINDS) {
      const left = buildMountainCardProfile(kind, "left");
      const right = buildMountainCardProfile(kind, "right");

      const fields = [
        "silhouettePath",
        "snowcapPath",
        "sunlitFacetPath",
        "ridgeCrestPath",
        "snowlipPath",
      ] as const;

      for (const field of fields) {
        const leftCoords = extractPathCoordinates(left[field]);
        const rightCoords = extractPathCoordinates(right[field]);
        expect(rightCoords).toHaveLength(leftCoords.length);

        for (let index = 0; index < leftCoords.length; index += 1) {
          expect(rightCoords[index].x).toBeCloseTo(
            MOUNTAIN_VIEWBOX_WIDTH - leftCoords[index].x,
            5
          );
          expect(rightCoords[index].y).toBeCloseTo(leftCoords[index].y, 5);
        }
      }
    }
  });

  it("throws concrete errors for malformed waypoint indices or unsupported union inputs", () => {
    for (const invalidIndex of [-1, -42, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => getMountainCardProfile(invalidIndex)).toThrow(
        "waypointIndex must be a non-negative integer"
      );
    }

    expect(() =>
      buildMountainCardProfile("unknown-peak" as MountainPeakKind, "left")
    ).toThrow("Unsupported mountain peak kind");

    expect(() =>
      buildMountainCardProfile("yotei-cone", "center" as MountainValleyFlank)
    ).toThrow("Unsupported mountain valley flank");
  });
});
