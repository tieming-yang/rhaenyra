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

  it("renders unclipped 3D silhouettes on a transparent canvas across neutral, heelside, toeside, and airborne poses", () => {
    const buffer = createRiderPixelBuffer();
    const poses = [
      deriveTrailRigPose(route, {
        progress: 0,
        motionEnergy: 0,
        elapsedSec: 0,
        reducedMotion: false,
      }),
      deriveTrailRigPose(route, {
        progress: 0.5,
        motionEnergy: 1,
        elapsedSec: 0.6,
        reducedMotion: false,
      }),
      deriveTrailRigPose(route, {
        progress: 1.5,
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
      expect(bounds.minX).toBeGreaterThanOrEqual(2);
      expect(bounds.maxX).toBeLessThanOrEqual(buffer.width - 3);
      expect(bounds.minY).toBeGreaterThanOrEqual(2);
      expect(bounds.maxY).toBeLessThanOrEqual(buffer.height - 2);

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
        progress: 0.5,
        motionEnergy: 0.6,
        elapsedSec: 0,
        reducedMotion: false,
      }),
      []
    );
    renderNisekoPowderPro(
      toesideBuf,
      deriveTrailRigPose(route, {
        progress: 1.5,
        motionEnergy: 0.6,
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

  it("spawns powder spray only when actively carving and ages particles out cleanly", () => {
    const deterministicRng = () => 0.25;
    const airborne = deriveAirborneRigPose({
      jumpProgress: 0.4,
      leanDeg: 10,
      elapsedSec: 0.2,
    });
    expect(stepPowderParticles([], airborne, 1 / 60, deterministicRng)).toEqual([]);

    const heelside = deriveTrailRigPose(route, {
      progress: 0.5,
      motionEnergy: 1,
      elapsedSec: 0.3,
      reducedMotion: false,
    });
    const spawned = stepPowderParticles([], heelside, 1 / 60, deterministicRng);
    expect(spawned.length).toBeGreaterThan(0);
    expect(spawned[0].vx).toBeLessThan(0);

    const neutral = deriveTrailRigPose(route, {
      progress: 0,
      motionEnergy: 0,
      elapsedSec: 1,
      reducedMotion: false,
    });
    let active = spawned;
    for (let frame = 0; frame < 20; frame++) {
      active = stepPowderParticles(active, neutral, 1 / 30, deterministicRng);
    }
    expect(active).toEqual([]);
  });

  it("validates pixel buffer dimensions and particle dtSec", () => {
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
  });
});
