import { describe, expect, it } from "vitest";
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
  type BlossomTone,
  type CharacterBounds,
  type SakuraSimulationState,
} from "./sakura-headline";

function createSyntheticMask(width = 40, height = 20) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 4; y < 16; y += 1) {
    for (let x = 4; x < 16; x += 1) {
      rgba[(y * width + x) * 4 + 3] = 240;
    }
    for (let x = 22; x < 34; x += 1) {
      rgba[(y * width + x) * 4 + 3] = 220;
    }
  }
  const charBoxes: readonly CharacterBounds[] = [
    { charIndex: 0, left: 3, top: 3, right: 17, bottom: 17 },
    { charIndex: 1, left: 21, top: 3, right: 35, bottom: 17 },
  ];
  return { rgba, width, height, charBoxes };
}

describe("deriveSakuraScaleConfig", () => {
  it("scales brush radius, particle density, and blossom sizes for giant 14rem hero watermarks", () => {
    const mobile = deriveSakuraScaleConfig(44);
    const desktopGiant = deriveSakuraScaleConfig(196);

    expect(desktopGiant.scale).toBeGreaterThan(mobile.scale);
    expect(desktopGiant.brushRadiusPx).toBeGreaterThan(110);
    expect(desktopGiant.maxParticles).toBeGreaterThan(mobile.maxParticles);
    expect(desktopGiant.blossomMaxSize).toBeGreaterThan(mobile.blossomMaxSize);
    expect(desktopGiant.updraftBiasPxPerSec).toBeGreaterThan(
      mobile.updraftBiasPxPerSec
    );
  });

  it("throws when fontSizePx is non-positive or non-finite", () => {
    expect(() => deriveSakuraScaleConfig(0)).toThrow(
      "fontSizePx must be a positive number"
    );
    expect(() => deriveSakuraScaleConfig(Number.NaN)).toThrow(
      "fontSizePx must be a finite number"
    );
  });
});

describe("sampleGlyphParticlesFromRgba", () => {
  it("samples opaque pixels into logical coordinates and assigns owning character indices", () => {
    const { rgba, width, height, charBoxes } = createSyntheticMask();
    const outcome = sampleGlyphParticlesFromRgba({
      rgba,
      width,
      height,
      dpr: 1,
      sampleStepPx: 2,
      charBoxes,
    });

    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;

    expect(outcome.charCount).toBe(2);
    expect(outcome.glyphs.length).toBeGreaterThan(20);
    expect(outcome.glyphs.some((g) => g.charIndex === 0)).toBe(true);
    expect(outcome.glyphs.some((g) => g.charIndex === 1)).toBe(true);
    for (const glyph of outcome.glyphs) {
      expect(glyph.x).toBe(glyph.homeX);
      expect(glyph.y).toBe(glyph.homeY);
      expect(glyph.heat).toBe(0);
    }
  });

  it("caps sampled particle count deterministically when maxParticles is smaller than candidates", () => {
    const { rgba, width, height, charBoxes } = createSyntheticMask();
    const outcome = sampleGlyphParticlesFromRgba({
      rgba,
      width,
      height,
      dpr: 1,
      sampleStepPx: 1,
      maxParticles: 18,
      charBoxes,
    });

    expect(outcome.status).toBe("ready");
    expect(outcome.glyphs.length).toBe(18);
  });

  it("returns explicit empty outcome when mask has no opaque pixels or no character boxes", () => {
    const emptyRgba = new Uint8ClampedArray(16 * 16 * 4);
    const noInk = sampleGlyphParticlesFromRgba({
      rgba: emptyRgba,
      width: 16,
      height: 16,
      dpr: 1,
      charBoxes: [{ charIndex: 0, left: 0, top: 0, right: 10, bottom: 10 }],
    });
    expect(noInk).toEqual({ status: "empty", glyphs: [], charCount: 1 });

    const noBoxes = sampleGlyphParticlesFromRgba({
      rgba: emptyRgba,
      width: 16,
      height: 16,
      dpr: 1,
      charBoxes: [],
    });
    expect(noBoxes).toEqual({ status: "empty", glyphs: [], charCount: 0 });
  });

  it("throws on malformed dimensions, buffer mismatch, invalid particle sizes, or inverted bounds", () => {
    const valid = new Uint8ClampedArray(10 * 10 * 4);
    expect(() =>
      sampleGlyphParticlesFromRgba({
        rgba: valid,
        width: 0,
        height: 10,
        dpr: 1,
        charBoxes: [],
      })
    ).toThrow("Mask width and height must be positive integers");

    expect(() =>
      sampleGlyphParticlesFromRgba({
        rgba: new Uint8ClampedArray(12),
        width: 10,
        height: 10,
        dpr: 1,
        charBoxes: [],
      })
    ).toThrow("RGBA buffer length must equal width * height * 4");

    expect(() =>
      sampleGlyphParticlesFromRgba({
        rgba: valid,
        width: 10,
        height: 10,
        dpr: 1,
        particleMinSize: 4,
        particleMaxSize: 2,
        charBoxes: [],
      })
    ).toThrow("Particle size bounds must be positive with min <= max");

    expect(() =>
      sampleGlyphParticlesFromRgba({
        rgba: valid,
        width: 10,
        height: 10,
        dpr: 2,
        charBoxes: [{ charIndex: 0, left: 8, top: 0, right: 4, bottom: 10 }],
      })
    ).toThrow(
      "CharacterBounds edges must satisfy left <= right and top <= bottom"
    );
  });
});

