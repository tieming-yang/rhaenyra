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
