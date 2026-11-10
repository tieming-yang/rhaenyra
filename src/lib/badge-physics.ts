export interface BadgeFieldMetrics {
  readonly fieldWidth: number;
  readonly fieldHeight: number;
  readonly anchorOffsetTop: number;
  readonly heroLeftBound: number;
  readonly heroRightBound: number;
  readonly heroTopBound: number;
  readonly heroBottomBound: number;
}

export interface BadgeDragStartInput {
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly grabOffsetX: number;
  readonly grabOffsetY: number;
  readonly timestampMs: number;
}

export interface BadgeDragMoveInput {
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly timestampMs: number;
}

export interface BadgeDragReleaseInput {
  readonly pointerId: number;
  readonly timestampMs: number;
  readonly committedTap: boolean;
}

export type BadgePhysicsState =
  | {
      readonly phase: "idle";
      readonly x: 0;
      readonly y: 0;
      readonly angleRad: 0;
      readonly pitchRad: 0;
      readonly rollRad: 0;
    }
  | {
      readonly phase: "dragging";
      readonly pointerId: number;
      readonly startClientX: number;
      readonly startClientY: number;
      readonly originRawX: number;
      readonly originRawY: number;
      readonly grabOffsetX: number;
      readonly grabOffsetY: number;
      readonly moved: boolean;
      readonly lastMoveTimeMs: number;
      readonly x: number;
      readonly y: number;
      readonly vx: number;
      readonly vy: number;
      readonly angleRad: number;
      readonly angularVel: number;
      readonly pitchRad: number;
      readonly pitchVel: number;
      readonly rollRad: number;
      readonly rollVel: number;
    }
  | {
      readonly phase: "swinging";
      readonly x: number;
      readonly y: number;
      readonly vx: number;
      readonly vy: number;
      readonly angleRad: number;
      readonly angularVel: number;
      readonly pitchRad: number;
      readonly pitchVel: number;
      readonly rollRad: number;
      readonly rollVel: number;
    };

export type BadgeIntroOutcome =
  | {
      readonly status: "started";
      readonly state: Extract<BadgePhysicsState, { readonly phase: "swinging" }>;
    }
  | {
      readonly status: "ignored_reduced_motion";
      readonly state: BadgePhysicsState;
    };

export type BadgeDragStartOutcome = {
  readonly status: "captured";
  readonly state: Extract<BadgePhysicsState, { readonly phase: "dragging" }>;
};

export type BadgeDragMoveOutcome =
  | {
      readonly status: "dragging";
      readonly state: Extract<BadgePhysicsState, { readonly phase: "dragging" }>;
    }
  | {
      readonly status: "below_threshold" | "ignored_pointer" | "ignored_not_dragging";
      readonly state: BadgePhysicsState;
    };

export type BadgeDragReleaseOutcome =
  | {
      readonly status: "tapped" | "released";
      readonly shouldToggleFlip: boolean;
      readonly state: BadgePhysicsState;
    }
  | {
      readonly status: "ignored_pointer" | "ignored_not_dragging";
      readonly shouldToggleFlip: false;
      readonly state: BadgePhysicsState;
    };

export interface BadgeRenderPose {
  readonly viewBox: string;
  readonly strapPath: string;
  readonly badgeTransform: string;
  readonly clipTransform: string;
  readonly isDragging: boolean;
  readonly isAnimated: boolean;
}

export const DEFAULT_RESTING_VIEWBOX = "0 0 480 590";
export const DEFAULT_RESTING_STRAP_PATH = "M 263 -96 C 260 -20 247 78 240 127";

const CANONICAL_SVG_HEIGHT = 590;
const MOUNT_OFFSET_X_SVG = 23;
const MOUNT_Y_SVG = -96;
const CLIP_PIVOT_OFFSET_PX = 40;
const STRAP_TUCK_PX = 4;

const DRAG_THRESHOLD_PX = 5;
const HERO_FREE_FRACTION = 0.55;
const MAX_INVERT_NORM = 0.97;
const MAX_THROW_SPEED_PX_S = 2500;
const VELOCITY_SMOOTH_TAU_SEC = 0.042;
const LIFT_GRACE_WINDOW_SEC = 0.034;
const HOLD_DECAY_TAU_SEC = 0.055;

const MAX_FRAME_DT_MS = 48;
const MAX_SUBSTEP_SEC = 1 / 120;

