import { ArrowDown } from "lucide-react";
import { InterviewHeader } from "@/components/interview-header";
import { ProposalDeskFinale } from "@/components/proposal-desk-finale";
import { ResumeShowcase } from "@/components/resume-showcase";
import { SnowboardRun } from "@/components/snowboard-run";
import { getSiteContent } from "@/content";
import "./resume-showcase.css";
import "./proposal-desk-finale.css";

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
          proposal={content.proposal}
        />

        <section
          id="proposal"
          className="interview-run"
          aria-labelledby="proposal-title"
        >
          <header className="run-intro">
            <p className="interview-kicker">{content.proposal.intro.eyebrow}</p>
            <h2 id="proposal-title">{content.proposal.intro.title}</h2>
            {content.proposal.intro.subtitle.trim().length > 0 ? (
              <p className="run-intro-subtitle">
                {content.proposal.intro.subtitle}
              </p>
            ) : null}
            <a className="run-start" href={`#${firstWaypointId}`}>
              {content.proposal.intro.startCtaLabel}
              <ArrowDown className="size-4" aria-hidden="true" />
            </a>
          </header>

          <SnowboardRun content={content.proposal} />

          <ProposalDeskFinale
            finish={content.proposal.finish}
            proposalIntro={content.proposal.intro}
            badge={content.hero.badge}
            profile={content.site.profile}
          />
        </section>
      </main>
    </>
  );
}
