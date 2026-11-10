import { describe, expect, it } from "vitest";
import {
  createIdleBadgeState,
  deriveBadgeRenderPose,
  invertHeroElasticDrag,
  mapHeroElasticDrag,
  moveBadgeDrag,
  releaseBadgeDrag,
  startBadgeDrag,
  stepBadgePhysics,
  triggerBadgeIntroSwing,
  validateBadgeFieldMetrics,
  type BadgeFieldMetrics,
  type BadgePhysicsState,
} from "./badge-physics";

const DESKTOP_METRICS: BadgeFieldMetrics = {
  fieldWidth: 480,
  fieldHeight: 590,
  anchorOffsetTop: 171,
  heroLeftBound: -720,
  heroRightBound: 680,
  heroTopBound: -145,
  heroBottomBound: 380,
};

describe("mapHeroElasticDrag and invertHeroElasticDrag", () => {
  it("tracks pointer 1:1 inside the inner hero zone and applies progressive elastic tension near edges", () => {
    const inner = mapHeroElasticDrag(-280, 90, DESKTOP_METRICS);
    expect(inner.x).toBeCloseTo(-280, 8);
    expect(inner.y).toBeCloseTo(90, 8);

    // Far across the left hero column: reaches > 450px freely without hitting a hard 112px wall
    const wideLeft = mapHeroElasticDrag(-620, 40, DESKTOP_METRICS);
    expect(wideLeft.x).toBeLessThan(-450);
    expect(wideLeft.x).toBeGreaterThan(DESKTOP_METRICS.heroLeftBound);

    // Extreme pull stays smoothly bounded inside the hero
    const extreme = mapHeroElasticDrag(-2400, 1200, DESKTOP_METRICS);
    expect(extreme.x).toBeGreaterThan(DESKTOP_METRICS.heroLeftBound);
    expect(extreme.y).toBeLessThan(DESKTOP_METRICS.heroBottomBound);
  });

  it("inverts mapped coordinates cleanly so mid-swing pointer capture never jumps", () => {
    const samples = [
      { x: 0, y: 0 },
      { x: -180, y: 45 },
      { x: 490, y: -85 },
      { x: -560, y: 210 },
    ];

    for (const sample of samples) {
      const inverted = invertHeroElasticDrag(sample.x, sample.y, DESKTOP_METRICS);
      const roundTrip = mapHeroElasticDrag(inverted.rawX, inverted.rawY, DESKTOP_METRICS);
      expect(roundTrip.x).toBeCloseTo(sample.x, 8);
      expect(roundTrip.y).toBeCloseTo(sample.y, 8);
    }
  });
});

