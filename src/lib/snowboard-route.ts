const routeWidth = 100;
const turnSpacing = 100;

type Checkpoint = Readonly<{ x: number; y: number }>;

/** Defines one turn per row, with the rider's path passing through each checkpoint. */
export function createSnowboardRoute(count: number) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("The snowboard route requires at least one checkpoint");
  }

  const checkpoints: readonly Checkpoint[] = Array.from({ length: count }, (_, index) => ({
    x: index % 2 === 0 ? 26 : 74,
    y: (index + 0.5) * turnSpacing,
  }));
  const path = checkpoints.map(({ x, y }, index) => {
    if (index === 0) return "M " + x + " " + y;

    const previous = checkpoints[index - 1];
    return "C " + previous.x + " " + (previous.y + turnSpacing / 3)
      + ", " + x + " " + (y - turnSpacing / 3) + ", " + x + " " + y;
  }).join(" ");

  return { checkpoints, path, width: routeWidth, height: count * turnSpacing };
}

/** Interpolates the same cubic used to draw the trail, so the board stays on it while scrolling. */
export function getSnowboardPose(
  route: ReturnType<typeof createSnowboardRoute>,
  progress: number,
  reducedMotion: boolean
) {
  const last = route.checkpoints.length - 1;
  const clamped = Math.min(Math.max(progress, 0), last);
  const activeIndex = Math.round(clamped);
  const position = reducedMotion ? activeIndex : clamped;
  const index = Math.floor(position);
  const from = route.checkpoints[index];
  const to = route.checkpoints[Math.min(index + 1, last)];
  const t = position - index;
  const curve = t * t * (3 - 2 * t);

  return {
    activeIndex,
    x: from.x + (to.x - from.x) * curve,
    y: from.y + (to.y - from.y) * t,
    lean: Math.sign(to.x - from.x) * 18 * Math.sin(Math.PI * t),
  };
}

export type MacJumpInput = Readonly<{
  progress: number;
  launchDeltaX: number;
  launchDeltaY: number;
  arcLift: number;
  reducedMotion: boolean;
}>;

export type MacJumpPose = Readonly<{
  x: number;
  y: number;
  scale: number;
  lean: number;
  opacity: number;
}>;

const MAC_LAUNCH_SCALE = 0.42;
const MAC_FADE_IN_END = 0.12;

/** Computes normalized jump progress between scrolling past the Mac screen and reaching Turn 01. */
export function getMacJumpProgress(
  scrollY: number,
  macLaunchDocY: number,
  firstTurnScrollY: number,
  viewportHeight: number
): number {
  if (
    !Number.isFinite(scrollY) ||
    !Number.isFinite(macLaunchDocY) ||
    !Number.isFinite(firstTurnScrollY) ||
    !Number.isFinite(viewportHeight) ||
    viewportHeight <= 0
  ) {
    throw new Error(
      "Mac jump progress requires finite scroll offsets and positive viewport height"
    );
  }

  const minSpan = Math.max(180, viewportHeight * 0.25);
  const jumpStart = Math.min(
    firstTurnScrollY - minSpan,
    macLaunchDocY - viewportHeight * 0.34
  );
  return (scrollY - jumpStart) / (firstTurnScrollY - jumpStart);
}

/** Computes the parabolic jump pose from the MacBook screen onto Checkpoint 01. */
export function getMacJumpPose(input: MacJumpInput): MacJumpPose {
  const { progress, launchDeltaX, launchDeltaY, arcLift, reducedMotion } = input;
  if (
    !Number.isFinite(progress) ||
    !Number.isFinite(launchDeltaX) ||
    !Number.isFinite(launchDeltaY) ||
    !Number.isFinite(arcLift) ||
    arcLift < 0
  ) {
    throw new Error(
      "Mac jump pose requires finite coordinates and a non-negative arc lift"
    );
  }

  if (reducedMotion || progress >= 1) {
    return { x: 0, y: 0, scale: 1, lean: 0, opacity: 1 };
  }
  if (progress <= 0) {
    return {
      x: launchDeltaX,
      y: launchDeltaY,
      scale: MAC_LAUNCH_SCALE,
      lean: 0,
      opacity: 0,
    };
  }

  const ease = progress * progress * (3 - 2 * progress);
  const oneMinusT = 1 - progress;
  const arc = 6.75 * progress * oneMinusT * oneMinusT;
  const direction = launchDeltaX === 0 ? 1 : -Math.sign(launchDeltaX);

  return {
    x: launchDeltaX * (1 - ease),
    y: launchDeltaY * (1 - ease) - arcLift * arc,
    scale: MAC_LAUNCH_SCALE + (1 - MAC_LAUNCH_SCALE) * ease,
    lean: direction * 16 * Math.sin(Math.PI * progress),
    opacity: Math.min(1, progress / MAC_FADE_IN_END),
  };
}

