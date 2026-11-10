const routeWidth = 100;
const turnSpacing = 180;
const SUBDIVISIONS_PER_STOP = 6;
const TRENCH_CROSSOVER_MARGIN = 0.032;
const CURVATURE_REFERENCE = 1850;

type Checkpoint = Readonly<{ x: number; y: number }>;

type RouteCurveSample = Readonly<{
  x: number;
  y: number;
  dxDp: number;
  d2xDp2: number;
}>;

export type CarveTrenchSegment = Readonly<{
  id: string;
  startProgress: number;
  endProgress: number;
  outsideSign: -1 | 1;
  isGateCheck: boolean;
  groovePath: string;
  bermPath: string;
}>;

const fmtCoord = (value: number): string => value.toFixed(2);

/** Evaluates position, slope tangent, and lateral curvature along the multi-carve S-route. */
function sampleRouteCurve(position: number): RouteCurveSample {
  const twoPiP = 2 * Math.PI * position;
  const threePiP = 3 * Math.PI * position;

  const cos2 = Math.cos(twoPiP);
  const sin2 = Math.sin(twoPiP);
  const cos3 = Math.cos(threePiP);
  const sin3 = Math.sin(threePiP);

  const envelope = 0.76 + 0.24 * cos2;
  const dEnvelope = -0.48 * Math.PI * sin2;
  const d2Envelope = -0.96 * Math.PI * Math.PI * cos2;

  const carrier = cos3;
  const dCarrier = -3 * Math.PI * sin3;
  const d2Carrier = -9 * Math.PI * Math.PI * cos3;

  const dfDp = dEnvelope * carrier + envelope * dCarrier;
  const d2fDp2 =
    d2Envelope * carrier + 2 * dEnvelope * dCarrier + envelope * d2Carrier;

  return {
    x: 50 - 30 * envelope * carrier,
    y: (0.5 + position) * turnSpacing,
    dxDp: -30 * dfDp,
    d2xDp2: -30 * d2fDp2,
  };
}

function buildHermiteSubpath(
  startProgress: number,
  endProgress: number,
  segments: number,
  lateralOffsetFn?: (unitT: number) => Readonly<{ offset: number; dOffsetDu: number }>
): string {
  const span = endProgress - startProgress;
  const step = span / segments;
  const pointAt = (index: number) => {
    const u = index / segments;
    const p = startProgress + index * step;
    const sample = sampleRouteCurve(p);
    if (!lateralOffsetFn) {
      return { x: sample.x, y: sample.y, dxDp: sample.dxDp };
    }
    const { offset, dOffsetDu } = lateralOffsetFn(u);
    return {
      x: sample.x + offset,
      y: sample.y,
      dxDp: sample.dxDp + dOffsetDu / span,
    };
  };

  let prev = pointAt(0);
  const commands = [`M ${fmtCoord(prev.x)} ${fmtCoord(prev.y)}`];

  for (let i = 1; i <= segments; i++) {
    const curr = pointAt(i);
    const cp1x = prev.x + (prev.dxDp * step) / 3;
    const cp1y = prev.y + (turnSpacing * step) / 3;
    const cp2x = curr.x - (curr.dxDp * step) / 3;
    const cp2y = curr.y - (turnSpacing * step) / 3;
    commands.push(
      `C ${fmtCoord(cp1x)} ${fmtCoord(cp1y)}, ${fmtCoord(cp2x)} ${fmtCoord(cp2y)}, ${fmtCoord(curr.x)} ${fmtCoord(curr.y)}`
    );
    prev = curr;
  }

  return commands.join(" ");
}

function smoothDropInRamp(position: number): number {
  const u = Math.min(1, Math.max(0, position / 0.14));
  return u * u * (3 - 2 * u);
}