const PENDULUM_LENGTH_PX = 280;
const PENDULUM_OMEGA = 4.5;
const GRAVITY_PX_S2 = PENDULUM_OMEGA * PENDULUM_OMEGA * PENDULUM_LENGTH_PX;
const RADIAL_STIFFNESS = 64;
const SLACK_LENGTH_PX = PENDULUM_LENGTH_PX - GRAVITY_PX_S2 / RADIAL_STIFFNESS;
const RADIAL_SOFT_KNEE_PX = 220;
const RADIAL_DAMPING = 6.2;
const TANGENTIAL_DAMPING = 1.48;
const PIVOT_FRICTION_ACC = 54;
const FREEFALL_AIR_DAMPING = 1.2;

const CARD_COM_LENGTH_PX = 165;
const STRAP_ANGLE_STIFFNESS = 5.5;
const CARD_ANGULAR_DAMPING = 2.85;
const CLASP_FRICTION_ALPHA = 0.38;
const MAX_CARD_ANGLE_RAD = 1.12;

const TILT_3D_STIFFNESS = 46;
const TILT_3D_DAMPING = 9.2;
const MAX_PITCH_RAD = 0.26;
const MAX_ROLL_RAD = 0.32;

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Validates DOM field and hero bounds used to map badge coordinates and strap geometry. */
export function validateBadgeFieldMetrics(metrics: BadgeFieldMetrics): void {
  assertFiniteNumber(metrics.fieldWidth, "BadgeFieldMetrics.fieldWidth");
  assertFiniteNumber(metrics.fieldHeight, "BadgeFieldMetrics.fieldHeight");
  assertFiniteNumber(metrics.anchorOffsetTop, "BadgeFieldMetrics.anchorOffsetTop");
  assertFiniteNumber(metrics.heroLeftBound, "BadgeFieldMetrics.heroLeftBound");
  assertFiniteNumber(metrics.heroRightBound, "BadgeFieldMetrics.heroRightBound");
  assertFiniteNumber(metrics.heroTopBound, "BadgeFieldMetrics.heroTopBound");
  assertFiniteNumber(metrics.heroBottomBound, "BadgeFieldMetrics.heroBottomBound");

  if (metrics.fieldWidth <= 0 || metrics.fieldHeight <= 0) {
    throw new Error("BadgeFieldMetrics dimensions must be positive");
  }
  if (metrics.heroLeftBound >= 0 || metrics.heroRightBound <= 0) {
    throw new Error("BadgeFieldMetrics horizontal bounds must straddle zero");
  }
  if (metrics.heroTopBound >= 0 || metrics.heroBottomBound <= 0) {
    throw new Error("BadgeFieldMetrics vertical bounds must straddle zero");
  }
}

function validateBadgeState(state: BadgePhysicsState): void {
  assertFiniteNumber(state.x, "BadgePhysicsState.x");
  assertFiniteNumber(state.y, "BadgePhysicsState.y");
  assertFiniteNumber(state.angleRad, "BadgePhysicsState.angleRad");
  assertFiniteNumber(state.pitchRad, "BadgePhysicsState.pitchRad");
  assertFiniteNumber(state.rollRad, "BadgePhysicsState.rollRad");

  if (state.phase === "idle") {
    if (
      state.x !== 0 ||
      state.y !== 0 ||
      state.angleRad !== 0 ||
      state.pitchRad !== 0 ||
      state.rollRad !== 0
    ) {
      throw new Error("Idle badge state must have zero displacement and rotation");
    }
    return;
  }

  assertFiniteNumber(state.vx, "BadgePhysicsState.vx");
  assertFiniteNumber(state.vy, "BadgePhysicsState.vy");
  assertFiniteNumber(state.angularVel, "BadgePhysicsState.angularVel");
  assertFiniteNumber(state.pitchVel, "BadgePhysicsState.pitchVel");
  assertFiniteNumber(state.rollVel, "BadgePhysicsState.rollVel");

  if (state.phase === "dragging") {
    if (!Number.isInteger(state.pointerId)) {
      throw new Error("Dragging badge state requires an integer pointerId");
    }
    assertFiniteNumber(state.startClientX, "BadgePhysicsState.startClientX");
    assertFiniteNumber(state.startClientY, "BadgePhysicsState.startClientY");
    assertFiniteNumber(state.originRawX, "BadgePhysicsState.originRawX");
    assertFiniteNumber(state.originRawY, "BadgePhysicsState.originRawY");
    assertFiniteNumber(state.grabOffsetX, "BadgePhysicsState.grabOffsetX");
    assertFiniteNumber(state.grabOffsetY, "BadgePhysicsState.grabOffsetY");
    assertFiniteNumber(state.lastMoveTimeMs, "BadgePhysicsState.lastMoveTimeMs");
  }
}

