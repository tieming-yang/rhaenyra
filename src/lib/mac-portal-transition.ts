export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface ScreenLayoutBox {
  readonly centerX: number;
  readonly centerY: number;
  readonly width: number;
  readonly height: number;
}

export interface StickyRailMetrics {
  readonly railTopPx: number;
  readonly railHeightPx: number;
  readonly viewportHeightPx: number;
  readonly startDwellRatio?: number;
}

export interface StageTargetCenter {
  readonly x: number;
  readonly y: number;
}

export interface StickyStageCenterInput {
  readonly stageWidth: number;
  readonly stageHeight: number;
  readonly viewportHeight: number;
}

export interface StickyStageCenter {
  readonly x: number;
  readonly y: number;
  readonly stickyTopPx: number;
}

export interface MacPortalDiveInput {
  readonly viewport: ViewportSize;
  readonly screen: ScreenLayoutBox;
  readonly targetCenter?: StageTargetCenter;
  readonly rawProgress: number;
  readonly reducedMotion: boolean;
}

export type MacPortalPhase = "browsing" | "diving" | "immersed";

export interface MacPortalDivePose {
  readonly phase: MacPortalPhase;
  readonly progress: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly scale: number;
  readonly lidTiltProgress: number;
  readonly copyOpacity: number;
  readonly copyShiftY: number;
  readonly dockOpacity: number;
  readonly baseOpacity: number;
  readonly portalScreenOpacity: number;
  readonly snowVeilOpacity: number;
  readonly screenCornerRadiusScale: number;
  readonly portalIntroScale: number;
  readonly uiInteractive: boolean;
}

export interface DeskFinaleInput {
  readonly viewport: ViewportSize;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly rawProgress: number;
  readonly reducedMotion: boolean;
}

export type DeskFinalePhase =
  | "screen-pullback"
  | "lid-closing"
  | "flatlay-settled";

export interface DeskFinalePose {
  readonly phase: DeskFinalePhase;
  readonly progress: number;
  readonly macScale: number;
  readonly snowScreenOpacity: number;
  readonly snowRidgeOpacity: number;
  readonly lidCloseProgress: number;
  readonly cameraOverheadProgress: number;
  readonly deskSurfaceOpacity: number;
  readonly badgeProgress: number;
  readonly stickyNoteProgress: number;
  readonly phoneProgress: number;
  readonly rulerProgress: number;
  readonly deskInteractive: boolean;
}

const BEZEL_CLEARANCE_MULTIPLIER = 1.12;

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number`);
  }
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) {
    return x >= edge1 ? 1 : 0;
  }
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function smootherstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) {
    return x >= edge1 ? 1 : 0;
  }
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Computes normalized [0, 1] scroll progress along a sticky scroll rail,
 * optionally reserving an initial dwell fraction before motion begins.
 */
export function resolveStickyRailProgress(metrics: StickyRailMetrics): number {
  assertFinite(metrics.railTopPx, "railTopPx");
  assertPositiveFinite(metrics.railHeightPx, "railHeightPx");
  assertPositiveFinite(metrics.viewportHeightPx, "viewportHeightPx");

  const dwellRatio = metrics.startDwellRatio ?? 0;
  if (!Number.isFinite(dwellRatio) || dwellRatio < 0 || dwellRatio >= 1) {
    throw new Error("startDwellRatio must be in [0, 1)");
  }

  const scrollablePx = metrics.railHeightPx - metrics.viewportHeightPx;
  if (scrollablePx <= 0) {
    return metrics.railTopPx <= 0 ? 1 : 0;
  }

  const rawRatio = clamp01(-metrics.railTopPx / scrollablePx);
  if (rawRatio <= dwellRatio) {
    return 0;
  }
  return clamp01((rawRatio - dwellRatio) / (1 - dwellRatio));
}

/**
 * Resolves the sticky CSS `top` offset (`<= 0`) for a stage inside the viewport,
 * along with the stage-local `(x, y)` point that maps to the viewport center
 * while stuck (staying invariant before sticking and after unsticking).
 */
export function resolveStickyStageViewportCenter(
  input: StickyStageCenterInput
): StickyStageCenter {
  assertPositiveFinite(input.stageWidth, "stageWidth");
  assertPositiveFinite(input.stageHeight, "stageHeight");
  assertPositiveFinite(input.viewportHeight, "viewportHeight");

  const stickyTopPx = Math.min(0, input.viewportHeight - input.stageHeight);
  return {
    x: input.stageWidth * 0.5,
    y: -stickyTopPx + input.viewportHeight * 0.5,
    stickyTopPx,
  };
}

/**
 * Derives the Section 3 -> Section 4 camera dive pose that centers `#resume-mac-screen`
 * in stage-local coordinates and scales it logarithmically past the viewport edges.
 */
