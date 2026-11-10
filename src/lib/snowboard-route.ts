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