/** Creates the canonical at-rest badge state. */
export function createIdleBadgeState(): BadgePhysicsState {
  return {
    phase: "idle",
    x: 0,
    y: 0,
    angleRad: 0,
    pitchRad: 0,
    rollRad: 0,
  };
}

/**
 * Maps unconstrained pointer displacement into full-hero coordinates with 1:1 follow
 * inside the inner reach zone and C1-continuous progressive lanyard resistance near edges.
 */
export function mapHeroElasticDrag(
  rawX: number,
  rawY: number,
  metrics: BadgeFieldMetrics
): Readonly<{ x: number; y: number }> {
  assertFiniteNumber(rawX, "rawX");
  assertFiniteNumber(rawY, "rawY");
  validateBadgeFieldMetrics(metrics);

  const rx = rawX < 0 ? -metrics.heroLeftBound : metrics.heroRightBound;
  const ry = rawY < 0 ? -metrics.heroTopBound : metrics.heroBottomBound;
  const norm = Math.hypot(rawX / rx, rawY / ry);

  if (norm <= HERO_FREE_FRACTION || norm === 0) {
    return { x: rawX, y: rawY };
  }

  const span = 1 - HERO_FREE_FRACTION;
  const excess = norm - HERO_FREE_FRACTION;
  const mappedNorm = HERO_FREE_FRACTION + (excess * span) / (span + excess);
  const scale = mappedNorm / norm;

  return {
    x: rawX * scale,
    y: rawY * scale,
  };
}

/**
 * Analytically inverts mapHeroElasticDrag so catching the badge mid-swing preserves
 * exact current coordinates without jumping on pointerdown.
 */
export function invertHeroElasticDrag(
  x: number,
  y: number,
  metrics: BadgeFieldMetrics
): Readonly<{ rawX: number; rawY: number }> {
  assertFiniteNumber(x, "x");
  assertFiniteNumber(y, "y");
  validateBadgeFieldMetrics(metrics);

  const rx = x < 0 ? -metrics.heroLeftBound : metrics.heroRightBound;
  const ry = y < 0 ? -metrics.heroTopBound : metrics.heroBottomBound;
  const mappedNorm = Math.hypot(x / rx, y / ry);

  if (mappedNorm <= HERO_FREE_FRACTION || mappedNorm === 0) {
    return { rawX: x, rawY: y };
  }

  const clampedNorm = Math.min(mappedNorm, MAX_INVERT_NORM);
  const span = 1 - HERO_FREE_FRACTION;
  const w = clampedNorm - HERO_FREE_FRACTION;
  const rawNorm = HERO_FREE_FRACTION + (w * span) / (span - w);
  const scale = rawNorm / mappedNorm;

  return {
    rawX: x * scale,
    rawY: y * scale,
  };
}

/** Launches the gentle desktop entrance pendulum swing unless reduced motion is active. */
export function triggerBadgeIntroSwing(
  state: BadgePhysicsState,
  reducedMotion: boolean
): BadgeIntroOutcome {
  validateBadgeState(state);
  if (reducedMotion) {
    return { status: "ignored_reduced_motion", state: createIdleBadgeState() };
  }

  return {
    status: "started",
    state: {
      phase: "swinging",
      x: 56,
      y: -14,
      vx: -38,
      vy: 0,
      angleRad: -0.16,
      angularVel: 0.22,
      pitchRad: 0.03,
      pitchVel: 0,
      rollRad: 0.08,
      rollVel: 0,
    },
  };
}

/** Captures a pointer press on the badge, preserving mid-swing position and angular momentum. */
export function startBadgeDrag(
  state: BadgePhysicsState,
  input: BadgeDragStartInput,
  metrics: BadgeFieldMetrics
): BadgeDragStartOutcome {
  validateBadgeState(state);
  validateBadgeFieldMetrics(metrics);
  if (!Number.isInteger(input.pointerId)) {
    throw new Error("BadgeDragStartInput.pointerId must be an integer");
  }
  assertFiniteNumber(input.clientX, "BadgeDragStartInput.clientX");
  assertFiniteNumber(input.clientY, "BadgeDragStartInput.clientY");
  assertFiniteNumber(input.grabOffsetX, "BadgeDragStartInput.grabOffsetX");
  assertFiniteNumber(input.grabOffsetY, "BadgeDragStartInput.grabOffsetY");
  assertFiniteNumber(input.timestampMs, "BadgeDragStartInput.timestampMs");

  const { rawX, rawY } = invertHeroElasticDrag(state.x, state.y, metrics);

  return {
    status: "captured",
    state: {
      phase: "dragging",
      pointerId: input.pointerId,
      startClientX: input.clientX,
      startClientY: input.clientY,
      originRawX: rawX,
      originRawY: rawY,
      grabOffsetX: input.grabOffsetX,
      grabOffsetY: input.grabOffsetY,
      moved: false,
      lastMoveTimeMs: input.timestampMs,
      x: state.x,
      y: state.y,
      vx: 0,
      vy: 0,
      angleRad: state.angleRad,
      angularVel: state.phase === "idle" ? 0 : state.angularVel * 0.45,
      pitchRad: state.pitchRad,
      pitchVel: state.phase === "idle" ? 0 : state.pitchVel * 0.45,
      rollRad: state.rollRad,
      rollVel: state.phase === "idle" ? 0 : state.rollVel * 0.45,
    },
  };
}

