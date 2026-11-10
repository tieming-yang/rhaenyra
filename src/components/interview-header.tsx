"use client";

import { type MouseEvent, useEffect, useState } from "react";
import { FileDown } from "lucide-react";
import { CANDIDATE_PROFILE } from "@/domain/portfolio-data";
import {
  HEADER_SECTION_HASH,
  resolveActiveHeaderSection,
  type HeaderSection,
} from "@/lib/header-navigation";

export function InterviewHeader() {
  const [activeSection, setActiveSection] = useState<HeaderSection>("profile");

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const viewportHeight = window.innerHeight;
      if (viewportHeight <= 0) return;

      const proposal = document.getElementById("proposal");
      const proposalTop = proposal ? proposal.getBoundingClientRect().top : null;
      const nextSection = resolveActiveHeaderSection(proposalTop, viewportHeight);
      setActiveSection((current) => (current === nextSection ? current : nextSection));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
    };
  }, []);

  function handleSectionClick(
    event: MouseEvent<HTMLAnchorElement>,
    section: HeaderSection
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const hash = HEADER_SECTION_HASH[section];
    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? "auto"
      : "smooth";

    if (section === "profile") {
      event.preventDefault();
      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }
      window.scrollTo({ top: 0, behavior });
      return;
    }

    const target = document.getElementById("proposal");
    if (!target) return;

    event.preventDefault();
    if (window.location.hash !== hash) {
      window.history.pushState(null, "", hash);
    }
    target.scrollIntoView({ behavior, block: "start" });
  }

  return (
    <header className="interview-header">
      <div className="interview-header-inner">
        <a
          href={HEADER_SECTION_HASH.profile}
          onClick={(event) => handleSectionClick(event, "profile")}
          className="interview-wordmark"
        >
          {CANDIDATE_PROFILE.name}
        </a>
        <nav className="interview-nav" aria-label="網站導覽">
          <a
            href={HEADER_SECTION_HASH.profile}
            aria-current={activeSection === "profile" ? "location" : undefined}
            onClick={(event) => handleSectionClick(event, "profile")}
          >
            履歷
          </a>
          <a
            href={HEADER_SECTION_HASH.proposal}
            aria-current={activeSection === "proposal" ? "location" : undefined}
            onClick={(event) => handleSectionClick(event, "proposal")}
          >
            提案
          </a>
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
  );
}
