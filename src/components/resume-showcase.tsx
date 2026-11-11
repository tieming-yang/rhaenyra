"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  formatContentTemplate,
  type ExperienceSectionContent,
  type HeroContent,
  type ProductsSectionContent,
  type ProposalSectionContent,
  type SiteProfileAssets,
} from "@/content";
import {
  deriveMacPortalDivePose,
  resolveStickyRailProgress,
  resolveStickyStageViewportCenter,
} from "@/lib/mac-portal-transition";
import { ResumeBadge } from "./resume-badge";
import { ResumeJobDeck } from "./resume-job-deck";
import { SakuraHeadlineName } from "./sakura-headline-name";

interface KeyCap {
  readonly id: string;
  readonly label?: string;
  readonly sub?: string;
  readonly size?: "sm" | "md" | "lg" | "xl" | "space" | "touch" | "arrows";
}

const keyboardRows: readonly (readonly KeyCap[])[] = [
  [
    { id: "esc", label: "esc", size: "sm" },
    { id: "f1", label: "F1" },
    { id: "f2", label: "F2" },
    { id: "f3", label: "F3" },
    { id: "f4", label: "F4" },
    { id: "f5", label: "F5" },
    { id: "f6", label: "F6" },
    { id: "f7", label: "F7" },
    { id: "f8", label: "F8" },
    { id: "f9", label: "F9" },
    { id: "f10", label: "F10" },
    { id: "f11", label: "F11" },
    { id: "f12", label: "F12" },
    { id: "touch", size: "touch" },
  ],
  [
    { id: "grave", sub: "~", label: "`" },
    { id: "1", sub: "!", label: "1" },
    { id: "2", sub: "@", label: "2" },
    { id: "3", sub: "#", label: "3" },
    { id: "4", sub: "$", label: "4" },
    { id: "5", sub: "%", label: "5" },
    { id: "6", sub: "^", label: "6" },
    { id: "7", sub: "&", label: "7" },
    { id: "8", sub: "*", label: "8" },
    { id: "9", sub: "(", label: "9" },
    { id: "0", sub: ")", label: "0" },
    { id: "minus", sub: "_", label: "-" },
    { id: "equal", sub: "+", label: "=" },
    { id: "delete", label: "⌫", size: "md" },
  ],
  [
    { id: "tab", label: "⇥", size: "md" },
    { id: "q", label: "Q" },
    { id: "w", label: "W" },
    { id: "e", label: "E" },
    { id: "r", label: "R" },
    { id: "t", label: "T" },
    { id: "y", label: "Y" },
    { id: "u", label: "U" },
    { id: "i", label: "I" },
    { id: "o", label: "O" },
    { id: "p", label: "P" },
    { id: "lbracket", sub: "{", label: "[" },
    { id: "rbracket", sub: "}", label: "]" },
    { id: "backslash", sub: "|", label: "\\" },
  ],
  [
    { id: "caps", label: "⇪", size: "lg" },
    { id: "a", label: "A" },
    { id: "s", label: "S" },
    { id: "d", label: "D" },
    { id: "f", label: "F" },
    { id: "g", label: "G" },
    { id: "h", label: "H" },
    { id: "j", label: "J" },
    { id: "k", label: "K" },
    { id: "l", label: "L" },
    { id: "semicolon", sub: ":", label: ";" },
    { id: "quote", sub: "\"", label: "'" },
    { id: "return", label: "⏎", size: "lg" },
  ],
  [
    { id: "lshift", label: "⇧", size: "xl" },
    { id: "z", label: "Z" },
    { id: "x", label: "X" },
    { id: "c", label: "C" },
    { id: "v", label: "V" },
    { id: "b", label: "B" },
    { id: "n", label: "N" },
    { id: "m", label: "M" },
    { id: "comma", sub: "<", label: "," },
    { id: "period", sub: ">", label: "." },
    { id: "slash", sub: "?", label: "/" },
    { id: "rshift", label: "⇧", size: "xl" },
  ],
  [
    { id: "fn", label: "fn" },
    { id: "ctrl", label: "⌃" },
    { id: "lopt", label: "⌥" },
    { id: "lcmd", label: "⌘", size: "sm" },
    { id: "space", label: "", size: "space" },
    { id: "rcmd", label: "⌘", size: "sm" },
    { id: "ropt", label: "⌥" },
    { id: "left", label: "◀" },
    { id: "updown", sub: "▲", label: "▼", size: "arrows" },
    { id: "right", label: "▶" },
  ],
];

