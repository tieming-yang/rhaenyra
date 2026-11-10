"use client";

import { useEffect, useRef } from "react";
import {
  BLOSSOM_PALETTE,
  clearSakuraPointer,
  createSakuraSimulationState,
  resolveGlyphSakuraRgb,
  sampleGlyphParticlesFromRgba,
  stepSakuraSimulation,
  triggerSakuraIntroHint,
  triggerSakuraTapBloom,
  updateSakuraPointer,
  type BlossomPetal,
  type CharacterBounds,
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
  readonly atlasCanvas: HTMLCanvasElement;
  readonly sprites: readonly CharacterAtlasSprite[];
  readonly glyphsByChar: readonly (readonly number[])[];
}

const BLEED_LEFT = 88;
const BLEED_RIGHT = 160;
const BLEED_TOP = 84;
const BLEED_BOTTOM = 136;
const INTERACTION_HALO_PX = 56;
const ATLAS_PAD_PX = 8;

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
  ctx.translate(BLEED_LEFT + petal.x, BLEED_TOP + petal.y);
  ctx.rotate(petal.rotation);
  ctx.scale(1, tumbleScale);

  // Authentic notched sakura petal silhouette (tapered calyx base + cleft tip)
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

  // Subtle botanical blush accent near the petal base
  ctx.globalAlpha = petal.opacity * 0.34;
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

  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const computed = window.getComputedStyle(rootEl);
  const fontSpec = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
  const inkColor = computed.color || "#311b25";
  const fontSizePx = Number.parseFloat(computed.fontSize) || 40;

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

  const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const sampled = sampleGlyphParticlesFromRgba({
    rgba: imageData.data,
    width: maskCanvas.width,
    height: maskCanvas.height,
    dpr,
    sampleStepPx: 1.9,
    maxParticles: 1600,
    charBoxes: sprites.map((sprite) => sprite.bounds),
  });

  const initialState = createSakuraSimulationState(
    sampled.glyphs,
    sampled.charCount
  );

  const buckets: number[][] = Array.from(
    { length: sampled.charCount },
    () => []
  );
  sampled.glyphs.forEach((glyph, particleIdx) => {
    buckets[glyph.charIndex]?.push(particleIdx);
  });

  return {
    layout: {
      rootWidth,
      rootHeight,
      dpr,
      atlasCanvas,
      sprites,
      glyphsByChar: buckets,
    },
    initialState,
  };
}

