"use client";

import { ChevronDown } from "lucide-react";
import { type MouseEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  formatContentTemplate,
  type ProposalSectionContent,
} from "@/content";
import {
  PROPOSAL_FINISH_HASH,
  PROPOSAL_FINISH_ID,
} from "@/lib/header-navigation";
import {
  createSnowboardRoute,
  createWaypointSprint,
  deriveAirborneRigPose,
  deriveSlopeFlow,
  deriveTrailRigPose,
  getCheckpointScrollTarget,
  getMacJumpPose,
  getMacJumpProgress,
  getSnowboardPose,
  getTrailScrollSpan,
  type RiderSpringState,
  stepRiderSpringState,
  stepSettleEnergy,
  stepWaypointSprint,
  type WaypointSprintState,
} from "@/lib/snowboard-route";
import {
  createRiderPixelBuffer,
  type PowderParticle,
  renderNisekoPowderPro,
  RIDER_ANCHOR_X_PCT,
  RIDER_ANCHOR_Y_PCT,
  RIDER_CANVAS_SIZE,
  stepPowderParticles,
} from "@/lib/snowboarder-pixel-3d";

type SlopeCrystal = Readonly<{
  xRatio: number;
  ySeed: number;
  parallax: number;
  size: number;
  twinklePhase: number;
}>;

type SlopeStreak = Readonly<{
  inCorridor: boolean;
  xOffset: number;
  ySeed: number;
  speedScale: number;
  lenScale: number;
}>;

const SLOPE_CRYSTALS: readonly SlopeCrystal[] = Array.from(
  { length: 28 },
  (_, index) => ({
    xRatio: 0.04 + (((index * 0.61803398875 + 0.13) % 1) * 0.92),
    ySeed: (index * 0.38196601125 + 0.07) % 1,
    parallax: index % 3 === 0 ? 0.76 : index % 3 === 1 ? 1.02 : 1.28,
    size: index % 4 === 0 ? 2.5 : index % 2 === 0 ? 2 : 1.5,
    twinklePhase: index * 1.37,
  })
);

const SLOPE_STREAKS: readonly SlopeStreak[] = Array.from(
  { length: 18 },
  (_, index) => {
    const inCorridor = index % 3 !== 0;
    const raw = (index * 0.7548776662 + 0.19) % 1;
    return {
      inCorridor,
      xOffset: inCorridor ? (raw - 0.5) * 0.88 : 0.06 + raw * 0.88,
      ySeed: (index * 0.5698402909 + 0.29) % 1,
      speedScale: 1.15 + (index % 5) * 0.13,
      lenScale: 0.76 + (index % 4) * 0.18,
    };
  }
);

const SCROLL_CANCEL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

