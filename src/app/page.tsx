import { ArrowDown, ArrowUp, Mail } from "lucide-react";
import { InterviewHeader } from "@/components/interview-header";
import { ResumeShowcase } from "@/components/resume-showcase";
import { SnowboardRun } from "@/components/snowboard-run";
import { getSiteContent } from "@/content";
import { HEADER_SECTION_HREF, PROPOSAL_FINISH_ID } from "@/lib/header-navigation";
import "./resume-showcase.css";

export default function HomePage() {
  const content = getSiteContent();
  const firstWaypointId = content.proposal.waypoints[0].id;

  return (
    <>
      <InterviewHeader
        content={content.common.header}
        resumePdfHref={content.site.profile.resumePdfHref}
      />
      <main id="profile">
        <ResumeShowcase
          profile={content.site.profile}
          hero={content.hero}
          experience={content.experience}
          products={content.products}
        />

        <section
          id="proposal"
          className="interview-run"
          aria-labelledby="proposal-title"
        >
          <header className="run-intro">
            <p className="interview-kicker">{content.proposal.intro.eyebrow}</p>
            <h2 id="proposal-title">{content.proposal.intro.title}</h2>
            <p className="run-intro-subtitle">
              {content.proposal.intro.subtitle}
            </p>
            <a className="run-start" href={`#${firstWaypointId}`}>
              {content.proposal.intro.startCtaLabel}
              <ArrowDown className="size-4" aria-hidden="true" />
            </a>
          </header>

          <SnowboardRun content={content.proposal} />

          <footer id={PROPOSAL_FINISH_ID} className="run-finish">
            <p className="interview-kicker">
              {content.proposal.finish.eyebrow}
            </p>
            <h2>{content.proposal.finish.title}</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={HEADER_SECTION_HREF.hero}
                data-scroll-section="hero"
                className="interview-button interview-button-primary"
              >
                {content.proposal.finish.backToTopLabel}
                <ArrowUp className="size-4" aria-hidden="true" />
              </a>
              <a
                href={`mailto:${content.site.profile.email}`}
                className="interview-button"
              >
                <Mail className="size-4" aria-hidden="true" />
                {content.proposal.finish.contactLabel}
              </a>
            </div>
          </footer>
        </section>
      </main>
    </>
  );
}
