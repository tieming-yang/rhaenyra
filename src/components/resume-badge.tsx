"use client";

import Image from "next/image";
import { ArrowDownRight, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CANDIDATE_PROFILE } from "@/domain/portfolio-data";
import {
  DEFAULT_RESTING_STRAP_PATH,
  DEFAULT_RESTING_VIEWBOX,
  createIdleBadgeState,
  deriveBadgeRenderPose,
  moveBadgeDrag,
  releaseBadgeDrag,
  startBadgeDrag,
  stepBadgePhysics,
  triggerBadgeIntroSwing,
  type BadgeFieldMetrics,
  type BadgePhysicsState,
} from "@/lib/badge-physics";

const CLIP_PIVOT_OFFSET_PX = 40;

function readBadgeFieldMetrics(
  field: HTMLDivElement,
  anchor: HTMLDivElement,
  badge: HTMLDivElement
): BadgeFieldMetrics | null {
  const fieldWidth = field.clientWidth;
  const fieldHeight = field.clientHeight;
  if (!fieldWidth || !fieldHeight) return null;

  const fieldRect = field.getBoundingClientRect();
  const cover = field.closest(".resume-cover");
  const coverRect = cover ? cover.getBoundingClientRect() : fieldRect;
  const badgeWidth = anchor.clientWidth || 220;
  const badgeHeight = badge.offsetHeight || badgeWidth / 0.75;

  const restCenterX = fieldRect.left + fieldWidth / 2;
  const anchorOffsetTop = anchor.offsetTop;
  const restAnchorTop = fieldRect.top + anchorOffsetTop;

  const heroLeftBound = Math.min(
    -140,
    coverRect.left - restCenterX + badgeWidth * 0.22
  );
  const heroRightBound = Math.max(
    140,
    coverRect.right - restCenterX - badgeWidth * 0.22
  );
  const heroTopBound = Math.min(
    -115,
    coverRect.top - restAnchorTop + 24
  );
  const heroBottomBound = Math.max(
    180,
    coverRect.bottom - restAnchorTop - badgeHeight * 0.42
  );

  return {
    fieldWidth,
    fieldHeight,
    anchorOffsetTop,
    heroLeftBound,
    heroRightBound,
    heroTopBound,
    heroBottomBound,
  };
}

