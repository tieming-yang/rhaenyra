import type { RiderRigPose } from "./snowboard-route";

export const RIDER_CANVAS_SIZE = 140;
export const RIDER_ANCHOR_X_PCT = 50;
export const RIDER_ANCHOR_Y_PCT = 70;

const RIDER_ANCHOR_X = (RIDER_CANVAS_SIZE * RIDER_ANCHOR_X_PCT) / 100;
const RIDER_ANCHOR_Y = (RIDER_CANVAS_SIZE * RIDER_ANCHOR_Y_PCT) / 100;
const RIDER_PIXEL_SCALE = 1.56;
const CAMERA_PITCH_RAD = 0.41;
const MAX_POWDER_PARTICLES = 96;

export type RiderPixelBuffer = Readonly<{
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  colorU32: Uint32Array;
  zbuf: Float32Array;
  outlineU32: Uint32Array;
}>;

export type PowderKind = "spray" | "mist" | "slash";

export type PowderParticle = Readonly<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: 1 | 2 | 3;
  kind: PowderKind;
}>;

export type WorldShiftPx = Readonly<{
  dx: number;
  dy: number;
}>;

const ZERO_WORLD_SHIFT: WorldShiftPx = { dx: 0, dy: 0 };

type Mat3x4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

type CameraMatrix = Readonly<{
  mat: Mat3x4;
  cosP: number;
  sinP: number;
}>;

type ProjectedVertex = Readonly<{
  sx: number;
  sy: number;
  sz: number;
}>;

type ColorRamp = readonly [number, number, number, number];

const packRgba = (r: number, g: number, b: number, a = 255): number =>
  ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);

const hexToU32 = (hex: string, alpha = 255): number => {
  const n = parseInt(hex.slice(1), 16);
  return packRgba((n >> 16) & 255, (n >> 8) & 255, n & 255, alpha);
};

const hexRamp = (a: string, b: string, c: string, d: string): ColorRamp => [
  hexToU32(a),
  hexToU32(b),
  hexToU32(c),
  hexToU32(d),
];

const PALETTE = {
  outline: hexToU32("#8c1f49"),
  shadowCore: hexToU32("#91224c", 48),
  shadowSoft: hexToU32("#91224c", 26),

  sprayCore: hexToU32("#ffffff"),
  sprayHighlight: hexToU32("#fff1f7", 245),
  sprayMist: hexToU32("#f9cde0", 228),
  sprayShadow: hexToU32("#e495b6", 212),
  sprayRim: hexToU32("#c96690", 198),
  mistSoft: hexToU32("#f3bcd5", 150),
  mistFaint: hexToU32("#e8abca", 110),

  alpineWhite: hexRamp("#ffffff", "#fff6fa", "#eed7e2", "#d5b4c4"),
  sakuraDeep: hexRamp("#e26a99", "#b12f60", "#91224c", "#6c1637"),
  sakuraShell: hexRamp("#ffd2e2", "#f18eb3", "#dc6d99", "#b84a77"),
  techPlum: hexRamp("#7d3857", "#562039", "#3f1529", "#2b0d1b"),
  espressoHair: hexRamp("#593546", "#3a202d", "#28141e", "#1a0b13"),
  chromeVisor: hexRamp("#ff9ec7", "#d9437f", "#a9285c", "#7a1840"),
  skin: hexRamp("#ffe0c8", "#f8c3a5", "#e2a384", "#c68467"),
  glint: hexRamp("#ffffff", "#fff4f9", "#ffe3ef", "#f8c8dc"),
} as const;

const BOX_CORNERS = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
] as const;

const BOX_FACES = [
  { idx: [4, 5, 6, 7], n: [0, 0, 1] },
  { idx: [1, 0, 3, 2], n: [0, 0, -1] },
  { idx: [5, 1, 2, 6], n: [1, 0, 0] },
  { idx: [0, 4, 7, 3], n: [-1, 0, 0] },
  { idx: [7, 6, 2, 3], n: [0, 1, 0] },
  { idx: [0, 1, 5, 4], n: [0, -1, 0] },
] as const;

const KEY_LIGHT = (() => {
  const lx = -0.36;
  const ly = 0.78;
  const lz = 0.51;
  const len = Math.hypot(lx, ly, lz);
  return [lx / len, ly / len, lz / len] as const;
})();

