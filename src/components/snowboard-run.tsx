"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import {
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { MountainCardBackdrop } from "@/components/mountain-card-backdrop";
import {
  formatContentTemplate,
  type ProposalSectionContent,
} from "@/content";
import {
  HEADER_SECTION_HASH,
  PROPOSAL_FINISH_HASH,
  PROPOSAL_FINISH_ID,
} from "@/lib/header-navigation";
import {
  createSnowboardRoute,
  createWaypointSprint,
  deriveSlopeFlow,
  deriveTrailRigPose,
  getCheckpointScrollTarget,
  getSnowboardPose,
  getTrailScrollSpan,
  resolveRunScreenZone,
  resolveRunZoneStep,
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

const HEADER_GUARD_PX = 68;
const DRAG_CANCEL_THRESHOLD_PX = 6;

type RunTapRipple = Readonly<{
  id: number;
  x: number;
  y: number;
  zone: "up" | "down";
}>;

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
  const followerRef = useRef<HTMLDivElement>(null);
  const slopeCanvasRef = useRef<HTMLCanvasElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const carveClipRectRef = useRef<SVGRectElement>(null);
  const riderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const sprintTriggerRef = useRef<((targetScrollY: number) => void) | null>(
    null
  );
  const activeIndexRef = useRef(0);
  const inFlightWaypointRef = useRef<number | null>(null);
  const pointerDownPosRef = useRef<Readonly<{ x: number; y: number }> | null>(
    null
  );
  const finePointerPosRef = useRef<Readonly<{ x: number; y: number }> | null>(
    null
  );
  const rippleIdRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [ripples, setRipples] = useState<readonly RunTapRipple[]>([]);

  useEffect(() => {
    const trail = trailRef.current;
    const follower = followerRef.current;
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
          window.scrollTo({ top: sprintStep.scrollY, behavior: "instant" });
        } else if (sprintStep.kind === "completed") {
          sprintState = sprintStep.nextState;
          window.scrollTo({ top: sprintStep.scrollY, behavior: "instant" });
        }
      }

      const bounds = lane.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (bounds.height === 0 || viewportHeight <= 0) return;

      const pointerPos = finePointerPosRef.current;
      if (pointerPos && follower) {
        const trailBounds = trail.getBoundingClientRect();
        const insideTrail =
          pointerPos.y > HEADER_GUARD_PX &&
          pointerPos.x >= trailBounds.left &&
          pointerPos.x <= trailBounds.right &&
          pointerPos.y >= trailBounds.top &&
          pointerPos.y <= trailBounds.bottom;
        if (!insideTrail) {
          follower.dataset.zone = "hidden";
          trail.dataset.hoverZone = "neutral";
        }
      }

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
              sprinting: sprintState.kind === "sprinting" || sprintBoost > 0,
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
      if (sprintState.kind === "idle") {
        inFlightWaypointRef.current = null;
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
      inFlightWaypointRef.current = null;
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
      if (nextSprint.kind === "idle") {
        sprintState = nextSprint;
        window.scrollTo({ top: targetScrollY, behavior: "instant" });
        schedule();
        return;
      }

      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      const launchStep = stepWaypointSprint(nextSprint, 16);
      if (launchStep.kind === "active") {
        sprintState = launchStep.nextState;
        window.scrollTo({ top: launchStep.scrollY, behavior: "instant" });
      } else if (launchStep.kind === "completed") {
        sprintState = launchStep.nextState;
        window.scrollTo({ top: launchStep.scrollY, behavior: "instant" });
      }
      lastFrameMs = performance.now();
      frame = window.requestAnimationFrame(update);
    };

    sprintTriggerRef.current = triggerSprint;

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
      inFlightWaypointRef.current = 0;
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
    inFlightWaypointRef.current = index;
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

  function scrollToIntro() {
    const proposalElement = document.getElementById("proposal");
    if (!proposalElement) return;

    if (window.location.hash !== HEADER_SECTION_HASH.proposal) {
      window.history.pushState(null, "", HEADER_SECTION_HASH.proposal);
    }

    const targetScrollY = Math.max(
      0,
      proposalElement.getBoundingClientRect().top + window.scrollY
    );
    inFlightWaypointRef.current = null;
    if (sprintTriggerRef.current) {
      sprintTriggerRef.current(targetScrollY);
      return;
    }

    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? "auto"
      : "smooth";
    proposalElement.scrollIntoView({ behavior, block: "start" });
  }

  function scrollToFinish() {
    const finishElement = document.getElementById(PROPOSAL_FINISH_ID);
    if (!finishElement) return;

    if (window.location.hash !== PROPOSAL_FINISH_HASH) {
      window.history.pushState(null, "", PROPOSAL_FINISH_HASH);
    }

    const maxScrollY = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    const finishBounds = finishElement.getBoundingClientRect();
    const targetScrollY = Math.min(
      maxScrollY,
      Math.max(
        0,
        finishBounds.bottom + window.scrollY - window.innerHeight
      )
    );
    inFlightWaypointRef.current = null;
    if (sprintTriggerRef.current) {
      sprintTriggerRef.current(targetScrollY);
      return;
    }

    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? "auto"
      : "smooth";
    finishElement.scrollIntoView({ behavior, block: "end" });
  }

  function handleTrailPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.isPrimary && event.button === 0) {
      pointerDownPosRef.current = { x: event.clientX, y: event.clientY };
    }
  }

  function handleTrailPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
      return;
    }
    finePointerPosRef.current = { x: event.clientX, y: event.clientY };

    const follower = followerRef.current;
    const trail = trailRef.current;
    const viewportHeight = window.innerHeight;
    if (!follower || !trail || viewportHeight <= 0) {
      return;
    }

    const overMarker =
      event.target instanceof Element &&
      event.target.closest(".run-marker") !== null;
    if (overMarker || event.clientY <= HEADER_GUARD_PX) {
      follower.dataset.zone = "hidden";
      trail.dataset.hoverZone = "neutral";
      return;
    }

    const zone = resolveRunScreenZone(event.clientY, viewportHeight);
    const badgeX = Math.min(event.clientX + 18, Math.max(16, window.innerWidth - 40));
    follower.style.transform = `translate3d(${badgeX}px, ${event.clientY}px, 0) translate(0, -50%)`;
    follower.dataset.zone = zone === "neutral" ? "hidden" : zone;
    trail.dataset.hoverZone = zone;
  }

  function hideFollower() {
    finePointerPosRef.current = null;
    if (followerRef.current) {
      followerRef.current.dataset.zone = "hidden";
    }
    if (trailRef.current) {
      trailRef.current.dataset.hoverZone = "neutral";
    }
  }

  function handleTrailClick(event: MouseEvent<HTMLDivElement>) {
    if (event.detail === 0 || !isPlainLeftClick(event)) {
      return;
    }
    if (
      event.target instanceof Element &&
      event.target.closest(".run-marker") !== null
    ) {
      return;
    }

    event.preventDefault();
    if (event.clientY <= HEADER_GUARD_PX) {
      return;
    }

    const downPos = pointerDownPosRef.current;
    pointerDownPosRef.current = null;
    if (
      downPos &&
      Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y) >
        DRAG_CANCEL_THRESHOLD_PX
    ) {
      return;
    }
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }

    const viewportHeight = window.innerHeight;
    if (viewportHeight <= 0 || content.waypoints.length < 1) {
      return;
    }

    const zone = resolveRunScreenZone(event.clientY, viewportHeight);
    const currentIndex = Math.min(
      content.waypoints.length - 1,
      Math.max(0, inFlightWaypointRef.current ?? activeIndexRef.current)
    );
    const outcome = resolveRunZoneStep({
      zone,
      currentIndex,
      waypointCount: content.waypoints.length,
    });
    if (outcome.kind === "ignored") {
      return;
    }

    if (
      (zone === "up" || zone === "down") &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const id = ++rippleIdRef.current;
      const nextRipple: RunTapRipple = {
        id,
        x: event.clientX,
        y: event.clientY,
        zone,
      };
      setRipples((prev) => [...prev.slice(-3), nextRipple]);
    }

    switch (outcome.kind) {
      case "waypoint":
        focusWaypoint(outcome.targetIndex);
        return;
      case "intro":
        scrollToIntro();
        return;
      case "finish":
        scrollToFinish();
        return;
    }
  }

  return (
    <div
      className="run-trail"
      ref={trailRef}
      data-hover-zone="neutral"
      onPointerDown={handleTrailPointerDown}
      onPointerMove={handleTrailPointerMove}
      onPointerLeave={hideFollower}
      onPointerCancel={hideFollower}
      onClick={handleTrailClick}
    >
      <div
        ref={followerRef}
        className="run-zone-follower"
        data-zone="hidden"
        aria-hidden="true"
      >
        <ChevronUp className="run-zone-icon-up" />
        <ChevronDown className="run-zone-icon-down" />
      </div>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="run-tap-ripple"
          data-zone={ripple.zone}
          aria-hidden="true"
          style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
          onAnimationEnd={() =>
            setRipples((prev) => prev.filter((item) => item.id !== ripple.id))
          }
        />
      ))}
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
        {content.waypoints.map((waypoint, index) => (
          <li
            className="run-stop"
            key={waypoint.id}
            aria-current={index === activeIndex ? "step" : undefined}
          >
            <article className="run-copy" id={waypoint.id}>
              <a
                href={`#${waypoint.id}`}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                className="run-mountain-card"
                onClick={(event) => {
                  if (event.detail === 0) {
                    focusWaypoint(index, event);
                  }
                }}
              >
                <MountainCardBackdrop index={index} />
                <div className="run-mountain-body">
                  <p className="run-waypoint-kicker tracking-[0.03em]">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {waypoint.subtitle}
                  </p>
                  <h2>{waypoint.title}</h2>
                  <ul className="run-waypoint-bullets mt-3.5 grid gap-2 text-[clamp(0.9rem,1.2vw,1.02rem)] leading-[1.68] text-muted-foreground">
                    {waypoint.bullets.map((bullet) => (
                      <li
                        key={bullet.title}
                        className="run-waypoint-bullet relative pl-3.5 before:absolute before:left-0 before:top-[0.62em] before:size-1.5 before:rounded-full before:bg-primary/65"
                      >
                        <strong className="font-semibold text-foreground">
                          {bullet.title}：
                        </strong>
                        {bullet.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </a>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
