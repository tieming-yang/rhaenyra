"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatContentTemplate,
  type ExperienceSectionContent,
  type HeroContent,
  type ProductsSectionContent,
  type ProposalSectionContent,
  type SiteProfileAssets,
} from "@/content";
import { MAC_KEYBOARD_ROWS } from "@/lib/mac-keyboard-layout";
import {
  deriveMacPortalDivePose,
  resolveStickyRailProgress,
  resolveStickyStageViewportCenter,
} from "@/lib/mac-portal-transition";
import { createSnowboardRoute } from "@/lib/snowboard-route";
import { MountainCardBackdrop } from "./mountain-card-backdrop";
import { ResumeBadge } from "./resume-badge";
import { ResumeJobDeck } from "./resume-job-deck";
import { SakuraHeadlineName } from "./sakura-headline-name";

interface ResumeShowcaseProps {
  readonly profile: SiteProfileAssets;
  readonly hero: HeroContent;
  readonly experience: ExperienceSectionContent;
  readonly products: ProductsSectionContent;
  readonly proposal: ProposalSectionContent;
}

function productArtStyle(artSrc: string) {
  return { backgroundImage: `url(${artSrc})` };
}

export function ResumeShowcase({
  profile,
  hero,
  experience,
  products,
  proposal,
}: ResumeShowcaseProps) {
  const portalRoute = useMemo(
    () => createSnowboardRoute(proposal.waypoints.length),
    [proposal.waypoints.length]
  );
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
  const portalViewportRef = useRef<HTMLDivElement>(null);
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
      const portalViewport = portalViewportRef.current;
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

      const clientWidth = document.documentElement.clientWidth || viewportWidth;
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
              startDwellRatio: 0.08,
            });

      const studioContentRect = studioContent.getBoundingClientRect();
      const slotRect = deviceSlot.getBoundingClientRect();
      const slotLeftInStudio = slotRect.left - studioContentRect.left;
      const slotTopInStudio = slotRect.top - studioContentRect.top;
      const screenOffsetInDeviceX =
        lid.offsetLeft + lid.clientLeft + macScreen.offsetLeft + screenWidth * 0.5;
      const screenOffsetInDeviceY =
        lid.offsetTop + lid.clientTop + macScreen.offsetTop + screenHeight * 0.5;
      const screenCenterX = slotLeftInStudio + device.offsetLeft + screenOffsetInDeviceX;
      const screenCenterY = slotTopInStudio + device.offsetTop + screenOffsetInDeviceY;

      const divePose = deriveMacPortalDivePose({
        viewport: { width: clientWidth, height: viewport },
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
        studioContent.style.removeProperty("opacity");
        studioContent.style.removeProperty("visibility");
        studioContent.style.removeProperty("pointer-events");
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
        if (portalViewport) {
          portalViewport.style.removeProperty("width");
          portalViewport.style.removeProperty("height");
          portalViewport.style.removeProperty("transform");
        }
        return;
      }

      studio.setAttribute("data-portal-diving", "");
      studio.style.setProperty("--scene-progress", "1");
      studioContent.style.opacity = String(divePose.studioOpacity);
      studioContent.style.visibility =
        divePose.studioOpacity <= 0.005 ? "hidden" : "visible";
      studioContent.style.pointerEvents =
        divePose.progress >= 0.84 ? "none" : "";

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
      if (portalViewport) {
        const proposalElement = document.getElementById("proposal");
        const proposalTop = proposalElement
          ? Math.max(0, proposalElement.getBoundingClientRect().top)
          : 0;
        const followScreenPx =
          (proposalTop * divePose.proposalFollowWeight) /
          Math.max(1, divePose.scale);

        portalViewport.style.width = `${clientWidth}px`;
        portalViewport.style.height = `${viewport}px`;
        portalViewport.style.transform = `translate(-50%, -50%) translate3d(0, ${followScreenPx}px, 0) scale(${1 / divePose.targetScale})`;
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
              {/*<a href="#job-desk">{hero.cover.experienceLinkLabel} <ArrowDown aria-hidden="true" /></a>*/}
              {/*<a href="#product-cases">{hero.cover.productsLinkLabel} <ArrowDown aria-hidden="true" /></a>*/}
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
              {product.details.length > 0 ? (
                <div className="resume-case-details">
                  <h3 className="resume-case-details-heading">{products.readCaseLabel}</h3>
                  {product.details.map((detail) => (
                    <div key={detail.title}>
                      <strong>{detail.title}</strong>
                      <p>{detail.text}</p>
                    </div>
                  ))}
                </div>
              ) : null}
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
                      <div className="resume-portal-viewport" ref={portalViewportRef}>
                        <div className="run-intro">
                          <p className="interview-kicker">{proposal.intro.eyebrow}</p>
                          <h2>{proposal.intro.title}</h2>
                          <p className="run-intro-subtitle">
                            {proposal.intro.subtitle}
                          </p>
                          <span className="run-start">
                            {proposal.intro.startCtaLabel}
                            <ArrowDown className="size-4" aria-hidden="true" />
                          </span>
                        </div>

                        <div className="run-trail">
                          <div className="run-lane">
                            <svg
                              className="run-path"
                              viewBox={`0 0 ${portalRoute.width} ${portalRoute.height}`}
                              preserveAspectRatio="none"
                            >
                              <path
                                className="run-guide"
                                d={portalRoute.path}
                                vectorEffect="non-scaling-stroke"
                              />
                            </svg>
                            {portalRoute.checkpoints.map((point, index) => (
                              <span
                                key={point.y}
                                className="run-marker"
                                data-active={index === 0 ? "" : undefined}
                                style={{
                                  left: `${(point.x / portalRoute.width) * 100}%`,
                                  top: `${(point.y / portalRoute.height) * 100}%`,
                                }}
                              />
                            ))}
                          </div>

                          <div className="run-stops">
                            {proposal.waypoints.map((waypoint, index) => (
                              <div
                                className="run-stop"
                                key={waypoint.id}
                                aria-current={index === 0 ? "step" : undefined}
                              >
                                <div className="run-copy">
                                  <div className="run-mountain-card">
                                    <MountainCardBackdrop index={index} />
                                    <div className="run-mountain-body">
                                      <p className="run-waypoint-kicker">
                                        <span>
                                          {String(index + 1).padStart(2, "0")}
                                        </span>
                                        {waypoint.label}
                                      </p>
                                      <h2>{waypoint.title}</h2>
                                      <p>{waypoint.description}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="resume-device-hinge" aria-hidden="true" />
                </div>
                <div className="resume-device-base" ref={deviceBaseRef} aria-hidden="true">
                  <div className="resume-device-keys">
                    {MAC_KEYBOARD_ROWS.map((row, rowIndex) => (
                      <div className="resume-device-key-row" data-row={rowIndex === 0 ? "fn" : undefined} key={row[0].id}>
                        {row.map((key) => (
                          <i
                            className="resume-device-key"
                            data-size={key.size}
                            data-homing={key.homing ? "" : undefined}
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