describe("badge drag lifecycle and outcomes", () => {
  it("treats sub-threshold movement as a tap on pointerup, but not on pointercancel", () => {
    const idle = createIdleBadgeState();
    const captured = startBadgeDrag(
      idle,
      {
        pointerId: 1,
        clientX: 500,
        clientY: 300,
        grabOffsetX: 0,
        grabOffsetY: 160,
        timestampMs: 100,
      },
      DESKTOP_METRICS
    );
    expect(captured.status).toBe("captured");

    const tinyMove = moveBadgeDrag(
      captured.state,
      { pointerId: 1, clientX: 503, clientY: 302, timestampMs: 116 },
      DESKTOP_METRICS,
      false
    );
    expect(tinyMove.status).toBe("below_threshold");

    const wrongPointer = moveBadgeDrag(
      captured.state,
      { pointerId: 99, clientX: 620, clientY: 340, timestampMs: 120 },
      DESKTOP_METRICS,
      false
    );
    expect(wrongPointer.status).toBe("ignored_pointer");

    const tapped = releaseBadgeDrag(
      tinyMove.state,
      { pointerId: 1, timestampMs: 130, committedTap: true },
      false
    );
    expect(tapped.status).toBe("tapped");
    expect(tapped.shouldToggleFlip).toBe(true);
    expect(tapped.state.phase).toBe("idle");

    const cancelled = releaseBadgeDrag(
      captured.state,
      { pointerId: 1, timestampMs: 130, committedTap: false },
      false
    );
    expect(cancelled.shouldToggleFlip).toBe(false);
  });

  it("preserves flick throw momentum on quick lift-off and decays velocity after a long hold", () => {
    const start = startBadgeDrag(
      createIdleBadgeState(),
      {
        pointerId: 2,
        clientX: 400,
        clientY: 260,
        grabOffsetX: 12,
        grabOffsetY: 220,
        timestampMs: 0,
      },
      DESKTOP_METRICS
    ).state;

    let dragging: BadgePhysicsState = start;
    for (let step = 1; step <= 5; step += 1) {
      const outcome = moveBadgeDrag(
        dragging,
        {
          pointerId: 2,
          clientX: 400 + step * 36,
          clientY: 260 + step * 6,
          timestampMs: step * 16,
        },
        DESKTOP_METRICS,
        false
      );
      expect(outcome.status).toBe("dragging");
      dragging = outcome.state;
    }

    const quickFlick = releaseBadgeDrag(
      dragging,
      { pointerId: 2, timestampMs: 5 * 16 + 14, committedTap: true },
      false
    );
    expect(quickFlick.status).toBe("released");
    expect(quickFlick.shouldToggleFlip).toBe(false);
    expect(quickFlick.state.phase).toBe("swinging");
    if (quickFlick.state.phase !== "swinging") return;
    expect(quickFlick.state.vx).toBeGreaterThan(900);

    const heldRelease = releaseBadgeDrag(
      dragging,
      { pointerId: 2, timestampMs: 5 * 16 + 420, committedTap: true },
      false
    );
    expect(heldRelease.state.phase).toBe("swinging");
    if (heldRelease.state.phase !== "swinging") return;
    expect(Math.abs(heldRelease.state.vx)).toBeLessThan(quickFlick.state.vx * 0.02);
  });

  it("applies opposite lever-arm card tilt when pulled near the clip vs near the bottom edge", () => {
    const pullBadge = (grabOffsetY: number) => {
      let state: BadgePhysicsState = startBadgeDrag(
        createIdleBadgeState(),
        {
          pointerId: 3,
          clientX: 300,
          clientY: 250,
          grabOffsetX: 0,
          grabOffsetY,
          timestampMs: 0,
        },
        DESKTOP_METRICS
      ).state;

      for (let step = 1; step <= 4; step += 1) {
        state = moveBadgeDrag(
          state,
          { pointerId: 3, clientX: 300 + step * 45, clientY: 250, timestampMs: step * 16 },
          DESKTOP_METRICS,
          false
        ).state;
      }
      return state;
    };

    const topGrab = pullBadge(20);
    const bottomGrab = pullBadge(310);

    // Pulling rightward at the top lets the bottom lag left (angleRad > 0),
    // while pulling rightward at the bottom swings the bottom right (angleRad < 0).
    expect(topGrab.angleRad).toBeGreaterThan(0);
    expect(bottomGrab.angleRad).toBeLessThan(0);
  });

  it("ignores move and release events when not currently dragging", () => {
    const idle = createIdleBadgeState();
    expect(
      moveBadgeDrag(idle, { pointerId: 1, clientX: 10, clientY: 10, timestampMs: 10 }, DESKTOP_METRICS, false)
        .status
    ).toBe("ignored_not_dragging");
    expect(
      releaseBadgeDrag(idle, { pointerId: 1, timestampMs: 10, committedTap: true }, false)
    ).toEqual({
      status: "ignored_not_dragging",
      shouldToggleFlip: false,
      state: idle,
    });
  });
});

describe("stepBadgePhysics", () => {
  it("swings across center multiple times along a natural pendulum arc and settles to idle", () => {
    let state: BadgePhysicsState = {
      phase: "swinging",
      x: -320,
      y: 24,
      vx: 0,
      vy: 0,
      angleRad: 0.25,
      angularVel: 0,
      pitchRad: 0,
      pitchVel: 0,
      rollRad: 0,
      rollVel: 0,
    };

    let maxRightSwing = 0;
    let minSecondLeftSwing = 0;
    let crossedRight = false;
    let bottomPassY = Number.NEGATIVE_INFINITY;

    // Simulate up to 5 seconds at 60fps
    for (let frame = 0; frame < 300 && state.phase !== "idle"; frame += 1) {
      state = stepBadgePhysics(state, 1000 / 60, false);
      if (Math.abs(state.x) < 12 && state.y > bottomPassY) {
        bottomPassY = state.y;
      }
      if (state.x > maxRightSwing) {
        maxRightSwing = state.x;
        crossedRight = true;
      }
      if (crossedRight && state.x < -20 && state.x < minSecondLeftSwing) {
        minSecondLeftSwing = state.x;
      }
    }

    // Genuine underdamped pendulum: swings well past center to the right, then back left, then settles
    expect(maxRightSwing).toBeGreaterThan(150);
    expect(minSecondLeftSwing).toBeLessThan(-75);
    expect(bottomPassY).toBeGreaterThan(0);
    expect(state).toEqual(createIdleBadgeState());
  });

  it("produces frame-rate-independent trajectories between 60Hz and 120Hz", () => {
    const initial: BadgePhysicsState = {
      phase: "swinging",
      x: 240,
      y: -18,
      vx: -180,
      vy: 40,
      angleRad: -0.22,
      angularVel: 0.4,
      pitchRad: 0.04,
      pitchVel: 0,
      rollRad: -0.06,
      rollVel: 0,
    };

    let at60Hz: BadgePhysicsState = initial;
    for (let i = 0; i < 60; i += 1) {
      at60Hz = stepBadgePhysics(at60Hz, 1000 / 60, false);
    }

    let at120Hz: BadgePhysicsState = initial;
    for (let i = 0; i < 120; i += 1) {
      at120Hz = stepBadgePhysics(at120Hz, 1000 / 120, false);
    }

    expect(at60Hz.x).toBeCloseTo(at120Hz.x, 4);
    expect(at60Hz.y).toBeCloseTo(at120Hz.y, 4);
    expect(at60Hz.angleRad).toBeCloseTo(at120Hz.angleRad, 4);
  });

  it("drops freely under gravity when lifted into the slack zone above rest length", () => {
    const liftedSlack: BadgePhysicsState = {
      phase: "swinging",
      x: 10,
      y: -125,
      vx: 0,
      vy: 0,
      angleRad: 0,
      angularVel: 0,
      pitchRad: 0,
      pitchVel: 0,
      rollRad: 0,
      rollVel: 0,
    };

    const next = stepBadgePhysics(liftedSlack, 32, false);
    expect(next.phase).toBe("swinging");
    if (next.phase !== "swinging") return;
    expect(next.vy).toBeGreaterThan(150);
    expect(next.y).toBeGreaterThan(-125);
  });

  it("honors reducedMotion across intro and active simulation steps", () => {
    const intro = triggerBadgeIntroSwing(createIdleBadgeState(), true);
    expect(intro).toEqual({
      status: "ignored_reduced_motion",
      state: createIdleBadgeState(),
    });

    const activeIntro = triggerBadgeIntroSwing(createIdleBadgeState(), false);
    expect(activeIntro.status).toBe("started");

    const reset = stepBadgePhysics(activeIntro.state, 16, true);
    expect(reset).toEqual(createIdleBadgeState());
  });
});

