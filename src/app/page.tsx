"use client";

import { useCallback, useState } from "react";
import { FileDown } from "lucide-react";
import { LiquidGlassPanel } from "@/components/liquid-glass-panel";
import { SlideDeckView } from "@/components/slide-deck-view";
import { ProfileResumeView } from "@/components/profile-resume-view";
import {
  CANDIDATE_PROFILE,
  INTERVIEW_SLIDES,
} from "@/domain/portfolio-data";
import {
  transitionSlideDeck,
  type ExperienceCategoryFilter,
  type PortfolioViewState,
  type SlideNavigationAction,
} from "@/domain/portfolio-domain";

export default function HomePage() {
  const [viewState, setViewState] = useState<PortfolioViewState>({
    kind: "slides",
    activeSlideIndex: 0,
    totalSlides: INTERVIEW_SLIDES.length,
  });

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
      className="interview-shell"
      data-cover={viewState.kind === "slides" && viewState.activeSlideIndex === 0 ? "" : undefined}
      data-lg-backdrop=".interview-backdrop"
    >
      <div className="interview-backdrop" aria-hidden="true" />
      <header className="interview-header">
        <div className="interview-header-inner">
          <span className="interview-wordmark">{CANDIDATE_PROFILE.name}</span>
          <nav className="mode-switch glass-control" aria-label="檢視模式">
            <LiquidGlassPanel />
            <button
              type="button"
              onClick={() => handleSwitchToSlides(0)}
              aria-pressed={viewState.kind === "slides"}
            >
              簡報
            </button>
            <button
              type="button"
              onClick={handleSwitchToProfile}
              aria-pressed={viewState.kind === "profile"}
            >
              履歷
            </button>
          </nav>
          <a
            href={CANDIDATE_PROFILE.resumePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="interview-pdf"
          >
            <FileDown className="hidden size-4 sm:block" aria-hidden="true" />
            履歷 PDF
          </a>
        </div>
      </header>

      <main>
        {viewState.kind === "slides" ? (
          <SlideDeckView
            activeSlideIndex={viewState.activeSlideIndex}
            onNavigate={handleSlideNavigation}
            onSwitchToProfile={handleSwitchToProfile}
          />
        ) : (
          <ProfileResumeView
            categoryFilter={viewState.categoryFilter}
            onChangeCategory={handleChangeCategory}
            onSwitchToSlides={handleSwitchToSlides}
          />
        )}
      </main>
    </div>
  );
}