/** Defines a multi-carve S-turn mountain route through each alternating topic gate, plus carved edge trenches. */
export function createSnowboardRoute(count: number) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("The snowboard route requires at least one checkpoint");
  }

  const checkpoints: readonly Checkpoint[] = Array.from(
    { length: count },
    (_, index) => {
      const sample = sampleRouteCurve(index);
      return {
        x: Math.round(sample.x),
        y: sample.y,
      };
    }
  );

  const last = count - 1;
  const path =
    last === 0
      ? `M ${checkpoints[0].x} ${checkpoints[0].y}`
      : buildHermiteSubpath(0, last, last * SUBDIVISIONS_PER_STOP);

  const totalCarves = last * 3;
  const edgeTrenches: readonly CarveTrenchSegment[] = Array.from(
    { length: totalCarves },
    (_, carveIndex) => {
      const rawStart = (2 * carveIndex + 1) / 6;
      const rawEnd = Math.min(last, (2 * carveIndex + 3) / 6);
      const startProgress = rawStart + TRENCH_CROSSOVER_MARGIN;
      const endProgress =
        carveIndex === totalCarves - 1
          ? last
          : rawEnd - TRENCH_CROSSOVER_MARGIN;
      const midSample = sampleRouteCurve((startProgress + endProgress) * 0.5);
      const outsideSign: -1 | 1 = midSample.d2xDp2 >= 0 ? -1 : 1;
      const isGateCheck = carveIndex % 3 === 2;
      const peakBerm = isGateCheck ? 1.75 : 1.35;

      return {
        id: `trench-${carveIndex}`,
        startProgress,
        endProgress,
        outsideSign,
        isGateCheck,
        groovePath: buildHermiteSubpath(startProgress, endProgress, 4),
        bermPath: buildHermiteSubpath(startProgress, endProgress, 4, (u) => ({
          offset: outsideSign * (0.45 + peakBerm * Math.sin(Math.PI * u)),
          dOffsetDu:
            outsideSign * peakBerm * Math.PI * Math.cos(Math.PI * u),
        })),
      };
    }
  );

  return {
    checkpoints,
    path,
    edgeTrenches,
    width: routeWidth,
    height: count * turnSpacing,
  };
}

/** Computes the normalized [0, 1] reveal fraction for a carved snow trench behind the rider. */
export function getTrenchReveal(
  trench: CarveTrenchSegment,
  progress: number
): number {
  if (!Number.isFinite(progress)) {
    throw new Error("Trench reveal requires a finite progress value");
  }
  if (progress <= trench.startProgress) {
    return 0;
  }
  if (progress >= trench.endProgress) {
    return 1;
  }
  return (
    (progress - trench.startProgress) /
    (trench.endProgress - trench.startProgress)
  );
}

/** Samples the rider's exact coordinates and inward banking angle along the multi-carve S-route. */
export function getSnowboardPose(
  route: ReturnType<typeof createSnowboardRoute>,
  progress: number,
  reducedMotion: boolean
) {
  const last = route.checkpoints.length - 1;
  const clamped = Math.min(Math.max(progress, 0), last);
  const activeIndex = Math.round(clamped);
  const position = reducedMotion ? activeIndex : clamped;
  const sample = sampleRouteCurve(position);
  const bank = Math.tanh(sample.d2xDp2 / CURVATURE_REFERENCE) * smoothDropInRamp(position);

  return {
    activeIndex,
    x: sample.x,
    y: sample.y,
    lean: reducedMotion ? 0 : bank * 18,
  };
}

export type TrailScrollMetrics = Readonly<{
  laneTopDocY: number;
  laneHeight: number;
  checkpointCount: number;
  viewportHeight: number;
  scrollHeight: number;
}>;

export type TrailScrollSpan = Readonly<{
  firstTurn: number;
  lastTurn: number;
}>;

