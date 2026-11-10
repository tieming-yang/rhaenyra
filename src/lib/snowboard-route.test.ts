import { describe, expect, it } from "vitest";
import { createSnowboardRoute, getSnowboardPose } from "./snowboard-route";

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