export type CarveSide = "neutral" | "heelside" | "toeside";

export type RiderRigPose =
  | Readonly<{
      kind: "airborne";
      boardYaw: number;
      edgeRoll: number;
      boardPitch: number;
      crouch: number;
      hipShift: number;
      pelvisYaw: number;
      torsoYaw: number;
      headYaw: number;
      leftArmDrop: number;
      rightArmDrop: number;
      hairSway: number;
      hairFlutter: number;
      shadowScale: 0;
      sprayIntensity: 0;
      spraySide: 0;
    }>
  | Readonly<{
      kind: "carving";
      carveSide: CarveSide;
      boardYaw: number;
      edgeRoll: number;
      boardPitch: number;
      crouch: number;
      hipShift: number;
      pelvisYaw: number;
      torsoYaw: number;
      headYaw: number;
      leftArmDrop: number;
      rightArmDrop: number;
      hairSway: number;
      hairFlutter: number;
      shadowScale: number;
      sprayIntensity: number;
      spraySide: -1 | 0 | 1;
    }>;

export type TrailRigInput = Readonly<{
  progress: number;
  motionEnergy: number;
  elapsedSec: number;
  reducedMotion: boolean;
}>;

export type AirborneRigInput = Readonly<{
  jumpProgress: number;
  leanDeg: number;
  elapsedSec: number;
}>;

const SETTLE_DURATION_MS = 600;
const GATE_LEAD_YAW = 0.36;
const CARVE_YAW_SWING = 0.92;
const CARVE_DEADZONE = 0.08;

/** Advances scroll-driven motion energy and decays it linearly to zero over 600ms when idle. */
export function stepSettleEnergy(
  currentEnergy: number,
  scrollDeltaPx: number,
  dtMs: number,
  reducedMotion: boolean
): number {
  if (
    !Number.isFinite(currentEnergy) ||
    currentEnergy < 0 ||
    currentEnergy > 1 ||
    !Number.isFinite(scrollDeltaPx) ||
    !Number.isFinite(dtMs) ||
    dtMs < 0
  ) {
    throw new Error(
      "Settle energy requires normalized currentEnergy [0, 1], finite scrollDeltaPx, and non-negative dtMs"
    );
  }

  if (reducedMotion) {
    return 0;
  }

  const boost = Math.min(1, Math.abs(scrollDeltaPx) / 28);
  const energized = Math.min(1, Math.max(currentEnergy, boost));
  if (Math.abs(scrollDeltaPx) >= 0.5) {
    return Math.max(energized, 0.35);
  }

  return Math.max(0, energized - dtMs / SETTLE_DURATION_MS);
}

