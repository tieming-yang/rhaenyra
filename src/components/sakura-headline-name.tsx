"use client";

import { useEffect, useRef } from "react";
import {
  BLOSSOM_PALETTE,
  clearSakuraPointer,
  createSakuraSimulationState,
  DEFAULT_WATERMARK_BASE_RGB,
  deriveSakuraScaleConfig,
  resolveGlyphSakuraRgb,
  sampleGlyphParticlesFromRgba,
  stepSakuraSimulation,
  triggerSakuraIntroHint,
  triggerSakuraTapBloom,
  updateSakuraPointer,
  type BlossomPetal,
  type CharacterBounds,
  type RgbTuple,
  type SakuraScaleConfig,
  type SakuraSimulationState,
} from "@/lib/sakura-headline";

interface SakuraHeadlineNameProps {
  readonly text: string;
}

interface CharacterAtlasSprite {
  readonly charIndex: number;
  readonly bounds: CharacterBounds;
  readonly atlasX: number;
  readonly atlasY: number;
  readonly atlasWidth: number;
  readonly atlasHeight: number;
  readonly drawLeft: number;
  readonly drawTop: number;
  readonly drawWidth: number;
  readonly drawHeight: number;
}

interface RasterizedHeadline {
  readonly rootWidth: number;
  readonly rootHeight: number;
  readonly dpr: number;
  readonly scaleConfig: SakuraScaleConfig;
  readonly atlasCanvas: HTMLCanvasElement;
  readonly sprites: readonly CharacterAtlasSprite[];
  readonly glyphsByChar: readonly (readonly number[])[];
  readonly baseColorCss: string;
  readonly roseColorRamp: readonly string[];
  readonly highlightColorRamp: readonly string[];
}

export const SAKURA_CANVAS_BLEED = {
  left: 120,
  right: 140,
  top: 280,
  bottom: 96,
} as const;

const ATLAS_PAD_PX = 12;
const COLOR_RAMP_STEPS = 32;
const MAX_CANVAS_DEVICE_DIM = 3840;

function parseComputedRgb(cssColor: string): RgbTuple {
  const match = cssColor.match(
    /rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/i
  );
  if (!match) {
    return DEFAULT_WATERMARK_BASE_RGB;
  }
  const r = Math.max(0, Math.min(255, Math.round(Number(match[1]))));
  const g = Math.max(0, Math.min(255, Math.round(Number(match[2]))));
  const b = Math.max(0, Math.min(255, Math.round(Number(match[3]))));

  // Guard against unstyled dark body `--foreground` (#311b25) before page CSS settles
  if (r < 140 && g < 100) {
    return DEFAULT_WATERMARK_BASE_RGB;
  }
  return { r, g, b };
}

function buildSakuraCssRamps(baseRgb: RgbTuple): {
  readonly baseColorCss: string;
  readonly roseColorRamp: readonly string[];
  readonly highlightColorRamp: readonly string[];
} {
  const roseColorRamp: string[] = [];
  const highlightColorRamp: string[] = [];

  for (let i = 0; i < COLOR_RAMP_STEPS; i += 1) {
    const heat = i / (COLOR_RAMP_STEPS - 1);
    const rose = resolveGlyphSakuraRgb(heat, 0.45, baseRgb);
    const highlight = resolveGlyphSakuraRgb(heat, 0.9, baseRgb);
    roseColorRamp.push(`rgb(${rose.r} ${rose.g} ${rose.b})`);
    highlightColorRamp.push(`rgb(${highlight.r} ${highlight.g} ${highlight.b})`);
  }

  return {
    baseColorCss: `rgb(${baseRgb.r} ${baseRgb.g} ${baseRgb.b})`,
    roseColorRamp,
    highlightColorRamp,
  };
}

