"use client";

import { useEffect, useRef, useState } from "react";
import { INTERVIEW_WAYPOINTS } from "@/domain/portfolio-data";
import {
  createSnowboardRoute,
  deriveAirborneRigPose,
  deriveTrailRigPose,
  getMacJumpPose,
  getMacJumpProgress,
  getSnowboardPose,
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

export function SnowboardRun() {
  const laneRef = useRef<HTMLDivElement>(null);
  const riderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

      const center = viewportHeight / 2;
      const halfRow = bounds.height / route.checkpoints.length / 2;
      const firstTurn = Math.max(0, bounds.top + scroll + halfRow - center);
      const lastTurn = Math.min(
        document.documentElement.scrollHeight - viewportHeight,
        bounds.bottom + scroll - halfRow - center
      );

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

  return (
    <div className="run-trail">
      <div className="run-lane" ref={laneRef} aria-hidden="true">
        <svg className="run-path" viewBox={`0 0 ${route.width} ${route.height}`} preserveAspectRatio="none">
          <path d={route.path} vectorEffect="non-scaling-stroke" />
        </svg>
        {route.checkpoints.map((point, index) => (
          <span
            key={point.y}
            className="run-marker"
            data-active={index === activeIndex ? "" : undefined}
            style={{ left: `${point.x / route.width * 100}%`, top: `${point.y / route.height * 100}%` }}
          />
        ))}
        <div
          className="run-rider"
          ref={riderRef}
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
            <article className="run-copy" id={waypoint.id} tabIndex={-1}>
              <p className="run-waypoint-kicker">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {waypoint.label}
              </p>
              <h2>{waypoint.title}</h2>
              <p>{waypoint.description}</p>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
