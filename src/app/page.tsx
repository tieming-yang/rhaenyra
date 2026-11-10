import { ArrowDown, ArrowUp, Mail } from "lucide-react";
import { InterviewHeader } from "@/components/interview-header";
import { ResumeShowcase } from "@/components/resume-showcase";
import { SnowboardRun } from "@/components/snowboard-run";
import { CANDIDATE_PROFILE } from "@/domain/portfolio-data";
import { HEADER_SECTION_HREF } from "@/lib/header-navigation";
import "./resume-showcase.css";

export default function HomePage() {
  return (
    <>
      <InterviewHeader />
      <main id="profile">
        <ResumeShowcase />

        <section
          id="proposal"
          className="interview-run"
          aria-labelledby="proposal-title"
        >
          <header className="run-intro">
            <p className="interview-kicker">
              04 / PROPOSAL · {CANDIDATE_PROFILE.targetCompany}
            </p>
            <h2 id="proposal-title">面試與成長提案</h2>
            <p className="run-intro-subtitle">{CANDIDATE_PROFILE.coreTagline}</p>
            <a className="run-start" href="#intro">
              向下探索
              <ArrowDown className="size-4" aria-hidden="true" />
            </a>
          </header>

          <SnowboardRun />

          <footer className="run-finish">
            <p className="interview-kicker">FINISH</p>
            <h2>感謝閱讀</h2>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={HEADER_SECTION_HREF.hero}
                data-scroll-section="hero"
                className="interview-button interview-button-primary"
              >
                回到頂部
                <ArrowUp className="size-4" aria-hidden="true" />
              </a>
              <a
                href={`mailto:${CANDIDATE_PROFILE.email}`}
                className="interview-button"
              >
                <Mail className="size-4" aria-hidden="true" />
                聯絡我
              </a>
            </div>
          </footer>
        </section>
      </main>
    </>
  );
}