const matMul = (a: Mat3x4, b: Mat3x4): Mat3x4 => [
  a[0] * b[0] + a[1] * b[4] + a[2] * b[8],
  a[0] * b[1] + a[1] * b[5] + a[2] * b[9],
  a[0] * b[2] + a[1] * b[6] + a[2] * b[10],
  a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3],

  a[4] * b[0] + a[5] * b[4] + a[6] * b[8],
  a[4] * b[1] + a[5] * b[5] + a[6] * b[9],
  a[4] * b[2] + a[5] * b[6] + a[6] * b[10],
  a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7],

  a[8] * b[0] + a[9] * b[4] + a[10] * b[8],
  a[8] * b[1] + a[9] * b[5] + a[10] * b[9],
  a[8] * b[2] + a[9] * b[6] + a[10] * b[10],
  a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11],
];

const matT = (x: number, y: number, z: number): Mat3x4 => [
  1, 0, 0, x,
  0, 1, 0, y,
  0, 0, 1, z,
];

const matRX = (a: number): Mat3x4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0];
};

const matRY = (a: number): Mat3x4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0];
};

const matRZ = (a: number): Mat3x4 => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0];
};

const composeTRS = (
  tx: number,
  ty: number,
  tz: number,
  rx = 0,
  ry = 0,
  rz = 0
): Mat3x4 => {
  let m = matT(tx, ty, tz);
  if (ry !== 0) m = matMul(m, matRY(ry));
  if (rx !== 0) m = matMul(m, matRX(rx));
  if (rz !== 0) m = matMul(m, matRZ(rz));
  return m;
};

const makeCamera = (
  cx: number,
  cy: number,
  scale: number,
  pitchRad: number
): CameraMatrix => {
  const cosP = Math.cos(pitchRad);
  const sinP = Math.sin(pitchRad);
  return {
    mat: [
      scale, 0, 0, cx,
      0, -scale * cosP, scale * sinP, cy,
      0, sinP, cosP, 0,
    ],
    cosP,
    sinP,
  };
};

/** Allocates a reusable pixel-3D Z-buffer target for the snowboarder sprite. */
export function createRiderPixelBuffer(
  width = RIDER_CANVAS_SIZE,
  height = RIDER_CANVAS_SIZE
): RiderPixelBuffer {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 16 || height < 16) {
    throw new Error("Rider pixel buffer requires integer dimensions of at least 16x16");
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  return {
    width,
    height,
    rgba,
    colorU32: new Uint32Array(rgba.buffer),
    zbuf: new Float32Array(width * height),
    outlineU32: new Uint32Array(width * height),
  };
}