describe("sakura simulation lifecycle and physics", () => {
  function setupIdleState(): SakuraSimulationState {
    const { rgba, width, height, charBoxes } = createSyntheticMask();
    const scaleConfig = deriveSakuraScaleConfig(160);
    const sampled = sampleGlyphParticlesFromRgba({
      rgba,
      width,
      height,
      dpr: 1,
      sampleStepPx: 2,
      charBoxes,
    });
    return createSakuraSimulationState(
      sampled.glyphs,
      sampled.charCount,
      42,
      scaleConfig
    );
  }

  it("validates state invariants on creation", () => {
    const idle = setupIdleState();
    expect(idle.phase).toBe("idle");
    expect(() => createSakuraSimulationState(idle.glyphs, 0)).toThrow(
      "charCount must be positive when glyphs are present"
    );
    expect(() => createSakuraSimulationState([], -1)).toThrow(
      "charCount must be a non-negative integer"
    );
  });

  it("runs intro hint petals upward from trailing letters and converges back to idle", () => {
    const idle = setupIdleState();
    const intro = triggerSakuraIntroHint(idle, false);
    expect(intro.status).toBe("started");
    expect(intro.state.phase).toBe("intro");
    if (intro.state.phase === "idle") return;

    expect(intro.state.blossoms.length).toBe(4);
    expect(intro.state.blossoms.every((petal) => petal.vy < 0)).toBe(true);
    expect(intro.state.charEnergies).toEqual([0, 0]);

    let current: SakuraSimulationState = intro.state;
    for (let step = 0; step < 220 && current.phase !== "idle"; step += 1) {
      current = stepSakuraSimulation(current, 24, false);
    }
    expect(current.phase).toBe("idle");
  });

  it("dissolves local character glyphs under cursor wind, spawns capped blossoms, and reforms on leave", () => {
    const idle = setupIdleState();
    const firstMove = updateSakuraPointer(
      idle,
      { x: 10, y: 10, vx: 320, vy: -40 },
      false
    );
    expect(firstMove.status).toBe("started");
    expect(firstMove.state.phase).toBe("active");

    const secondMove = updateSakuraPointer(
      firstMove.state,
      { x: 11, y: 10, vx: 600, vy: -30 },
      false
    );
    expect(secondMove.status).toBe("updated");

    let activeState = secondMove.state;
    for (let i = 0; i < 30; i += 1) {
      activeState = stepSakuraSimulation(activeState, 16, false);
    }

    expect(activeState.phase).toBe("active");
    if (activeState.phase === "idle") return;

    expect(activeState.charEnergies[0]).toBeGreaterThan(0.5);
    expect(activeState.blossoms.length).toBeGreaterThan(0);
    expect(activeState.blossoms.length).toBeLessThanOrEqual(48);

    let settling = clearSakuraPointer(activeState);
    expect(settling.phase).toBe("settling");

    for (let i = 0; i < 240 && settling.phase !== "idle"; i += 1) {
      settling = stepSakuraSimulation(settling, 20, false);
    }

    expect(settling.phase).toBe("idle");
    expect(settling.charEnergies).toEqual([0, 0]);
    for (const glyph of settling.glyphs) {
      expect(glyph.x).toBe(glyph.homeX);
      expect(glyph.y).toBe(glyph.homeY);
      expect(glyph.vx).toBe(0);
      expect(glyph.vy).toBe(0);
      expect(glyph.heat).toBe(0);
    }
  });

  it("triggers touch tap bloom into settling and clamps large tab-switch frame deltas safely", () => {
    const idle = setupIdleState();
    const tapped = triggerSakuraTapBloom(idle, 28, 10, false);
    expect(tapped.status).toBe("started");
    expect(tapped.state.phase).toBe("settling");
    if (tapped.state.phase === "idle") return;

    expect(tapped.state.blossoms.length).toBe(6);
    expect(tapped.state.charEnergies[1]).toBeGreaterThan(0.5);

    const afterResume = stepSakuraSimulation(tapped.state, 5000, false);
    for (const glyph of afterResume.glyphs) {
      expect(Number.isFinite(glyph.x)).toBe(true);
      expect(Number.isFinite(glyph.y)).toBe(true);
      expect(Math.hypot(glyph.x - glyph.homeX, glyph.y - glyph.homeY)).toBeLessThan(
        140
      );
    }
  });

  it("ignores triggers under reducedMotion or empty glyphs and resets active states immediately", () => {
    const idle = setupIdleState();
    expect(triggerSakuraIntroHint(idle, true).status).toBe(
      "ignored_reduced_motion"
    );
    expect(
      updateSakuraPointer(idle, { x: 10, y: 10, vx: 50, vy: 0 }, true).status
    ).toBe("ignored_reduced_motion");
    expect(triggerSakuraTapBloom(idle, 10, 10, true).status).toBe(
      "ignored_reduced_motion"
    );

    const emptyIdle = createSakuraSimulationState([], 0);
    expect(triggerSakuraIntroHint(emptyIdle, false).status).toBe(
      "ignored_empty_glyphs"
    );
    expect(
      updateSakuraPointer(emptyIdle, { x: 0, y: 0, vx: 0, vy: 0 }, false).status
    ).toBe("ignored_empty_glyphs");
    expect(triggerSakuraTapBloom(emptyIdle, 0, 0, false).status).toBe(
      "ignored_empty_glyphs"
    );

    const active = stepSakuraSimulation(
      updateSakuraPointer(idle, { x: 10, y: 10, vx: 200, vy: 0 }, false).state,
      16,
      false
    );
    const snapped = stepSakuraSimulation(active, 16, true);
    expect(snapped.phase).toBe("idle");
    expect(snapped.charEnergies).toEqual([0, 0]);
  });

  it("throws on negative frame delta or non-finite pointer inputs", () => {
    const idle = setupIdleState();
    expect(() => stepSakuraSimulation(idle, -1, false)).toThrow(
      "dtMs must be non-negative"
    );
    expect(() =>
      updateSakuraPointer(idle, { x: Number.NaN, y: 0, vx: 0, vy: 0 }, false)
    ).toThrow("PointerField.x must be a finite number");
  });
});

describe("sakura color and palette policies", () => {
  it("preserves exact resting watermark blush (#efbdd0) at heat=0 and blooms into rich sakura crimson/highlights", () => {
    expect(resolveGlyphSakuraRgb(0, 0.4)).toEqual(DEFAULT_WATERMARK_BASE_RGB);

    const crimsonBloom = resolveGlyphSakuraRgb(1, 0.5);
    expect(crimsonBloom).toEqual({ r: 177, g: 47, b: 96 });

    const highlightBloom = resolveGlyphSakuraRgb(1, 0.9);
    expect(highlightBloom.r).toBeGreaterThan(DEFAULT_WATERMARK_BASE_RGB.r);
    expect(highlightBloom.g).toBeGreaterThan(DEFAULT_WATERMARK_BASE_RGB.g);

    const tones: readonly BlossomTone[] = [0, 1, 2, 3];
    for (const tone of tones) {
      expect(BLOSSOM_PALETTE[tone].fill).toMatch(/^#[0-9a-f]{6}$/);
      expect(BLOSSOM_PALETTE[tone].accent).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