function isForegroundInteractiveTarget(target: EventTarget | null): boolean {
  if (document.querySelector(".resume-badge-swing[data-dragging]") !== null) {
    return true;
  }
  if (!(target instanceof Element)) {
    return false;
  }
  return (
    target.closest(".resume-badge-swing, a, button, summary, details") !== null
  );
}

function drawNotchedSakuraPetal(
  ctx: CanvasRenderingContext2D,
  petal: BlossomPetal
): void {
  if (petal.opacity <= 0.01) {
    return;
  }

  const r = petal.size * 0.5;
  const tumbleScale = Math.max(0.24, Math.abs(Math.cos(petal.tumble)));
  const palette = BLOSSOM_PALETTE[petal.tone];

  ctx.save();
  ctx.translate(
    SAKURA_CANVAS_BLEED.left + petal.x,
    SAKURA_CANVAS_BLEED.top + petal.y
  );
  ctx.rotate(petal.rotation);
  ctx.scale(1, tumbleScale);

  // Authentic notched sakura petal silhouette (tapered calyx base + V-cleft tip)
  ctx.globalAlpha = petal.opacity;
  ctx.fillStyle = palette.fill;
  ctx.beginPath();
  ctx.moveTo(0, r * 1.05);
  ctx.bezierCurveTo(
    -r * 0.78,
    r * 0.52,
    -r * 0.96,
    -r * 0.48,
    -r * 0.34,
    -r * 1.02
  );
  ctx.quadraticCurveTo(-r * 0.11, -r * 0.98, 0, -r * 0.68);
  ctx.quadraticCurveTo(r * 0.11, -r * 0.98, r * 0.34, -r * 1.02);
  ctx.bezierCurveTo(
    r * 0.96,
    -r * 0.48,
    r * 0.78,
    r * 0.52,
    0,
    r * 1.05
  );
  ctx.closePath();
  ctx.fill();

  // Botanical blush accent near the petal calyx base
  ctx.globalAlpha = petal.opacity * 0.36;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.95);
  ctx.quadraticCurveTo(-r * 0.28, r * 0.35, 0, -r * 0.12);
  ctx.quadraticCurveTo(r * 0.28, r * 0.35, 0, r * 0.95);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function rasterizeHeadlineLayout(
  rootEl: HTMLElement,
  textEl: HTMLElement,
  text: string
): {
  readonly layout: RasterizedHeadline;
  readonly initialState: SakuraSimulationState;
} | null {
  const textNode = textEl.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const rootRect = rootEl.getBoundingClientRect();
  const rootWidth = Math.ceil(rootRect.width);
  const rootHeight = Math.ceil(rootRect.height);
  if (rootWidth <= 0 || rootHeight <= 0) {
    return null;
  }

  const logicalCanvasMax = Math.max(
    rootWidth + SAKURA_CANVAS_BLEED.left + SAKURA_CANVAS_BLEED.right,
    rootHeight + SAKURA_CANVAS_BLEED.top + SAKURA_CANVAS_BLEED.bottom
  );
  const rawDpr = Math.min(window.devicePixelRatio || 1, 2);
  const dpr = Math.max(
    1,
    Math.min(rawDpr, MAX_CANVAS_DEVICE_DIM / Math.max(1, logicalCanvasMax))
  );

  const computed = window.getComputedStyle(rootEl);
  const fontSpec = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
  const baseRgb = parseComputedRgb(computed.color || "");
  const inkColor = `rgb(${baseRgb.r} ${baseRgb.g} ${baseRgb.b})`;
  const fontSizePx = Number.parseFloat(computed.fontSize) || 96;
  const scaleConfig = deriveSakuraScaleConfig(fontSizePx);

  const range = document.createRange();
  const measuredChars: {
    readonly ch: string;
    readonly charIndex: number;
    readonly bounds: CharacterBounds;
  }[] = [];

  let charIndex = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      continue;
    }
    range.setStart(textNode, i);
    range.setEnd(textNode, i + 1);
    const rect = range.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }
    const left = rect.left - rootRect.left;
    const top = rect.top - rootRect.top;
    measuredChars.push({
      ch,
      charIndex,
      bounds: {
        charIndex,
        left,
        top,
        right: left + rect.width,
        bottom: top + rect.height,
      },
    });
    charIndex += 1;
  }

  if (measuredChars.length === 0) {
    return null;
  }

  const atlasCanvas = document.createElement("canvas");
  const slotWidths = measuredChars.map(({ bounds }) =>
    Math.ceil((bounds.right - bounds.left + ATLAS_PAD_PX * 2) * dpr)
  );
  const slotHeights = measuredChars.map(({ bounds }) =>
    Math.ceil((bounds.bottom - bounds.top + ATLAS_PAD_PX * 2) * dpr)
  );
  const totalAtlasWidth = slotWidths.reduce((sum, w) => sum + w, 0);
  const maxAtlasHeight = Math.max(...slotHeights, 1);

  atlasCanvas.width = Math.max(1, totalAtlasWidth);
  atlasCanvas.height = maxAtlasHeight;
  const atlasCtx = atlasCanvas.getContext("2d");
  if (!atlasCtx) {
    return null;
  }

  atlasCtx.font = fontSpec;
  atlasCtx.textBaseline = "alphabetic";
  atlasCtx.fillStyle = inkColor;

  const sampleMetrics = atlasCtx.measureText("Hg");
  const fontAscent =
    sampleMetrics.fontBoundingBoxAscent ?? fontSizePx * 0.8;
  const fontDescent =
    sampleMetrics.fontBoundingBoxDescent ?? fontSizePx * 0.2;
  const glyphBoxHeight = fontAscent + fontDescent;

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = Math.max(1, Math.ceil(rootWidth * dpr));
  maskCanvas.height = Math.max(1, Math.ceil(rootHeight * dpr));
  const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
  if (!maskCtx) {
    return null;
  }

  const sprites: CharacterAtlasSprite[] = [];
  let cursorAtlasX = 0;

  for (let idx = 0; idx < measuredChars.length; idx += 1) {
    const { ch, bounds } = measuredChars[idx];
    const slotW = slotWidths[idx];
    const slotH = slotHeights[idx];
    const rectHeight = bounds.bottom - bounds.top;
    const baselineOffset = (rectHeight - glyphBoxHeight) * 0.5 + fontAscent;

    atlasCtx.save();
    atlasCtx.beginPath();
    atlasCtx.rect(cursorAtlasX, 0, slotW, slotH);
    atlasCtx.clip();
    atlasCtx.scale(dpr, dpr);
    atlasCtx.font = fontSpec;
    atlasCtx.textBaseline = "alphabetic";
    atlasCtx.fillStyle = inkColor;
    atlasCtx.fillText(
      ch,
      cursorAtlasX / dpr + ATLAS_PAD_PX,
      ATLAS_PAD_PX + baselineOffset
    );
    atlasCtx.restore();

    const drawLeft = bounds.left - ATLAS_PAD_PX;
    const drawTop = bounds.top - ATLAS_PAD_PX;
    const drawWidth = slotW / dpr;
    const drawHeight = slotH / dpr;

    maskCtx.drawImage(
      atlasCanvas,
      cursorAtlasX,
      0,
      slotW,
      slotH,
      drawLeft * dpr,
      drawTop * dpr,
      slotW,
      slotH
    );

    sprites.push({
      charIndex: bounds.charIndex,
      bounds,
      atlasX: cursorAtlasX,
      atlasY: 0,
      atlasWidth: slotW,
      atlasHeight: slotH,
      drawLeft,
      drawTop,
      drawWidth,
      drawHeight,
    });

    cursorAtlasX += slotW;
  }

  const imageData = maskCtx.getImageData(
    0,
    0,
    maskCanvas.width,
    maskCanvas.height
  );
  const sampled = sampleGlyphParticlesFromRgba({
    rgba: imageData.data,
    width: maskCanvas.width,
    height: maskCanvas.height,
    dpr,
    sampleStepPx: scaleConfig.sampleStepPx,
    maxParticles: scaleConfig.maxParticles,
    particleMinSize: scaleConfig.particleMinSize,
    particleMaxSize: scaleConfig.particleMaxSize,
    charBoxes: sprites.map((sprite) => sprite.bounds),
  });

  const initialState = createSakuraSimulationState(
    sampled.glyphs,
    sampled.charCount,
    0x20261111,
    scaleConfig
  );

  const buckets: number[][] = Array.from(
    { length: sampled.charCount },
    () => []
  );
  sampled.glyphs.forEach((glyph, particleIdx) => {
    buckets[glyph.charIndex]?.push(particleIdx);
  });

  const ramps = buildSakuraCssRamps(baseRgb);

  return {
    layout: {
      rootWidth,
      rootHeight,
      dpr,
      scaleConfig,
      atlasCanvas,
      sprites,
      glyphsByChar: buckets,
      ...ramps,
    },
    initialState,
  };
}