/** Advances world-space powder plumes, lingering snow mist, and gate-check hockey-slash bursts. */
export function stepPowderParticles(
  particles: readonly PowderParticle[],
  pose: RiderRigPose,
  dtSec: number,
  worldShift: WorldShiftPx = ZERO_WORLD_SHIFT,
  randomFn: () => number = Math.random
): readonly PowderParticle[] {
  if (!Number.isFinite(dtSec) || dtSec < 0) {
    throw new Error("Powder particle step requires a non-negative finite dtSec");
  }
  if (!Number.isFinite(worldShift.dx) || !Number.isFinite(worldShift.dy)) {
    throw new Error("Powder particle step requires finite worldShift coordinates");
  }

  const stepScale = Math.min(2.5, Math.max(0.2, dtSec * 60));
  const shiftX = Math.max(-32, Math.min(32, worldShift.dx));
  const shiftY = Math.max(-32, Math.min(32, worldShift.dy));
  const next: PowderParticle[] = [];

  for (const p of particles) {
    const life = p.life - stepScale;
    if (life <= 0) continue;

    const advect = p.kind === "mist" ? 0.92 : 0.78;
    const drag = Math.pow(p.kind === "mist" ? 0.9 : 0.955, stepScale);
    const gravity = p.kind === "mist" ? 0.018 : 0.055;
    const vx = p.vx * drag;
    const vy = p.vy * drag + gravity * stepScale;
    const x = p.x - shiftX * advect + vx * stepScale;
    const y = p.y - shiftY * advect + vy * stepScale;

    if (
      x < -4 ||
      x > RIDER_CANVAS_SIZE + 4 ||
      y < -4 ||
      y > RIDER_CANVAS_SIZE + 4
    ) {
      continue;
    }

    next.push({
      x,
      y,
      vx,
      vy,
      life,
      maxLife: p.maxLife,
      size: p.size,
      kind: p.kind,
    });
  }

  if (
    pose.kind === "carving" &&
    pose.sprayIntensity > 0.08 &&
    pose.spraySide !== 0 &&
    next.length < MAX_POWDER_PARTICLES
  ) {
    const sinYaw = Math.sin(pose.boardYaw);
    const cosYaw = Math.cos(pose.boardYaw);
    const railBaseX = RIDER_ANCHOR_X + pose.spraySide * 4.8;
    const railBaseY = RIDER_ANCHOR_Y - pose.boardLift * 1.4 - 1.2;
    const speedBoost = Math.min(0.65, Math.hypot(shiftX, shiftY) * 0.08);

    const sprayCount = Math.min(4, Math.ceil(pose.sprayIntensity * 3.8));
    for (let i = 0; i < sprayCount && next.length < MAX_POWDER_PARTICLES; i++) {
      if (randomFn() > pose.sprayIntensity + 0.3) continue;
      const railT = -0.95 + randomFn() * 1.35;
      const maxLife = 15 + Math.floor(randomFn() * 12);
      const sizeRoll = randomFn();
      const size: 1 | 2 | 3 =
        pose.sprayIntensity > 0.62 && sizeRoll > 0.48
          ? 3
          : sizeRoll > 0.3
            ? 2
            : 1;

      next.push({
        x: railBaseX + sinYaw * railT * 10.5 + (randomFn() - 0.5) * 2.6,
        y: railBaseY + cosYaw * railT * 4.4 + (randomFn() - 0.5) * 2.2,
        vx:
          pose.spraySide *
            (0.75 + randomFn() * 1.65 * (pose.sprayIntensity + speedBoost)) -
          sinYaw * 0.32,
        vy:
          -0.68 -
          randomFn() * 1.25 * (pose.sprayIntensity + speedBoost * 0.6),
        life: maxLife,
        maxLife,
        size,
        kind: "spray",
      });
    }

    if (pose.sprayIntensity > 0.26 && next.length < MAX_POWDER_PARTICLES) {
      const mistCount = pose.sprayIntensity > 0.68 ? 2 : 1;
      for (let i = 0; i < mistCount && next.length < MAX_POWDER_PARTICLES; i++) {
        const maxLife = 22 + Math.floor(randomFn() * 14);
        next.push({
          x:
            railBaseX -
            sinYaw * (5.5 + randomFn() * 5) +
            pose.spraySide * (1.5 + randomFn() * 3),
          y: railBaseY - cosYaw * (2.5 + randomFn() * 3.5) - randomFn() * 2.5,
          vx: pose.spraySide * (0.35 + randomFn() * 0.7 * pose.sprayIntensity),
          vy: -0.35 - randomFn() * 0.55 * pose.sprayIntensity,
          life: maxLife,
          maxLife,
          size: randomFn() > 0.4 ? 3 : 2,
          kind: "mist",
        });
      }
    }

    if (pose.isGateSlash && next.length < MAX_POWDER_PARTICLES) {
      const slashCount = 4;
      for (let i = 0; i < slashCount && next.length < MAX_POWDER_PARTICLES; i++) {
        const fanT = (i / (slashCount - 1)) * 2 - 1;
        const maxLife = 18 + Math.floor(randomFn() * 10);
        next.push({
          x: railBaseX + sinYaw * fanT * 9 + pose.spraySide * 2,
          y: railBaseY + cosYaw * fanT * 4,
          vx: pose.spraySide * (1.45 + randomFn() * 2.15),
          vy: -0.95 + fanT * 0.55 - randomFn() * 0.85,
          life: maxLife,
          maxLife,
          size: randomFn() > 0.35 ? 3 : 2,
          kind: "slash",
        });
      }
    }
  }

  return next;
}

