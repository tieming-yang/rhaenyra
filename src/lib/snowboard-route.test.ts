import { describe, expect, it } from "vitest";
import {
  createSnowboardRoute,
  deriveAirborneRigPose,
  deriveTrailRigPose,
  getCheckpointScrollTarget,
  getMacJumpPose,
  getMacJumpProgress,
  getSnowboardPose,
  getTrailScrollSpan,
  getTrenchReveal,
  stepSettleEnergy,
} from "./snowboard-route";

describe("the snowboard route", () => {
  const route = createSnowboardRoute(8);

  it("places the rider on each alternating wide topic gate and clamps at the ends", () => {
    route.checkpoints.forEach(({ x, y }, index) => {
      const pose = getSnowboardPose(route, index, false);
      expect(x).toBe(index % 2 === 0 ? 20 : 80);
      expect(pose).toMatchObject({ activeIndex: index, x, y });
    });
    expect(Math.abs(getSnowboardPose(route, 0, false).lean)).toBe(0);
    expect(getSnowboardPose(route, 1, false).lean).toBeLessThan(-14);
    expect(getSnowboardPose(route, 2, false).lean).toBeGreaterThan(14);
    expect(getSnowboardPose(route, -1, false)).toEqual(getSnowboardPose(route, 0, false));
    expect(getSnowboardPose(route, 9, false)).toEqual(getSnowboardPose(route, 7, false));
  });

  it("carves 3 genuine C-turns (1.5 S-cycles) between consecutive topics instead of sliding straight", () => {
    const startGate = getSnowboardPose(route, 0, false);
    const firstCarve = getSnowboardPose(route, 1 / 3, false);
    const centerCrossover = getSnowboardPose(route, 0.5, false);
    const secondCarve = getSnowboardPose(route, 2 / 3, false);
    const nextGate = getSnowboardPose(route, 1, false);

    expect(startGate.x).toBe(20);
    expect(firstCarve.x).toBeGreaterThan(68);
    expect(firstCarve.lean).toBeLessThan(-10);
    expect(centerCrossover.x).toBeCloseTo(50, 6);
    expect(Math.abs(centerCrossover.lean)).toBeCloseTo(0, 6);
    expect(secondCarve.x).toBeLessThan(32);
    expect(secondCarve.lean).toBeGreaterThan(10);
    expect(nextGate.x).toBe(80);
    expect(nextGate.lean).toBeLessThan(-14);
  });

  it("generates alternating C-carve edge trenches separated by unweighted crossover gaps", () => {
    expect(route.edgeTrenches).toHaveLength(21);
    expect(createSnowboardRoute(1).edgeTrenches).toEqual([]);

    for (let i = 0; i < route.edgeTrenches.length; i++) {
      const trench = route.edgeTrenches[i];
      expect(trench.endProgress).toBeGreaterThan(trench.startProgress);
      expect(trench.isGateCheck).toBe(i % 3 === 2);
      expect(trench.groovePath.startsWith("M ")).toBe(true);
      expect(trench.bermPath.startsWith("M ")).toBe(true);

      if (i > 0) {
        const prev = route.edgeTrenches[i - 1];
        expect(trench.startProgress - prev.endProgress).toBeCloseTo(0.064, 5);
        expect(trench.outsideSign).toBe(-prev.outsideSign);
      }
    }

    const firstTrench = route.edgeTrenches[0];
    expect(getTrenchReveal(firstTrench, 0)).toBe(0);
    expect(getTrenchReveal(firstTrench, firstTrench.startProgress)).toBe(0);
    expect(
      getTrenchReveal(
        firstTrench,
        (firstTrench.startProgress + firstTrench.endProgress) / 2
      )
    ).toBeCloseTo(0.5, 6);
    expect(getTrenchReveal(firstTrench, firstTrench.endProgress)).toBe(1);
    expect(getTrenchReveal(firstTrench, 5)).toBe(1);
    expect(() => getTrenchReveal(firstTrench, Number.NaN)).toThrow(
      "Trench reveal requires a finite progress value"
    );
  });

  it("stops at the nearest checkpoint with zero lean when motion is reduced", () => {
    const reduced = getSnowboardPose(route, 1.7, true);
    expect(reduced.activeIndex).toBe(2);
    expect(reduced.x).toBe(route.checkpoints[2].x);
    expect(reduced.y).toBe(route.checkpoints[2].y);
    expect(reduced.lean).toBe(0);
  });

  it("maps each checkpoint index to the exact scrollY where the snowboarder lands on that turn", () => {
    const metrics = {
      laneTopDocY: 3100,
      laneHeight: 2000,
      checkpointCount: 8,
      viewportHeight: 900,
      scrollHeight: 5600,
    };
    const { firstTurn, lastTurn } = getTrailScrollSpan(metrics);
    expect(firstTurn).toBe(3100 + 125 - 450);
    expect(lastTurn).toBe(3100 + 2000 - 125 - 450);

    for (let index = 0; index < metrics.checkpointCount; index += 1) {
      const targetScroll = getCheckpointScrollTarget(metrics, index);
      const progress =
        ((targetScroll - firstTurn) / (lastTurn - firstTurn)) *
        (metrics.checkpointCount - 1);
      const pose = getSnowboardPose(route, progress, false);

      expect(progress).toBeCloseTo(index, 8);
      expect(pose.activeIndex).toBe(index);
      expect(pose.x).toBeCloseTo(route.checkpoints[index].x, 8);
      expect(pose.y).toBeCloseTo(route.checkpoints[index].y, 8);
    }
  });

  it("clamps lastTurn to maxScrollY and throws on invalid checkpoint or scroll metrics", () => {
    const clampedMetrics = {
      laneTopDocY: 3000,
      laneHeight: 1600,
      checkpointCount: 8,
      viewportHeight: 1000,
      scrollHeight: 4450,
    };
    const span = getTrailScrollSpan(clampedMetrics);
    expect(span.lastTurn).toBe(3450);
    expect(getCheckpointScrollTarget(clampedMetrics, 7)).toBe(3450);

    expect(() => getCheckpointScrollTarget(clampedMetrics, -1)).toThrow(
      "Checkpoint index must be an integer within [0, checkpointCount)"
    );
    expect(() => getCheckpointScrollTarget(clampedMetrics, 8)).toThrow(
      "Checkpoint index must be an integer within [0, checkpointCount)"
    );
    expect(() =>
      getTrailScrollSpan({ ...clampedMetrics, laneHeight: 0 })
    ).toThrow();
    expect(() =>
      getTrailScrollSpan({ ...clampedMetrics, scrollHeight: 800 })
    ).toThrow();
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
      scale: 0.9,
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

  it("surges to 2.5x foreground scale at the mid-air apex before settling down to 1x on landing", () => {
    const mid = getMacJumpPose({
      progress: 1 / 3,
      launchDeltaX: 240,
      launchDeltaY: -600,
      arcLift: 120,
      reducedMotion: false,
    });
    const descending = getMacJumpPose({
      progress: 0.8,
      launchDeltaX: 240,
      launchDeltaY: -600,
      arcLift: 120,
      reducedMotion: false,
    });
    const nearlyLanded = getMacJumpPose({
      progress: 0.98,
      launchDeltaX: 240,
      launchDeltaY: -600,
      arcLift: 120,
      reducedMotion: false,
    });
    const ease = (1 / 3) * (1 / 3) * (3 - 2 / 3);
    const linearY = -600 * (1 - ease);

    expect(mid.opacity).toBe(1);
    expect(mid.y).toBeCloseTo(linearY - 120, 5);
    expect(mid.scale).toBeCloseTo(2.5, 5);
    expect(descending.scale).toBeGreaterThan(1);
    expect(descending.scale).toBeLessThan(mid.scale);
    expect(nearlyLanded.scale).toBeGreaterThan(1);
    expect(nearlyLanded.scale).toBeLessThan(1.03);
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

describe("Option B 3D rig kinematics and settle policy", () => {
  const route = createSnowboardRoute(8);

  it("transitions through drop-in, toeside carve, unweighted crossover pop, heelside carve, and gate hockey-slash", () => {
    const startGate = deriveTrailRigPose(route, {
      progress: 0,
      motionEnergy: 0.8,
      elapsedSec: 1.2,
      reducedMotion: false,
    });
    const toesideRhythm = deriveTrailRigPose(route, {
      progress: 1 / 3,
      motionEnergy: 0.9,
      elapsedSec: 1.2,
      reducedMotion: false,
    });
    const crossoverPop = deriveTrailRigPose(route, {
      progress: 0.5,
      motionEnergy: 0.9,
      elapsedSec: 1.2,
      reducedMotion: false,
    });
    const heelsideRhythm = deriveTrailRigPose(route, {
      progress: 2 / 3,
      motionEnergy: 0.9,
      elapsedSec: 1.2,
      reducedMotion: false,
    });
    const topicGateSlash = deriveTrailRigPose(route, {
      progress: 1.0,
      motionEnergy: 0.9,
      elapsedSec: 1.2,
      reducedMotion: false,
    });
    const settledMidTurn = deriveTrailRigPose(route, {
      progress: 2 / 3,
      motionEnergy: 0,
      elapsedSec: 1.2,
      reducedMotion: false,
    });

    expect(startGate.kind).toBe("carving");
    expect(startGate.carveSide).toBe("neutral");
    expect(startGate.sprayIntensity).toBe(0);
    expect(startGate.spraySide).toBe(0);
    expect(startGate.boardLift).toBe(0);
    expect(startGate.boardYaw).toBeGreaterThan(0);

    expect(toesideRhythm.carveSide).toBe("toeside");
    expect(toesideRhythm.edgeRoll).toBeGreaterThan(0.4);
    expect(toesideRhythm.leftArmDrop).toBeGreaterThan(0.5);
    expect(toesideRhythm.spraySide).toBe(1);
    expect(toesideRhythm.sprayIntensity).toBeGreaterThan(0.5);
    expect(toesideRhythm.isGateSlash).toBe(false);

    expect(crossoverPop.carveSide).toBe("neutral");
    expect(crossoverPop.boardLift).toBeGreaterThan(1.0);
    expect(crossoverPop.sprayIntensity).toBe(0);
    expect(crossoverPop.boardYaw).toBeLessThan(-0.5);

    expect(heelsideRhythm.carveSide).toBe("heelside");
    expect(heelsideRhythm.edgeRoll).toBeLessThan(-0.4);
    expect(heelsideRhythm.rightArmDrop).toBeGreaterThan(0.5);
    expect(heelsideRhythm.spraySide).toBe(-1);
    expect(heelsideRhythm.sprayIntensity).toBeGreaterThan(0.5);

    expect(topicGateSlash.carveSide).toBe("toeside");
    expect(topicGateSlash.isGateSlash).toBe(true);
    expect(topicGateSlash.sprayIntensity).toBeGreaterThan(0.9);
    expect(topicGateSlash.crouch).toBeGreaterThan(toesideRhythm.crouch);

    expect(settledMidTurn.sprayIntensity).toBe(0);
    expect(settledMidTurn.boardLift).toBe(0);

    const beforeGate = deriveTrailRigPose(route, {
      progress: 0.9999,
      motionEnergy: 0.5,
      elapsedSec: 0,
      reducedMotion: false,
    });
    const afterGate = deriveTrailRigPose(route, {
      progress: 1.0001,
      motionEnergy: 0.5,
      elapsedSec: 0,
      reducedMotion: false,
    });
    expect(afterGate.boardYaw).toBeCloseTo(beforeGate.boardYaw, 2);
    expect(afterGate.edgeRoll).toBeCloseTo(beforeGate.edgeRoll, 2);
  });

  it("aligns airborne landing joint angles seamlessly with Checkpoint 01 stance", () => {
    const midAir = deriveAirborneRigPose({
      jumpProgress: 0.5,
      leanDeg: -12,
      elapsedSec: 0.4,
    });
    expect(midAir.kind).toBe("airborne");
    expect(midAir.crouch).toBeGreaterThan(2);
    expect(midAir.shadowScale).toBe(0);
    expect(midAir.sprayIntensity).toBe(0);

    const touchdown = deriveAirborneRigPose({
      jumpProgress: 1,
      leanDeg: 0,
      elapsedSec: 1.0,
    });
    const checkpointZero = deriveTrailRigPose(route, {
      progress: 0,
      motionEnergy: 0,
      elapsedSec: 1.0,
      reducedMotion: false,
    });

    expect(touchdown.boardYaw).toBeCloseTo(checkpointZero.boardYaw, 6);
    expect(touchdown.edgeRoll).toBeCloseTo(checkpointZero.edgeRoll, 6);
    expect(touchdown.boardPitch).toBeCloseTo(checkpointZero.boardPitch, 6);
    expect(touchdown.crouch).toBeCloseTo(checkpointZero.crouch, 6);
    expect(touchdown.pelvisYaw).toBeCloseTo(checkpointZero.pelvisYaw, 6);
    expect(touchdown.torsoYaw).toBeCloseTo(checkpointZero.torsoYaw, 6);
    expect(touchdown.headYaw).toBeCloseTo(checkpointZero.headYaw, 6);
    expect(touchdown.leftArmDrop).toBeCloseTo(checkpointZero.leftArmDrop, 6);
    expect(touchdown.rightArmDrop).toBeCloseTo(checkpointZero.rightArmDrop, 6);
    expect(touchdown.hairSway).toBeCloseTo(checkpointZero.hairSway, 6);
  });

  it("snaps to nearest checkpoint with zero spray or flutter when reducedMotion is enabled", () => {
    const reduced = deriveTrailRigPose(route, {
      progress: 1.65,
      motionEnergy: 1,
      elapsedSec: 2.5,
      reducedMotion: true,
    });
    const exactTwo = deriveTrailRigPose(route, {
      progress: 2,
      motionEnergy: 0,
      elapsedSec: 0,
      reducedMotion: false,
    });
    expect(reduced).toEqual(exactTwo);
  });

  it("boosts settle energy on scroll and decays cleanly to zero at 600ms", () => {
    expect(stepSettleEnergy(0, 0, 16, false)).toBe(0);
    const boosted = stepSettleEnergy(0, 40, 16, false);
    expect(boosted).toBe(1);

    const halfDecayed = stepSettleEnergy(boosted, 0, 300, false);
    expect(halfDecayed).toBeCloseTo(0.5, 5);

    const settled = stepSettleEnergy(halfDecayed, 0, 300, false);
    expect(settled).toBe(0);
    expect(stepSettleEnergy(1, 50, 16, true)).toBe(0);
  });

  it("throws on malformed rig or settle inputs", () => {
    expect(() => stepSettleEnergy(-0.1, 0, 16, false)).toThrow();
    expect(() => stepSettleEnergy(0.5, 0, -1, false)).toThrow();
    expect(() =>
      deriveTrailRigPose(route, {
        progress: 0.5,
        motionEnergy: 1.2,
        elapsedSec: 0,
        reducedMotion: false,
      })
    ).toThrow();
    expect(() =>
      deriveAirborneRigPose({
        jumpProgress: Number.NaN,
        leanDeg: 0,
        elapsedSec: 0,
      })
    ).toThrow();
  });
});