/**
 * Updates elastic drag position and smoothed throw velocity while feeding grab-offset
 * torque into the live card pendulum.
 */
export function moveBadgeDrag(
  state: BadgePhysicsState,
  input: BadgeDragMoveInput,
  metrics: BadgeFieldMetrics,
  reducedMotion: boolean
): BadgeDragMoveOutcome {
  validateBadgeState(state);
  validateBadgeFieldMetrics(metrics);
  if (!Number.isInteger(input.pointerId)) {
    throw new Error("BadgeDragMoveInput.pointerId must be an integer");
  }
  assertFiniteNumber(input.clientX, "BadgeDragMoveInput.clientX");
  assertFiniteNumber(input.clientY, "BadgeDragMoveInput.clientY");
  assertFiniteNumber(input.timestampMs, "BadgeDragMoveInput.timestampMs");

  if (state.phase !== "dragging") {
    return { status: "ignored_not_dragging", state };
  }
  if (state.pointerId !== input.pointerId) {
    return { status: "ignored_pointer", state };
  }

  const dx = input.clientX - state.startClientX;
  const dy = input.clientY - state.startClientY;
  if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
    return { status: "below_threshold", state };
  }

  if (reducedMotion) {
    return {
      status: "dragging",
      state: {
        ...state,
        moved: true,
        lastMoveTimeMs: input.timestampMs,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        angleRad: 0,
        angularVel: 0,
        pitchRad: 0,
        pitchVel: 0,
        rollRad: 0,
        rollVel: 0,
      },
    };
  }

  const nextPos = mapHeroElasticDrag(state.originRawX + dx, state.originRawY + dy, metrics);
  const rawDtMs = Math.max(1, Math.min(MAX_FRAME_DT_MS, input.timestampMs - state.lastMoveTimeMs));
  const dtSec = rawDtMs / 1000;

  const instVx = clamp((nextPos.x - state.x) / dtSec, -MAX_THROW_SPEED_PX_S, MAX_THROW_SPEED_PX_S);
  const instVy = clamp((nextPos.y - state.y) / dtSec, -MAX_THROW_SPEED_PX_S, MAX_THROW_SPEED_PX_S);
  const alpha = state.moved ? 1 - Math.exp(-dtSec / VELOCITY_SMOOTH_TAU_SEC) : 0.72;

  const nextVx = state.vx + (instVx - state.vx) * alpha;
  const nextVy = state.vy + (instVy - state.vy) * alpha;
  const clipAx = clamp((nextVx - state.vx) / dtSec, -9000, 9000);
  const clipAy = clamp((nextVy - state.vy) / dtSec, -9000, 9000);

  const articulated = stepCardArticulation(
    {
      x: nextPos.x,
      y: nextPos.y,
      vx: nextVx,
      vy: nextVy,
      clipAx,
      clipAy,
      angleRad: state.angleRad,
      angularVel: state.angularVel,
      pitchRad: state.pitchRad,
      pitchVel: state.pitchVel,
      rollRad: state.rollRad,
      rollVel: state.rollVel,
      grabOffsetX: state.grabOffsetX,
      grabOffsetY: state.grabOffsetY,
      isDragging: true,
    },
    dtSec
  );

  return {
    status: "dragging",
    state: {
      ...state,
      moved: true,
      lastMoveTimeMs: input.timestampMs,
      x: nextPos.x,
      y: nextPos.y,
      vx: nextVx,
      vy: nextVy,
      angleRad: articulated.angleRad,
      angularVel: articulated.angularVel,
      pitchRad: articulated.pitchRad,
      pitchVel: articulated.pitchVel,
      rollRad: articulated.rollRad,
      rollVel: articulated.rollVel,
    },
  };
}

