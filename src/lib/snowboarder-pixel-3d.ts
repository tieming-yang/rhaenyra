import type { RiderRigPose } from "./snowboard-route";

export const RIDER_CANVAS_SIZE = 70;
const RIDER_ANCHOR_X = 35;
const RIDER_ANCHOR_Y = 56;
const RIDER_PIXEL_SCALE = 1.56;
const CAMERA_PITCH_RAD = 0.41;

export type RiderPixelBuffer = Readonly<{
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  colorU32: Uint32Array;
  zbuf: Float32Array;
  outlineU32: Uint32Array;
}>;

export type PowderParticle = Readonly<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}>;

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
  sprayMist: hexToU32("#fbd5e5"),
  sprayRim: hexToU32("#df8cae", 215),

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

/** Advances existing powder spray particles and spawns fresh spray along the carving edge. */
export function stepPowderParticles(
  particles: readonly PowderParticle[],
  pose: RiderRigPose,
  dtSec: number,
  randomFn: () => number = Math.random
): readonly PowderParticle[] {
  if (!Number.isFinite(dtSec) || dtSec < 0) {
    throw new Error("Powder particle step requires a non-negative finite dtSec");
  }

  const stepScale = Math.min(2.5, Math.max(0.2, dtSec * 60));
  const next: PowderParticle[] = [];

  for (const p of particles) {
    const life = p.life - stepScale;
    if (life <= 0) continue;
    next.push({
      x: p.x + p.vx * stepScale,
      y: p.y + p.vy * stepScale,
      vx: p.vx,
      vy: p.vy + 0.065 * stepScale,
      life,
      maxLife: p.maxLife,
    });
  }

  if (
    pose.kind === "carving" &&
    pose.sprayIntensity > 0.12 &&
    pose.spraySide !== 0 &&
    next.length < 24
  ) {
    const spawnCount = pose.sprayIntensity > 0.58 ? 2 : 1;
    for (let i = 0; i < spawnCount && next.length < 24; i++) {
      if (randomFn() > pose.sprayIntensity + 0.25) continue;
      const maxLife = 12 + Math.floor(randomFn() * 8);
      next.push({
        x: RIDER_ANCHOR_X + pose.spraySide * 5 + (randomFn() - 0.5) * 3,
        y: RIDER_ANCHOR_Y - randomFn() * 3.5,
        vx: pose.spraySide * (0.45 + randomFn() * 0.95 * pose.sprayIntensity),
        vy: -0.55 - randomFn() * 0.75 * pose.sprayIntensity,
        life: maxLife,
        maxLife,
      });
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

  if (pose.kind === "carving" && pose.shadowScale > 0) {
    const rx = Math.round(9.5 * pose.shadowScale * (width / RIDER_CANVAS_SIZE));
    const ry = Math.max(2, Math.round(3.2 * (height / RIDER_CANVAS_SIZE)));
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

  const camera = makeCamera(cx, cy, scale, CAMERA_PITCH_RAD);
  const boardRoot = composeTRS(
    0,
    0,
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
  const hipY = 7.2 - crouch;
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

  // Crisp pixel powder spray overlay
  const coordScaleX = width / RIDER_CANVAS_SIZE;
  const coordScaleY = height / RIDER_CANVAS_SIZE;
  for (const p of particles) {
    const px = Math.round(p.x * coordScaleX);
    const py = Math.round(p.y * coordScaleY);
    const ratio = p.life / p.maxLife;
    if (ratio > 0.55) {
      setPixelSafe(buffer, px, py, PALETTE.sprayCore);
      setPixelSafe(buffer, px + 1, py, PALETTE.sprayMist);
      setPixelSafe(buffer, px, py + 1, PALETTE.sprayRim);
    } else {
      setPixelSafe(buffer, px, py, ratio > 0.28 ? PALETTE.sprayMist : PALETTE.sprayRim);
    }
  }
}