/** Derives continuous 3D Option B (Niseko Powder Pro) carving kinematics along the trail. */
export function deriveTrailRigPose(
  route: ReturnType<typeof createSnowboardRoute>,
  input: TrailRigInput
): Extract<RiderRigPose, { kind: "carving" }> {
  const { progress, motionEnergy, elapsedSec, reducedMotion } = input;
  if (
    !Number.isFinite(progress) ||
    !Number.isFinite(motionEnergy) ||
    motionEnergy < 0 ||
    motionEnergy > 1 ||
    !Number.isFinite(elapsedSec)
  ) {
    throw new Error(
      "Trail rig pose requires finite progress/elapsedSec and motionEnergy within [0, 1]"
    );
  }

  const last = route.checkpoints.length - 1;
  const clamped = Math.min(Math.max(progress, 0), last);
  const position = reducedMotion ? Math.round(clamped) : clamped;
  const energy = reducedMotion ? 0 : motionEnergy;

  const leanNorm = Math.sin(Math.PI * position);
  const bankBias = Math.cos(Math.PI * position);
  const absLean = Math.abs(leanNorm);

  const carveSide: CarveSide =
    leanNorm > CARVE_DEADZONE
      ? "heelside"
      : leanNorm < -CARVE_DEADZONE
        ? "toeside"
        : "neutral";

  const boardYaw = leanNorm * CARVE_YAW_SWING + bankBias * GATE_LEAD_YAW;
  const edgeRoll = -leanNorm * 0.56;
  const breath = energy * Math.sin(elapsedSec * 5.2) * 0.2;
  const crouch = Math.max(0, absLean * 2.0 - breath);
  const hipShift = -leanNorm * 1.4;
  const pelvisYaw = boardYaw - 0.78;
  const torsoYaw = leanNorm * 0.54 + bankBias * 0.16 - 0.24;
  const headYaw = leanNorm * 0.26 + bankBias * 0.12 - 0.05;

  const leftArmDrop = leanNorm < 0 ? absLean * 0.65 : -0.25;
  const rightArmDrop = leanNorm > 0 ? absLean * 0.65 : -0.25;
  const hairSway = -leanNorm * 1.35 - bankBias * 0.2;
  const hairFlutter = energy * Math.sin(elapsedSec * 8.5) * 0.5;

  const sprayIntensity =
    carveSide === "neutral" || reducedMotion
      ? 0
      : absLean * (0.3 + 0.7 * energy);
  const spraySide: -1 | 0 | 1 =
    sprayIntensity <= 0 ? 0 : leanNorm > 0 ? -1 : 1;

  return {
    kind: "carving",
    carveSide,
    boardYaw,
    edgeRoll,
    boardPitch: absLean * 0.06,
    crouch,
    hipShift,
    pelvisYaw,
    torsoYaw,
    headYaw,
    leftArmDrop,
    rightArmDrop,
    hairSway,
    hairFlutter,
    shadowScale: 1 - absLean * 0.08,
    sprayIntensity,
    spraySide,
  };
}

/** Derives the mid-air 3D tucked pose while jumping from the Mac screen onto Checkpoint 01. */
export function deriveAirborneRigPose(
  input: AirborneRigInput
): Extract<RiderRigPose, { kind: "airborne" }> {
  const { jumpProgress, leanDeg, elapsedSec } = input;
  if (
    !Number.isFinite(jumpProgress) ||
    !Number.isFinite(leanDeg) ||
    !Number.isFinite(elapsedSec)
  ) {
    throw new Error("Airborne rig pose requires finite jumpProgress, leanDeg, and elapsedSec");
  }

  const t = Math.min(Math.max(jumpProgress, 0), 1);
  const airArc = Math.sin(Math.PI * t);
  const leanNorm = Math.max(-1, Math.min(1, leanDeg / 18));
  const boardYaw = GATE_LEAD_YAW + leanNorm * 0.35;

  return {
    kind: "airborne",
    boardYaw,
    edgeRoll: -leanNorm * 0.38,
    boardPitch: -airArc * 0.24,
    crouch: airArc * 2.2,
    hipShift: -leanNorm * 0.6,
    pelvisYaw: boardYaw - 0.78,
    torsoYaw: GATE_LEAD_YAW * (16 / 36) - 0.24 + leanNorm * 0.25,
    headYaw: GATE_LEAD_YAW * (12 / 36) - 0.05 + leanNorm * 0.15,
    leftArmDrop: -0.45 * airArc - 0.25 * (1 - airArc),
    rightArmDrop: -0.45 * airArc - 0.25 * (1 - airArc),
    hairSway: -0.2 - airArc * 0.85,
    hairFlutter: airArc * Math.sin(elapsedSec * 10) * 0.6,
    shadowScale: 0,
    sprayIntensity: 0,
    spraySide: 0,
  };
}