/**
 * Releases an active badge pointer capture, distinguishing clean taps (toggle flip)
 * from drags and decaying stale velocity if the pointer paused before release.
 */
export function releaseBadgeDrag(
  state: BadgePhysicsState,
  input: BadgeDragReleaseInput,
  reducedMotion: boolean
): BadgeDragReleaseOutcome {
  validateBadgeState(state);
  if (!Number.isInteger(input.pointerId)) {
    throw new Error("BadgeDragReleaseInput.pointerId must be an integer");
  }
  assertFiniteNumber(input.timestampMs, "BadgeDragReleaseInput.timestampMs");

  if (state.phase !== "dragging") {
    return { status: "ignored_not_dragging", shouldToggleFlip: false, state };
  }
  if (state.pointerId !== input.pointerId) {
    return { status: "ignored_pointer", shouldToggleFlip: false, state };
  }

  const shouldToggleFlip = !state.moved && input.committedTap;

  if (reducedMotion) {
    return {
      status: shouldToggleFlip ? "tapped" : "released",
      shouldToggleFlip,
      state: createIdleBadgeState(),
    };
  }

  const pauseSec = Math.max(0, (input.timestampMs - state.lastMoveTimeMs) / 1000);
  const holdDecay =
    pauseSec <= LIFT_GRACE_WINDOW_SEC
      ? 1
      : Math.exp(-(pauseSec - LIFT_GRACE_WINDOW_SEC) / HOLD_DECAY_TAU_SEC);

  const releaseVx = clamp(state.vx * holdDecay, -MAX_THROW_SPEED_PX_S, MAX_THROW_SPEED_PX_S);
  const releaseVy = clamp(state.vy * holdDecay, -MAX_THROW_SPEED_PX_S, MAX_THROW_SPEED_PX_S);
  const lever = clamp((state.grabOffsetY - CARD_COM_LENGTH_PX) / CARD_COM_LENGTH_PX, -1, 1);
  const releaseAngularBoost = (-releaseVx / 950) * lever * 0.55;

  const candidate: Extract<BadgePhysicsState, { readonly phase: "swinging" }> = {
    phase: "swinging",
    x: state.x,
    y: state.y,
    vx: releaseVx,
    vy: releaseVy,
    angleRad: state.angleRad,
    angularVel: clamp(state.angularVel + releaseAngularBoost, -8.5, 8.5),
    pitchRad: state.pitchRad,
    pitchVel: state.pitchVel,
    rollRad: state.rollRad,
    rollVel: state.rollVel,
  };

  if (isBadgeAtRest(candidate)) {
    return {
      status: shouldToggleFlip ? "tapped" : "released",
      shouldToggleFlip,
      state: createIdleBadgeState(),
    };
  }

  return {
    status: shouldToggleFlip ? "tapped" : "released",
    shouldToggleFlip,
    state: candidate,
  };
}

interface CardArticulationInput {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly clipAx: number;
  readonly clipAy: number;
  readonly angleRad: number;
  readonly angularVel: number;
  readonly pitchRad: number;
  readonly pitchVel: number;
  readonly rollRad: number;
  readonly rollVel: number;
  readonly grabOffsetX: number;
  readonly grabOffsetY: number;
  readonly isDragging: boolean;
}