/**
 * Renders the giant hero display name ("Rhaenyra Liang") with localized wind-brush
 * sakura dissolve, elastic glyph reformation, and buoyant notched cherry blossoms
 * while keeping foreground badge drag and links unobstructed.
 */
export function SakuraHeadlineName({ text }: SakuraHeadlineNameProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    const textEl = textRef.current;
    const canvasEl = canvasRef.current;
    if (!rootEl || !textEl || !canvasEl) {
      return;
    }

    const ctx = canvasEl.getContext("2d");
    if (!ctx) {
      return;
    }

    const hostCoverEl =
      rootEl.closest<HTMLElement>(".resume-cover") ??
      rootEl.parentElement ??
      rootEl;
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    let layout: RasterizedHeadline | null = null;
    let simState: SakuraSimulationState = createSakuraSimulationState([], 0);
    let animFrame = 0;
    let measureFrame = 0;
    let introTimer = 0;
    let hasPlayedIntro = false;
    let lastFrameTime = 0;
    let lastPointer: {
      x: number;
      y: number;
      time: number;
      vx: number;
      vy: number;
    } | null = null;
    let touchTapCandidate: {
      id: number;
      startX: number;
      startY: number;
    } | null = null;

    const syncCanvasBackingStore = (nextLayout: RasterizedHeadline) => {
      const logicalW =
        nextLayout.rootWidth +
        SAKURA_CANVAS_BLEED.left +
        SAKURA_CANVAS_BLEED.right;
      const logicalH =
        nextLayout.rootHeight +
        SAKURA_CANVAS_BLEED.top +
        SAKURA_CANVAS_BLEED.bottom;
      canvasEl.style.width = `${logicalW}px`;
      canvasEl.style.height = `${logicalH}px`;
      canvasEl.width = Math.max(1, Math.round(logicalW * nextLayout.dpr));
      canvasEl.height = Math.max(1, Math.round(logicalH * nextLayout.dpr));
    };

    const paintFrame = () => {
      if (!layout) {
        delete rootEl.dataset.sakuraCanvas;
        return;
      }

      const logicalW =
        layout.rootWidth +
        SAKURA_CANVAS_BLEED.left +
        SAKURA_CANVAS_BLEED.right;
      const logicalH =
        layout.rootHeight +
        SAKURA_CANVAS_BLEED.top +
        SAKURA_CANVAS_BLEED.bottom;

      ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
      ctx.clearRect(0, 0, logicalW, logicalH);

      if (simState.phase === "idle") {
        delete rootEl.dataset.sakuraCanvas;
        return;
      }

      const hasDisplacedCharacters = simState.charEnergies.some(
        (energy) => energy > 0
      );

      if (hasDisplacedCharacters) {
        const elapsedSec = simState.elapsedMs / 1000;
        const maxRampIdx = COLOR_RAMP_STEPS - 1;

        for (const sprite of layout.sprites) {
          const charEnergy = simState.charEnergies[sprite.charIndex] ?? 0;

          // Keep untouched or nearly-settled giant letters razor-sharp via Retina atlas
          if (charEnergy < 0.34) {
            ctx.globalAlpha = 1 - charEnergy / 0.34;
            ctx.drawImage(
              layout.atlasCanvas,
              sprite.atlasX,
              sprite.atlasY,
              sprite.atlasWidth,
              sprite.atlasHeight,
              SAKURA_CANVAS_BLEED.left + sprite.drawLeft,
              SAKURA_CANVAS_BLEED.top + sprite.drawTop,
              sprite.drawWidth,
              sprite.drawHeight
            );
          }

          if (charEnergy <= 0) {
            continue;
          }

          const particleVisibility = Math.min(1, charEnergy / 0.22);
          const indices = layout.glyphsByChar[sprite.charIndex] ?? [];

          for (const particleIndex of indices) {
            const glyph = simState.glyphs[particleIndex];
            const px = SAKURA_CANVAS_BLEED.left + glyph.x;
            const py = SAKURA_CANVAS_BLEED.top + glyph.y;

            ctx.globalAlpha = glyph.alpha * particleVisibility;

            if (glyph.heat < 0.06) {
              ctx.fillStyle = layout.baseColorCss;
              ctx.beginPath();
              ctx.arc(px, py, glyph.size * 0.72, 0, Math.PI * 2);
              ctx.fill();
            } else {
              const rampIdx = Math.min(
                maxRampIdx,
                Math.round(glyph.heat * maxRampIdx)
              );
              ctx.fillStyle =
                glyph.variant >= 0.8
                  ? layout.highlightColorRamp[rampIdx]
                  : layout.roseColorRamp[rampIdx];

              const speed = Math.hypot(glyph.vx, glyph.vy);
              const baseAngle =
                speed > 6 ? Math.atan2(glyph.vy, glyph.vx) : glyph.phase;
              const angle =
                baseAngle + Math.sin(elapsedSec * 6.4 + glyph.phase) * 0.32;
              const rx = glyph.size * (0.96 + glyph.heat * 0.74);
              const ry = glyph.size * (0.82 - glyph.heat * 0.24);

              ctx.beginPath();
              ctx.ellipse(px, py, rx, ry, angle, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        ctx.globalAlpha = 1;
        rootEl.dataset.sakuraCanvas = "";
      } else {
        delete rootEl.dataset.sakuraCanvas;
      }

      for (const petal of simState.blossoms) {
        drawNotchedSakuraPetal(ctx, petal);
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      animFrame = 0;
      const dtMs = lastFrameTime > 0 ? Math.max(0, now - lastFrameTime) : 16.67;
      lastFrameTime = now;

      simState = stepSakuraSimulation(
        simState,
        dtMs,
        reducedMotionQuery.matches
      );
      paintFrame();

      if (simState.phase !== "idle") {
        animFrame = window.requestAnimationFrame(tick);
      } else {
        lastFrameTime = 0;
      }
    };

    const ensureLoopRunning = () => {
      if (animFrame === 0 && simState.phase !== "idle") {
        lastFrameTime = performance.now();
        animFrame = window.requestAnimationFrame(tick);
      }
    };

    const releasePointerField = () => {
      if (simState.phase !== "active") {
        return;
      }
      lastPointer = null;
      simState = clearSakuraPointer(simState);
      ensureLoopRunning();
    };

    const rebuildLayout = () => {
      measureFrame = 0;
      const built = rasterizeHeadlineLayout(rootEl, textEl, text);
      if (!built) {
        return;
      }

      const dimensionsUnchanged =
        layout !== null &&
        Math.abs(layout.rootWidth - built.layout.rootWidth) <= 1 &&
        Math.abs(layout.rootHeight - built.layout.rootHeight) <= 1 &&
        layout.dpr === built.layout.dpr &&
        layout.baseColorCss === built.layout.baseColorCss &&
        simState.glyphs.length > 0;

      if (dimensionsUnchanged && simState.phase !== "idle") {
        return;
      }

      layout = built.layout;
      simState = built.initialState;
      lastPointer = null;
      syncCanvasBackingStore(built.layout);
      paintFrame();

      if (!hasPlayedIntro && !reducedMotionQuery.matches) {
        window.clearTimeout(introTimer);
        introTimer = window.setTimeout(() => {
          if (
            hasPlayedIntro ||
            reducedMotionQuery.matches ||
            simState.phase !== "idle"
          ) {
            return;
          }
          const liveRgb = parseComputedRgb(
            window.getComputedStyle(rootEl).color || ""
          );
          if (
            !layout ||
            layout.baseColorCss !== `rgb(${liveRgb.r} ${liveRgb.g} ${liveRgb.b})`
          ) {
            rebuildLayout();
          }
          hasPlayedIntro = true;
          const outcome = triggerSakuraIntroHint(
            simState,
            reducedMotionQuery.matches
          );
          simState = outcome.state;
          ensureLoopRunning();
        }, 360);
      }
    };

    const ensureFreshIdleLayout = () => {
      if (!layout) {
        rebuildLayout();
        return;
      }
      if (simState.phase !== "idle") {
        return;
      }
      const liveRgb = parseComputedRgb(
        window.getComputedStyle(rootEl).color || ""
      );
      if (layout.baseColorCss !== `rgb(${liveRgb.r} ${liveRgb.g} ${liveRgb.b})`) {
        rebuildLayout();
      }
    };

    const scheduleRebuild = () => {
      if (measureFrame === 0) {
        measureFrame = window.requestAnimationFrame(rebuildLayout);
      }
    };

    const applyFinePointerSample = (
      localX: number,
      localY: number,
      timeStamp: number
    ) => {
      let vx = 0;
      let vy = -24;
      if (lastPointer !== null) {
        const dtSec = Math.max(0.004, (timeStamp - lastPointer.time) / 1000);
        const rawVx = Math.max(
          -1800,
          Math.min(1800, (localX - lastPointer.x) / dtSec)
        );
        const rawVy = Math.max(
          -1800,
          Math.min(1800, (localY - lastPointer.y) / dtSec)
        );
        vx = lastPointer.vx * 0.42 + rawVx * 0.58;
        vy = lastPointer.vy * 0.42 + rawVy * 0.58;
      }

      lastPointer = { x: localX, y: localY, time: timeStamp, vx, vy };
      hasPlayedIntro = true;
      const outcome = updateSakuraPointer(
        simState,
        { x: localX, y: localY, vx, vy },
        reducedMotionQuery.matches
      );
      simState = outcome.state;
      ensureLoopRunning();
    };

    const handleCoverPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reducedMotionQuery.matches) {
        return;
      }
      if (event.buttons !== 0 || isForegroundInteractiveTarget(event.target)) {
        releasePointerField();
        return;
      }
      ensureFreshIdleLayout();
      const rect = rootEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const activeHalo = Math.max(
        76,
        (layout?.scaleConfig.brushRadiusPx ?? 80) * 0.85
      );
      const padX = simState.phase === "active" ? activeHalo : 18;
      const padTop = simState.phase === "active" ? activeHalo * 1.15 : 16;
      const padBottom = simState.phase === "active" ? activeHalo * 0.8 : 16;

      const isNearWatermark =
        event.clientX >= rect.left - padX &&
        event.clientX <= rect.right + padX &&
        event.clientY >= rect.top - padTop &&
        event.clientY <= rect.bottom + padBottom;

      if (isNearWatermark) {
        applyFinePointerSample(
          event.clientX - rect.left,
          event.clientY - rect.top,
          event.timeStamp
        );
      } else {
        releasePointerField();
      }
    };

    const handleCoverPointerDown = (event: PointerEvent) => {
      if (
        event.pointerType !== "touch" ||
        reducedMotionQuery.matches ||
        isForegroundInteractiveTarget(event.target)
      ) {
        return;
      }
      touchTapCandidate = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    };

    const handleCoverPointerUp = (event: PointerEvent) => {
      if (
        event.pointerType !== "touch" ||
        !touchTapCandidate ||
        touchTapCandidate.id !== event.pointerId
      ) {
        return;
      }
      const moved = Math.hypot(
        event.clientX - touchTapCandidate.startX,
        event.clientY - touchTapCandidate.startY
      );
      touchTapCandidate = null;
      if (
        moved >= 12 ||
        reducedMotionQuery.matches ||
        isForegroundInteractiveTarget(event.target)
      ) {
        return;
      }
      ensureFreshIdleLayout();
      const rect = rootEl.getBoundingClientRect();
      const tapPad = 24;
      const hitWatermark =
        event.clientX >= rect.left - tapPad &&
        event.clientX <= rect.right + tapPad &&
        event.clientY >= rect.top - tapPad &&
        event.clientY <= rect.bottom + tapPad;

      if (!hitWatermark) {
        return;
      }

      hasPlayedIntro = true;
      const outcome = triggerSakuraTapBloom(
        simState,
        event.clientX - rect.left,
        event.clientY - rect.top,
        reducedMotionQuery.matches
      );
      simState = outcome.state;
      ensureLoopRunning();
    };

    const clearTouchCandidate = () => {
      touchTapCandidate = null;
    };

    const handleReducedMotionChange = () => {
      if (!reducedMotionQuery.matches) {
        return;
      }
      window.clearTimeout(introTimer);
      lastPointer = null;
      simState = stepSakuraSimulation(simState, 0, true);
      window.cancelAnimationFrame(animFrame);
      animFrame = 0;
      lastFrameTime = 0;
      paintFrame();
    };

    const resizeObserver = new ResizeObserver(scheduleRebuild);
    resizeObserver.observe(rootEl);

    hostCoverEl.addEventListener("pointermove", handleCoverPointerMove, {
      passive: true,
    });
    hostCoverEl.addEventListener("pointerleave", releasePointerField);
    hostCoverEl.addEventListener("pointerdown", handleCoverPointerDown, {
      passive: true,
    });
    hostCoverEl.addEventListener("pointerup", handleCoverPointerUp, {
      passive: true,
    });
    hostCoverEl.addEventListener("pointercancel", clearTouchCandidate);
    window.addEventListener("blur", releasePointerField);
    document.documentElement.addEventListener(
      "pointerleave",
      releasePointerField
    );
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    let cancelled = false;
    scheduleRebuild();
    document.fonts?.ready.then(() => {
      if (!cancelled) {
        scheduleRebuild();
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(introTimer);
      window.cancelAnimationFrame(animFrame);
      window.cancelAnimationFrame(measureFrame);
      resizeObserver.disconnect();
      hostCoverEl.removeEventListener("pointermove", handleCoverPointerMove);
      hostCoverEl.removeEventListener("pointerleave", releasePointerField);
      hostCoverEl.removeEventListener("pointerdown", handleCoverPointerDown);
      hostCoverEl.removeEventListener("pointerup", handleCoverPointerUp);
      hostCoverEl.removeEventListener("pointercancel", clearTouchCandidate);
      window.removeEventListener("blur", releasePointerField);
      document.documentElement.removeEventListener(
        "pointerleave",
        releasePointerField
      );
      reducedMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange
      );
      delete rootEl.dataset.sakuraCanvas;
    };
  }, [text]);

  return (
    <span className="sakura-headline" ref={rootRef}>
      <span className="sakura-headline-text" ref={textRef}>
        {text}
      </span>
      <canvas
        className="sakura-headline-canvas"
        ref={canvasRef}
        aria-hidden="true"
      />
    </span>
  );
}
