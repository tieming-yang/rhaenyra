"use client";

import Image from "next/image";
import { ArrowUpRight, Mail, RotateCw, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type {
  HeroBadgeContent,
  ProposalSectionContent,
  SiteProfileAssets,
} from "@/content";
import { HEADER_SECTION_HREF, PROPOSAL_FINISH_ID } from "@/lib/header-navigation";
import {
  deriveDeskFinalePose,
  resolveStickyRailProgress,
} from "@/lib/mac-portal-transition";

interface ProposalDeskFinaleProps {
  readonly finish: ProposalSectionContent["finish"];
  readonly proposalIntro: ProposalSectionContent["intro"];
  readonly badge: HeroBadgeContent;
  readonly profile: SiteProfileAssets;
}

const WORLD_TILT_DEG = 76;
const LID_OPEN_DEG = 180 - WORLD_TILT_DEG;
const WORLD_TILT_RAD = (WORLD_TILT_DEG * Math.PI) / 180;
const RULER_TICKS = Array.from({ length: 21 }, (_, index) => index);

export function ProposalDeskFinale({
  finish,
  proposalIntro,
  badge,
  profile,
}: ProposalDeskFinaleProps) {
  const rawId = useId();
  const lanyardPathId = `${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}-desk-strap`;
  const [badgeFlipped, setBadgeFlipped] = useState(false);

  const railRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const deskBackdropRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const macSlotRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLDivElement>(null);
  const snowScreenRef = useRef<HTMLDivElement>(null);
  const snowRidgeRef = useRef<HTMLDivElement>(null);
  const macShadowRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const badgeItemRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLAnchorElement>(null);
  const phoneRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    const stage = stageRef.current;
    const camera = cameraRef.current;
    const world = worldRef.current;
    const macSlot = macSlotRef.current;
    if (!rail || !stage || !camera || !world || !macSlot) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const applyObjectReveal = (
      element: HTMLElement | null,
      itemProgress: number,
      fromX: number,
      fromY: number,
      restRotateDeg: number
    ) => {
      if (!element) return;
      const inv = 1 - itemProgress;
      element.style.opacity = String(itemProgress);
      element.style.transform = `translate3d(${fromX * inv}px, ${fromY * inv}px, 0) rotate(${restRotateDeg + inv * 4}deg) scale(${0.92 + 0.08 * itemProgress})`;
    };

    const update = () => {
      frame = 0;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      if (viewportWidth <= 0 || viewportHeight <= 0) return;

      const railRect = rail.getBoundingClientRect();
      const screenWidth = macSlot.offsetWidth;
      const screenHeight = macSlot.offsetHeight;
      if (railRect.height <= 0 || screenWidth <= 0 || screenHeight <= 0) return;

      const rawProgress = reduce.matches
        ? 1
        : resolveStickyRailProgress({
            railTopPx: railRect.top,
            railHeightPx: railRect.height,
            viewportHeightPx: viewportHeight,
            startDwellRatio: 0.04,
          });

      const pose = deriveDeskFinalePose({
        viewport: { width: viewportWidth, height: viewportHeight },
        screenWidth,
        screenHeight,
        rawProgress,
        reducedMotion: reduce.matches,
      });

      stage.dataset.finalePhase = pose.phase;
      stage.dataset.interactive = pose.deskInteractive ? "true" : "false";

      const stageWidth = stage.clientWidth;
      const stageHeight = stage.clientHeight;
      const worldWidth = world.offsetWidth;
      const worldHeight = world.offsetHeight;
      if (stageWidth <= 0 || stageHeight <= 0) return;

      // Measure untransformed slot offset inside world by walking offsetParents up to world
      let slotLeftInWorld = 0;
      let slotTopInWorld = 0;
      let cursor: HTMLElement | null = macSlot;
      while (cursor && cursor !== world) {
        slotLeftInWorld += cursor.offsetLeft;
        slotTopInWorld += cursor.offsetTop;
        cursor = cursor.offsetParent as HTMLElement | null;
      }

      const invOverhead = 1 - pose.cameraOverheadProgress;
      const hingeX = slotLeftInWorld + screenWidth * 0.5 - worldWidth * 0.5;
      const hingeY = slotTopInWorld - worldHeight * 0.5;
      const openCenterX = hingeX;
      const openCenterY =
        hingeY * Math.cos(WORLD_TILT_RAD) - screenHeight * 0.5;
      const openCenterZ = hingeY * Math.sin(WORLD_TILT_RAD);

      const camCenterInStageX = camera.offsetLeft + camera.offsetWidth * 0.5;
      const camCenterInStageY = camera.offsetTop + camera.offsetHeight * 0.5;
      const camToStageCenterX =
        (stageWidth * 0.5 - camCenterInStageX) * invOverhead;
      const camToStageCenterY =
        (stageHeight * 0.5 - camCenterInStageY) * invOverhead;

      camera.style.transform = `translate3d(${camToStageCenterX}px, ${camToStageCenterY}px, 0) scale(${pose.macScale})`;

      const worldTilt = WORLD_TILT_DEG * invOverhead;
      world.style.transform = `translate3d(${-openCenterX * invOverhead}px, ${-openCenterY * invOverhead}px, ${-openCenterZ * invOverhead}px) rotateX(${worldTilt}deg)`;

      if (lidRef.current) {
        const lidAngle = LID_OPEN_DEG * (1 - pose.lidCloseProgress);
        const closedLiftZ = 5 * pose.lidCloseProgress;
        lidRef.current.style.transform = `translateZ(${closedLiftZ}px) rotateX(${lidAngle}deg)`;
      }
      if (snowScreenRef.current) {
        snowScreenRef.current.style.opacity = String(pose.snowScreenOpacity);
      }
      if (snowRidgeRef.current) {
        snowRidgeRef.current.style.opacity = String(pose.snowRidgeOpacity);
      }
      if (deskBackdropRef.current) {
        deskBackdropRef.current.style.opacity = String(pose.deskSurfaceOpacity);
      }
      if (macShadowRef.current) {
        macShadowRef.current.style.opacity = String(
          0.35 + 0.65 * pose.cameraOverheadProgress
        );
      }

      applyObjectReveal(noteRef.current, pose.stickyNoteProgress, 28, -26, -2.4);
      applyObjectReveal(badgeItemRef.current, pose.badgeProgress, 38, 18, 2.2);
      applyObjectReveal(rulerRef.current, pose.rulerProgress, -26, 32, -1.6);
      applyObjectReveal(phoneRef.current, pose.phoneProgress, 26, 34, 1.8);
    };

    const schedule = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(rail);
    resizeObserver.observe(stage);

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener("change", schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <footer
      id={PROPOSAL_FINISH_ID}
      className="desk-finale-rail"
      ref={railRef}
      aria-label={`${finish.eyebrow}: ${finish.title}`}
    >
      <div className="desk-finale-stage" ref={stageRef} data-interactive="false">
        <div className="desk-surface-backdrop" ref={deskBackdropRef} aria-hidden="true" />

        <div className="desk-camera" ref={cameraRef}>
          <div className="desk-world" ref={worldRef}>
            <div className="desk-knoll-grid">
              {/* 1. Transforming MacBook (Open Screen -> Closed Top-Down Shell) */}
              <div className="desk-mac-slot" ref={macSlotRef}>
                <div className="desk-mac-shadow" ref={macShadowRef} aria-hidden="true" />
                <div className="desk-mac" aria-hidden="true">
                  <div className="desk-mac-base">
                    <div className="desk-mac-well" />
                    <div className="desk-mac-pad" />
                    <div className="desk-mac-notch" />
                  </div>

                  <div className="desk-mac-lid" ref={lidRef}>
                    {/* Outer Anodized Top Cover (visible when lid closes in overhead view) */}
                    <div className="desk-mac-lid-outer">
                      <div className="desk-mac-sheen" />
                      <div className="desk-mac-emblem">
                        <span />
                      </div>
                      <div className="desk-mac-front-lip" />
                    </div>

                    {/* Inner Display Glass (visible when open during pullback from Section 4) */}
                    <div className="desk-mac-lid-inner">
                      <div className="desk-mac-webcam" />
                      <div className="desk-mac-display">
                        <div className="desk-mac-snowworld" ref={snowScreenRef}>
                          <div className="desk-mac-snowridge" ref={snowRidgeRef}>
                            <svg
                              className="desk-mac-snowmountains"
                              viewBox="0 0 800 240"
                              preserveAspectRatio="xMidYMax slice"
                            >
                              <path
                                fill="#ecd0dd"
                                opacity="0.72"
                                d="M 0 240 L 0 154 L 94 108 L 162 66 L 228 102 L 308 42 L 372 82 L 448 34 L 518 78 L 592 40 L 668 88 L 734 56 L 800 124 L 800 240 Z"
                              />
                              <path
                                fill="#fff8fa"
                                d="M 0 240 L 0 176 L 84 132 L 154 88 L 204 52 L 258 92 L 322 118 L 388 60 L 434 36 L 486 74 L 548 112 L 614 58 L 664 38 L 726 88 L 800 156 L 800 240 Z"
                              />
                            </svg>
                            <div className="desk-mac-snowcopy">
                              <span>{proposalIntro.eyebrow}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Sticky Note Tip ("FINISH / 感謝閱讀") */}
              <div className="desk-note-object" ref={noteRef}>
                <span className="desk-note-tape" aria-hidden="true" />
                <p className="desk-note-eyebrow">
                  <Sparkles aria-hidden="true" />
                  {finish.eyebrow}
                </p>
                <h2 className="desk-note-title">{finish.title}</h2>
              </div>

              {/* 3. Hero's ID Badge + Coiled Lanyard on the Side of the Mac */}
              <div className="desk-badge-object" ref={badgeItemRef}>
                <svg
                  className="desk-badge-lanyard"
                  viewBox="0 0 220 96"
                  aria-hidden="true"
                >
                  <path
                    id={lanyardPathId}
                    className="desk-lanyard-band"
                    d="M 110 88 C 110 42, 48 56, 26 18 C 14 -2, 88 -8, 158 14 C 192 24, 198 52, 174 66"
                  />
                  <path
                    className="desk-lanyard-weave"
                    d="M 110 88 C 110 42, 48 56, 26 18 C 14 -2, 88 -8, 158 14 C 192 24, 198 52, 174 66"
                  />
                  <text dy="3">
                    <textPath href={`#${lanyardPathId}`} startOffset="12%">
                      {badge.strapText}
                    </textPath>
                  </text>
                </svg>

                <div className="desk-badge-clip" aria-hidden="true" />

                <button
                  type="button"
                  className="desk-badge-card-btn"
                  aria-pressed={badgeFlipped}
                  aria-label={
                    badgeFlipped
                      ? badge.flipToFrontAriaLabel
                      : badge.flipToBackAriaLabel
                  }
                  onClick={() => setBadgeFlipped((prev) => !prev)}
                >
                  <span
                    className="desk-badge-card"
                    data-flipped={badgeFlipped ? "" : undefined}
                  >
                    <span className="desk-badge-face desk-badge-front">
                      <span className="desk-badge-header">
                        <span>{badge.front.topLabel}</span>
                        <span>{badge.front.numberLabel}</span>
                      </span>
                      <span className="desk-badge-photo-wrap">
                        <Image
                          src={profile.badgePortraitSrc}
                          alt={badge.front.name}
                          fill
                          sizes="220px"
                          className="desk-badge-photo"
                        />
                      </span>
                      <span className="desk-badge-meta">
                        <strong>{badge.front.name}</strong>
                        <small>{badge.front.role}</small>
                      </span>
                      <span className="desk-badge-flip-chip" aria-hidden="true">
                        <RotateCw />
                      </span>
                    </span>

                    <span className="desk-badge-face desk-badge-back">
                      <span className="desk-badge-header">
                        <span>{badge.back.topLabel}</span>
                        <span>{badge.back.numberLabel}</span>
                      </span>
                      <strong className="desk-badge-company">
                        {badge.back.name}
                      </strong>
                      <span className="desk-badge-summary">
                        {badge.back.positioning}
                      </span>
                      <span className="desk-badge-signature">
                        {badge.back.signature}
                      </span>
                      <span className="desk-badge-flip-chip" aria-hidden="true">
                        <RotateCw />
                      </span>
                    </span>
                  </span>
                </button>
              </div>

              {/* 4. Drafting Triangle Ruler CTA ("回到頂部") */}
              <a
                href={HEADER_SECTION_HREF.hero}
                data-scroll-section="hero"
                className="desk-ruler-object"
                ref={rulerRef}
                aria-label={finish.backToTopLabel}
              >
                <svg
                  className="desk-ruler-svg"
                  viewBox="0 0 320 132"
                  aria-hidden="true"
                >
                  <polygon
                    className="desk-ruler-body"
                    points="16,122 160,12 304,122"
                  />
                  <polygon
                    className="desk-ruler-cutout"
                    points="96,98 160,48 224,98"
                  />
                  <g className="desk-ruler-ticks">
                    {RULER_TICKS.map((tick) => {
                      const x = 32 + tick * 12.8;
                      const isMajor = tick % 5 === 0;
                      const yTop = isMajor ? 109 : 114;
                      return (
                        <line
                          key={tick}
                          x1={x}
                          y1={122}
                          x2={x}
                          y2={yTop}
                        />
                      );
                    })}
                  </g>
                </svg>
                <span className="desk-ruler-label">
                  <span className="desk-ruler-arrow" aria-hidden="true">
                    ▲
                  </span>
                  <span>{finish.backToTopLabel}</span>
                </span>
              </a>

              {/* 5. Smartphone CTA ("聯絡我") */}
              <a
                href={`mailto:${profile.email}`}
                className="desk-phone-object"
                ref={phoneRef}
                aria-label={`${finish.contactLabel}: ${profile.email}`}
              >
                <span className="desk-phone-frame">
                  <span className="desk-phone-screen">
                    <span className="desk-phone-statusbar" aria-hidden="true">
                      <span>09:41</span>
                      <span className="desk-phone-island" />
                      <span>5G</span>
                    </span>
                    <span className="desk-phone-card">
                      <span className="desk-phone-icon" aria-hidden="true">
                        <Mail />
                      </span>
                      <span className="desk-phone-copy">
                        <strong>
                          {finish.contactLabel}
                          <ArrowUpRight aria-hidden="true" />
                        </strong>
                        <small>{profile.email}</small>
                      </span>
                    </span>
                    <span className="desk-phone-homebar" aria-hidden="true" />
                  </span>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