function stepCardArticulation(input: CardArticulationInput, dtSec: number) {
  const steps = Math.max(1, Math.ceil(dtSec / MAX_SUBSTEP_SEC));
  const h = dtSec / steps;

  let angleRad = input.angleRad;
  let angularVel = input.angularVel;
  let pitchRad = input.pitchRad;
  let pitchVel = input.pitchVel;
  let rollRad = input.rollRad;
  let rollVel = input.rollVel;

  const strapAngle = clamp(
    -Math.atan2(input.x, Math.max(60, input.y + PENDULUM_LENGTH_PX)),
    -0.55,
    0.55
  );

  const lever = input.isDragging
    ? clamp((input.grabOffsetY - CARD_COM_LENGTH_PX) / CARD_COM_LENGTH_PX, -1, 1)
    : 0;
  const accelCoupling = input.isDragging ? 0.55 - 0.95 * lever : 1;
  const grabHoldAngle = input.isDragging
    ? clamp((-input.grabOffsetX / 150) * 0.22 - (input.vx / 1300) * lever * 0.42, -0.48, 0.48)
    : 0;

  const dragRollBias = input.isDragging ? clamp((input.grabOffsetX / 130) * 0.14, -0.14, 0.14) : 0;
  const dragPitchBias = input.isDragging ? 0.055 : 0;
  const targetRoll = clamp((input.vx / 920) * 0.24 + dragRollBias, -MAX_ROLL_RAD, MAX_ROLL_RAD);
  const targetPitch = clamp((-input.vy / 960) * 0.2 + dragPitchBias, -MAX_PITCH_RAD, MAX_PITCH_RAD);

  const effectiveGravity = Math.max(0.25 * GRAVITY_PX_S2, GRAVITY_PX_S2 - input.clipAy);
  const dampingFactor = input.isDragging ? CARD_ANGULAR_DAMPING * 1.9 : CARD_ANGULAR_DAMPING;

  for (let i = 0; i < steps; i += 1) {
    const pendulumAlpha =
      (input.clipAx * accelCoupling * Math.cos(angleRad) -
        effectiveGravity * Math.sin(angleRad)) /
      CARD_COM_LENGTH_PX;
    const strapTorque = (strapAngle * 0.38 + grabHoldAngle - angleRad) * STRAP_ANGLE_STIFFNESS;
    const angularAcc = pendulumAlpha + strapTorque - dampingFactor * angularVel;

    angularVel += angularAcc * h;
    angleRad += angularVel * h;
    if (angleRad > MAX_CARD_ANGLE_RAD) {
      angleRad = MAX_CARD_ANGLE_RAD;
      angularVel = Math.min(0, angularVel * -0.25);
    } else if (angleRad < -MAX_CARD_ANGLE_RAD) {
      angleRad = -MAX_CARD_ANGLE_RAD;
      angularVel = Math.max(0, angularVel * -0.25);
    }

    const pitchAcc = (targetPitch - pitchRad) * TILT_3D_STIFFNESS - TILT_3D_DAMPING * pitchVel;
    pitchVel += pitchAcc * h;
    pitchRad = clamp(pitchRad + pitchVel * h, -MAX_PITCH_RAD, MAX_PITCH_RAD);

    const rollAcc = (targetRoll - rollRad) * TILT_3D_STIFFNESS - TILT_3D_DAMPING * rollVel;
    rollVel += rollAcc * h;
    rollRad = clamp(rollRad + rollVel * h, -MAX_ROLL_RAD, MAX_ROLL_RAD);
  }

  return { angleRad, angularVel, pitchRad, pitchVel, rollRad, rollVel };
}

function isBadgeAtRest(
  state: Extract<BadgePhysicsState, { readonly phase: "swinging" }>
): boolean {
  return (
    Math.hypot(state.x, state.y) < 0.75 &&
    Math.hypot(state.vx, state.vy) < 4 &&
    Math.abs(state.angleRad) < 0.0075 &&
    Math.abs(state.angularVel) < 0.03 &&
    Math.abs(state.pitchRad) < 0.005 &&
    Math.abs(state.rollRad) < 0.005
  );
}

/**
 * Advances the coupled lanyard pendulum, secondary clip swing, and 3D card tilt
 * using fixed-ceiling substeps for frame-rate independence across 60Hz and 120Hz displays.
 */
