"use client";

import { useCallback, useState } from "react";
import {
  FileDown,
  Layers,
  Palette,
  Presentation,
  Sparkles,
} from "lucide-react";
import { SnowSakuraCanvas } from "@/components/snow-sakura-canvas";
import { SlideDeckView } from "@/components/slide-deck-view";
import { ProfileResumeView } from "@/components/profile-resume-view";
import {
  CANDIDATE_PROFILE,
  INTERVIEW_SLIDES,
} from "@/domain/portfolio-data";
import {
  resolveThemeTokens,
  transitionSlideDeck,
  type ExperienceCategoryFilter,
  type ModernThemeId,
  type ParticleAmbienceMode,
  type PortfolioViewState,
  type SlideNavigationAction,
} from "@/domain/portfolio-domain";

export default function HomePage() {
  const [viewState, setViewState] = useState<PortfolioViewState>({
    kind: "slides",
    activeSlideIndex: 0,
    totalSlides: INTERVIEW_SLIDES.length,
  });

  const [themeId, setThemeId] = useState<ModernThemeId>("B1");
  const [particleMode, setParticleMode] =
    useState<ParticleAmbienceMode>("both");

  const tokens = resolveThemeTokens(themeId);

  const handleSlideNavigation = useCallback(
    (action: SlideNavigationAction) => {
      setViewState((prev) => {
        if (prev.kind !== "slides") {
          return prev;
        }
        const outcome = transitionSlideDeck(prev, action);
        if (outcome.status === "transitioned") {
          return {
            ...prev,
            activeSlideIndex: outcome.nextIndex,
          };
        }
        return prev;
      });
    },
    []
  );

  const handleSwitchToProfile = useCallback(() => {
    setViewState({
      kind: "profile",
      categoryFilter: "all",
    });
  }, []);

  const handleSwitchToSlides = useCallback((slideIndex = 0) => {
    setViewState({
      kind: "slides",
      activeSlideIndex: slideIndex,
      totalSlides: INTERVIEW_SLIDES.length,
    });
  }, []);

  const handleChangeCategory = useCallback(
    (categoryFilter: ExperienceCategoryFilter) => {
      setViewState({
        kind: "profile",
        categoryFilter,
      });
    },
    []
  );

  return (
    <div
      className={`relative min-h-screen transition-colors duration-300 ${
        tokens.isDark ? "dark" : ""
      }`}
      style={{
        background: tokens.pageBackground,
        color: tokens.textPrimary,
      }}
    >
      {/* Subtle Micro Snow & Sakura Ambient Canvas */}
      <SnowSakuraCanvas themeId={themeId} mode={particleMode} />

      {/* Sticky Top Control Bar */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
          tokens.isDark
            ? "border-slate-800/90 bg-slate-950/85 text-slate-100"
            : "border-slate-200/80 bg-white/85 text-slate-900"
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          {/* Brand Title */}
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 px-3 py-1 text-xs font-bold shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span>Jstyle北海道</span>
              <span className="opacity-35">×</span>
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>{CANDIDATE_PROFILE.name}</span>
            </div>
            <span className="hidden xl:inline text-xs font-medium opacity-65">
              {CANDIDATE_PROFILE.rolePitch}
            </span>
          </div>

          {/* Right Controls: View Mode + Theme + Subtle Particle Switcher + PDF */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Mode Toggle */}
            <div
              className={`inline-flex rounded-xl border p-0.5 text-xs ${
                tokens.isDark
                  ? "border-slate-800 bg-slate-900"
                  : "border-slate-200 bg-slate-100/90"
              }`}
            >
              <button
                type="button"
                onClick={() => handleSwitchToSlides(0)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                  viewState.kind === "slides"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <Presentation className="h-3.5 w-3.5" />
                簡報提案 (8頁)
              </button>
              <button
                type="button"
                onClick={handleSwitchToProfile}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                  viewState.kind === "profile"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "opacity-75 hover:opacity-100"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                完整履歷總覽
              </button>
            </div>

            {/* Theme Tuning Selector (B1 / B2 / B3) */}
            <div
              className={`hidden md:inline-flex items-center gap-1 rounded-xl border p-0.5 text-xs ${
                tokens.isDark
                  ? "border-slate-800 bg-slate-900"
                  : "border-slate-200 bg-slate-100/90"
              }`}
              title="切換方案 B 現代配色子主題"
            >
              <Palette className="ml-2 h-3.5 w-3.5 opacity-60" />
              {(["B1", "B2", "B3"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setThemeId(id)}
                  className={`rounded-lg px-2 py-1 font-semibold transition-all ${
                    themeId === id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                      : "opacity-65 hover:opacity-100"
                  }`}
                >
                  {id === "B1"
                    ? "B1 琉璃白"
                    : id === "B2"
                      ? "B2 高對比"
                      : "B3 星夜藍"}
                </button>
              ))}
            </div>

            {/* Subtle Particle Selector */}
            <div
              className={`hidden sm:inline-flex items-center gap-1 rounded-xl border p-0.5 text-xs ${
                tokens.isDark
                  ? "border-slate-800 bg-slate-900"
                  : "border-slate-200 bg-slate-100/90"
              }`}
              title="調整背景微距雪晶與櫻花點綴"
            >
              <Sparkles className="ml-2 h-3.5 w-3.5 opacity-60" />
              {(
                [
                  { id: "both", label: "微雪櫻" },
                  { id: "sakura", label: "微櫻" },
                  { id: "snow", label: "細雪" },
                  { id: "off", label: "靜態" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setParticleMode(item.id)}
                  className={`rounded-lg px-2 py-1 font-medium transition-all ${
                    particleMode === item.id
                      ? "bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-2xs font-semibold"
                      : "opacity-65 hover:opacity-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* PDF Resume Download */}
            <a
              href={CANDIDATE_PROFILE.resumePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300/80 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">履歷 PDF</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="relative z-10">
        {viewState.kind === "slides" ? (
          <SlideDeckView
            activeSlideIndex={viewState.activeSlideIndex}
            themeId={themeId}
            onNavigate={handleSlideNavigation}
            onSwitchToProfile={handleSwitchToProfile}
          />
        ) : (
          <ProfileResumeView
            categoryFilter={viewState.categoryFilter}
            themeId={themeId}
            onChangeCategory={handleChangeCategory}
            onSwitchToSlides={handleSwitchToSlides}
          />
        )}
      </main>
    </div>
  );
}