interface ResumeShowcaseProps {
  readonly profile: SiteProfileAssets;
  readonly hero: HeroContent;
  readonly experience: ExperienceSectionContent;
  readonly products: ProductsSectionContent;
  readonly proposalIntro: ProposalSectionContent["intro"];
}

function productArtStyle(artSrc: string) {
  return { backgroundImage: `url(${artSrc})` };
}

export function ResumeShowcase({
  profile,
  hero,
  experience,
  products,
  proposalIntro,
}: ResumeShowcaseProps) {
  const coverRef = useRef<HTMLElement>(null);
  const deskRef = useRef<HTMLElement>(null);
  const studioRef = useRef<HTMLElement>(null);
  const studioContentRef = useRef<HTMLDivElement>(null);
  const diveSpacerRef = useRef<HTMLDivElement>(null);
  const caseCopyRef = useRef<HTMLDivElement>(null);
  const deviceSlotRef = useRef<HTMLDivElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLDivElement>(null);
  const macScreenRef = useRef<HTMLDivElement>(null);
  const deviceBaseRef = useRef<HTMLDivElement>(null);
  const projectDockRef = useRef<HTMLDivElement>(null);
  const portalScreenRef = useRef<HTMLDivElement>(null);
  const portalHorizonRef = useRef<HTMLDivElement>(null);
  const portalVeilRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const [nearStudio, setNearStudio] = useState(false);
  const safeSelected = selected < products.items.length ? selected : 0;
  const product = products.items[safeSelected];

  useEffect(() => {
    const cover = coverRef.current;
    const desk = deskRef.current;
    const studio = studioRef.current;
    if (!cover || !desk || !studio) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const tracks = [
      { element: cover, entry: 0.09, distance: 0.6 },
      { element: desk, entry: 0.88, distance: 0.62 },
      { element: studio, entry: 0.89, distance: 0.75 },
    ];

    const update = () => {
      frame = 0;
      const viewport = window.innerHeight;
      const viewportWidth = window.innerWidth;
      for (const { element, entry, distance } of tracks) {
        if (reduce.matches) {
          element.style.removeProperty("--scene-progress");
          continue;
        }

        const top = element.getBoundingClientRect().top;
        const position = (viewport * entry - top) / (viewport * distance);
        const progress = Math.min(1, Math.max(0, position));
        element.style.setProperty("--scene-progress", String(progress * progress * (3 - 2 * progress)));
      }

      const studioContent = studioContentRef.current;
      const diveSpacer = diveSpacerRef.current;
      const deviceSlot = deviceSlotRef.current;
      const device = deviceRef.current;
      const lid = lidRef.current;
      const macScreen = macScreenRef.current;
      const caseCopy = caseCopyRef.current;
      const deviceBase = deviceBaseRef.current;
      const projectDock = projectDockRef.current;
      const portalScreen = portalScreenRef.current;
      const portalHorizon = portalHorizonRef.current;
      const portalVeil = portalVeilRef.current;
      if (
        !studioContent ||
        !deviceSlot ||
        !device ||
        !lid ||
        !macScreen ||
        viewport <= 0 ||
        viewportWidth <= 0
      ) {
        return;
      }

      const studioRect = studio.getBoundingClientRect();
      const studioContentWidth = studioContent.clientWidth;
      const studioContentHeight = studioContent.offsetHeight;
      const diveSpacerHeight = diveSpacer ? diveSpacer.offsetHeight : 0;
      const screenWidth = macScreen.offsetWidth;
      const screenHeight = macScreen.offsetHeight;
      if (
        studioRect.height <= 0 ||
        studioContentWidth <= 0 ||
        studioContentHeight <= 0 ||
        screenWidth <= 0 ||
        screenHeight <= 0
      ) {
        return;
      }

      const stageCenter = resolveStickyStageViewportCenter({
        stageWidth: studioContentWidth,
        stageHeight: studioContentHeight,
        viewportHeight: viewport,
      });
      if (reduce.matches) {
        studioContent.style.removeProperty("--studio-sticky-top");
      } else {
        studioContent.style.setProperty(
          "--studio-sticky-top",
          `${stageCenter.stickyTopPx}px`
        );
      }

      const rawDiveProgress =
        reduce.matches || diveSpacerHeight <= 0
          ? 0
          : resolveStickyRailProgress({
              railTopPx: studioRect.top - stageCenter.stickyTopPx,
              railHeightPx: viewport + diveSpacerHeight,
              viewportHeightPx: viewport,
              startDwellRatio: 0.12,
            });

      const studioContentRect = studioContent.getBoundingClientRect();
      const slotRect = deviceSlot.getBoundingClientRect();
      const slotLeftInStudio = slotRect.left - studioContentRect.left;
      const slotTopInStudio = slotRect.top - studioContentRect.top;
      const screenOffsetInDeviceX = lid.offsetLeft + macScreen.offsetLeft + screenWidth * 0.5;
      const screenOffsetInDeviceY = lid.offsetTop + macScreen.offsetTop + screenHeight * 0.5;
      const screenCenterX = slotLeftInStudio + device.offsetLeft + screenOffsetInDeviceX;
      const screenCenterY = slotTopInStudio + device.offsetTop + screenOffsetInDeviceY;

      const divePose = deriveMacPortalDivePose({
        viewport: { width: viewportWidth, height: viewport },
        screen: {
          centerX: screenCenterX,
          centerY: screenCenterY,
          width: screenWidth,
          height: screenHeight,
        },
        targetCenter: { x: stageCenter.x, y: stageCenter.y },
        rawProgress: rawDiveProgress,
        reducedMotion: reduce.matches,
      });

      if (divePose.phase === "browsing") {
        studio.removeAttribute("data-portal-diving");
        device.style.removeProperty("transform-origin");
        device.style.removeProperty("transform");
        macScreen.style.removeProperty("box-shadow");
        macScreen.style.removeProperty("border-radius");
        if (caseCopy) {
          caseCopy.style.removeProperty("opacity");
          caseCopy.style.removeProperty("transform");
          caseCopy.style.removeProperty("pointer-events");
        }
        if (projectDock) {
          projectDock.style.removeProperty("opacity");
          projectDock.style.removeProperty("transform");
          projectDock.style.removeProperty("pointer-events");
        }
        if (deviceBase) {
          deviceBase.style.removeProperty("opacity");
        }
        if (portalScreen) {
          portalScreen.style.opacity = "0";
          portalScreen.style.visibility = "hidden";
        }
        if (portalHorizon) {
          portalHorizon.style.removeProperty("opacity");
          portalHorizon.style.removeProperty("transform");
        }
        if (portalVeil) {
          portalVeil.style.opacity = "0";
        }
        return;
      }

      studio.setAttribute("data-portal-diving", "");
      studio.style.setProperty("--scene-progress", "1");
      device.style.transformOrigin = `${screenOffsetInDeviceX}px ${screenOffsetInDeviceY}px`;
      device.style.transform = `translate3d(${divePose.translateX}px, ${divePose.translateY}px, 0) scale(${divePose.scale})`;
      macScreen.style.boxShadow =
        divePose.progress > 0.78 ? "none" : "0 0 0 1px #090407";
      const rScale = divePose.screenCornerRadiusScale;
      macScreen.style.borderRadius =
        rScale <= 0.005
          ? "0px"
          : `${(0.56 * rScale).toFixed(3)}rem ${(0.56 * rScale).toFixed(3)}rem ${(0.2 * rScale).toFixed(3)}rem ${(0.2 * rScale).toFixed(3)}rem`;

      if (caseCopy) {
        caseCopy.style.opacity = String(divePose.copyOpacity);
        caseCopy.style.transform = `translate3d(0, ${divePose.copyShiftY}px, 0)`;
        caseCopy.style.pointerEvents = divePose.uiInteractive ? "" : "none";
      }
      if (projectDock) {
        projectDock.style.opacity = String(divePose.dockOpacity);
        projectDock.style.transform = `translate3d(0, ${(1 - divePose.dockOpacity) * 22}px, 0)`;
        projectDock.style.pointerEvents = divePose.uiInteractive ? "" : "none";
      }
      if (deviceBase) {
        deviceBase.style.opacity = String(divePose.baseOpacity);
      }
      if (portalScreen) {
        portalScreen.style.visibility =
          divePose.portalScreenOpacity > 0.005 ? "visible" : "hidden";
        portalScreen.style.opacity = String(divePose.portalScreenOpacity);
      }
      if (portalHorizon) {
        const horizonOpacity = Math.max(0, 1 - divePose.snowVeilOpacity);
        const driftDownPct = 10 * divePose.progress;
        portalHorizon.style.opacity = String(horizonOpacity);
        portalHorizon.style.transform = `translate3d(0, ${driftDownPct}%, 0) scale(${divePose.portalIntroScale})`;
      }
      if (portalVeil) {
        portalVeil.style.opacity = String(divePose.snowVeilOpacity);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setNearStudio(true);
      observer.disconnect();
    }, { rootMargin: "240px" });
    observer.observe(studio);

    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(studio);
    if (studioContentRef.current) {
      resizeObserver.observe(studioContentRef.current);
    }
    if (diveSpacerRef.current) {
      resizeObserver.observe(diveSpacerRef.current);
    }

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reduce.addEventListener("change", schedule);
    schedule();

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reduce.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <div className="resume-showcase">
      <section className="resume-cover-rail" ref={coverRef} aria-labelledby="profile-title">
        <div className="resume-cover">
          <div className="resume-cover-copy">
            <p className="resume-eyebrow">{hero.cover.eyebrow}</p>
            <h1 id="profile-title">
              {hero.cover.headline}
              <span className="resume-cover-tagline">{hero.cover.tagline}</span>
            </h1>
            <p className="resume-cover-positioning">{hero.cover.positioning}</p>
          </div>

          <ResumeBadge content={hero.badge} profile={profile} />

          <div className="resume-cover-aside">
            <p>{hero.cover.summary}</p>
            <nav aria-label={hero.cover.sectionNavAriaLabel}>
              <a href="#job-desk">{hero.cover.experienceLinkLabel} <ArrowDown aria-hidden="true" /></a>
              <a href="#product-cases">{hero.cover.productsLinkLabel} <ArrowDown aria-hidden="true" /></a>
            </nav>
          </div>

          <span className="resume-cover-mark" aria-hidden="true">
            <SakuraHeadlineName text={hero.cover.watermark} />
          </span>
        </div>
      </section>

      <section className="resume-desk" id="job-desk" ref={deskRef} aria-labelledby="job-desk-title">
        <div className="resume-desk-inner" data-watermark={experience.watermark}>
          <ResumeJobDeck content={experience} />
          <a className="resume-desk-next" href="#product-cases">{experience.nextSectionLabel} <ArrowDown aria-hidden="true" /></a>
        </div>
      </section>

      <section className="resume-studio-rail" id="product-cases" ref={studioRef} aria-labelledby="product-cases-title">
        <div className="resume-studio" ref={studioContentRef}>
          <div className="resume-studio-inner">
            <div className="resume-case-copy" ref={caseCopyRef}>
              <p className="resume-eyebrow">
                {products.eyebrowPrefix} / {String(safeSelected + 1).padStart(2, "0")}
              </p>
              <h2 id="product-cases-title">{product.name}</h2>
              <p className="resume-case-title">{product.title}</p>
              <p className="resume-case-summary">{product.summary}</p>
              <a className="resume-product-site" href={product.siteUrl} target="_blank" rel="noopener noreferrer">
                {products.openSiteLabel} <ArrowUpRight aria-hidden="true" />
              </a>
              <details className="resume-case-details" key={product.id}>
                <summary>{products.readCaseLabel}</summary>
                {product.details.map((detail) => (
                  <div key={detail.title}>
                    <strong>{detail.title}</strong>
                    <p>{detail.text}</p>
                  </div>
                ))}
              </details>
            </div>

            <div className="resume-device-slot" ref={deviceSlotRef}>
              <div className="resume-device" ref={deviceRef}>
                <div className="resume-device-lid" ref={lidRef}>
                  <div className="resume-device-camera" aria-hidden="true" />
                  <div className="resume-device-screen" id="resume-mac-screen" ref={macScreenRef}>
                    <div
                      className="resume-screen-strip"
                      style={{ transform: `translateX(-${safeSelected * 100}%)` }}
                      aria-hidden="true"
                    >
                      {products.items.map((entry) => (
                        <div className="resume-screen-frame" style={productArtStyle(entry.artSrc)} key={entry.id}>
                          <span>{entry.name}</span>
                          <strong>{entry.display}</strong>
                          <small>{entry.caption}</small>
                        </div>
                      ))}
                    </div>
                    <div className="resume-live-screen" key={product.id}>
                      {product.previewSrc ? (
                        <div className="resume-live-preview">
                          <Image
                            src={product.previewSrc}
                            alt={formatContentTemplate(products.previewAltTemplate, {
                              name: product.name,
                            })}
                            fill
                            sizes="(max-width: 767px) 94vw, 740px"
                          />
                        </div>
                      ) : nearStudio && (
                        <iframe
                          title={formatContentTemplate(products.liveSiteTitleTemplate, {
                            name: product.name,
                          })}
                          src={product.siteUrl}
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                          referrerPolicy="strict-origin-when-cross-origin"
                          inert
                          tabIndex={-1}
                        />
                      )}
                    </div>
                    <div className="resume-portal-screen" ref={portalScreenRef} aria-hidden="true">
                      <div className="resume-portal-horizon" ref={portalHorizonRef}>
                        <svg
                          className="resume-portal-mountains"
                          viewBox="0 0 800 220"
                          preserveAspectRatio="xMidYMax slice"
                        >
                          <path
                            className="resume-portal-range-back"
                            d="M 0 220 L 0 148 L 88 104 L 146 68 L 198 96 L 272 44 L 328 78 L 412 32 L 474 72 L 548 38 L 618 82 L 692 52 L 758 96 L 800 132 L 800 220 Z"
                          />
                          <path
                            className="resume-portal-range-front"
                            d="M 0 220 L 0 166 L 74 126 L 138 86 L 182 54 L 226 84 L 284 112 L 346 62 L 388 38 L 432 68 L 492 104 L 558 58 L 604 34 L 652 72 L 718 114 L 800 158 L 800 220 Z"
                          />
                        </svg>
                        <div className="resume-portal-cue">
                          <span>{proposalIntro.eyebrow}</span>
                        </div>
                      </div>
                      <div className="resume-portal-veil" ref={portalVeilRef} />
                    </div>
                  </div>
                  <div className="resume-device-hinge" aria-hidden="true" />
                </div>
                <div className="resume-device-base" ref={deviceBaseRef} aria-hidden="true">
                  <div className="resume-device-keys">
                    {keyboardRows.map((row, rowIndex) => (
                      <div className="resume-device-key-row" data-row={rowIndex === 0 ? "fn" : undefined} key={row[0].id}>
                        {row.map((key) => (
                          <i
                            className="resume-device-key"
                            data-size={key.size}
                            data-homing={key.id === "f" || key.id === "j" ? "" : undefined}
                            key={key.id}
                          >
                            {key.sub ? <small>{key.sub}</small> : null}
                            {key.label ? <span>{key.label}</span> : null}
                          </i>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="resume-device-trackpad" />
                </div>
              </div>
            </div>

            <div className="resume-project-dock" ref={projectDockRef} role="group" aria-label={products.dockAriaLabel}>
              {products.items.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={safeSelected === index}
                  onClick={() => setSelected(index)}
                >
                  <span style={productArtStyle(entry.artSrc)} aria-hidden="true" />
                  {entry.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="resume-studio-dive-spacer" ref={diveSpacerRef} aria-hidden="true" />
      </section>

    </div>
  );
}
