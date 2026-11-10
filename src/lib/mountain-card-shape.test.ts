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

function extractPathCoordinates(
  pathData: string
): Array<{ readonly x: number; readonly y: number }> {
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
  it("produces eight unique multi-peak (range, flank) combinations across the eight proposal waypoints", () => {
    const profiles = Array.from({ length: 8 }, (_, index) =>
      getMountainCardProfile(index)
    );

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

    const uniqueKeys = new Set(
      profiles.map((profile) => `${profile.kind}:${profile.flank}`)
    );
    expect(uniqueKeys.size).toBe(8);

    for (let index = 0; index < profiles.length; index += 1) {
      expect(profiles[index].peakCount).toBeGreaterThanOrEqual(3);
      if (index > 0) {
        expect(profiles[index].kind).not.toBe(profiles[index - 1].kind);
      }
    }
  });

  it("uses angular multi-peak crown segments and bounded finite SVG coordinates across all variants", () => {
    const flanks: readonly MountainValleyFlank[] = ["left", "right"];

    for (const kind of MOUNTAIN_PEAK_KINDS) {
      for (const flank of flanks) {
        const profile = buildMountainCardProfile(kind, flank);
        expect(profile.viewBox).toBe(MOUNTAIN_VIEWBOX);

        expect(profile.backRangePath.startsWith("M ")).toBe(true);
        expect(profile.backRangePath.endsWith(" Z")).toBe(true);
        expect(profile.silhouettePath.startsWith("M ")).toBe(true);
        expect(profile.silhouettePath.endsWith(" Z")).toBe(true);
        expect(profile.sunlitFacesPath.endsWith(" Z")).toBe(true);
        expect(profile.shadedFacesPath.endsWith(" Z")).toBe(true);
        expect(profile.areteRidgesPath.endsWith(" Z")).toBe(false);

        // Crown ridges and arête facets must be crisp polygonal lines (no quadratic Q scallops)
        expect(profile.areteRidgesPath).not.toContain("Q ");
        expect(profile.sunlitFacesPath).not.toContain("Q ");
        expect(profile.shadedFacesPath).not.toContain("Q ");

        const allPaths = [
          profile.backRangePath,
          profile.silhouettePath,
          profile.sunlitFacesPath,
          profile.shadedFacesPath,
          profile.areteRidgesPath,
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

  it("mirrors silhouette geometry on the right flank while preserving consistent upper-left sunlight direction", () => {
    for (const kind of MOUNTAIN_PEAK_KINDS) {
      const left = buildMountainCardProfile(kind, "left");
      const right = buildMountainCardProfile(kind, "right");

      const directMirroredFields = [
        "backRangePath",
        "silhouettePath",
        "areteRidgesPath",
      ] as const;

      for (const field of directMirroredFields) {
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

      // Mirrored east faces become sunlit (upper-left sun) and mirrored west faces become shaded
      const leftSunlit = extractPathCoordinates(left.sunlitFacesPath);
      const rightShaded = extractPathCoordinates(right.shadedFacesPath);
      expect(rightShaded).toHaveLength(leftSunlit.length);
      for (let index = 0; index < leftSunlit.length; index += 1) {
        expect(rightShaded[index].x).toBeCloseTo(
          MOUNTAIN_VIEWBOX_WIDTH - leftSunlit[index].x,
          5
        );
        expect(rightShaded[index].y).toBeCloseTo(leftSunlit[index].y, 5);
      }

      const leftShaded = extractPathCoordinates(left.shadedFacesPath);
      const rightSunlit = extractPathCoordinates(right.sunlitFacesPath);
      expect(rightSunlit).toHaveLength(leftShaded.length);
      for (let index = 0; index < leftShaded.length; index += 1) {
        expect(rightSunlit[index].x).toBeCloseTo(
          MOUNTAIN_VIEWBOX_WIDTH - leftShaded[index].x,
          5
        );
        expect(rightSunlit[index].y).toBeCloseTo(leftShaded[index].y, 5);
      }
    }
  });

  it("throws concrete errors for malformed waypoint indices or unsupported union inputs", () => {
    for (const invalidIndex of [
      -1,
      -42,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() => getMountainCardProfile(invalidIndex)).toThrow(
        "waypointIndex must be a non-negative integer"
      );
    }

    expect(() =>
      buildMountainCardProfile("unknown-peak" as MountainPeakKind, "left")
    ).toThrow("Unsupported mountain peak kind");

    expect(() =>
      buildMountainCardProfile("daisetsuzan-massif", "center" as MountainValleyFlank)
    ).toThrow("Unsupported mountain valley flank");
  });
});
