export interface CharacterBounds {
  readonly charIndex: number;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface GlyphParticle {
  readonly homeX: number;
  readonly homeY: number;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly heat: number;
  readonly alpha: number;
  readonly size: number;
  readonly charIndex: number;
  readonly phase: number;
  readonly swirlSign: -1 | 1;
  readonly variant: number;
}

export type BlossomTone = 0 | 1 | 2 | 3;

export interface BlossomPetal {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly size: number;
  readonly rotation: number;
  readonly spin: number;
  readonly tumble: number;
  readonly tumbleSpeed: number;
  readonly swayPhase: number;
  readonly swayFreq: number;
  readonly ageMs: number;
  readonly maxLifeMs: number;
  readonly opacity: number;
  readonly tone: BlossomTone;
}

export interface PointerField {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

export type SakuraSimulationState =
  | {
      readonly phase: "idle";
      readonly glyphs: readonly GlyphParticle[];
      readonly charCount: number;
      readonly charEnergies: readonly number[];
      readonly rngSeed: number;
    }
  | {
      readonly phase: "intro" | "active" | "settling";
      readonly glyphs: readonly GlyphParticle[];
      readonly blossoms: readonly BlossomPetal[];
      readonly charCount: number;
      readonly charEnergies: readonly number[];
      readonly pointer: PointerField | null;
      readonly spawnCarry: number;
      readonly elapsedMs: number;
      readonly rngSeed: number;
    };

export type GlyphSamplingOutcome =
  | {
      readonly status: "ready";
      readonly glyphs: readonly GlyphParticle[];
      readonly charCount: number;
    }
  | {
      readonly status: "empty";
      readonly glyphs: readonly [];
      readonly charCount: number;
    };

export type SakuraTriggerOutcome =
  | {
      readonly status: "started" | "updated";
      readonly state: SakuraSimulationState;
    }
  | {
      readonly status: "ignored_reduced_motion" | "ignored_empty_glyphs";
      readonly state: SakuraSimulationState;
    };

export interface RgbaMaskInput {
  readonly rgba: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly sampleStepPx?: number;
  readonly maxParticles?: number;
  readonly charBoxes: readonly CharacterBounds[];
}

export interface RgbTuple {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const DEFAULT_SAMPLE_STEP_PX = 2;
const DEFAULT_MAX_GLYPH_PARTICLES = 1600;
const MIN_ALPHA_THRESHOLD = 72;
const MAX_BLOSSOM_PETALS = 40;
const MAX_FRAME_DT_MS = 48;
const BASE_BRUSH_RADIUS_PX = 54;
const TAP_BLOOM_RADIUS_PX = 76;
const SPRING_STIFFNESS = 38;
const SPRING_DAMPING_RATE = 8.4;
const HEAT_COOL_RATE = 1.75;

const COLOR_STOPS: readonly RgbTuple[] = [
  { r: 49, g: 27, b: 37 }, // --foreground (#311b25)
  { r: 145, g: 34, b: 76 }, // --sakura-deep (#91224c)
  { r: 177, g: 47, b: 96 }, // --sakura (#b12f60)
  { r: 229, g: 150, b: 176 }, // --sakura-petal (#e596b0)
  { r: 255, g: 214, b: 229 }, // sakura highlight (#ffd6e5)
];

export const BLOSSOM_PALETTE: Readonly<
  Record<BlossomTone, { readonly fill: string; readonly accent: string }>
> = {
  0: { fill: "#f6b8ce", accent: "#cf5684" },
  1: { fill: "#e596b0", accent: "#b12f60" },
  2: { fill: "#ffd7e6", accent: "#d96f98" },
  3: { fill: "#f2a6c1", accent: "#91224c" },
};

function nextRandom(seed: number): readonly [number, number] {
  const nextSeed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(nextSeed ^ (nextSeed >>> 15), 1 | nextSeed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const unit = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [unit, nextSeed];
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function assertCharacterIndex(charIndex: number, charCount: number): void {
  if (!Number.isInteger(charIndex) || charIndex < 0 || charIndex >= charCount) {
    throw new Error(`Character index ${charIndex} is outside valid bounds 0..${charCount - 1}`);
  }
}

function resolveOwningCharIndex(
  x: number,
  y: number,
  charBoxes: readonly CharacterBounds[]
): number {
  let nearestIndex = charBoxes[0].charIndex;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  for (const box of charBoxes) {
    if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
      return box.charIndex;
    }
    const clampedX = Math.max(box.left, Math.min(box.right, x));
    const clampedY = Math.max(box.top, Math.min(box.bottom, y));
    const dx = x - clampedX;
    const dy = y - clampedY;
    const distSq = dx * dx + dy * dy;
    if (distSq < nearestDistanceSq) {
      nearestDistanceSq = distSq;
      nearestIndex = box.charIndex;
    }
  }

  return nearestIndex;
}

function validateCharacterBoxes(charBoxes: readonly CharacterBounds[]): number {
  if (charBoxes.length === 0) {
    return 0;
  }
  let maxCharIndex = -1;
  for (const box of charBoxes) {
    if (!Number.isInteger(box.charIndex) || box.charIndex < 0) {
      throw new Error("CharacterBounds.charIndex must be a non-negative integer");
    }
    assertFiniteNumber(box.left, "CharacterBounds.left");
    assertFiniteNumber(box.top, "CharacterBounds.top");
    assertFiniteNumber(box.right, "CharacterBounds.right");
    assertFiniteNumber(box.bottom, "CharacterBounds.bottom");
    if (box.right < box.left || box.bottom < box.top) {
      throw new Error("CharacterBounds edges must satisfy left <= right and top <= bottom");
    }
    if (box.charIndex > maxCharIndex) {
      maxCharIndex = box.charIndex;
    }
  }
  return maxCharIndex + 1;
}

/**
 * Samples logical glyph particles from an offscreen RGBA text mask and maps each
 * particle to its owning character index for crisp-to-particle transitions.
 */
export function sampleGlyphParticlesFromRgba(input: RgbaMaskInput): GlyphSamplingOutcome {
  const {
    rgba,
    width,
    height,
    dpr,
    sampleStepPx = DEFAULT_SAMPLE_STEP_PX,
    maxParticles = DEFAULT_MAX_GLYPH_PARTICLES,
    charBoxes,
  } = input;

  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error("Mask width and height must be positive integers");
  }
  if (!Number.isFinite(dpr) || dpr <= 0) {
    throw new Error("Device pixel ratio must be a positive finite number");
  }
  if (!Number.isFinite(sampleStepPx) || sampleStepPx <= 0) {
    throw new Error("Sample step must be a positive finite number");
  }
  if (!Number.isInteger(maxParticles) || maxParticles < 1) {
    throw new Error("maxParticles must be a positive integer");
  }
  if (rgba.length !== width * height * 4) {
    throw new Error("RGBA buffer length must equal width * height * 4");
  }

  const charCount = validateCharacterBoxes(charBoxes);
  if (charCount === 0) {
    return { status: "empty", glyphs: [], charCount: 0 };
  }

  const deviceStep = Math.max(1, Math.round(sampleStepPx * dpr));
  const rawCandidates: {
    readonly homeX: number;
    readonly homeY: number;
    readonly alpha: number;
    readonly charIndex: number;
  }[] = [];

  for (let py = Math.floor(deviceStep / 2); py < height; py += deviceStep) {
    for (let px = Math.floor(deviceStep / 2); px < width; px += deviceStep) {
      const alphaByte = rgba[(py * width + px) * 4 + 3];
      if (alphaByte < MIN_ALPHA_THRESHOLD) {
        continue;
      }
      const homeX = px / dpr;
      const homeY = py / dpr;
      rawCandidates.push({
        homeX,
        homeY,
        alpha: Math.min(1, alphaByte / 255),
        charIndex: resolveOwningCharIndex(homeX, homeY, charBoxes),
      });
    }
  }

  if (rawCandidates.length === 0) {
    return { status: "empty", glyphs: [], charCount };
  }

  const stride =
    rawCandidates.length > maxParticles ? rawCandidates.length / maxParticles : 1;
  const selectedCount = Math.min(rawCandidates.length, maxParticles);
  let seed = 0x51f15eed;
  const glyphs: GlyphParticle[] = [];

  for (let index = 0; index < selectedCount; index += 1) {
    const candidate = rawCandidates[Math.min(rawCandidates.length - 1, Math.floor(index * stride))];
    let uPhase = 0;
    let uSign = 0;
    let uVariant = 0;
    let uSize = 0;
    [uPhase, seed] = nextRandom(seed);
    [uSign, seed] = nextRandom(seed);
    [uVariant, seed] = nextRandom(seed);
    [uSize, seed] = nextRandom(seed);

    glyphs.push({
      homeX: candidate.homeX,
      homeY: candidate.homeY,
      x: candidate.homeX,
      y: candidate.homeY,
      vx: 0,
      vy: 0,
      heat: 0,
      alpha: candidate.alpha,
      size: 1.45 + uSize * 0.95,
      charIndex: candidate.charIndex,
      phase: uPhase * Math.PI * 2,
      swirlSign: uSign < 0.5 ? -1 : 1,
      variant: uVariant,
    });
  }

  return {
    status: "ready",
    glyphs,
    charCount,
  };
}

function computeCharEnergies(
  glyphs: readonly GlyphParticle[],
  charCount: number
): readonly number[] {
  const energies = new Array<number>(charCount).fill(0);
  for (const glyph of glyphs) {
    assertCharacterIndex(glyph.charIndex, charCount);
    const displacement = Math.hypot(glyph.x - glyph.homeX, glyph.y - glyph.homeY);
    const energy = Math.min(1, Math.max(glyph.heat, displacement / 3));
    if (energy > energies[glyph.charIndex]) {
      energies[glyph.charIndex] = energy;
    }
  }
  return energies;
}

/**
 * Creates a validated idle simulation state from sampled glyph particles.
 */
export function createSakuraSimulationState(
  glyphs: readonly GlyphParticle[],
  charCount: number,
  initialSeed = 0x20261111
): SakuraSimulationState {
  if (!Number.isInteger(charCount) || charCount < 0) {
    throw new Error("charCount must be a non-negative integer");
  }
  if (!Number.isFinite(initialSeed)) {
    throw new Error("initialSeed must be a finite number");
  }
  if (glyphs.length > 0 && charCount === 0) {
    throw new Error("charCount must be positive when glyphs are present");
  }
  for (const glyph of glyphs) {
    assertFiniteNumber(glyph.homeX, "GlyphParticle.homeX");
    assertFiniteNumber(glyph.homeY, "GlyphParticle.homeY");
    assertCharacterIndex(glyph.charIndex, charCount);
  }

  return {
    phase: "idle",
    glyphs,
    charCount,
    charEnergies: new Array<number>(charCount).fill(0),
    rngSeed: initialSeed | 0,
  };
}

function createBlossomPetal(
  originX: number,
  originY: number,
  baseVx: number,
  baseVy: number,
  seedInput: number,
  sizeMin = 6.8,
  sizeMax = 12.6
): readonly [BlossomPetal, number] {
  let seed = seedInput;
  let u1 = 0;
  let u2 = 0;
  let u3 = 0;
  let u4 = 0;
  let u5 = 0;
  let u6 = 0;
  let u7 = 0;
  let u8 = 0;
  let u9 = 0;
  [u1, seed] = nextRandom(seed);
  [u2, seed] = nextRandom(seed);
  [u3, seed] = nextRandom(seed);
  [u4, seed] = nextRandom(seed);
  [u5, seed] = nextRandom(seed);
  [u6, seed] = nextRandom(seed);
  [u7, seed] = nextRandom(seed);
  [u8, seed] = nextRandom(seed);
  [u9, seed] = nextRandom(seed);

  const spreadAngle = u1 * Math.PI * 2;
  const spreadSpeed = 14 + u2 * 34;
  const tone = (Math.floor(u9 * 4) % 4) as BlossomTone;

  const petal: BlossomPetal = {
    x: originX + (u3 - 0.5) * 6,
    y: originY + (u4 - 0.5) * 6,
    vx: baseVx + Math.cos(spreadAngle) * spreadSpeed,
    vy: baseVy + Math.sin(spreadAngle) * spreadSpeed - (10 + u5 * 22),
    size: sizeMin + u6 * (sizeMax - sizeMin),
    rotation: u7 * Math.PI * 2,
    spin: (u8 - 0.5) * 3.4,
    tumble: u2 * Math.PI * 2,
    tumbleSpeed: 2.2 + u3 * 3.2,
    swayPhase: u4 * Math.PI * 2,
    swayFreq: 2.4 + u5 * 2.1,
    ageMs: 0,
    maxLifeMs: 1450 + u7 * 850,
    opacity: 0.08,
    tone,
  };

  return [petal, seed];
}

/**
 * Triggers the subtle one-time load hint by shedding 3 drifting sakura petals
 * from the trailing half of the headline while keeping letterforms crisp.
 */
export function triggerSakuraIntroHint(
  state: SakuraSimulationState,
  reducedMotion: boolean
): SakuraTriggerOutcome {
  if (reducedMotion) {
    return { status: "ignored_reduced_motion", state };
  }
  if (state.glyphs.length === 0) {
    return { status: "ignored_empty_glyphs", state };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  for (const glyph of state.glyphs) {
    if (glyph.homeX < minX) minX = glyph.homeX;
    if (glyph.homeX > maxX) maxX = glyph.homeX;
  }
  const trailingThreshold = minX + (maxX - minX) * 0.58;
  const trailingGlyphs = state.glyphs.filter((glyph) => glyph.homeX >= trailingThreshold);
  const pool = trailingGlyphs.length > 0 ? trailingGlyphs : state.glyphs;

  let seed = state.rngSeed;
  const blossoms: BlossomPetal[] =
    state.phase === "idle" ? [] : [...state.blossoms];

  for (let i = 0; i < 3 && blossoms.length < MAX_BLOSSOM_PETALS; i += 1) {
    let pickUnit = 0;
    [pickUnit, seed] = nextRandom(seed);
    const anchor = pool[Math.floor(pickUnit * pool.length)];
    let petal: BlossomPetal;
    [petal, seed] = createBlossomPetal(
      anchor.homeX,
      anchor.homeY,
      26 + i * 7,
      -8 + i * 5,
      seed,
      7.5,
      11.8
    );
    blossoms.push(petal);
  }

  return {
    status: "started",
    state: {
      phase: state.phase === "active" ? "active" : "intro",
      glyphs: state.glyphs,
      blossoms,
      charCount: state.charCount,
      charEnergies: state.charEnergies,
      pointer: state.phase === "idle" ? null : state.pointer,
      spawnCarry: state.phase === "idle" ? 0 : state.spawnCarry,
      elapsedMs: state.phase === "idle" ? 0 : state.elapsedMs,
      rngSeed: seed,
    },
  };
}

/**
 * Updates the active cursor wind-brush field from pointer coordinates and velocity.
 */
export function updateSakuraPointer(
  state: SakuraSimulationState,
  pointer: PointerField,
  reducedMotion: boolean
): SakuraTriggerOutcome {
  assertFiniteNumber(pointer.x, "PointerField.x");
  assertFiniteNumber(pointer.y, "PointerField.y");
  assertFiniteNumber(pointer.vx, "PointerField.vx");
  assertFiniteNumber(pointer.vy, "PointerField.vy");

  if (reducedMotion) {
    return { status: "ignored_reduced_motion", state };
  }
  if (state.glyphs.length === 0) {
    return { status: "ignored_empty_glyphs", state };
  }

  return {
    status: state.phase === "active" ? "updated" : "started",
    state: {
      phase: "active",
      glyphs: state.glyphs,
      blossoms: state.phase === "idle" ? [] : state.blossoms,
      charCount: state.charCount,
      charEnergies: state.charEnergies,
      pointer,
      spawnCarry: state.phase === "idle" ? 0 : state.spawnCarry,
      elapsedMs: state.phase === "idle" ? 0 : state.elapsedMs,
      rngSeed: state.rngSeed,
    },
  };
}

/**
 * Releases the active pointer field so displaced particles elastically reform.
 */
export function clearSakuraPointer(state: SakuraSimulationState): SakuraSimulationState {
  if (state.phase === "idle") {
    return state;
  }
  const hasAnyEnergy =
    state.blossoms.length > 0 || state.charEnergies.some((energy) => energy > 0);
  if (!hasAnyEnergy) {
    return {
      phase: "idle",
      glyphs: state.glyphs,
      charCount: state.charCount,
      charEnergies: state.charEnergies,
      rngSeed: state.rngSeed,
    };
  }

  return {
    ...state,
    phase: "settling",
    pointer: null,
  };
}

/**
 * Triggers a localized radial sakura bloom on coarse/touch tap and enters settling
 * so letters smoothly reform while detached petals drift away.
 */
export function triggerSakuraTapBloom(
  state: SakuraSimulationState,
  tapX: number,
  tapY: number,
  reducedMotion: boolean
): SakuraTriggerOutcome {
  assertFiniteNumber(tapX, "tapX");
  assertFiniteNumber(tapY, "tapY");

  if (reducedMotion) {
    return { status: "ignored_reduced_motion", state };
  }
  if (state.glyphs.length === 0) {
    return { status: "ignored_empty_glyphs", state };
  }

  let seed = state.rngSeed;
  const nearAnchors: GlyphParticle[] = [];

  const nextGlyphs = state.glyphs.map((glyph) => {
    const dx = glyph.x - tapX;
    const dy = glyph.y - tapY;
    const dist = Math.hypot(dx, dy);
    if (dist >= TAP_BLOOM_RADIUS_PX) {
      return glyph;
    }

    const t = 1 - dist / TAP_BLOOM_RADIUS_PX;
    const weight = t * t * (3 - 2 * t);
    const nx = dist > 0.001 ? dx / dist : Math.cos(glyph.phase);
    const ny = dist > 0.001 ? dy / dist : Math.sin(glyph.phase);
    const tx = -ny * glyph.swirlSign;
    const ty = nx * glyph.swirlSign;
    const impulse = (115 + glyph.variant * 95) * weight;

    const updated: GlyphParticle = {
      ...glyph,
      vx: glyph.vx + nx * impulse + tx * impulse * 0.48,
      vy: glyph.vy + ny * impulse + ty * impulse * 0.48 - 38 * weight,
      heat: Math.min(1, Math.max(glyph.heat, 0.55 + weight * 0.45)),
    };
    if (weight > 0.25) {
      nearAnchors.push(updated);
    }
    return updated;
  });

  const blossoms: BlossomPetal[] =
    state.phase === "idle" ? [] : [...state.blossoms];
  const anchorPool = nearAnchors.length > 0 ? nearAnchors : nextGlyphs;

  for (let i = 0; i < 6 && blossoms.length < MAX_BLOSSOM_PETALS; i += 1) {
    let pickUnit = 0;
    [pickUnit, seed] = nextRandom(seed);
    const anchor = anchorPool[Math.floor(pickUnit * anchorPool.length)];
    const angle = (i / 6) * Math.PI * 2;
    let petal: BlossomPetal;
    [petal, seed] = createBlossomPetal(
      anchor.x,
      anchor.y,
      Math.cos(angle) * 44,
      Math.sin(angle) * 32 - 20,
      seed,
      7.2,
      12.4
    );
    blossoms.push(petal);
  }

  const charEnergies = computeCharEnergies(nextGlyphs, state.charCount);

  return {
    status: "started",
    state: {
      phase: "settling",
      glyphs: nextGlyphs,
      blossoms,
      charCount: state.charCount,
      charEnergies,
      pointer: null,
      spawnCarry: 0,
      elapsedMs: state.phase === "idle" ? 0 : state.elapsedMs,
      rngSeed: seed,
    },
  };
}

/**
 * Advances the sakura particle simulation by dtMs milliseconds.
 * Immediately resets to idle when reducedMotion is active.
 */
export function stepSakuraSimulation(
  state: SakuraSimulationState,
  dtMs: number,
  reducedMotion: boolean
): SakuraSimulationState {
  assertFiniteNumber(dtMs, "dtMs");
  if (dtMs < 0) {
    throw new Error("dtMs must be non-negative");
  }

  if (reducedMotion) {
    if (state.phase === "idle") {
      return state;
    }
    const resetGlyphs = state.glyphs.map((glyph) =>
      glyph.x === glyph.homeX &&
      glyph.y === glyph.homeY &&
      glyph.vx === 0 &&
      glyph.vy === 0 &&
      glyph.heat === 0
        ? glyph
        : {
            ...glyph,
            x: glyph.homeX,
            y: glyph.homeY,
            vx: 0,
            vy: 0,
            heat: 0,
          }
    );
    return {
      phase: "idle",
      glyphs: resetGlyphs,
      charCount: state.charCount,
      charEnergies: new Array<number>(state.charCount).fill(0),
      rngSeed: state.rngSeed,
    };
  }

  if (state.phase === "idle" || dtMs === 0) {
    return state;
  }

  const clampedDtMs = Math.min(dtMs, MAX_FRAME_DT_MS);
  const dt = clampedDtMs / 1000;
  const nextElapsedMs = state.elapsedMs + clampedDtMs;
  const elapsedSec = nextElapsedMs / 1000;
  const pointer = state.pointer;
  const pointerSpeed = pointer ? Math.hypot(pointer.vx, pointer.vy) : 0;
  const effectiveRadius =
    BASE_BRUSH_RADIUS_PX + Math.min(28, pointerSpeed * 0.032);
  const damping = Math.exp(-SPRING_DAMPING_RATE * dt);

  const agitatedSpawnAnchors: GlyphParticle[] = [];
  let anyActiveGlyph = false;
  const charEnergies = new Array<number>(state.charCount).fill(0);

  const nextGlyphs = state.glyphs.map((glyph) => {
    let weight = 0;
    let dx = 0;
    let dy = 0;
    let dist = Number.POSITIVE_INFINITY;

    if (pointer) {
      const currDx = glyph.x - pointer.x;
      const currDy = glyph.y - pointer.y;
      const currDist = Math.hypot(currDx, currDy);
      const homeDx = glyph.homeX - pointer.x;
      const homeDy = glyph.homeY - pointer.y;
      const homeDist = Math.hypot(homeDx, homeDy);

      if (currDist <= homeDist) {
        dx = currDx;
        dy = currDy;
        dist = currDist;
      } else {
        dx = homeDx;
        dy = homeDy;
        dist = homeDist;
      }

      if (dist < effectiveRadius) {
        const falloff = 1 - dist / effectiveRadius;
        weight = falloff * falloff * (3 - 2 * falloff);
      }
    }

    const isAtRest =
      weight === 0 &&
      glyph.heat === 0 &&
      glyph.x === glyph.homeX &&
      glyph.y === glyph.homeY &&
      glyph.vx === 0 &&
      glyph.vy === 0;

    if (isAtRest) {
      return glyph;
    }

    let ax = 0;
    let ay = 0;
    let nextHeat = glyph.heat;

    if (pointer && weight > 0) {
      const nx = dist > 0.001 ? dx / dist : Math.cos(glyph.phase);
      const ny = dist > 0.001 ? dy / dist : Math.sin(glyph.phase);
      const tx = -ny * glyph.swirlSign;
      const ty = nx * glyph.swirlSign;
      const radialMag = (245 + Math.min(240, pointerSpeed * 0.24)) * weight;
      const swirlMag =
        (135 + 35 * Math.sin(elapsedSec * 7.2 + glyph.phase)) * weight;

      ax += nx * radialMag + tx * swirlMag + pointer.vx * 0.88 * weight;
      ay +=
        ny * radialMag +
        ty * swirlMag +
        pointer.vy * 0.88 * weight -
        Math.min(95, pointerSpeed * 0.11) * weight;

      nextHeat = Math.min(1, Math.max(nextHeat, 0.52 + weight * 0.58));
    } else {
      const homeDistNow = Math.hypot(glyph.x - glyph.homeX, glyph.y - glyph.homeY);
      const coolFactor = homeDistNow < 1.5 ? 2.35 : 1;
      nextHeat = Math.max(0, nextHeat - HEAT_COOL_RATE * coolFactor * dt);
    }

    const springScale = 1 - 0.74 * weight;
    const toHomeX = glyph.homeX - glyph.x;
    const toHomeY = glyph.homeY - glyph.y;
    ax += toHomeX * SPRING_STIFFNESS * springScale;
    ay += toHomeY * SPRING_STIFFNESS * springScale;

    if (weight === 0) {
      // Gentle tangential curve while returning so petals arc organically home
      ax += -toHomeY * glyph.swirlSign * 4.2;
      ay += toHomeX * glyph.swirlSign * 4.2;
    }

    let nextVx = (glyph.vx + ax * dt) * damping;
    let nextVy = (glyph.vy + ay * dt) * damping;
    let nextX = glyph.x + nextVx * dt;
    let nextY = glyph.y + nextVy * dt;

    const nextDisp = Math.hypot(nextX - glyph.homeX, nextY - glyph.homeY);
    const nextSpeed = Math.hypot(nextVx, nextVy);

    if (weight === 0 && nextDisp < 0.22 && nextSpeed < 2.4 && nextHeat < 0.02) {
      nextX = glyph.homeX;
      nextY = glyph.homeY;
      nextVx = 0;
      nextVy = 0;
      nextHeat = 0;
    } else {
      anyActiveGlyph = true;
    }

    const updated: GlyphParticle = {
      ...glyph,
      x: nextX,
      y: nextY,
      vx: nextVx,
      vy: nextVy,
      heat: nextHeat,
    };

    if (weight > 0.22) {
      agitatedSpawnAnchors.push(updated);
    }

    const energy = Math.min(1, Math.max(nextHeat, nextDisp / 3));
    if (energy > charEnergies[glyph.charIndex]) {
      charEnergies[glyph.charIndex] = energy;
    }

    return updated;
  });

  let seed = state.rngSeed;
  let nextSpawnCarry = state.spawnCarry;
  const nextBlossoms: BlossomPetal[] = [];

  for (const petal of state.blossoms) {
    const nextAgeMs = petal.ageMs + clampedDtMs;
    if (nextAgeMs >= petal.maxLifeMs) {
      continue;
    }
    const ageSec = nextAgeMs / 1000;
    const dragX = Math.exp(-1.55 * dt);
    const dragY = Math.exp(-1.35 * dt);
    const nextVx = petal.vx * dragX;
    const nextVy = (petal.vy + 36 * dt) * dragY;
    const swayVx = Math.sin(ageSec * petal.swayFreq + petal.swayPhase) * 24;
    const nextX = petal.x + (nextVx + swayVx) * dt;
    const nextY = petal.y + nextVy * dt;
    const nextRotation =
      petal.rotation +
      petal.spin * dt +
      Math.cos(ageSec * petal.swayFreq + petal.swayPhase) * 0.48 * dt;
    const nextTumble = petal.tumble + petal.tumbleSpeed * dt;

    const fadeIn = Math.min(1, nextAgeMs / 130);
    const remainingRatio = (petal.maxLifeMs - nextAgeMs) / petal.maxLifeMs;
    const fadeOut =
      remainingRatio < 0.38
        ? (remainingRatio / 0.38) * (remainingRatio / 0.38)
        : 1;
    const opacity = Math.max(0, Math.min(0.94, fadeIn * fadeOut * 0.94));

    nextBlossoms.push({
      ...petal,
      x: nextX,
      y: nextY,
      vx: nextVx,
      vy: nextVy,
      rotation: nextRotation,
      tumble: nextTumble,
      ageMs: nextAgeMs,
      opacity,
    });
  }

  if (
    state.phase === "active" &&
    pointer &&
    agitatedSpawnAnchors.length > 0 &&
    pointerSpeed > 24
  ) {
    const spawnRate = 2.4 + Math.min(18, pointerSpeed * 0.03);
    nextSpawnCarry += dt * spawnRate;

    while (nextSpawnCarry >= 1 && nextBlossoms.length < MAX_BLOSSOM_PETALS) {
      nextSpawnCarry -= 1;
      let pickUnit = 0;
      [pickUnit, seed] = nextRandom(seed);
      const anchor =
        agitatedSpawnAnchors[Math.floor(pickUnit * agitatedSpawnAnchors.length)];
      let blossom: BlossomPetal;
      [blossom, seed] = createBlossomPetal(
        anchor.x,
        anchor.y,
        pointer.vx * 0.34,
        pointer.vy * 0.3 - 12,
        seed
      );
      nextBlossoms.push(blossom);
    }
    if (nextBlossoms.length >= MAX_BLOSSOM_PETALS) {
      nextSpawnCarry = 0;
    }
  } else {
    nextSpawnCarry = Math.max(0, nextSpawnCarry - dt * 2);
  }

  if (state.phase !== "active" && !anyActiveGlyph && nextBlossoms.length === 0) {
    return {
      phase: "idle",
      glyphs: nextGlyphs,
      charCount: state.charCount,
      charEnergies,
      rngSeed: seed,
    };
  }

  return {
    phase: state.phase,
    glyphs: nextGlyphs,
    blossoms: nextBlossoms,
    charCount: state.charCount,
    charEnergies,
    pointer: state.phase === "active" ? pointer : null,
    spawnCarry: nextSpawnCarry,
    elapsedMs: nextElapsedMs,
    rngSeed: seed,
  };
}

/**
 * Interpolates a glyph particle's RGB color along the sakura brand ramp
 * (#311b25 ink -> #91224c deep -> #b12f60 sakura -> #e596b0 petal -> #ffd6e5 highlight).
 */
export function resolveGlyphSakuraRgb(heat: number, variant: number): RgbTuple {
  assertFiniteNumber(heat, "heat");
  assertFiniteNumber(variant, "variant");

  if (heat <= 0) {
    return COLOR_STOPS[0];
  }
  const boosted = Math.min(1, Math.max(0, heat * (0.86 + variant * 0.24)));
  const scaled = boosted * (COLOR_STOPS.length - 1);
  const index = Math.min(COLOR_STOPS.length - 2, Math.floor(scaled));
  const frac = scaled - index;
  const from = COLOR_STOPS[index];
  const to = COLOR_STOPS[index + 1];

  return {
    r: Math.round(from.r + (to.r - from.r) * frac),
    g: Math.round(from.g + (to.g - from.g) * frac),
    b: Math.round(from.b + (to.b - from.b) * frac),
  };
}
