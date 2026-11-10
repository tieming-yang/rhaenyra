import { describe, expect, it } from "vitest";
import {
  createSnowboardRoute,
  deriveAirborneRigPose,
  deriveTrailRigPose,
} from "./snowboard-route";
import {
  createRiderPixelBuffer,
  RIDER_CANVAS_SIZE,
  renderNisekoPowderPro,
  stepPowderParticles,
} from "./snowboarder-pixel-3d";

const measureOpaqueBounds = (
  colorU32: Uint32Array,
  width: number,
  height: number
) => {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let solidPixels = 0;
  let shadowPixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = colorU32[y * width + x];
      const alpha = (pixel >>> 24) & 255;
      if (alpha === 0) continue;
      if (alpha < 100) {
        shadowPixels++;
      } else {
        solidPixels++;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return { minX, maxX, minY, maxY, solidPixels, shadowPixels };
};

describe("Niseko Powder Pro pixel-3D software renderer", () => {
  const route = createSnowboardRoute(8);

  it("renders unclipped 3D silhouettes at invariant pixel scale across neutral, carving, pop, slash, and airborne poses", () => {
    const buffer = createRiderPixelBuffer();
    expect(RIDER_CANVAS_SIZE).toBe(140);

    const poses = [
      deriveTrailRigPose(route, {
        progress: 0,
        motionEnergy: 0,
        elapsedSec: 0,
        reducedMotion: false,
      }),
      deriveTrailRigPose(route, {
        progress: 1 / 3,
        motionEnergy: 1,
        elapsedSec: 0.6,
        reducedMotion: false,
      }),
      deriveTrailRigPose(route, {
        progress: 0.5,
        motionEnergy: 1,
        elapsedSec: 0.6,
        reducedMotion: false,
      }),
      deriveTrailRigPose(route, {
        progress: 2 / 3,
        motionEnergy: 1,
        elapsedSec: 0.6,
        reducedMotion: false,
      }),
      deriveTrailRigPose(route, {
        progress: 1,
        motionEnergy: 1,
        elapsedSec: 0.6,
        reducedMotion: false,
      }),
      deriveAirborneRigPose({
        jumpProgress: 0.5,
        leanDeg: -14,
        elapsedSec: 0.5,
      }),
    ];

    for (const pose of poses) {
      renderNisekoPowderPro(buffer, pose, []);
      expect(buffer.colorU32[0]).toBe(0);
      expect(buffer.colorU32[RIDER_CANVAS_SIZE - 1]).toBe(0);

      const bounds = measureOpaqueBounds(
        buffer.colorU32,
        buffer.width,
        buffer.height
      );
      expect(bounds.solidPixels).toBeGreaterThan(250);
      expect(bounds.maxX - bounds.minX).toBeLessThan(48);
      expect(bounds.maxY - bounds.minY).toBeLessThan(48);
      expect(bounds.minX).toBeGreaterThanOrEqual(24);
      expect(bounds.maxX).toBeLessThanOrEqual(buffer.width - 24);
      expect(bounds.minY).toBeGreaterThanOrEqual(24);
      expect(bounds.maxY).toBeLessThanOrEqual(buffer.height - 16);

      if (pose.kind === "airborne") {
        expect(bounds.shadowPixels).toBe(0);
      } else {
        expect(bounds.shadowPixels).toBeGreaterThan(15);
      }
    }
  });

  it("produces distinct 3D silhouettes between heelside and toeside carves", () => {
    const heelsideBuf = createRiderPixelBuffer();
    const toesideBuf = createRiderPixelBuffer();

    renderNisekoPowderPro(
      heelsideBuf,
      deriveTrailRigPose(route, {
        progress: 2 / 3,
        motionEnergy: 0.8,
        elapsedSec: 0,
        reducedMotion: false,
      }),
      []
    );
    renderNisekoPowderPro(
      toesideBuf,
      deriveTrailRigPose(route, {
        progress: 1 / 3,
        motionEnergy: 0.8,
        elapsedSec: 0,
        reducedMotion: false,
      }),
      []
    );

    let differingPixels = 0;
    for (let i = 0; i < heelsideBuf.colorU32.length; i++) {
      if (heelsideBuf.colorU32[i] !== toesideBuf.colorU32[i]) {
        differingPixels++;
      }
    }
    expect(differingPixels).toBeGreaterThan(200);
  });

  it("spawns rooster-tail spray, mist, and gate-slash bursts, advects in world space, and ages out cleanly", () => {
    const deterministicRng = () => 0.25;
    const zeroShift = { dx: 0, dy: 0 };
    const airborne = deriveAirborneRigPose({
      jumpProgress: 0.4,
      leanDeg: 10,
      elapsedSec: 0.2,
    });
    expect(
      stepPowderParticles([], airborne, 1 / 60, zeroShift, deterministicRng)
    ).toEqual([]);

    const heelside = deriveTrailRigPose(route, {
      progress: 2 / 3,
      motionEnergy: 1,
      elapsedSec: 0.3,
      reducedMotion: false,
    });
    const spawned = stepPowderParticles(
      [],
      heelside,
      1 / 60,
      zeroShift,
      deterministicRng
    );
    expect(spawned.some((p) => p.kind === "spray")).toBe(true);
    expect(spawned.some((p) => p.kind === "mist")).toBe(true);
    expect(spawned.some((p) => p.kind === "slash")).toBe(false);
    expect(spawned[0].vx).toBeLessThan(0);

    const gateSlash = deriveTrailRigPose(route, {
      progress: 1.0,
      motionEnergy: 1,
      elapsedSec: 0.3,
      reducedMotion: false,
    });
    const slashParticles = stepPowderParticles(
      [],
      gateSlash,
      1 / 60,
      zeroShift,
      deterministicRng
    );
    expect(slashParticles.filter((p) => p.kind === "slash").length).toBeGreaterThanOrEqual(4);

    const neutral = deriveTrailRigPose(route, {
      progress: 0,
      motionEnergy: 0,
      elapsedSec: 1,
      reducedMotion: false,
    });
    const advected = stepPowderParticles(
      spawned,
      neutral,
      1 / 60,
      { dx: 10, dy: 14 },
      deterministicRng
    );
    expect(advected[0].x).toBeLessThan(spawned[0].x - 5);
    expect(advected[0].y).toBeLessThan(spawned[0].y - 8);

    const buf = createRiderPixelBuffer();
    renderNisekoPowderPro(buf, gateSlash, slashParticles);
    expect(measureOpaqueBounds(buf.colorU32, buf.width, buf.height).solidPixels).toBeGreaterThan(300);

    let active = spawned;
    for (let frame = 0; frame < 30; frame++) {
      active = stepPowderParticles(
        active,
        neutral,
        1 / 30,
        zeroShift,
        deterministicRng
      );
    }
    expect(active).toEqual([]);
  });

  it("validates pixel buffer dimensions, particle dtSec, and worldShift", () => {
    expect(() => createRiderPixelBuffer(8, 8)).toThrow(
      "Rider pixel buffer requires integer dimensions of at least 16x16"
    );
    const neutral = deriveTrailRigPose(route, {
      progress: 0,
      motionEnergy: 0,
      elapsedSec: 0,
      reducedMotion: false,
    });
    expect(() => stepPowderParticles([], neutral, -0.01)).toThrow(
      "Powder particle step requires a non-negative finite dtSec"
    );
    expect(() =>
      stepPowderParticles([], neutral, 1 / 60, { dx: Number.NaN, dy: 0 })
    ).toThrow("Powder particle step requires finite worldShift coordinates");
  });
});
