"use client";

import { useEffect, useRef } from "react";
import type {
  ModernThemeId,
  ParticleAmbienceMode,
} from "@/domain/portfolio-domain";
import { resolveThemeTokens } from "@/domain/portfolio-domain";

interface SnowSakuraCanvasProps {
  readonly themeId: ModernThemeId;
  readonly mode: ParticleAmbienceMode;
}

interface MicroParticle {
  readonly kind: "sakura" | "snow";
  x: number;
  y: number;
  readonly size: number;
  readonly speedX: number;
  readonly speedY: number;
  angle: number;
  readonly spin: number;
  flip: number;
  readonly flipSpeed: number;
}

function createInitialParticles(width: number, height: number): MicroParticle[] {
  const count = 18;
  const items: MicroParticle[] = [];

  for (let i = 0; i < count; i += 1) {
    const kind = i % 2 === 0 ? "sakura" : "snow";
    items.push({
      kind,
      x: Math.random() * width,
      y: Math.random() * height,
      // Subtle micro-touch sizes: Sakura 2.6px - 4.0px, Snow 2.0px - 3.2px
      size:
        kind === "sakura"
          ? 2.6 + Math.random() * 1.4
          : 2.0 + Math.random() * 1.2,
      speedX:
        kind === "sakura"
          ? 0.18 + Math.random() * 0.22
          : -0.06 + Math.random() * 0.14,
      speedY:
        kind === "sakura"
          ? 0.20 + Math.random() * 0.22
          : 0.16 + Math.random() * 0.18,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.01,
      flip: Math.random() * Math.PI * 2,
      flipSpeed: 0.01 + Math.random() * 0.012,
    });
  }

  return items;
}

function drawMicroSakuraPetal(
  ctx: CanvasRenderingContext2D,
  p: MicroParticle,
  topColor: string,
  bottomColor: string
): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.scale(1, 0.65 + 0.35 * Math.cos(p.flip));

  const s = p.size;
  const grad = ctx.createLinearGradient(0, -s, 0, s);
  grad.addColorStop(0, bottomColor);
  grad.addColorStop(1, topColor);
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.bezierCurveTo(s * 0.95, s * 0.35, s * 0.85, -s * 0.65, s * 0.28, -s);
  ctx.lineTo(0, -s * 0.65);
  ctx.lineTo(-s * 0.28, -s);
  ctx.bezierCurveTo(-s * 0.85, -s * 0.65, -s * 0.95, s * 0.35, 0, s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMicroSnowCrystal(
  ctx: CanvasRenderingContext2D,
  p: MicroParticle,
  snowColor: string
): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  const r = p.size;
  ctx.strokeStyle = snowColor;
  ctx.lineWidth = 0.85;
  ctx.lineCap = "round";

  for (let i = 0; i < 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.58);
    ctx.lineTo(r * 0.26, -r * 0.78);
    ctx.moveTo(0, -r * 0.58);
    ctx.lineTo(-r * 0.26, -r * 0.78);
    ctx.stroke();
    ctx.rotate(Math.PI / 3);
  }

  ctx.restore();
}

export function SnowSakuraCanvas({ themeId, mode }: SnowSakuraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (mode === "off") {
      return undefined;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      return undefined;
    }

    let animationFrameId = 0;
    const tokens = resolveThemeTokens(themeId);

    const syncCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncCanvasSize();
    const particles = createInitialParticles(
      window.innerWidth,
      window.innerHeight
    );

    const renderFrame = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (mode !== "both" && p.kind !== mode) {
          continue;
        }

        p.x += p.speedX + Math.sin(p.angle) * 0.08;
        p.y += p.speedY;
        p.angle += p.spin;
        p.flip += p.flipSpeed;

        if (p.y > height + 12) {
          p.y = -12;
          p.x = Math.random() * width;
        }
        if (p.x > width + 12) {
          p.x = -12;
        } else if (p.x < -12) {
          p.x = width + 12;
        }

        if (p.kind === "sakura") {
          drawMicroSakuraPetal(
            ctx,
            p,
            tokens.sakuraTopColor,
            tokens.sakuraBottomColor
          );
        } else {
          drawMicroSnowCrystal(ctx, p, tokens.snowColor);
        }
      }

      animationFrameId = window.requestAnimationFrame(renderFrame);
    };

    window.addEventListener("resize", syncCanvasSize);
    animationFrameId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener("resize", syncCanvasSize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [themeId, mode]);

  if (mode === "off") {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