export function stepBadgePhysics(
  state: BadgePhysicsState,
  dtMs: number,
  reducedMotion: boolean
): BadgePhysicsState {
  validateBadgeState(state);
  assertFiniteNumber(dtMs, "dtMs");
  if (dtMs < 0) {
    throw new Error("dtMs must be non-negative");
  }

  if (reducedMotion) {
    if (state.phase === "dragging") {
      return {
        ...state,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        angleRad: 0,
        angularVel: 0,
        pitchRad: 0,
        pitchVel: 0,
        rollRad: 0,
        rollVel: 0,
      };
    }
    return createIdleBadgeState();
  }

  if (state.phase === "idle" || dtMs === 0) {
    return state;
  }

  const clampedDtMs = Math.min(dtMs, MAX_FRAME_DT_MS);
  const totalSec = clampedDtMs / 1000;

  if (state.phase === "dragging") {
    const decay = Math.exp(-totalSec / 0.08);
    const dampedVx = state.vx * decay;
    const dampedVy = state.vy * decay;
    const articulated = stepCardArticulation(
      {
        x: state.x,
        y: state.y,
        vx: dampedVx,
        vy: dampedVy,
        clipAx: 0,
        clipAy: 0,
        angleRad: state.angleRad,
        angularVel: state.angularVel,
        pitchRad: state.pitchRad,
        pitchVel: state.pitchVel,
        rollRad: state.rollRad,
        rollVel: state.rollVel,
        grabOffsetX: state.grabOffsetX,
        grabOffsetY: state.grabOffsetY,
        isDragging: true,
      },
      totalSec
    );

    return {
      ...state,
      vx: dampedVx,
      vy: dampedVy,
      angleRad: articulated.angleRad,
      angularVel: articulated.angularVel,
      pitchRad: articulated.pitchRad,
      pitchVel: articulated.pitchVel,
      rollRad: articulated.rollRad,
      rollVel: articulated.rollVel,
    };
  }

  const steps = Math.max(1, Math.ceil(totalSec / MAX_SUBSTEP_SEC));
  const h = totalSec / steps;

  let x = state.x;
  let y = state.y;
  let vx = state.vx;
  let vy = state.vy;
  let angleRad = state.angleRad;
  let angularVel = state.angularVel;
  let pitchRad = state.pitchRad;
  let pitchVel = state.pitchVel;
  let rollRad = state.rollRad;
  let rollVel = state.rollVel;

  for (let i = 0; i < steps; i += 1) {
    const rx = x;
    const ry = y + PENDULUM_LENGTH_PX;
    const r = Math.hypot(rx, ry);
    const ux = r > 0.001 ? rx / r : 0;
    const uy = r > 0.001 ? ry / r : 1;
    const tx = uy;
    const ty = -ux;

    let clipAx = 0;
    let clipAy = GRAVITY_PX_S2;

    if (r > SLACK_LENGTH_PX) {
      const stretch = r - SLACK_LENGTH_PX;
      const effectiveStretch =
        stretch <= RADIAL_SOFT_KNEE_PX
          ? stretch
          : RADIAL_SOFT_KNEE_PX + (stretch - RADIAL_SOFT_KNEE_PX) * 0.45;
      const vr = vx * ux + vy * uy;
      const vt = vx * tx + vy * ty;
      const tensionAcc = Math.max(0, RADIAL_STIFFNESS * effectiveStretch + RADIAL_DAMPING * vr);
      const tangentialDrag = TANGENTIAL_DAMPING * vt + PIVOT_FRICTION_ACC * Math.tanh(vt / 28);

      clipAx -= tensionAcc * ux + tangentialDrag * tx;
      clipAy -= tensionAcc * uy + tangentialDrag * ty;
    } else {
      clipAx -= FREEFALL_AIR_DAMPING * vx;
      clipAy -= FREEFALL_AIR_DAMPING * vy;
    }

    vx += clipAx * h;
    vy += clipAy * h;
    x += vx * h;
    y += vy * h;

    const strapAngle = clamp(-Math.atan2(x, Math.max(60, y + PENDULUM_LENGTH_PX)), -0.55, 0.55);
    const effectiveGravity = Math.max(0.25 * GRAVITY_PX_S2, GRAVITY_PX_S2 - clipAy);
    const pendulumAlpha =
      (clipAx * Math.cos(angleRad) - effectiveGravity * Math.sin(angleRad)) / CARD_COM_LENGTH_PX;
    const strapTorque = (strapAngle * 0.38 - angleRad) * STRAP_ANGLE_STIFFNESS;
    const claspDrag =
      CARD_ANGULAR_DAMPING * angularVel + CLASP_FRICTION_ALPHA * Math.tanh(angularVel / 0.24);
    const angularAcc = pendulumAlpha + strapTorque - claspDrag;

    angularVel += angularAcc * h;
    angleRad += angularVel * h;
    if (angleRad > MAX_CARD_ANGLE_RAD) {
      angleRad = MAX_CARD_ANGLE_RAD;
      angularVel = Math.min(0, angularVel * -0.25);
    } else if (angleRad < -MAX_CARD_ANGLE_RAD) {
      angleRad = -MAX_CARD_ANGLE_RAD;
      angularVel = Math.max(0, angularVel * -0.25);
    }

    const targetRoll = clamp((vx / 920) * 0.24, -MAX_ROLL_RAD, MAX_ROLL_RAD);
    const targetPitch = clamp((-vy / 960) * 0.2, -MAX_PITCH_RAD, MAX_PITCH_RAD);

    const pitchAcc = (targetPitch - pitchRad) * TILT_3D_STIFFNESS - TILT_3D_DAMPING * pitchVel;
    pitchVel += pitchAcc * h;
    pitchRad = clamp(pitchRad + pitchVel * h, -MAX_PITCH_RAD, MAX_PITCH_RAD);

    const rollAcc = (targetRoll - rollRad) * TILT_3D_STIFFNESS - TILT_3D_DAMPING * rollVel;
    rollVel += rollAcc * h;
    rollRad = clamp(rollRad + rollVel * h, -MAX_ROLL_RAD, MAX_ROLL_RAD);
  }

  const nextState: Extract<BadgePhysicsState, { readonly phase: "swinging" }> = {
    phase: "swinging",
    x,
    y,
    vx,
    vy,
    angleRad,
    angularVel,
    pitchRad,
    pitchVel,
    rollRad,
    rollVel,
  };

  if (isBadgeAtRest(nextState)) {
    return createIdleBadgeState();
  }

  return nextState;
}