const rasterizeTriangle = (
  buffer: RiderPixelBuffer,
  a: ProjectedVertex,
  b: ProjectedVertex,
  c: ProjectedVertex,
  color: number,
  outlineCol: number,
  zBias: number
): void => {
  const v0 = a;
  let v1 = b;
  let v2 = c;
  let area =
    (v1.sx - v0.sx) * (v2.sy - v0.sy) - (v1.sy - v0.sy) * (v2.sx - v0.sx);
  if (Math.abs(area) < 1e-4) return;
  if (area < 0) {
    const tmp = v1;
    v1 = v2;
    v2 = tmp;
    area = -area;
  }

  const invArea = 1 / area;
  const { width, height, colorU32, zbuf, outlineU32 } = buffer;
  const minX = Math.max(0, Math.ceil(Math.min(v0.sx, v1.sx, v2.sx) - 0.5));
  const maxX = Math.min(width - 1, Math.floor(Math.max(v0.sx, v1.sx, v2.sx) + 0.5));
  const minY = Math.max(0, Math.ceil(Math.min(v0.sy, v1.sy, v2.sy) - 0.5));
  const maxY = Math.min(height - 1, Math.floor(Math.max(v0.sy, v1.sy, v2.sy) + 0.5));

  for (let py = minY; py <= maxY; py++) {
    const cy = py + 0.5;
    const row = py * width;
    for (let px = minX; px <= maxX; px++) {
      const cx = px + 0.5;
      const w0 = (v1.sx - cx) * (v2.sy - cy) - (v1.sy - cy) * (v2.sx - cx);
      const w1 = (v2.sx - cx) * (v0.sy - cy) - (v2.sy - cy) * (v0.sx - cx);
      const w2 = (v0.sx - cx) * (v1.sy - cy) - (v0.sy - cy) * (v1.sx - cx);
      if (w0 >= -1e-4 && w1 >= -1e-4 && w2 >= -1e-4) {
        const z = (w0 * v0.sz + w1 * v1.sz + w2 * v2.sz) * invArea + zBias;
        const idx = row + px;
        if (z > zbuf[idx]) {
          zbuf[idx] = z;
          colorU32[idx] = color;
          outlineU32[idx] = outlineCol;
        }
      }
    }
  }
};

const drawBox = (
  buffer: RiderPixelBuffer,
  camera: CameraMatrix,
  modelMat: Mat3x4,
  hx: number,
  hy: number,
  hz: number,
  ramp: ColorRamp,
  zBias = 0
): void => {
  const m = matMul(camera.mat, modelMat);
  const pts: ProjectedVertex[] = new Array(8);
  for (let i = 0; i < 8; i++) {
    const [bx, by, bz] = BOX_CORNERS[i];
    const lx = bx * hx;
    const ly = by * hy;
    const lz = bz * hz;
    pts[i] = {
      sx: m[0] * lx + m[1] * ly + m[2] * lz + m[3],
      sy: m[4] * lx + m[5] * ly + m[6] * lz + m[7],
      sz: m[8] * lx + m[9] * ly + m[10] * lz + m[11],
    };
  }

  for (const { idx, n } of BOX_FACES) {
    const nx = modelMat[0] * n[0] + modelMat[1] * n[1] + modelMat[2] * n[2];
    const ny = modelMat[4] * n[0] + modelMat[5] * n[1] + modelMat[6] * n[2];
    const nz = modelMat[8] * n[0] + modelMat[9] * n[1] + modelMat[10] * n[2];
    const viewNz = camera.sinP * ny + camera.cosP * nz;
    if (viewNz <= 0.01) continue;

    const ndotl =
      nx * KEY_LIGHT[0] + ny * KEY_LIGHT[1] + nz * KEY_LIGHT[2];
    const col =
      ndotl > 0.62
        ? ramp[0]
        : ndotl > 0.18
          ? ramp[1]
          : ndotl > -0.28
            ? ramp[2]
            : ramp[3];

    rasterizeTriangle(buffer, pts[idx[0]], pts[idx[1]], pts[idx[2]], col, PALETTE.outline, zBias);
    rasterizeTriangle(buffer, pts[idx[0]], pts[idx[2]], pts[idx[3]], col, PALETTE.outline, zBias);
  }
};

const setPixelSafe = (
  buffer: RiderPixelBuffer,
  x: number,
  y: number,
  col: number
): void => {
  const ix = x | 0;
  const iy = y | 0;
  if (ix >= 0 && ix < buffer.width && iy >= 0 && iy < buffer.height) {
    buffer.colorU32[iy * buffer.width + ix] = col;
  }
};