function wrapPositive(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function isPlainLeftClick(event: {
  readonly defaultPrevented: boolean;
  readonly button: number;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function renderAlpineSlopeBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  laneLeftPx: number,
  laneWidthPx: number,
  offsetPx: number,
  streakIntensity: number,
  elapsedSec: number
): void {
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;

  if (laneWidthPx > 12) {
    const ribSpacing = 26;
    const ribShift = wrapPositive(offsetPx, ribSpacing);
    const inset = Math.min(16, laneWidthPx * 0.12);
    const leftX = laneLeftPx + inset;
    const rightX = laneLeftPx + laneWidthPx - inset;
    const midX = (leftX + rightX) * 0.5;
    const ribRows = Math.ceil(height / ribSpacing) + 2;

    ctx.lineCap = "round";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let row = 0; row <= ribRows; row++) {
      const y = row * ribSpacing - ribShift;
      ctx.moveTo(leftX, y + 2.5);
      ctx.quadraticCurveTo(midX, y - 2.5, rightX, y + 2.5);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let row = 0; row <= ribRows; row++) {
      const y = row * ribSpacing - ribShift + 1.6;
      ctx.moveTo(leftX + 4, y + 2.2);
      ctx.quadraticCurveTo(midX, y - 2.1, rightX - 4, y + 2.2);
    }
    ctx.strokeStyle = "rgba(210, 147, 168, 0.13)";
    ctx.stroke();
  }

  const contourSpacing = 124;
  const contourOffset = offsetPx * 0.82;
  const firstContour = Math.floor(contourOffset / contourSpacing) - 1;
  const contourCount = Math.ceil(height / contourSpacing) + 3;
  const segments = 8;

  const traceContours = (yNudge: number) => {
    ctx.beginPath();
    for (let k = 0; k < contourCount; k++) {
      const worldIdx = firstContour + k;
      const baseY = worldIdx * contourSpacing - contourOffset + yNudge;
      const phase = worldIdx * 1.93;
      for (let s = 0; s <= segments; s++) {
        const u = s / segments;
        const x = u * width;
        const wave =
          Math.sin(u * Math.PI * 2.2 + phase) * 10.5 +
          Math.cos(u * Math.PI * 4.1 - phase * 0.6) * 4.2;
        const y = baseY + wave;
        if (s === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
  };

  ctx.lineWidth = 1.6;
  traceContours(0);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.76)";
  ctx.stroke();

  ctx.lineWidth = 1;
  traceContours(1.8);
  ctx.strokeStyle = "rgba(210, 147, 168, 0.15)";
  ctx.stroke();

  const crystalSpan = height + 48;
  for (const crystal of SLOPE_CRYSTALS) {
    const x = Math.round(crystal.xRatio * width);
    const y = Math.round(
      crystalSpan -
        24 -
        wrapPositive(
          crystal.ySeed * crystalSpan + offsetPx * crystal.parallax,
          crystalSpan
        )
    );
    const twinkle =
      streakIntensity === 0
        ? 0.55
        : 0.45 + 0.55 * Math.sin(elapsedSec * 3.8 + crystal.twinklePhase);

    ctx.fillStyle = `rgba(255, 255, 255, ${(0.38 + twinkle * 0.52).toFixed(2)})`;
    ctx.fillRect(x, y, crystal.size, crystal.size);

    if (twinkle > 0.78) {
      ctx.fillStyle = "rgba(210, 147, 168, 0.34)";
      ctx.fillRect(x - 2, y + 0.5, crystal.size + 4, 1);
      ctx.fillRect(x + 0.5, y - 2, 1, crystal.size + 4);
    }
  }

  if (streakIntensity > 0) {
    const streakSpan = height + 160;
    const laneCenterX = laneLeftPx + laneWidthPx * 0.5;
    const baseLen = 10 + streakIntensity * 64;
    const sakuraAlpha = (0.06 + streakIntensity * 0.2).toFixed(3);
    const whiteAlpha = (0.22 + streakIntensity * 0.5).toFixed(3);

    ctx.lineCap = "round";
    ctx.lineWidth = 1.15 + streakIntensity * 0.55;
    ctx.beginPath();
    for (const streak of SLOPE_STREAKS) {
      const x = streak.inCorridor
        ? laneCenterX + streak.xOffset * Math.max(laneWidthPx, 96)
        : streak.xOffset * width;
      const y =
        streakSpan -
        80 -
        wrapPositive(
          streak.ySeed * streakSpan + offsetPx * streak.speedScale * 1.45,
          streakSpan
        );
      const len = baseLen * streak.lenScale;
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${whiteAlpha})`;
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < SLOPE_STREAKS.length; i += 2) {
      const streak = SLOPE_STREAKS[i];
      const x =
        (streak.inCorridor
          ? laneCenterX + streak.xOffset * Math.max(laneWidthPx, 96)
          : streak.xOffset * width) + 1.5;
      const y =
        streakSpan -
        80 -
        wrapPositive(
          streak.ySeed * streakSpan + offsetPx * streak.speedScale * 1.45,
          streakSpan
        );
      const len = baseLen * streak.lenScale * 0.78;
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y + 2 + len);
    }
    ctx.strokeStyle = `rgba(177, 47, 96, ${sakuraAlpha})`;
    ctx.stroke();
  }
}

const MOUNTAIN_SILHOUETTE_PATH =
  "M 0 56 L 0 46 C 42 45, 82 36, 114 24 C 129 18.4, 141 12, 152 6 Q 166 1.5, 180 2.5 Q 194 1.5, 208 6 C 219 12, 231 18.4, 246 24 C 278 36, 318 45, 360 46 L 360 56 Z";
const MOUNTAIN_RIDGE_BORDER_PATH =
  "M 0.5 56 L 0.5 46 C 42 45, 82 36, 114 24 C 129 18.4, 141 12, 152 6 Q 166 1.5, 180 2.5 Q 194 1.5, 208 6 C 219 12, 231 18.4, 246 24 C 278 36, 318 45, 359.5 46 L 359.5 56";
const MOUNTAIN_SNOWCAP_PATH =
  "M 114 24 C 129 18.4, 141 12, 152 6 Q 166 1.5, 180 2.5 Q 194 1.5, 208 6 C 219 12, 231 18.4, 246 24 Q 228 28.5, 212 22 Q 196 31, 180 23.5 Q 164 31, 148 22 Q 132 28.5, 114 24 Z";
const MOUNTAIN_SNOWCAP_LIP_PATH =
  "M 114 24 Q 132 28.5, 148 22 Q 164 31, 180 23.5 Q 196 31, 212 22 Q 228 28.5, 246 24";

function MountainCardCrest() {
  return (
    <svg
      className="run-mountain-crest"
      viewBox="0 0 360 56"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className="run-mountain-fill" d={MOUNTAIN_SILHOUETTE_PATH} />
      <path className="run-mountain-snowcap" d={MOUNTAIN_SNOWCAP_PATH} />
      <path
        className="run-mountain-snowline"
        d={MOUNTAIN_SNOWCAP_LIP_PATH}
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="run-mountain-facet"
        d="M 180 2.5 Q 173 13, 164 24.5 M 196 4.2 Q 204 13, 212 22"
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="run-mountain-stroke"
        d={MOUNTAIN_RIDGE_BORDER_PATH}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface SnowboardRunProps {
  readonly content: ProposalSectionContent;
}

export function SnowboardRun({ content }: SnowboardRunProps) {
  const carveClipId = useId();
  const route = useMemo(
    () => createSnowboardRoute(content.waypoints.length),
    [content.waypoints.length]
  );
  const start = route.checkpoints[0];
  const trailRef = useRef<HTMLDivElement>(null);
  const slopeCanvasRef = useRef<HTMLCanvasElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const carveClipRectRef = useRef<SVGRectElement>(null);
  const riderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const sprintTriggerRef = useRef<((targetScrollY: number) => void) | null>(
    null
  );
  const sprintCancelRef = useRef<(() => void) | null>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const trail = trailRef.current;
    const slopeCanvas = slopeCanvasRef.current;
    const lane = laneRef.current;
    const rider = riderRef.current;
    const canvas = canvasRef.current;
    if (!trail || !lane || !rider || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const slopeCtx = slopeCanvas?.getContext("2d") ?? null;

    const pixelBuffer = createRiderPixelBuffer(RIDER_CANVAS_SIZE, RIDER_CANVAS_SIZE);
    const imageData = ctx.createImageData(RIDER_CANVAS_SIZE, RIDER_CANVAS_SIZE);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const maxProgress = Math.max(0, route.checkpoints.length - 1);

    let frame = 0;
    let lastScrollY = window.scrollY;
    let lastFrameMs = performance.now();
    let motionEnergy = 0;
    let slopeOffsetPx = 0;
    let lastSlopeW = 0;
    let lastSlopeH = 0;
    let lastSlopeDpr = 0;
    let riderSpring: RiderSpringState | null = null;
    let sprintState: WaypointSprintState = { kind: "idle" };
    let particles: readonly PowderParticle[] = [];
    let lastTrailX: number | null = null;
    let lastTrailY: number | null = null;
    const visibleTargets = new Set<Element>();
    let isRunVisible = true;

    const paintCanvas = () => {
      imageData.data.set(pixelBuffer.rgba);
      ctx.putImageData(imageData, 0, 0);
    };

    const paintSlopeBackdrop = (
      bounds: DOMRect,
      dtSec: number,
      riderVelocity: number,
      sprintBoost: number,
      elapsedSec: number
    ) => {
      const flow = deriveSlopeFlow({
        riderVelocity,
        motionEnergy,
        sprintBoost,
        reducedMotion: motion.matches,
      });
      slopeOffsetPx += flow.upwardSpeedPxPerSec * dtSec;

      if (slopeCanvas && slopeCtx) {
        const slopeBounds = slopeCanvas.getBoundingClientRect();
        const width = Math.round(slopeBounds.width);
        const height = Math.round(slopeBounds.height);
        if (width > 0 && height > 0) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          if (
            width !== lastSlopeW ||
            height !== lastSlopeH ||
            dpr !== lastSlopeDpr
          ) {
            lastSlopeW = width;
            lastSlopeH = height;
            lastSlopeDpr = dpr;
            slopeCanvas.width = Math.round(width * dpr);
            slopeCanvas.height = Math.round(height * dpr);
            slopeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          }

          renderAlpineSlopeBackdrop(
            slopeCtx,
            width,
            height,
            bounds.left - slopeBounds.left,
            bounds.width,
            motion.matches ? 0 : slopeOffsetPx,
            flow.streakIntensity,
            elapsedSec
          );
        }
      }

      return flow;
    };

    const update = (nowMs: number) => {
      frame = 0;
      const dtMs = Math.min(50, Math.max(0, nowMs - lastFrameMs));
      const dtSec = dtMs > 0 ? dtMs / 1000 : 1 / 60;
      lastFrameMs = nowMs;

      let sprintBoost = 0;
      if (sprintState.kind === "sprinting") {
        const sprintStep = stepWaypointSprint(sprintState, dtMs);
        if (sprintStep.kind === "active") {
          sprintState = sprintStep.nextState;
          sprintBoost = sprintStep.sprintBoost;
          window.scrollTo(0, sprintStep.scrollY);
        } else if (sprintStep.kind === "completed") {
          sprintState = sprintStep.nextState;
          window.scrollTo(0, sprintStep.scrollY);
        }
      }

      const bounds = lane.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (bounds.height === 0 || viewportHeight <= 0) return;

      const scroll = window.scrollY;
      const scrollDelta = scroll - lastScrollY;
      lastScrollY = scroll;
      motionEnergy = stepSettleEnergy(
        motionEnergy,
        scrollDelta,
        dtMs,
        motion.matches
      );
      const elapsedSec = nowMs / 1000;

      const { firstTurn, lastTurn } = getTrailScrollSpan({
        laneTopDocY: bounds.top + scroll,
        laneHeight: bounds.height,
        checkpointCount: route.checkpoints.length,
        viewportHeight,
        scrollHeight: Math.max(viewportHeight, document.documentElement.scrollHeight),
      });

      const macScreen = document.getElementById("resume-mac-screen");
      if (!motion.matches && macScreen && scroll < firstTurn) {
        const screenBounds = macScreen.getBoundingClientRect();
        if (screenBounds.height > 0) {
          riderSpring = { progress: 0, velocity: 0 };
          lastTrailX = null;
          lastTrailY = null;
          carveClipRectRef.current?.setAttribute("height", "0");
          paintSlopeBackdrop(bounds, dtSec, 0, sprintBoost, elapsedSec);

          const launchX = screenBounds.left + screenBounds.width * 0.5;
          const launchY = screenBounds.top + screenBounds.height * 0.58;
          const anchorX = bounds.left + (start.x / route.width) * bounds.width;
          const anchorY = bounds.top + (start.y / route.height) * bounds.height;
          const jumpProgress = getMacJumpProgress(
            scroll,
            launchY + scroll,
            firstTurn,
            viewportHeight
          );
          const arcLift = Math.min(180, Math.max(96, viewportHeight * 0.15));
          const jumpPose = getMacJumpPose({
            progress: jumpProgress,
            launchDeltaX: launchX - anchorX,
            launchDeltaY: launchY - anchorY,
            arcLift,
            reducedMotion: false,
          });
          rider.style.opacity = String(jumpPose.opacity);
          rider.style.transform = `translate3d(${jumpPose.x}px, ${jumpPose.y}px, 0) translate(-${RIDER_ANCHOR_X_PCT}%, -${RIDER_ANCHOR_Y_PCT}%) scale(${jumpPose.scale})`;

          if (jumpPose.opacity > 0) {
            particles = [];
            const airbornePose = deriveAirborneRigPose({
              jumpProgress,
              leanDeg: jumpPose.lean,
              elapsedSec,
              reducedMotion: false,
            });
            renderNisekoPowderPro(pixelBuffer, airbornePose, particles);
            paintCanvas();
          }

          if (activeIndexRef.current !== 0) {
            activeIndexRef.current = 0;
            setActiveIndex(0);
          }
          if (
            !document.hidden &&
            (sprintState.kind === "sprinting" ||
              isRunVisible ||
              (jumpPose.opacity > 0 && motionEnergy > 0))
          ) {
            frame = window.requestAnimationFrame(update);
          }
          return;
        }
      }

      const rawTargetProgress =
        lastTurn > firstTurn
          ? ((scroll - firstTurn) / (lastTurn - firstTurn)) * maxProgress
          : 0;
      const clampedTargetProgress = Math.min(
        Math.max(rawTargetProgress, 0),
        maxProgress
      );

      riderSpring =
        riderSpring === null
          ? {
              progress: motion.matches
                ? Math.round(clampedTargetProgress)
                : clampedTargetProgress,
              velocity: 0,
            }
          : stepRiderSpringState({
              state: riderSpring,
              targetProgress: clampedTargetProgress,
              maxProgress,
              dtSec,
              reducedMotion: motion.matches,
            });

      const flow = paintSlopeBackdrop(
        bounds,
        dtSec,
        riderSpring.velocity,
        sprintBoost,
        elapsedSec
      );

      const pose = getSnowboardPose(route, riderSpring.progress, motion.matches);
      carveClipRectRef.current?.setAttribute("height", pose.y.toFixed(2));

      const x = ((pose.x - start.x) / route.width) * bounds.width;
      const y = ((pose.y - start.y) / route.height) * bounds.height;
      rider.style.opacity = "1";
      rider.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-${RIDER_ANCHOR_X_PCT}%, -${RIDER_ANCHOR_Y_PCT}%) scale(1)`;

      const riderWidthPx = rider.offsetWidth;
      const pxToBuffer = riderWidthPx > 0 ? RIDER_CANVAS_SIZE / riderWidthPx : 1;
      const ambientSlopeShiftY = motion.matches
        ? 0
        : flow.upwardSpeedPxPerSec * dtSec * 0.52 * pxToBuffer;
      const worldShift =
        lastTrailX === null || lastTrailY === null
          ? { dx: 0, dy: ambientSlopeShiftY }
          : {
              dx: (x - lastTrailX) * pxToBuffer,
              dy: (y - lastTrailY) * pxToBuffer + ambientSlopeShiftY,
            };
      lastTrailX = x;
      lastTrailY = y;

      const rigPose = deriveTrailRigPose(route, {
        progress: riderSpring.progress,
        motionEnergy,
        riderSpeed: Math.abs(riderSpring.velocity),
        sprintBoost,
        elapsedSec,
        reducedMotion: motion.matches,
      });
      particles = motion.matches
        ? []
        : stepPowderParticles(particles, rigPose, dtSec, worldShift);
      renderNisekoPowderPro(pixelBuffer, rigPose, particles);
      paintCanvas();

      if (pose.activeIndex !== activeIndexRef.current) {
        activeIndexRef.current = pose.activeIndex;
        setActiveIndex(pose.activeIndex);
      }

      const springSettling =
        Math.abs(riderSpring.progress - clampedTargetProgress) > 1e-3 ||
        Math.abs(riderSpring.velocity) > 1e-3;

      if (
        !motion.matches &&
        !document.hidden &&
        (isRunVisible ||
          sprintState.kind === "sprinting" ||
          springSettling ||
          motionEnergy > 0 ||
          particles.length > 0)
      ) {
        frame = window.requestAnimationFrame(update);
      }
    };

    const schedule = () => {
      if (!frame) {
        lastFrameMs = performance.now();
        frame = window.requestAnimationFrame(update);
      }
    };

    const cancelSprint = () => {
      sprintState = { kind: "idle" };
    };

    const triggerSprint = (targetScrollY: number) => {
      const viewportHeight = window.innerHeight;
      if (viewportHeight <= 0) return;
      const nextSprint = createWaypointSprint(
        window.scrollY,
        targetScrollY,
        viewportHeight,
        motion.matches
      );
      sprintState = nextSprint;
      if (nextSprint.kind === "idle") {
        window.scrollTo({ top: targetScrollY, behavior: "auto" });
      }
      schedule();
    };

    sprintTriggerRef.current = triggerSprint;
    sprintCancelRef.current = cancelSprint;

    const onKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_CANCEL_KEYS.has(event.key)) {
        cancelSprint();
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        schedule();
      }
    };

    const startLink = trail
      .closest("#proposal")
      ?.querySelector<HTMLAnchorElement>("a.run-start");
    const onStartClick = (event: globalThis.MouseEvent) => {
      if (!isPlainLeftClick(event)) return;
      const viewportHeight = window.innerHeight;
      if (viewportHeight <= 0) return;
      const bounds = lane.getBoundingClientRect();
      if (bounds.height <= 0) return;

      event.preventDefault();
      const href = startLink?.getAttribute("href");
      if (href && window.location.hash !== href) {
        window.history.pushState(null, "", href);
      }
      cardRefs.current[0]?.focus({ preventScroll: true });

      const targetScrollY = getCheckpointScrollTarget(
        {
          laneTopDocY: bounds.top + window.scrollY,
          laneHeight: bounds.height,
          checkpointCount: route.checkpoints.length,
          viewportHeight,
          scrollHeight: Math.max(
            viewportHeight,
            document.documentElement.scrollHeight
          ),
        },
        0
      );
      triggerSprint(targetScrollY);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(lane);
    observer.observe(trail);
    observer.observe(document.body);

    let visibilityObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      visibilityObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              visibleTargets.add(entry.target);
            } else {
              visibleTargets.delete(entry.target);
            }
          }
          isRunVisible = visibleTargets.size > 0;
          if (isRunVisible && !motion.matches) {
            schedule();
          }
        },
        { rootMargin: "420px 0px 320px 0px" }
      );
      visibilityObserver.observe(trail);
      const macElement = document.getElementById("resume-mac-screen");
      if (macElement) {
        visibilityObserver.observe(macElement);
      }
    }

    startLink?.addEventListener("click", onStartClick);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("wheel", cancelSprint, { passive: true });
    window.addEventListener("touchstart", cancelSprint, { passive: true });
    window.addEventListener("keydown", onKeyDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    motion.addEventListener("change", schedule);
    schedule();

    return () => {
      sprintTriggerRef.current = null;
      sprintCancelRef.current = null;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      visibilityObserver?.disconnect();
      startLink?.removeEventListener("click", onStartClick);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("wheel", cancelSprint);
      window.removeEventListener("touchstart", cancelSprint);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motion.removeEventListener("change", schedule);
    };
  }, [route, start]);

  function focusWaypoint(index: number, event?: MouseEvent<HTMLElement>) {
    if (event && !isPlainLeftClick(event)) {
      return;
    }
    event?.preventDefault();

    const lane = laneRef.current;
    const viewportHeight = window.innerHeight;
    if (!lane || viewportHeight <= 0) return;

    const bounds = lane.getBoundingClientRect();
    if (bounds.height <= 0) return;

    const waypoint = content.waypoints[index];
    if (!waypoint) return;

    const hash = `#${waypoint.id}`;
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }

    cardRefs.current[index]?.focus({ preventScroll: true });

    const targetScrollY = getCheckpointScrollTarget(
      {
        laneTopDocY: bounds.top + window.scrollY,
        laneHeight: bounds.height,
        checkpointCount: route.checkpoints.length,
        viewportHeight,
        scrollHeight: Math.max(viewportHeight, document.documentElement.scrollHeight),
      },
      index
    );
    if (sprintTriggerRef.current) {
      sprintTriggerRef.current(targetScrollY);
      return;
    }

    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? "auto"
      : "smooth";
    window.scrollTo({ top: targetScrollY, behavior });
  }

  function scrollToFinish(event: MouseEvent<HTMLElement>) {
    if (!isPlainLeftClick(event)) {
      return;
    }
    event.preventDefault();

    const finishElement = document.getElementById(PROPOSAL_FINISH_ID);
    if (!finishElement) return;

    sprintCancelRef.current?.();

    if (window.location.hash !== PROPOSAL_FINISH_HASH) {
      window.history.pushState(null, "", PROPOSAL_FINISH_HASH);
    }

    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? "auto"
      : "smooth";
    finishElement.scrollIntoView({ behavior, block: "start" });
  }

  return (
    <div className="run-trail" ref={trailRef}>
      <div className="run-slope-stage" aria-hidden="true">
        <canvas ref={slopeCanvasRef} className="run-slope-canvas" />
      </div>
      <div className="run-lane" ref={laneRef}>
        <svg
          className="run-path"
          viewBox={`0 0 ${route.width} ${route.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <clipPath id={carveClipId} clipPathUnits="userSpaceOnUse">
              <rect
                ref={carveClipRectRef}
                x="-24"
                y="0"
                width={route.width + 48}
                height="0"
              />
            </clipPath>
          </defs>
          <path
            className="run-guide"
            d={route.path}
            vectorEffect="non-scaling-stroke"
          />
          <g className="run-trenches" clipPath={`url(#${carveClipId})`}>
            {route.edgeTrenches.map((trench) => (
              <g
                key={trench.id}
                data-gate={trench.isGateCheck ? "" : undefined}
              >
                <path
                  className="run-trench-shadow"
                  d={trench.groovePath}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="run-trench-berm"
                  d={trench.bermPath}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  className="run-trench-groove"
                  d={trench.groovePath}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </g>
        </svg>
        {route.checkpoints.map((point, index) => {
          const waypoint = content.waypoints[index];
          return (
            <button
              key={point.y}
              type="button"
              className="run-marker"
              data-active={index === activeIndex ? "" : undefined}
              aria-label={formatContentTemplate(
                content.trail.markerAriaTemplate,
                {
                  step: index + 1,
                  title: waypoint.title,
                }
              )}
              aria-current={index === activeIndex ? "step" : undefined}
              style={{
                left: `${(point.x / route.width) * 100}%`,
                top: `${(point.y / route.height) * 100}%`,
              }}
              onClick={(event) => focusWaypoint(index, event)}
            />
          );
        })}
        <div
          className="run-rider"
          ref={riderRef}
          aria-hidden="true"
          style={{ left: `${start.x / route.width * 100}%`, top: `${start.y / route.height * 100}%` }}
        >
          <canvas
            ref={canvasRef}
            width={RIDER_CANVAS_SIZE}
            height={RIDER_CANVAS_SIZE}
            aria-hidden="true"
          />
        </div>
      </div>

      <ol className="run-stops" aria-label={content.trail.stopsAriaLabel}>
        {content.waypoints.map((waypoint, index) => {
          const nextWaypoint = content.waypoints[index + 1];
          const nextHref = nextWaypoint
            ? `#${nextWaypoint.id}`
            : PROPOSAL_FINISH_HASH;
          const nextAriaLabel = nextWaypoint
            ? formatContentTemplate(content.trail.nextTopicAriaTemplate, {
                title: nextWaypoint.title,
              })
            : content.trail.finishAriaLabel;

          return (
            <li className="run-stop" key={waypoint.id} aria-current={index === activeIndex ? "step" : undefined}>
              <article className="run-copy" id={waypoint.id}>
                <a
                  href={`#${waypoint.id}`}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  className="run-mountain-card"
                  onClick={(event) => focusWaypoint(index, event)}
                >
                  <MountainCardCrest />
                  <div className="run-mountain-body">
                    <p className="run-waypoint-kicker">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {waypoint.label}
                    </p>
                    <h2>{waypoint.title}</h2>
                    <p>{waypoint.description}</p>
                  </div>
                </a>
                <a
                  href={nextHref}
                  className="run-next-topic"
                  aria-label={nextAriaLabel}
                  onClick={(event) =>
                    nextWaypoint
                      ? focusWaypoint(index + 1, event)
                      : scrollToFinish(event)
                  }
                >
                  <ChevronDown aria-hidden="true" />
                </a>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