/**
 * Renders the hero headline name with localized cursor wind-brush sakura
 * dissolve, elastic glyph reformation, and drifting notched cherry blossoms.
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

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let layout: RasterizedHeadline | null = null;
    let simState: SakuraSimulationState = createSakuraSimulationState([], 0);
    let animFrame = 0;
    let measureFrame = 0;
    let introTimer = 0;
    let hasPlayedIntro = false;
    let lastFrameTime = 0;
    let lastPointer: { x: number; y: number; time: number; vx: number; vy: number } | null =
      null;
    let touchTapCandidate: { id: number; startX: number; startY: number } | null = null;

    const syncCanvasBackingStore = (nextLayout: RasterizedHeadline) => {
      const logicalW = nextLayout.rootWidth + BLEED_LEFT + BLEED_RIGHT;
      const logicalH = nextLayout.rootHeight + BLEED_TOP + BLEED_BOTTOM;
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

      const logicalW = layout.rootWidth + BLEED_LEFT + BLEED_RIGHT;
      const logicalH = layout.rootHeight + BLEED_TOP + BLEED_BOTTOM;

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

        for (const sprite of layout.sprites) {
          const charEnergy = simState.charEnergies[sprite.charIndex] ?? 0;

          // Keep untouched or gently settling letters razor-sharp via Retina atlas
          if (charEnergy < 0.34) {
            ctx.globalAlpha = 1 - charEnergy / 0.34;
            ctx.drawImage(
              layout.atlasCanvas,
              sprite.atlasX,
              sprite.atlasY,
              sprite.atlasWidth,
              sprite.atlasHeight,
              BLEED_LEFT + sprite.drawLeft,
              BLEED_TOP + sprite.drawTop,
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
            const px = BLEED_LEFT + glyph.x;
            const py = BLEED_TOP + glyph.y;
            const rgb = resolveGlyphSakuraRgb(glyph.heat, glyph.variant);

            ctx.globalAlpha = glyph.alpha * particleVisibility;
            ctx.fillStyle = `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;

            if (glyph.heat < 0.08) {
              ctx.beginPath();
              ctx.arc(px, py, glyph.size * 0.68, 0, Math.PI * 2);
              ctx.fill();
            } else {
              const speed = Math.hypot(glyph.vx, glyph.vy);
              const baseAngle =
                speed > 6 ? Math.atan2(glyph.vy, glyph.vx) : glyph.phase;
              const angle =
                baseAngle + Math.sin(elapsedSec * 6.4 + glyph.phase) * 0.32;
              const rx = glyph.size * (0.95 + glyph.heat * 0.72);
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

    const rebuildLayout = () => {
      measureFrame = 0;
      // Ensure DOM text is temporarily untouched if needed; root color stays var(--foreground)
      const built = rasterizeHeadlineLayout(rootEl, textEl, text);
      if (!built) {
        return;
      }

      const dimensionsUnchanged =
        layout !== null &&
        layout.rootWidth === built.layout.rootWidth &&
        layout.rootHeight === built.layout.rootHeight &&
        layout.dpr === built.layout.dpr &&
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
          if (hasPlayedIntro || reducedMotionQuery.matches || simState.phase !== "idle") {
            return;
          }
          hasPlayedIntro = true;
          const outcome = triggerSakuraIntroHint(simState, reducedMotionQuery.matches);
          simState = outcome.state;
          ensureLoopRunning();
        }, 320);
      }
    };

    const scheduleRebuild = () => {
      if (measureFrame === 0) {
        measureFrame = window.requestAnimationFrame(rebuildLayout);
      }
    };

    const applyFinePointerSample = (clientX: number, clientY: number, timeStamp: number) => {
      const rect = rootEl.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      let vx = 0;
      let vy = -18;
      if (lastPointer !== null) {
        const dtSec = Math.max(0.004, (timeStamp - lastPointer.time) / 1000);
        const rawVx = Math.max(-1600, Math.min(1600, (localX - lastPointer.x) / dtSec));
        const rawVy = Math.max(-1600, Math.min(1600, (localY - lastPointer.y) / dtSec));
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

    const handleRootPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reducedMotionQuery.matches) {
        return;
      }
      if (!layout) {
        rebuildLayout();
      }
      applyFinePointerSample(event.clientX, event.clientY, event.timeStamp);
    };

    const handleRootPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reducedMotionQuery.matches) {
        return;
      }
      if (!layout) {
        rebuildLayout();
      }
      applyFinePointerSample(event.clientX, event.clientY, event.timeStamp);
    };

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (simState.phase !== "active" || event.pointerType === "touch") {
        return;
      }
      const rect = rootEl.getBoundingClientRect();
      const withinHalo =
        event.clientX >= rect.left - INTERACTION_HALO_PX &&
        event.clientX <= rect.right + INTERACTION_HALO_PX &&
        event.clientY >= rect.top - INTERACTION_HALO_PX &&
        event.clientY <= rect.bottom + INTERACTION_HALO_PX;

      if (withinHalo) {
        applyFinePointerSample(event.clientX, event.clientY, event.timeStamp);
      } else {
        lastPointer = null;
        simState = clearSakuraPointer(simState);
        ensureLoopRunning();
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

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || reducedMotionQuery.matches) {
        return;
      }
      touchTapCandidate = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    };

    const handlePointerUp = (event: PointerEvent) => {
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
      if (moved >= 12 || reducedMotionQuery.matches) {
        return;
      }
      if (!layout) {
        rebuildLayout();
      }
      const rect = rootEl.getBoundingClientRect();
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

    rootEl.addEventListener("pointerenter", handleRootPointerEnter);
    rootEl.addEventListener("pointermove", handleRootPointerMove);
    rootEl.addEventListener("pointerdown", handlePointerDown);
    rootEl.addEventListener("pointerup", handlePointerUp);
    rootEl.addEventListener("pointercancel", clearTouchCandidate);
    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    window.addEventListener("blur", releasePointerField);
    document.documentElement.addEventListener("pointerleave", releasePointerField);
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
      rootEl.removeEventListener("pointerenter", handleRootPointerEnter);
      rootEl.removeEventListener("pointermove", handleRootPointerMove);
      rootEl.removeEventListener("pointerdown", handlePointerDown);
      rootEl.removeEventListener("pointerup", handlePointerUp);
      rootEl.removeEventListener("pointercancel", clearTouchCandidate);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("blur", releasePointerField);
      document.documentElement.removeEventListener("pointerleave", releasePointerField);
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
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