export function ResumeBadge() {
  const [flipped, setFlipped] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const strapRef = useRef<SVGPathElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLImageElement>(null);
  const strapId = useId();

  useEffect(() => {
    const field = fieldRef.current;
    const svg = svgRef.current;
    const strap = strapRef.current;
    const anchor = anchorRef.current;
    const badge = badgeRef.current;
    const clip = clipRef.current;
    if (!field || !svg || !strap || !anchor || !badge || !clip) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktopMedia = window.matchMedia("(min-width: 48rem)");

    let state: BadgePhysicsState = createIdleBadgeState();
    let cachedMetrics = readBadgeFieldMetrics(field, anchor, badge);
    let frame = 0;
    let lastTickMs = 0;

    const paint = () => {
      const metrics = cachedMetrics ?? readBadgeFieldMetrics(field, anchor, badge);
      if (!metrics) return;
      cachedMetrics = metrics;

      const pose = deriveBadgeRenderPose(state, metrics);
      svg.setAttribute("viewBox", pose.viewBox);
      strap.setAttribute("d", pose.strapPath);
      badge.style.transform = pose.badgeTransform;
      clip.style.transform = pose.clipTransform;

      if (pose.isDragging) {
        badge.dataset.dragging = "";
      } else {
        delete badge.dataset.dragging;
      }
    };

    const stopLoop = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      lastTickMs = 0;
    };

    const tick = (nowMs: number) => {
      frame = 0;
      const dtMs = lastTickMs > 0 ? Math.max(0, nowMs - lastTickMs) : 1000 / 60;
      lastTickMs = nowMs;

      if (state.phase === "dragging") {
        const idleSinceMoveMs = nowMs - state.lastMoveTimeMs;
        if (idleSinceMoveMs >= 14) {
          state = stepBadgePhysics(state, dtMs, motion.matches);
          paint();
        }
      } else if (state.phase === "swinging") {
        state = stepBadgePhysics(state, dtMs, motion.matches);
        paint();
      }

      if (state.phase !== "idle") {
        frame = requestAnimationFrame(tick);
      } else {
        lastTickMs = 0;
      }
    };

    const ensureLoop = () => {
      if (!frame && state.phase !== "idle" && !motion.matches) {
        lastTickMs = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const refreshMetrics = () => {
      cachedMetrics = readBadgeFieldMetrics(field, anchor, badge);
      paint();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (
        state.phase === "dragging" ||
        event.button !== 0 ||
        (event.target instanceof Element && event.target.closest("button, a"))
      ) {
        return;
      }

      const metrics = readBadgeFieldMetrics(field, anchor, badge);
      if (!metrics) return;
      cachedMetrics = metrics;

      const anchorRect = anchor.getBoundingClientRect();
      const pivotClientX = anchorRect.left + anchorRect.width / 2 + state.x;
      const pivotClientY = anchorRect.top - CLIP_PIVOT_OFFSET_PX + state.y;
      const nowMs = performance.now();

      state = startBadgeDrag(
        state,
        {
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          grabOffsetX: event.clientX - pivotClientX,
          grabOffsetY: event.clientY - pivotClientY,
          timestampMs: nowMs,
        },
        metrics
      ).state;

      badge.setPointerCapture(event.pointerId);
      paint();
      ensureLoop();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (state.phase !== "dragging" || state.pointerId !== event.pointerId) {
        return;
      }

      const metrics = cachedMetrics ?? readBadgeFieldMetrics(field, anchor, badge);
      if (!metrics) return;
      cachedMetrics = metrics;

      const outcome = moveBadgeDrag(
        state,
        {
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          timestampMs: performance.now(),
        },
        metrics,
        motion.matches
      );
      state = outcome.state;
      if (outcome.status === "dragging") {
        paint();
        ensureLoop();
      }
    };

    const onPointerRelease = (event: PointerEvent) => {
      if (state.phase !== "dragging" || state.pointerId !== event.pointerId) {
        return;
      }

      const outcome = releaseBadgeDrag(
        state,
        {
          pointerId: event.pointerId,
          timestampMs: performance.now(),
          committedTap: event.type === "pointerup",
        },
        motion.matches
      );
      state = outcome.state;
      if (outcome.shouldToggleFlip) {
        setFlipped((value) => !value);
      }

      paint();
      if (state.phase === "idle") {
        stopLoop();
      } else {
        ensureLoop();
      }
    };

    const onReducedMotionChange = () => {
      if (!motion.matches) return;
      if (state.phase === "dragging" && badge.hasPointerCapture(state.pointerId)) {
        badge.releasePointerCapture(state.pointerId);
      }
      stopLoop();
      state = createIdleBadgeState();
      paint();
    };

    const observer = new ResizeObserver(refreshMetrics);
    observer.observe(field);
    const cover = field.closest(".resume-cover");
    if (cover) {
      observer.observe(cover);
    }

    badge.addEventListener("pointerdown", onPointerDown);
    badge.addEventListener("pointermove", onPointerMove);
    badge.addEventListener("pointerup", onPointerRelease);
    badge.addEventListener("pointercancel", onPointerRelease);
    badge.addEventListener("lostpointercapture", onPointerRelease);
    motion.addEventListener("change", onReducedMotionChange);

    if (desktopMedia.matches && !motion.matches) {
      state = triggerBadgeIntroSwing(state, false).state;
    }
    paint();
    ensureLoop();

    return () => {
      observer.disconnect();
      stopLoop();
      badge.removeEventListener("pointerdown", onPointerDown);
      badge.removeEventListener("pointermove", onPointerMove);
      badge.removeEventListener("pointerup", onPointerRelease);
      badge.removeEventListener("pointercancel", onPointerRelease);
      badge.removeEventListener("lostpointercapture", onPointerRelease);
      motion.removeEventListener("change", onReducedMotionChange);
    };
  }, []);

  return (
    <div className="resume-badge" role="group" aria-label="Rhaenyra Liang 個人名牌">
      <div className="resume-badge-field" ref={fieldRef}>
        <svg className="resume-strap" ref={svgRef} viewBox={DEFAULT_RESTING_VIEWBOX} aria-hidden="true">
          <path id={strapId} ref={strapRef} d={DEFAULT_RESTING_STRAP_PATH} />
          <use href={`#${strapId}`} className="resume-strap-weave" />
          <text><textPath href={`#${strapId}`} startOffset="48%">RHAENYRA LIANG</textPath></text>
        </svg>

        <div className="resume-badge-anchor" ref={anchorRef}>
          <div className="resume-badge-swing" ref={badgeRef}>
            <Image
              ref={clipRef}
              src="/resume/badge-clip.svg"
              alt=""
              width={40}
              height={54}
              draggable={false}
              className="resume-clip"
            />
            <button
              type="button"
              className="resume-badge-flip"
              aria-label={flipped ? "翻回名牌正面" : "翻看聯絡方式"}
              aria-pressed={flipped}
              onClick={() => setFlipped((value) => !value)}
            >
              {flipped ? <ArrowUpLeft aria-hidden="true" /> : <ArrowDownRight aria-hidden="true" />}
            </button>
            <div className="resume-badge-card" data-flipped={flipped ? "" : undefined}>
              <div className="resume-badge-face resume-badge-front" aria-hidden={flipped}>
                <div className="resume-badge-label">
                  <span>PRODUCT · AI OPERATIONS</span>
                  <span>#01</span>
                </div>
                <Image
                  src="/resume/badge-portrait-sakura.webp"
                  alt=""
                  width={640}
                  height={640}
                  sizes="(max-width: 767px) 180px, 254px"
                  fetchPriority="high"
                  loading="eager"
                  draggable={false}
                  className="resume-badge-portrait"
                />
                <div className="resume-badge-name">
                  <p>{CANDIDATE_PROFILE.name}</p>
                  <span>產品管理 · AI 營運</span>
                </div>
              </div>
              <div className="resume-badge-face resume-badge-back" aria-hidden={!flipped} inert={!flipped}>
                <div className="resume-badge-label"><span>CONTACT</span><span>#01</span></div>
                <p className="resume-badge-company">{CANDIDATE_PROFILE.name}</p>
                <p className="resume-badge-period">{CANDIDATE_PROFILE.chinesePositioning}</p>
                <div className="resume-badge-contact">
                  <a href={`mailto:${CANDIDATE_PROFILE.email}`}>
                    <span>EMAIL</span>
                    {CANDIDATE_PROFILE.email}
                  </a>
                  <a href={CANDIDATE_PROFILE.resumePdfUrl} target="_blank" rel="noopener noreferrer">
                    <span>RÉSUMÉ</span>
                    <span>開啟 PDF <ArrowUpRight aria-hidden="true" /></span>
                  </a>
                </div>
                <span className="resume-badge-signature">Jstyle北海道 · Interview</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
