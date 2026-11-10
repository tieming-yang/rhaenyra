import Link from "next/link";
import { ArrowDown, ArrowRight, Mail } from "lucide-react";
import { InterviewHeader } from "@/components/interview-header";
import { SnowboardRun } from "@/components/snowboard-run";
import { CANDIDATE_PROFILE } from "@/domain/portfolio-data";

export default function HomePage() {
  return (
    <>
      <InterviewHeader current="run" />
      <main className="interview-run">
        <section className="run-intro" aria-labelledby="run-title">
          <p className="interview-kicker">{CANDIDATE_PROFILE.targetCompany} · 面試提案</p>
          <h1 id="run-title">{CANDIDATE_PROFILE.name}</h1>
          <p className="run-intro-subtitle">{CANDIDATE_PROFILE.chinesePositioning}</p>
          <a className="run-start" href="#intro">
            向下探索
            <ArrowDown className="size-4" aria-hidden="true" />
          </a>
        </section>

        <SnowboardRun />

        <footer className="run-finish">
          <p className="interview-kicker">FINISH</p>
          <h2>感謝閱讀</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/profile" className="interview-button interview-button-primary">
              查看完整履歷
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a href={`mailto:${CANDIDATE_PROFILE.email}`} className="interview-button">
              <Mail className="size-4" aria-hidden="true" />
              聯絡我
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
