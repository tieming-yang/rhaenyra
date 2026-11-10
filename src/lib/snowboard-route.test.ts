import { describe, expect, it } from "vitest";
import {
  createSnowboardRoute,
  getMacJumpPose,
  getMacJumpProgress,
  getSnowboardPose,
} from "./snowboard-route";

describe("the snowboard route", () => {
  const route = createSnowboardRoute(8);

  it("places the rider on each alternating turn and clamps at the ends", () => {
    route.checkpoints.forEach(({ x, y }, index) => {
      const pose = getSnowboardPose(route, index, false);
      expect(pose).toMatchObject({ activeIndex: index, x, y });
      expect(Math.abs(pose.lean)).toBe(0);
    });
    expect(getSnowboardPose(route, -1, false)).toEqual(getSnowboardPose(route, 0, false));
    expect(getSnowboardPose(route, 9, false)).toEqual(getSnowboardPose(route, 7, false));
  });

  it("crosses the middle and leans in opposite directions on consecutive turns", () => {
    expect(getSnowboardPose(route, 0.5, false)).toMatchObject({ x: 50, y: 100, lean: 18 });
    expect(getSnowboardPose(route, 1.5, false)).toMatchObject({ x: 50, y: 200, lean: -18 });
  });

  it("stops at the nearest checkpoint when motion is reduced", () => {
    expect(getSnowboardPose(route, 1.7, true)).toEqual(getSnowboardPose(route, 2, false));
  });
});

describe("Mac-to-trail jump kinematics", () => {
  it("stays hidden inside the Mac screen before scroll exit and lands seamlessly at Turn 01", () => {
    const before = getMacJumpPose({
      progress: 0,
      launchDeltaX: 240,
      launchDeltaY: -620,
      arcLift: 130,
      reducedMotion: false,
    });
    expect(before).toEqual({
      x: 240,
      y: -620,
      scale: 0.42,
      lean: 0,
      opacity: 0,
    });

    const landed = getMacJumpPose({
      progress: 1,
      launchDeltaX: 240,
      launchDeltaY: -620,
      arcLift: 130,
      reducedMotion: false,
    });
    expect(landed).toEqual({
      x: 0,
      y: 0,
      scale: 1,
      lean: 0,
      opacity: 1,
    });
  });

  it("lifts above the linear path in mid-air while scaling up and tilting toward the landing lane", () => {
    const mid = getMacJumpPose({
      progress: 1 / 3,
      launchDeltaX: 240,
      launchDeltaY: -600,
      arcLift: 120,
      reducedMotion: false,
    });
    const ease = (1 / 3) * (1 / 3) * (3 - 2 / 3);
    const linearY = -600 * (1 - ease);

    expect(mid.opacity).toBe(1);
    expect(mid.y).toBeCloseTo(linearY - 120, 5);
    expect(mid.scale).toBeGreaterThan(0.42);
    expect(mid.scale).toBeLessThan(1);
    expect(mid.lean).toBeLessThan(0);
  });

  it("bypasses aerial motion when prefers-reduced-motion is active", () => {
    expect(
      getMacJumpPose({
        progress: 0.35,
        launchDeltaX: 240,
        launchDeltaY: -600,
        arcLift: 120,
        reducedMotion: true,
      })
    ).toEqual({
      x: 0,
      y: 0,
      scale: 1,
      lean: 0,
      opacity: 1,
    });
  });

  it("computes normalized scroll progress from Mac launch Y to Turn 01", () => {
    const start = 2300 - 900 * 0.34;
    const end = 2750;
    expect(getMacJumpProgress(start - 100, 2300, end, 900)).toBeLessThan(0);
    expect(getMacJumpProgress(start, 2300, end, 900)).toBeCloseTo(0, 6);
    expect(getMacJumpProgress((start + end) / 2, 2300, end, 900)).toBeCloseTo(0.5, 6);
    expect(getMacJumpProgress(end, 2300, end, 900)).toBeCloseTo(1, 6);
  });

  it("throws on malformed jump inputs", () => {
    expect(() => getMacJumpProgress(0, 2000, 2500, 0)).toThrow(
      "Mac jump progress requires finite scroll offsets and positive viewport height"
    );
    expect(() =>
      getMacJumpPose({
        progress: 0.5,
        launchDeltaX: 0,
        launchDeltaY: -400,
        arcLift: -10,
        reducedMotion: false,
      })
    ).toThrow("Mac jump pose requires finite coordinates and a non-negative arc lift");
  });
});