const drawPowderPuff = (
  buffer: RiderPixelBuffer,
  px: number,
  py: number,
  size: 1 | 2 | 3,
  ratio: number,
  isMist: boolean
): void => {
  if (isMist) {
    const col = ratio > 0.45 ? PALETTE.mistSoft : PALETTE.mistFaint;
    setPixelSafe(buffer, px, py, col);
    setPixelSafe(buffer, px + 1, py, PALETTE.mistFaint);
    if (size >= 3 && ratio > 0.35) {
      setPixelSafe(buffer, px - 1, py, PALETTE.mistFaint);
      setPixelSafe(buffer, px, py - 1, col);
      setPixelSafe(buffer, px, py + 1, PALETTE.mistFaint);
    }
    return;
  }

  if (size === 3 && ratio > 0.42) {
    setPixelSafe(buffer, px, py - 1, PALETTE.sprayCore);
    setPixelSafe(buffer, px - 1, py, PALETTE.sprayCore);
    setPixelSafe(buffer, px, py, PALETTE.sprayHighlight);
    setPixelSafe(buffer, px + 1, py, PALETTE.sprayMist);
    setPixelSafe(buffer, px - 1, py + 1, PALETTE.sprayShadow);
    setPixelSafe(buffer, px, py + 1, PALETTE.sprayShadow);
    setPixelSafe(buffer, px + 1, py + 1, PALETTE.sprayRim);
    return;
  }

  if (size >= 2 && ratio > 0.35) {
    setPixelSafe(buffer, px, py, PALETTE.sprayCore);
    setPixelSafe(buffer, px + 1, py, PALETTE.sprayMist);
    setPixelSafe(buffer, px, py + 1, PALETTE.sprayShadow);
    setPixelSafe(buffer, px + 1, py + 1, PALETTE.sprayRim);
    return;
  }

  setPixelSafe(
    buffer,
    px,
    py,
    ratio > 0.5
      ? PALETTE.sprayHighlight
      : ratio > 0.25
        ? PALETTE.sprayMist
        : PALETTE.sprayShadow
  );
};