function roundSvg(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Derives isotropic SVG viewBox, taut-or-catenary lanyard path, 3D card transform,
 * and articulated metal clip swivel from the current badge physics state.
 */
export function deriveBadgeRenderPose(
  state: BadgePhysicsState,
  metrics: BadgeFieldMetrics
): BadgeRenderPose {
  validateBadgeState(state);
  validateBadgeFieldMetrics(metrics);

  const scale = CANONICAL_SVG_HEIGHT / metrics.fieldHeight;
  const vw = roundSvg(metrics.fieldWidth * scale);
  const centerX = vw / 2;

  const startX = centerX + MOUNT_OFFSET_X_SVG + clamp(state.x * scale * 0.08, -28, 28);
  const startY = MOUNT_Y_SVG;

  const pivotX = centerX + state.x * scale;
  const pivotY = (metrics.anchorOffsetTop - CLIP_PIVOT_OFFSET_PX + state.y) * scale;
  const endX = pivotX + Math.sin(state.angleRad) * STRAP_TUCK_PX * scale;
  const endY = pivotY - Math.cos(state.angleRad) * STRAP_TUCK_PX * scale;

  const restPivotY = (metrics.anchorOffsetTop - CLIP_PIVOT_OFFSET_PX - STRAP_TUCK_PX) * scale;
  const restChord = Math.hypot(-MOUNT_OFFSET_X_SVG, restPivotY - startY);

  const spanX = endX - startX;
  const spanY = endY - startY;
  const chord = Math.hypot(spanX, spanY);

  const slack = Math.max(0, restChord - chord);
  const tautness = clamp((chord - restChord) / 190, 0, 1);
  const sagY = Math.min(115, slack * 0.65);

  const relaxedC1X = startX + spanX * 0.12;
  const relaxedC1Y = startY + Math.max(52, spanY * 0.34) + sagY * 0.72;
  const relaxedC2X = startX + spanX * 0.68 - Math.sin(state.angleRad) * 16;
  const relaxedC2Y =
    Math.max(startY + 34, endY - Math.max(28, spanY * 0.34) - Math.cos(state.angleRad) * 8) +
    sagY;

  const tautC1X = startX + spanX * 0.33;
  const tautC1Y = startY + spanY * 0.33 + 12 * (1 - tautness);
  const tautC2X = startX + spanX * 0.67 - Math.sin(state.angleRad) * 6;
  const tautC2Y = startY + spanY * 0.67 + 8 * (1 - tautness);

  const c1x = roundSvg(relaxedC1X + (tautC1X - relaxedC1X) * tautness);
  const c1y = roundSvg(relaxedC1Y + (tautC1Y - relaxedC1Y) * tautness);
  const c2x = roundSvg(relaxedC2X + (tautC2X - relaxedC2X) * tautness);
  const c2y = roundSvg(relaxedC2Y + (tautC2Y - relaxedC2Y) * tautness);

  const strapPath = `M ${roundSvg(startX)} ${startY} C ${c1x} ${c1y} ${c2x} ${c2y} ${roundSvg(endX)} ${roundSvg(endY)}`;

  const cardDeg = roundSvg((state.angleRad * 180) / Math.PI);
  const pitchDeg = roundSvg((state.pitchRad * 180) / Math.PI);
  const rollDeg = roundSvg((state.rollRad * 180) / Math.PI);
  const tx = roundSvg(state.x);
  const ty = roundSvg(state.y);

  const strapTangentRad = -Math.atan2(endX - c2x, Math.max(12, endY - c2y));
  const swivelDeg = roundSvg(
    clamp((((strapTangentRad - state.angleRad) * 180) / Math.PI) * 0.34, -9, 9)
  );

  return {
    viewBox: `0 0 ${vw} ${CANONICAL_SVG_HEIGHT}`,
    strapPath,
    badgeTransform: `translate3d(${tx}px, ${ty}px, 0) rotateZ(${cardDeg}deg) rotateX(${pitchDeg}deg) rotateY(${rollDeg}deg)`,
    clipTransform: `translateX(-50%) rotate(${swivelDeg}deg)`,
    isDragging: state.phase === "dragging" && state.moved,
    isAnimated: state.phase !== "idle",
  };
}