/** Computes the document scrollY bounds where Turn 01 and the final turn align with the viewport center. */
export function getTrailScrollSpan(metrics: TrailScrollMetrics): TrailScrollSpan {
  const { laneTopDocY, laneHeight, checkpointCount, viewportHeight, scrollHeight } =
    metrics;
  if (
    !Number.isFinite(laneTopDocY) ||
    !Number.isFinite(laneHeight) ||
    laneHeight <= 0 ||
    !Number.isInteger(checkpointCount) ||
    checkpointCount < 1 ||
    !Number.isFinite(viewportHeight) ||
    viewportHeight <= 0 ||
    !Number.isFinite(scrollHeight) ||
    scrollHeight < viewportHeight
  ) {
    throw new Error(
      "Trail scroll span requires positive laneHeight/viewportHeight, valid checkpointCount, and scrollHeight >= viewportHeight"
    );
  }

  const center = viewportHeight / 2;
  const halfRow = laneHeight / checkpointCount / 2;
  const firstTurn = Math.max(0, laneTopDocY + halfRow - center);
  const maxScrollY = scrollHeight - viewportHeight;
  const lastTurn = Math.min(
    maxScrollY,
    laneTopDocY + laneHeight - halfRow - center
  );
  return { firstTurn, lastTurn: Math.max(firstTurn, lastTurn) };
}

