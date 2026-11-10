"use client";

import Image from "next/image";
import { ArrowDownRight, ArrowUpLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CANDIDATE_PROFILE } from "@/domain/portfolio-data";

const restingStrap = "M 263 -28 C 264 23 249 78 240 112";
const clipOffset = 46;

export function ResumeBadge() {
  const [flipped, setFlipped] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const strapRef = useRef<SVGPathElement>(null);
  const strapId = useId();
  useEffect(() => {
    const field = fieldRef.current;
    const badge = badgeRef.current;
    const strap = strapRef.current;
    const anchor = badge?.parentElement;
    if (!field || !badge || !strap || !anchor) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const firstSwing = !motion.matches && window.matchMedia("(min-width: 48rem)").matches;
    let x = firstSwing ? 44 : 0;
    let y = firstSwing ? -12 : 0;
    let vx = 0;
    let vy = 0;
    let frame = 0;
    let drag: { id: number; startX: number; startY: number; x: number; y: number; moved: boolean } | null = null;

    const paint = () => {
      const width = field.clientWidth;
      const height = field.clientHeight;
      if (!width || !height) return;

      const endX = 240 + x * 480 / width;
      const endY = (anchor.offsetTop - clipOffset + y) * 590 / height;
      strap.setAttribute("d", `M 263 -28 C 264 24 ${(263 + endX) / 2} ${endY * 0.65} ${endX} ${endY}`);
      badge.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x * 0.15}deg)`;
    };

    const settle = () => {
      frame = 0;
      if (motion.matches || Math.abs(x) + Math.abs(y) + Math.abs(vx) + Math.abs(vy) < 0.5) {
        x = y = vx = vy = 0;
        paint();
        return;
      }

      vx = (vx - x * 0.075) * 0.82;
      vy = (vy - y * 0.075) * 0.82;
      x += vx;
      y += vy;
      paint();
      frame = requestAnimationFrame(settle);
    };

    const start = (event: PointerEvent) => {
      if (drag || event.button !== 0 ||
        (event.target instanceof Element && event.target.closest("button, a"))) return;

      cancelAnimationFrame(frame);
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y, moved: false };
      vx = vy = 0;
      badge.setPointerCapture(event.pointerId);
    };

    const move = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      if (motion.matches) return;
      badge.dataset.dragging = "";

      const limit = Math.min(112, field.clientWidth * 0.23);
      const nextX = Math.max(-limit, Math.min(limit, drag.x + dx));
      const nextY = Math.max(-62, Math.min(86, drag.y + dy));
      vx = (nextX - x) * 0.36;
      vy = (nextY - y) * 0.36;
      x = nextX;
      y = nextY;
      paint();
    };

    const release = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      if (!drag.moved && event.type === "pointerup") setFlipped((value) => !value);
      drag = null;
      delete badge.dataset.dragging;
      frame = requestAnimationFrame(settle);
    };

    const updateMotion = () => {
      if (!motion.matches) return;
      const captured = drag?.id;
      drag = null;
      if (captured !== undefined && badge.hasPointerCapture(captured)) {
        badge.releasePointerCapture(captured);
      }
      delete badge.dataset.dragging;
      cancelAnimationFrame(frame);
      x = y = vx = vy = 0;
      paint();
    };

    const observer = new ResizeObserver(paint);
    observer.observe(field);
    badge.addEventListener("pointerdown", start);
    badge.addEventListener("pointermove", move);
    badge.addEventListener("pointerup", release);
    badge.addEventListener("pointercancel", release);
    badge.addEventListener("lostpointercapture", release);
    motion.addEventListener("change", updateMotion);
    paint();
    if (firstSwing) frame = requestAnimationFrame(settle);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      badge.removeEventListener("pointerdown", start);
      badge.removeEventListener("pointermove", move);
      badge.removeEventListener("pointerup", release);
      badge.removeEventListener("pointercancel", release);
      badge.removeEventListener("lostpointercapture", release);
      motion.removeEventListener("change", updateMotion);
    };
  }, []);

  return (
    <div className="resume-badge" role="group" aria-label="Rhaenyra Liang 個人名牌">
      <div className="resume-badge-field" ref={fieldRef}>
        <svg className="resume-strap" viewBox="0 0 480 590" preserveAspectRatio="none" aria-hidden="true">
          <path id={strapId} ref={strapRef} d={restingStrap} />
          <use href={`#${strapId}`} className="resume-strap-weave" />
          <text><textPath href={`#${strapId}`} startOffset="29%">RHAENYRA LIANG</textPath></text>
        </svg>

        <div className="resume-badge-anchor">
          <div className="resume-badge-swing" ref={badgeRef}>
            <Image
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
      <p className="resume-drag-hint">拖曳名牌 · 點一下翻面</p>
    </div>
  );
}