/** Renders the Option B (Niseko Powder Pro) 3D pixel rider, contact shadow, and powder spray. */
export function renderNisekoPowderPro(
  buffer: RiderPixelBuffer,
  pose: RiderRigPose,
  particles: readonly PowderParticle[]
): void {
  const { width, height, colorU32, zbuf, outlineU32 } = buffer;
  colorU32.fill(0);
  zbuf.fill(-1e9);
  outlineU32.fill(0);

  const cx = (width * RIDER_ANCHOR_X) / RIDER_CANVAS_SIZE;
  const cy = (height * RIDER_ANCHOR_Y) / RIDER_CANVAS_SIZE;
  const scale = (width / RIDER_CANVAS_SIZE) * RIDER_PIXEL_SCALE;
  const coordScaleX = width / RIDER_CANVAS_SIZE;
  const coordScaleY = height / RIDER_CANVAS_SIZE;

  if (pose.kind === "carving" && pose.shadowScale > 0) {
    const rx = Math.round(9.5 * pose.shadowScale * coordScaleX);
    const ry = Math.max(2, Math.round(3.2 * coordScaleY));
    for (let oy = -ry; oy <= ry; oy++) {
      for (let ox = -rx; ox <= rx; ox++) {
        const d = (ox * ox) / Math.max(1, rx * rx) + (oy * oy) / Math.max(1, ry * ry);
        if (d <= 0.6) {
          setPixelSafe(buffer, cx + ox, cy + oy + 1, PALETTE.shadowCore);
        } else if (d <= 1) {
          setPixelSafe(buffer, cx + ox, cy + oy + 1, PALETTE.shadowSoft);
        }
      }
    }
  }

  // Trailing airborne snow mist hangs behind the rider's 3D silhouette
  for (const p of particles) {
    if (p.kind !== "mist") continue;
    drawPowderPuff(
      buffer,
      Math.round(p.x * coordScaleX),
      Math.round(p.y * coordScaleY),
      p.size,
      p.life / p.maxLife,
      true
    );
  }

  const lift = pose.boardLift;
  const camera = makeCamera(cx, cy, scale, CAMERA_PITCH_RAD);
  const boardRoot = composeTRS(
    0,
    lift,
    0,
    pose.boardPitch,
    pose.boardYaw,
    pose.edgeRoll
  );

  // Directional Hokkaido swallowtail powder board
  drawBox(buffer, camera, matMul(boardRoot, composeTRS(0, 0.65, 0.4)), 3.1, 0.5, 11.8, PALETTE.techPlum, 0);
  drawBox(buffer, camera, matMul(boardRoot, composeTRS(0, 1.2, 12.0, -0.42, 0, 0)), 2.8, 0.45, 2.2, PALETTE.sakuraDeep, 0.02);
  drawBox(buffer, camera, matMul(boardRoot, composeTRS(-1.6, 0.8, -11.4, 0.2, 0, 0)), 1.1, 0.45, 1.6, PALETTE.sakuraShell, 0.02);
  drawBox(buffer, camera, matMul(boardRoot, composeTRS(1.6, 0.8, -11.4, 0.2, 0, 0)), 1.1, 0.45, 1.6, PALETTE.sakuraShell, 0.02);
  drawBox(buffer, camera, matMul(boardRoot, composeTRS(0, 0.9, 1.5)), 1.1, 0.35, 8.5, PALETTE.sakuraShell, 0.05);

  // Boots & angulated technical plum snow pants
  const crouch = pose.crouch;
  const hipY = 7.2 - crouch + lift;
  drawBox(buffer, camera, matMul(boardRoot, composeTRS(0, 1.8, 4.4)), 1.5, 1.1, 1.7, PALETTE.sakuraDeep, 0.02);
  drawBox(buffer, camera, matMul(boardRoot, composeTRS(0, 1.8, -4.2)), 1.5, 1.1, 1.7, PALETTE.sakuraDeep, 0.02);

  const legAng = pose.edgeRoll * 0.42;
  const shinHalfH = Math.max(1.4, 2.4 - crouch * 0.3);
  drawBox(buffer, camera, matMul(boardRoot, composeTRS(0, 4.3 - crouch * 0.45, 3.4, 0.12, 0, legAng)), 1.55, shinHalfH, 1.65, PALETTE.techPlum, 0.03);
  drawBox(buffer, camera, matMul(boardRoot, composeTRS(0, 4.3 - crouch * 0.45, -3.2, -0.12, 0, legAng)), 1.55, shinHalfH, 1.65, PALETTE.techPlum, 0.03);

  // Pelvis & alpine-white / sakura freeride parka
  const pelvis = composeTRS(
    pose.hipShift * 0.45,
    hipY,
    0,
    0,
    pose.pelvisYaw,
    pose.edgeRoll * 0.4
  );
  drawBox(buffer, camera, pelvis, 3.15, 1.35, 2.45, PALETTE.techPlum, 0.04);

  const forwardLean = Math.abs(pose.edgeRoll) * 0.38 + Math.max(0, crouch * 0.06);
  const torso = composeTRS(
    pose.hipShift * 0.55,
    hipY + 1.15,
    0,
    forwardLean,
    pose.torsoYaw,
    pose.edgeRoll * 0.46
  );
  drawBox(buffer, camera, matMul(torso, composeTRS(0, 1.6, 0)), 3.4, 1.6, 2.5, PALETTE.sakuraDeep, 0.05);
  drawBox(buffer, camera, matMul(torso, composeTRS(0, 4.3, 0)), 3.7, 2.0, 2.65, PALETTE.alpineWhite, 0.06);
  drawBox(buffer, camera, matMul(torso, composeTRS(0, 3.1, 2.55)), 2.6, 0.75, 0.35, PALETTE.sakuraShell, 0.09);
  drawBox(buffer, camera, matMul(torso, composeTRS(0, 6.2, -0.45)), 3.5, 1.05, 2.7, PALETTE.sakuraDeep, 0.07);

  // Articulated arms (inside hand drops low toward snow on deep carves)
  const lDrop = pose.leftArmDrop;
  const rDrop = pose.rightArmDrop;
  const lArm = matMul(torso, composeTRS(-4.1, 5.3, 0.4, -0.35 + lDrop * 0.4, 0, 0.42 - lDrop * 0.35));
  const rArm = matMul(torso, composeTRS(4.1, 5.3, 0.4, -0.35 + rDrop * 0.4, 0, -0.42 + rDrop * 0.35));
  drawBox(buffer, camera, matMul(lArm, composeTRS(0, -2.2, 0)), 1.2, 2.6, 1.25, PALETTE.alpineWhite, 0.05);
  drawBox(buffer, camera, matMul(lArm, composeTRS(0, -4.8, 0.2)), 1.25, 1.1, 1.3, PALETTE.techPlum, 0.06);
  drawBox(buffer, camera, matMul(rArm, composeTRS(0, -2.2, 0)), 1.2, 2.6, 1.25, PALETTE.alpineWhite, 0.05);
  drawBox(buffer, camera, matMul(rArm, composeTRS(0, -4.8, 0.2)), 1.25, 1.1, 1.3, PALETTE.techPlum, 0.06);

  // Head, sakura knit beanie + snow pom-pom, rose-chrome visor & flowing dark wavy hair
  const head = composeTRS(
    pose.hipShift * 0.55,
    hipY + 7.85,
    0,
    0.05,
    pose.headYaw,
    pose.edgeRoll * 0.22
  );
  drawBox(buffer, camera, matMul(head, composeTRS(0, 2.8, 0.2)), 3.55, 2.85, 3.45, PALETTE.skin, 0.06);
  drawBox(buffer, camera, matMul(head, composeTRS(0, 4.9, -0.1)), 3.95, 1.85, 3.85, PALETTE.sakuraDeep, 0.07);
  drawBox(buffer, camera, matMul(head, composeTRS(0, 3.5, 0)), 4.1, 0.85, 3.95, PALETTE.sakuraShell, 0.08);
  drawBox(buffer, camera, matMul(head, composeTRS(0, 7.2, -0.4)), 1.45, 1.35, 1.45, PALETTE.alpineWhite, 0.08);

  drawBox(buffer, camera, matMul(head, composeTRS(0, 2.85, 3.55)), 3.65, 1.25, 0.55, PALETTE.chromeVisor, 0.1);
  drawBox(buffer, camera, matMul(head, composeTRS(-1.3, 3.15, 3.95)), 1.2, 0.45, 0.3, PALETTE.glint, 0.13);

  for (let i = -1; i <= 1; i++) {
    const lockWave = pose.hairSway + pose.hairFlutter * (i === 0 ? 1 : 0.75);
    drawBox(
      buffer,
      camera,
      matMul(head, composeTRS(i * 2.1 + lockWave * 0.35, 1.3, -2.95, 0.32, 0, lockWave * 0.08)),
      1.35,
      2.3,
      1.35,
      PALETTE.espressoHair,
      0.05
    );
    drawBox(
      buffer,
      camera,
      matMul(head, composeTRS(i * 2.3 + lockWave * 0.7, -0.8, -4.1, 0.45, 0, lockWave * 0.12)),
      1.15,
      1.7,
      1.15,
      PALETTE.espressoHair,
      0.05
    );
  }

  // 1px silhouette pixel outline pass
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      if (outlineU32[idx] !== 0) continue;
      const neighbor =
        outlineU32[idx - 1] ||
        outlineU32[idx + 1] ||
        outlineU32[idx - width] ||
        outlineU32[idx + width];
      if (neighbor !== 0) {
        colorU32[idx] = neighbor;
      }
    }
  }

  // Active carving rail snow-curl wave + foreground rooster-tail plumes
  if (
    pose.kind === "carving" &&
    pose.sprayIntensity > 0.2 &&
    pose.spraySide !== 0
  ) {
    const sinYaw = Math.sin(pose.boardYaw);
    const cosYaw = Math.cos(pose.boardYaw);
    const curlSteps = pose.isGateSlash ? 9 : 6;
    const baseRailX = cx + pose.spraySide * 5.2 * coordScaleX;
    const baseRailY = cy - (1.2 + lift * 1.4) * coordScaleY;

    for (let s = 0; s < curlSteps; s++) {
      const t = (s / (curlSteps - 1)) * 1.6 - 0.85;
      const rx = Math.round(
        baseRailX +
          (sinYaw * t * 9.5 + pose.spraySide * (1 - Math.abs(t)) * 2.4) *
            coordScaleX
      );
      const ry = Math.round(baseRailY + cosYaw * t * 4.2 * coordScaleY);
      setPixelSafe(buffer, rx, ry - 1, PALETTE.sprayCore);
      setPixelSafe(buffer, rx + pose.spraySide, ry, PALETTE.sprayMist);
      setPixelSafe(buffer, rx + pose.spraySide, ry + 1, PALETTE.sprayShadow);
    }
  }

  for (const p of particles) {
    if (p.kind === "mist") continue;
    drawPowderPuff(
      buffer,
      Math.round(p.x * coordScaleX),
      Math.round(p.y * coordScaleY),
      p.size,
      p.life / p.maxLife,
      false
    );
  }
}
