"use client";

import { useEffect, useRef, useState } from "react";
import { INTERVIEW_WAYPOINTS } from "@/domain/portfolio-data";
import { createSnowboardRoute, getSnowboardPose } from "@/lib/snowboard-route";

const route = createSnowboardRoute(INTERVIEW_WAYPOINTS.length);
const start = route.checkpoints[0];

function PixelSnowboarder() {
  return (
    <svg
      viewBox="0 0 42 39"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g fill="var(--jstyle-blue)">
        <path d="M16 1h9v2h3v2h2v9h-2v3h-3v2h-9v-2h-3v-3h-2V6h2V3h3z" />
        <path d="M15 16h12v2h4v2h4v1h4v5h-6v-2h-4v4h-4v3H13v-4h-2v-4H8v2H3v-5h4v-2h4v-2z" />
        <path d="M13 25h14v2h2v3h3v5h-7v-2h-3v-3h-4v3h-2v2H9v-4h3v-4z" />
        <path d="M1 32h4v2h29v-2h4v-2h3v5h-3v2h-5v1H6v-1H3v-2H1z" />
      </g>
      <path fill="#f78fbe" d="M16 3h9v2h3v4H13V6h3zM15 18h11v2h4v2h4v2h-5v-2h-3v5H14v-5h-3v1H7v-3h4v-2z" />
      <path fill="#ffc4df" d="M17 4h6v2h-6zM14 19h6v2h-6zM12 21h3v2h-3z" />
      <path fill="#80c6eb" d="M14 10h13v3H14z" />
      <path fill="#e9f8ff" d="M15 10h5v1h-5z" />
      <path fill="#f8c3a5" d="M16 14h10v2h-3v1h-5v-1h-2z" />
      <path fill="#d9619b" d="M23 20h3v7h-3zM14 27h11v2h3v3h-3v-1h-3v-2h-5v3h-5v-2h2z" />
      <path fill="#bde7f9" d="M5 35h29v-2h4v2h-4v1H6v-1z" />
      <path fill="var(--jstyle-accent)" d="M16 35h10v1H16z" />
    </svg>
  );
}

export function SnowboardRun() {
  const laneRef = useRef<HTMLDivElement>(null);
  const riderRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const lane = laneRef.current;
    const rider = riderRef.current;
    if (!lane || !rider) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const update = () => {
      frame = 0;
      const bounds = lane.getBoundingClientRect();
      if (bounds.height === 0) return;

      const scroll = window.scrollY;
      const viewportHeight = window.innerHeight;
      const center = viewportHeight / 2;
      const halfRow = bounds.height / route.checkpoints.length / 2;
      const firstTurn = Math.max(0, bounds.top + scroll + halfRow - center);
      const lastTurn = Math.min(
        document.documentElement.scrollHeight - viewportHeight,
        bounds.bottom + scroll - halfRow - center
      );
      const progress = lastTurn > firstTurn
        ? (scroll - firstTurn) / (lastTurn - firstTurn) * (route.checkpoints.length - 1)
        : 0;
      const pose = getSnowboardPose(route, progress, motion.matches);
      const x = (pose.x - start.x) / route.width * bounds.width;
      const y = (pose.y - start.y) / route.height * bounds.height;
      rider.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -88%) rotate(${pose.lean}deg)`;

      if (pose.activeIndex !== activeIndexRef.current) {
        activeIndexRef.current = pose.activeIndex;
        setActiveIndex(pose.activeIndex);
      }
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(lane);
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
          <PixelSnowboarder />
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