describe("deriveBadgeRenderPose and validation invariants", () => {
  it("computes isotropic viewBox and sags lanyard control points when slack vs pulling straight when taut", () => {
    const wideField: BadgeFieldMetrics = {
      ...DESKTOP_METRICS,
      fieldWidth: 590,
      fieldHeight: 590,
    };
    const restPose = deriveBadgeRenderPose(createIdleBadgeState(), wideField);
    expect(restPose.viewBox).toBe("0 0 590 590");
    expect(restPose.isAnimated).toBe(false);
    expect(restPose.isDragging).toBe(false);

    const slackPose = deriveBadgeRenderPose(
      {
        phase: "swinging",
        x: 0,
        y: -110,
        vx: 0,
        vy: 0,
        angleRad: 0,
        angularVel: 0,
        pitchRad: 0,
        pitchVel: 0,
        rollRad: 0,
        rollVel: 0,
      },
      DESKTOP_METRICS
    );
    const tautPose = deriveBadgeRenderPose(
      {
        phase: "swinging",
        x: 420,
        y: 190,
        vx: 0,
        vy: 0,
        angleRad: -0.3,
        angularVel: 0,
        pitchRad: 0.05,
        pitchVel: 0,
        rollRad: 0.1,
        rollVel: 0,
      },
      DESKTOP_METRICS
    );

    const parsePathNumbers = (d: string) => d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const [, , , , , slackC2Y, , slackEndY] = parsePathNumbers(slackPose.strapPath);
    const [tautStartX, tautStartY, tautC1X, tautC1Y, , , tautEndX, tautEndY] = parsePathNumbers(
      tautPose.strapPath
    );

    // When lifted high, gravity sags c2y well below the lifted clip endpoint!
    expect(slackC2Y).toBeGreaterThan(slackEndY);

    // When stretched taut, c1 lies right along the first third of the straight chord
    const chordThirdX = tautStartX + (tautEndX - tautStartX) * 0.33;
    const chordThirdY = tautStartY + (tautEndY - tautStartY) * 0.33;
    expect(Math.abs(tautC1X - chordThirdX)).toBeLessThan(2);
    expect(Math.abs(tautC1Y - chordThirdY)).toBeLessThan(4);
  });

  it("throws concrete errors on malformed metrics, negative dtMs, or broken state invariants", () => {
    expect(() =>
      validateBadgeFieldMetrics({ ...DESKTOP_METRICS, fieldWidth: 0 })
    ).toThrow("BadgeFieldMetrics dimensions must be positive");

    expect(() =>
      validateBadgeFieldMetrics({ ...DESKTOP_METRICS, heroLeftBound: 20 })
    ).toThrow("BadgeFieldMetrics horizontal bounds must straddle zero");

    expect(() => stepBadgePhysics(createIdleBadgeState(), -5, false)).toThrow(
      "dtMs must be non-negative"
    );

    const corruptedIdle = {
      phase: "idle",
      x: 12,
      y: 0,
      angleRad: 0,
      pitchRad: 0,
      rollRad: 0,
    } as unknown as BadgePhysicsState;

    expect(() => stepBadgePhysics(corruptedIdle, 16, false)).toThrow(
      "Idle badge state must have zero displacement and rotation"
    );
  });
});