/** Computes the exact window.scrollY that places the snowboarder squarely on the requested checkpoint index. */
export function getCheckpointScrollTarget(
  metrics: TrailScrollMetrics,
  checkpointIndex: number
): number {
  const { checkpointCount } = metrics;
  if (
    !Number.isInteger(checkpointIndex) ||
    checkpointIndex < 0 ||
    checkpointIndex >= checkpointCount
  ) {
    throw new Error(
      "Checkpoint index must be an integer within [0, checkpointCount)"
    );
  }

  const { firstTurn, lastTurn } = getTrailScrollSpan(metrics);
  if (checkpointCount === 1 || lastTurn <= firstTurn) {
    return firstTurn;
  }

  return (
    firstTurn + (checkpointIndex / (checkpointCount - 1)) * (lastTurn - firstTurn)
  );
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

const MAC_LAUNCH_SCALE = 0.9;
const MAC_PEAK_SCALE = 2.5;
const MAC_APEX_EASE = 7 / 27;
const MAC_SCALE_BOOST =
  MAC_PEAK_SCALE - (MAC_LAUNCH_SCALE + (1 - MAC_LAUNCH_SCALE) * MAC_APEX_EASE);
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
  const baseScale = MAC_LAUNCH_SCALE + (1 - MAC_LAUNCH_SCALE) * ease;
  const direction = launchDeltaX === 0 ? 1 : -Math.sign(launchDeltaX);

  return {
    x: launchDeltaX * (1 - ease),
    y: launchDeltaY * (1 - ease) - arcLift * arc,
    scale: baseScale + MAC_SCALE_BOOST * arc,
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
      boardLift: 0;
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
      isGateSlash: false;
    }>
  | Readonly<{
      kind: "carving";
      carveSide: CarveSide;
      boardYaw: number;
      edgeRoll: number;
      boardPitch: number;
      boardLift: number;
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
      isGateSlash: boolean;
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

/** Derives continuous 3D Option B (Niseko Powder Pro) multi-carve kinematics along the trail. */
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

  const sample = sampleRouteCurve(position);
  const ramp = smoothDropInRamp(position);
  const rawBank = Math.tanh(sample.d2xDp2 / CURVATURE_REFERENCE);
  const bank = rawBank * ramp;
  const absBank = Math.abs(bank);

  const gateRaw = Math.max(0, (Math.cos(2 * Math.PI * position) - 0.55) / 0.45);
  const gateCheck =
    position <= 0.5 ? 0 : gateRaw * gateRaw * (3 - 2 * gateRaw);

  const carveSide: CarveSide =
    bank > CARVE_DEADZONE
      ? "heelside"
      : bank < -CARVE_DEADZONE
        ? "toeside"
        : "neutral";

  const tangentYaw = Math.atan2(sample.dxDp, turnSpacing);
  const activeCarveYaw =
    tangentYaw * 0.92 + rawBank * 0.28 + rawBank * 0.26 * gateCheck * energy;
  const boardYaw = GATE_LEAD_YAW * (1 - ramp) + activeCarveYaw * ramp;

  const edgeRoll = bank === 0 ? 0 : -bank * (0.52 + 0.16 * energy);
  const crossoverWindow = Math.max(0, 1 - (Math.abs(rawBank) / 0.24) ** 2);
  const boardLift =
    energy === 0 ? 0 : energy * ramp * crossoverWindow * 1.35;

  const breath = energy === 0 ? 0 : energy * Math.sin(elapsedSec * 5.4) * 0.18;
  const crouch = Math.max(
    0,
    absBank * (1.25 + 0.95 * energy) + gateCheck * 0.45 * energy - breath
  );
  const hipShift = bank === 0 ? 0 : -bank * (1.1 + 0.45 * energy);
  const pelvisYaw = boardYaw - 0.78;

  const torsoLead = GATE_LEAD_YAW * (16 / 36);
  const headLead = GATE_LEAD_YAW * (12 / 36);
  const torsoYaw =
    (torsoLead - 0.24) * (1 - ramp) +
    (boardYaw * 0.55 + bank * 0.18 - 0.24) * ramp;
  const headYaw =
    (headLead - 0.05) * (1 - ramp) +
    (boardYaw * 0.34 + bank * 0.14 - 0.05) * ramp;

  const popArmLift =
    energy === 0 ? 0 : crossoverWindow * 0.12 * energy * ramp;
  const leftArmDrop =
    bank < -CARVE_DEADZONE
      ? absBank * (0.52 + 0.28 * energy)
      : -0.25 - popArmLift;
  const rightArmDrop =
    bank > CARVE_DEADZONE
      ? absBank * (0.52 + 0.28 * energy)
      : -0.25 - popArmLift;

  const hairSway =
    -0.2 * (1 - ramp) + (-bank * 1.25 - tangentYaw * 0.45) * ramp;
  const hairFlutter =
    energy === 0 ? 0 : energy * Math.sin(elapsedSec * 8.8) * 0.55;

  const isGateSlash = gateCheck > 0.35 && energy > 0.2;
  const sprayIntensity =
    carveSide === "neutral" || energy <= 0
      ? 0
      : Math.min(1, (absBank * 0.95 + gateCheck * 0.35) * energy);
  const spraySide: -1 | 0 | 1 =
    sprayIntensity <= 0 ? 0 : bank > 0 ? -1 : 1;

  return {
    kind: "carving",
    carveSide,
    boardYaw,
    edgeRoll,
    boardPitch: absBank * 0.07 + boardLift * 0.04,
    boardLift,
    crouch,
    hipShift,
    pelvisYaw,
    torsoYaw,
    headYaw,
    leftArmDrop,
    rightArmDrop,
    hairSway,
    hairFlutter,
    shadowScale: Math.max(0.68, 1 - absBank * 0.08 - boardLift * 0.14),
    sprayIntensity,
    spraySide,
    isGateSlash,
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
    edgeRoll: leanNorm === 0 ? 0 : -leanNorm * 0.38,
    boardPitch: airArc === 0 ? 0 : -airArc * 0.24,
    boardLift: 0,
    crouch: airArc * 2.2,
    hipShift: leanNorm === 0 ? 0 : -leanNorm * 0.6,
    pelvisYaw: boardYaw - 0.78,
    torsoYaw: GATE_LEAD_YAW * (16 / 36) - 0.24 + leanNorm * 0.25,
    headYaw: GATE_LEAD_YAW * (12 / 36) - 0.05 + leanNorm * 0.15,
    leftArmDrop: -0.45 * airArc - 0.25 * (1 - airArc),
    rightArmDrop: -0.45 * airArc - 0.25 * (1 - airArc),
    hairSway: -0.2 - airArc * 0.85,
    hairFlutter: airArc === 0 ? 0 : airArc * Math.sin(elapsedSec * 10) * 0.6,
    shadowScale: 0,
    sprayIntensity: 0,
    spraySide: 0,
    isGateSlash: false,
  };
}