export function deriveMacPortalDivePose(
  input: MacPortalDiveInput
): MacPortalDivePose {
  assertPositiveFinite(input.viewport.width, "viewport.width");
  assertPositiveFinite(input.viewport.height, "viewport.height");
  assertFinite(input.screen.centerX, "screen.centerX");
  assertFinite(input.screen.centerY, "screen.centerY");
  assertPositiveFinite(input.screen.width, "screen.width");
  assertPositiveFinite(input.screen.height, "screen.height");
  assertFinite(input.rawProgress, "rawProgress");

  const targetX = input.targetCenter?.x ?? input.viewport.width * 0.5;
  const targetY = input.targetCenter?.y ?? input.viewport.height * 0.5;
  assertFinite(targetX, "targetCenter.x");
  assertFinite(targetY, "targetCenter.y");

  if (input.reducedMotion) {
    return {
      phase: "browsing",
      progress: 0,
      translateX: 0,
      translateY: 0,
      scale: 1,
      lidTiltProgress: 1,
      copyOpacity: 1,
      copyShiftY: 0,
      dockOpacity: 1,
      baseOpacity: 1,
      portalScreenOpacity: 0,
      snowVeilOpacity: 0,
      screenCornerRadiusScale: 1,
      portalIntroScale: 1,
      uiInteractive: true,
    };
  }

  const progress = clamp01(input.rawProgress);
  if (progress === 0) {
    return {
      phase: "browsing",
      progress: 0,
      translateX: 0,
      translateY: 0,
      scale: 1,
      lidTiltProgress: 1,
      copyOpacity: 1,
      copyShiftY: 0,
      dockOpacity: 1,
      baseOpacity: 1,
      portalScreenOpacity: 0,
      snowVeilOpacity: 0,
      screenCornerRadiusScale: 1,
      portalIntroScale: 0.92,
      uiInteractive: true,
    };
  }

  const coverScale =
    Math.max(
      input.viewport.width / input.screen.width,
      input.viewport.height / input.screen.height
    ) * BEZEL_CLEARANCE_MULTIPLIER;
  const targetScale = Math.max(1.25, coverScale);

  const zoomEase = smootherstep(0, 0.86, progress);
  const centerEase = smoothstep(0, 0.68, progress);
  const scale = Math.pow(targetScale, zoomEase);

  const deltaX = targetX - input.screen.centerX;
  const deltaY = targetY - input.screen.centerY;

  const copyFade = smoothstep(0.02, 0.34, progress);
  const dockFade = smoothstep(0.0, 0.26, progress);
  const baseFade = smoothstep(0.16, 0.58, progress);
  const portalScreenOpacity = smoothstep(0.16, 0.66, progress);
  const snowVeilOpacity = smoothstep(0.64, 0.86, progress);
  const screenCornerRadiusScale = 1 - smoothstep(0.54, 0.84, progress);
  const portalIntroScale = 0.92 + 0.08 * smoothstep(0.2, 0.86, progress);

  return {
    phase: progress >= 0.86 ? "immersed" : "diving",
    progress,
    translateX: deltaX * centerEase,
    translateY: deltaY * centerEase,
    scale,
    lidTiltProgress: 1,
    copyOpacity: 1 - copyFade,
    copyShiftY: -28 * copyFade,
    dockOpacity: 1 - dockFade,
    baseOpacity: 1 - baseFade,
    portalScreenOpacity,
    snowVeilOpacity,
    screenCornerRadiusScale,
    portalIntroScale,
    uiInteractive: progress < 0.08,
  };
}

/**
 * Derives the Section 4 finale camera arc:
 * 1) Pulls back from the full-screen snowfield into the open Mac monitor,
 * 2) Hinges the Mac lid shut while arcing overhead to a bird's-eye flat-lay,
 * 3) Settles the Hero ID badge, sticky note, smartphone, and triangle ruler onto the desk.
 */
export function deriveDeskFinalePose(input: DeskFinaleInput): DeskFinalePose {
  assertPositiveFinite(input.viewport.width, "viewport.width");
  assertPositiveFinite(input.viewport.height, "viewport.height");
  assertPositiveFinite(input.screenWidth, "screenWidth");
  assertPositiveFinite(input.screenHeight, "screenHeight");
  assertFinite(input.rawProgress, "rawProgress");

  if (input.reducedMotion) {
    return {
      phase: "flatlay-settled",
      progress: 1,
      macScale: 1,
      snowScreenOpacity: 0,
      snowRidgeOpacity: 0,
      lidCloseProgress: 1,
      cameraOverheadProgress: 1,
      deskSurfaceOpacity: 1,
      badgeProgress: 1,
      stickyNoteProgress: 1,
      phoneProgress: 1,
      rulerProgress: 1,
      deskInteractive: true,
    };
  }

  const progress = clamp01(input.rawProgress);
  const portalStartScale = Math.max(
    1.35,
    Math.max(
      input.viewport.width / input.screenWidth,
      input.viewport.height / input.screenHeight
    ) * BEZEL_CLEARANCE_MULTIPLIER
  );

  const pullbackEase = smootherstep(0.0, 0.42, progress);
  const macScale = Math.pow(portalStartScale, 1 - pullbackEase);
  const snowScreenOpacity = 1 - smoothstep(0.28, 0.54, progress);
  const snowRidgeOpacity =
    smoothstep(0.03, 0.18, progress) * snowScreenOpacity;
  const lidCloseProgress = smootherstep(0.34, 0.72, progress);
  const cameraOverheadProgress = smootherstep(0.32, 0.78, progress);
  const deskSurfaceOpacity = smoothstep(0.14, 0.48, progress);

  const badgeProgress = smootherstep(0.56, 0.86, progress);
  const stickyNoteProgress = smootherstep(0.62, 0.9, progress);
  const phoneProgress = smootherstep(0.66, 0.94, progress);
  const rulerProgress = smootherstep(0.7, 0.98, progress);

  const phase: DeskFinalePhase =
    progress < 0.34
      ? "screen-pullback"
      : progress < 0.82
        ? "lid-closing"
        : "flatlay-settled";

  return {
    phase,
    progress,
    macScale,
    snowScreenOpacity,
    snowRidgeOpacity,
    lidCloseProgress,
    cameraOverheadProgress,
    deskSurfaceOpacity,
    badgeProgress,
    stickyNoteProgress,
    phoneProgress,
    rulerProgress,
    deskInteractive: progress >= 0.76,
  };
}
