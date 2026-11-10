import { describe, expect, it } from "vitest";
import {
  deriveDeskFinalePose,
  deriveMacPortalDivePose,
  resolveStickyRailProgress,
} from "./mac-portal-transition";

describe("resolveStickyRailProgress", () => {
  it("stays at 0 during initial dwell and reaches 1 at rail completion", () => {
    expect(
      resolveStickyRailProgress({
        railTopPx: 120,
        railHeightPx: 2200,
        viewportHeightPx: 1000,
        startDwellRatio: 0.25,
      })
    ).toBe(0);

    // 20% scrolled (< 25% dwell) stays at 0
    expect(
      resolveStickyRailProgress({
        railTopPx: -240,
        railHeightPx: 2200,
        viewportHeightPx: 1000,
        startDwellRatio: 0.25,
      })
    ).toBe(0);

    // Halfway past dwell (62.5% of 1200px = -750px) -> 0.5
    expect(
      resolveStickyRailProgress({
        railTopPx: -750,
        railHeightPx: 2200,
        viewportHeightPx: 1000,
        startDwellRatio: 0.25,
      })
    ).toBeCloseTo(0.5, 5);

    expect(
      resolveStickyRailProgress({
        railTopPx: -1200,
        railHeightPx: 2200,
        viewportHeightPx: 1000,
        startDwellRatio: 0.25,
      })
    ).toBe(1);
  });

  it("throws concrete errors on malformed rail inputs", () => {
    expect(() =>
      resolveStickyRailProgress({
        railTopPx: 0,
        railHeightPx: 0,
        viewportHeightPx: 800,
      })
    ).toThrow("railHeightPx must be a positive finite number");

    expect(() =>
      resolveStickyRailProgress({
        railTopPx: 0,
        railHeightPx: 1600,
        viewportHeightPx: 800,
        startDwellRatio: 1,
      })
    ).toThrow("startDwellRatio must be in [0, 1)");
  });
});

describe("deriveMacPortalDivePose", () => {
  const viewport = { width: 1440, height: 900 };
  const screen = { centerX: 980, centerY: 470, width: 640, height: 400 };

  it("transitions cleanly across browsing, diving, and immersed phases and clears viewport bounds", () => {
    const start = deriveMacPortalDivePose({
      viewport,
      screen,
      rawProgress: 0,
      reducedMotion: false,
    });
    expect(start.phase).toBe("browsing");
    expect(start.scale).toBe(1);
    expect(start.uiInteractive).toBe(true);
    expect(start.portalScreenOpacity).toBe(0);

    const mid = deriveMacPortalDivePose({
      viewport,
      screen,
      rawProgress: 0.5,
      reducedMotion: false,
    });
    expect(mid.phase).toBe("diving");
    expect(mid.scale).toBeGreaterThan(1.4);
    expect(mid.uiInteractive).toBe(false);
    expect(mid.copyOpacity).toBe(0);
    expect(mid.portalScreenOpacity).toBeGreaterThan(0.4);

    const end = deriveMacPortalDivePose({
      viewport,
      screen,
      rawProgress: 1,
      reducedMotion: false,
    });
    expect(end.phase).toBe("immersed");
    expect(screen.width * end.scale).toBeGreaterThan(viewport.width);
    expect(screen.height * end.scale).toBeGreaterThan(viewport.height);
    expect(screen.centerX + end.translateX).toBeCloseTo(viewport.width * 0.5, 5);
    expect(screen.centerY + end.translateY).toBeCloseTo(viewport.height * 0.5, 5);
    expect(end.portalScreenOpacity).toBe(1);
    expect(end.portalIntroScale).toBeCloseTo(1, 5);
  });

  it("bypasses camera zoom when reducedMotion is enabled and validates inputs", () => {
    const reduced = deriveMacPortalDivePose({
      viewport,
      screen,
      rawProgress: 0.85,
      reducedMotion: true,
    });
    expect(reduced.phase).toBe("browsing");
    expect(reduced.scale).toBe(1);
    expect(reduced.uiInteractive).toBe(true);

    expect(() =>
      deriveMacPortalDivePose({
        viewport: { width: -10, height: 900 },
        screen,
        rawProgress: 0.5,
        reducedMotion: false,
      })
    ).toThrow("viewport.width must be a positive finite number");
  });
});

describe("deriveDeskFinalePose", () => {
  const baseInput = {
    viewport: { width: 1440, height: 900 },
    screenWidth: 520,
    screenHeight: 330,
  };

  it("progresses through screen-pullback, lid-closing, and flatlay-settled with staggered desk objects", () => {
    const start = deriveDeskFinalePose({
      ...baseInput,
      rawProgress: 0,
      reducedMotion: false,
    });
    expect(start.phase).toBe("screen-pullback");
    expect(start.macScale * baseInput.screenWidth).toBeGreaterThan(
      baseInput.viewport.width
    );
    expect(start.lidCloseProgress).toBe(0);
    expect(start.snowScreenOpacity).toBe(1);
    expect(start.deskInteractive).toBe(false);

    const closing = deriveDeskFinalePose({
      ...baseInput,
      rawProgress: 0.55,
      reducedMotion: false,
    });
    expect(closing.phase).toBe("lid-closing");
    expect(closing.macScale).toBeCloseTo(1, 4);
    expect(closing.lidCloseProgress).toBeGreaterThan(0.5);
    expect(closing.cameraOverheadProgress).toBeGreaterThan(0.45);
    expect(closing.snowScreenOpacity).toBe(0);

    const settled = deriveDeskFinalePose({
      ...baseInput,
      rawProgress: 1,
      reducedMotion: false,
    });
    expect(settled.phase).toBe("flatlay-settled");
    expect(settled.macScale).toBeCloseTo(1, 5);
    expect(settled.lidCloseProgress).toBe(1);
    expect(settled.cameraOverheadProgress).toBe(1);
    expect(settled.badgeProgress).toBe(1);
    expect(settled.stickyNoteProgress).toBe(1);
    expect(settled.phoneProgress).toBe(1);
    expect(settled.rulerProgress).toBe(1);
    expect(settled.deskInteractive).toBe(true);
  });

  it("returns immediate flatlay-settled state under reducedMotion and validates inputs", () => {
    const reduced = deriveDeskFinalePose({
      ...baseInput,
      rawProgress: 0.1,
      reducedMotion: true,
    });
    expect(reduced.phase).toBe("flatlay-settled");
    expect(reduced.lidCloseProgress).toBe(1);
    expect(reduced.deskInteractive).toBe(true);

    expect(() =>
      deriveDeskFinalePose({
        ...baseInput,
        screenWidth: 0,
        rawProgress: 0.5,
        reducedMotion: false,
      })
    ).toThrow("screenWidth must be a positive finite number");
  });
});
