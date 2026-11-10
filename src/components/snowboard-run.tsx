"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";
import { INTERVIEW_WAYPOINTS } from "@/domain/portfolio-data";
import {
  createSnowboardRoute,
  deriveAirborneRigPose,
  deriveTrailRigPose,
  getCheckpointScrollTarget,
  getMacJumpPose,
  getMacJumpProgress,
  getSnowboardPose,
  getTrailScrollSpan,
  stepSettleEnergy,
} from "@/lib/snowboard-route";
import {
  createRiderPixelBuffer,
  type PowderParticle,
  renderNisekoPowderPro,
  RIDER_CANVAS_SIZE,
  stepPowderParticles,
} from "@/lib/snowboarder-pixel-3d";

const route = createSnowboardRoute(INTERVIEW_WAYPOINTS.length);
const start = route.checkpoints[0];

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

export function SnowboardRun() {
  const laneRef = useRef<HTMLDivElement>(null);
  const riderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const lane = laneRef.current;
    const rider = riderRef.current;
    const canvas = canvasRef.current;
    if (!lane || !rider || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixelBuffer = createRiderPixelBuffer(RIDER_CANVAS_SIZE, RIDER_CANVAS_SIZE);
    const imageData = ctx.createImageData(RIDER_CANVAS_SIZE, RIDER_CANVAS_SIZE);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let lastScrollY = window.scrollY;
    let lastFrameMs = performance.now();
    let motionEnergy = 0;
    let particles: readonly PowderParticle[] = [];

    const paintCanvas = () => {
      imageData.data.set(pixelBuffer.rgba);
      ctx.putImageData(imageData, 0, 0);
    };

    const update = (nowMs: number) => {
      frame = 0;
      const dtMs = Math.min(50, Math.max(0, nowMs - lastFrameMs));
      lastFrameMs = nowMs;

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
          rider.style.transform = `translate3d(${jumpPose.x}px, ${jumpPose.y}px, 0) translate(-50%, -80%) scale(${jumpPose.scale})`;

          if (jumpPose.opacity > 0) {
            particles = [];
            const airbornePose = deriveAirborneRigPose({
              jumpProgress,
              leanDeg: jumpPose.lean,
              elapsedSec,
            });
            renderNisekoPowderPro(pixelBuffer, airbornePose, particles);
            paintCanvas();
          }

          if (activeIndexRef.current !== 0) {
            activeIndexRef.current = 0;
            setActiveIndex(0);
          }
          if (jumpPose.opacity > 0 && motionEnergy > 0) {
            frame = window.requestAnimationFrame(update);
          }
          return;
        }
      }

      const progress = lastTurn > firstTurn
        ? (scroll - firstTurn) / (lastTurn - firstTurn) * (route.checkpoints.length - 1)
        : 0;
      const pose = getSnowboardPose(route, progress, motion.matches);
      const x = (pose.x - start.x) / route.width * bounds.width;
      const y = (pose.y - start.y) / route.height * bounds.height;
      rider.style.opacity = "1";
      rider.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -80%) scale(1)`;

      const rigPose = deriveTrailRigPose(route, {
        progress,
        motionEnergy,
        elapsedSec,
        reducedMotion: motion.matches,
      });
      particles = motion.matches
        ? []
        : stepPowderParticles(particles, rigPose, dtMs > 0 ? dtMs / 1000 : 1 / 60);
      renderNisekoPowderPro(pixelBuffer, rigPose, particles);
      paintCanvas();

      if (pose.activeIndex !== activeIndexRef.current) {
        activeIndexRef.current = pose.activeIndex;
        setActiveIndex(pose.activeIndex);
      }

      if (!motion.matches && (motionEnergy > 0 || particles.length > 0)) {
        frame = window.requestAnimationFrame(update);
      }
    };

    const schedule = () => {
      if (!frame) {
        lastFrameMs = performance.now();
        frame = window.requestAnimationFrame(update);
      }
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(lane);
    observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
    };
  }, []);

  function focusWaypoint(index: number, event?: MouseEvent<HTMLElement>) {
    if (
      event &&
      (event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey)
    ) {
      return;
    }
    event?.preventDefault();

    const lane = laneRef.current;
    const viewportHeight = window.innerHeight;
    if (!lane || viewportHeight <= 0) return;

    const bounds = lane.getBoundingClientRect();
    if (bounds.height <= 0) return;

    const waypoint = INTERVIEW_WAYPOINTS[index];
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
    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? "auto"
      : "smooth";
    window.scrollTo({ top: targetScrollY, behavior });
  }

  return (
    <div className="run-trail">
      <div className="run-lane" ref={laneRef}>
        <svg
          className="run-path"
          viewBox={`0 0 ${route.width} ${route.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={route.path} vectorEffect="non-scaling-stroke" />
        </svg>
        {route.checkpoints.map((point, index) => {
          const waypoint = INTERVIEW_WAYPOINTS[index];
          return (
            <button
              key={point.y}
              type="button"
              className="run-marker"
              data-active={index === activeIndex ? "" : undefined}
              aria-label={`前往第 ${index + 1} 站：${waypoint.title}`}
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

      <ol className="run-stops" aria-label="面試提案的八個轉彎">
        {INTERVIEW_WAYPOINTS.map((waypoint, index) => (
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
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
