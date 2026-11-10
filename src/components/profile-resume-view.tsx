"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Mail,
  Sparkles,
} from "lucide-react";
import {
  CANDIDATE_PROFILE,
  CATEGORY_LABELS,
  EDUCATION_AND_TEACHING,
  filterWorkExperiences,
  JSTYLE_VALUE_PROPOSALS,
  KEY_METRICS,
  ROADMAP_30_60_90,
  SKILL_GROUPS,
  WORK_EXPERIENCES,
} from "@/domain/portfolio-data";
import type { ExperienceCategoryFilter } from "@/domain/portfolio-domain";

const FILTER_OPTIONS: readonly ExperienceCategoryFilter[] = [
  "all",
  "product_management",
  "ai_ops_engineering",
  "growth_content",
  "frontend_uiux",
];

export function ProfileResumeView() {
  const [categoryFilter, setCategoryFilter] = useState<ExperienceCategoryFilter>("all");
  const filteredExperiences = filterWorkExperiences(
    WORK_EXPERIENCES,
    categoryFilter
  );

  return (
    <div className="profile-page">
      <section className="profile-overview" aria-label="實戰量化指標">
        <dl className="profile-metrics" aria-label="實戰量化指標">
          {KEY_METRICS.map((metric) => (
            <div key={metric.id}>
              <dt>{metric.label}</dt>
              <dd className="interview-metric-value">{metric.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="profile-section" aria-labelledby="experience-title">
        <header>
          <p className="interview-kicker">01 / WORK & PROJECT EXPERIENCE</p>
          <h2 id="experience-title">工作經歷與產品專案</h2>
        </header>

        <div className="flex flex-wrap gap-2" role="group" aria-label="依專業領域篩選">
          {FILTER_OPTIONS.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              aria-pressed={category === categoryFilter}
              className="interview-button choice-button"
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
        <p className="sr-only" role="status">顯示 {filteredExperiences.length} 筆經歷</p>

        <div className="grid grid-cols-1 gap-3.5">
          {filteredExperiences.map((exp) => (
            <article
              key={exp.id}
              className="rounded-2xl border p-4 sm:p-5 interview-panel"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`h-3.5 w-1.5 rounded-full ${
                        exp.accentAxis === "snow" ? "bg-(--sakura-petal)" : "bg-primary"
                      }`}
                    />
                    <h3 className="text-base font-extrabold">{exp.company}</h3>
                    <span className="text-xs font-bold text-primary">
                      ｜{exp.role}
                    </span>
                  </div>
                  {exp.subRoles && (
                    <div className="mt-1 flex flex-wrap gap-1.5 pl-3.5">
                      {exp.subRoles.map((sr) => (
                        <span
                          key={sr}
                          className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground"
                        >
                          {sr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-xs font-medium">
                  {exp.period}
                </span>
              </div>

              <ul className="space-y-1.5 pl-3.5 text-sm leading-relaxed opacity-90 mb-3">
                {exp.highlights.map((hl) => (
                  <li key={hl} className="list-disc">
                    {hl}
                  </li>
                ))}
              </ul>

              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs flex items-start gap-2 ${
                  exp.accentAxis === "snow"
                    ? "border-border bg-muted"
                    : "border-primary/25 bg-accent/40"
                }`}
              >
                <Sparkles
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    exp.accentAxis === "snow"
                      ? "text-accent-foreground"
                      : "text-primary"
                  }`}
                />
                <div>
                  <span className="font-bold">對 Jstyle北海道 的直接助益：</span>
                  <span className="opacity-90">{exp.jstyleRelevance}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-section" aria-labelledby="skills-title">
        <header>
          <p className="interview-kicker">02 / CAPABILITIES</p>
          <h2 id="skills-title">專長與教育背景</h2>
        </header>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {SKILL_GROUPS.map((sg) => (
              <div
                key={sg.id}
                className="rounded-2xl border p-4.5 flex flex-col justify-between interview-panel"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`h-3.5 w-1.5 rounded-full ${
                        sg.accentAxis === "snow" ? "bg-(--sakura-petal)" : "bg-primary"
                      }`}
                    />
                    <h3 className="text-sm font-extrabold">{sg.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground mb-3">
                    {sg.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sg.tools.map((tool) => (
                    <span
                      key={tool}
                      className="rounded-md border border-border px-2 py-0.5 text-xs font-medium"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div
            className="lg:col-span-4 rounded-2xl border p-5 flex flex-col justify-between interview-panel"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-accent-foreground">
                <GraduationCap className="h-5 w-5" />
                <h3 className="text-sm font-extrabold">
                  教育背景與台美教學經驗
                </h3>
              </div>

              <div className="rounded-xl bg-muted p-3">
                <div className="text-xs font-bold">
                  {EDUCATION_AND_TEACHING.degree}
                </div>
              </div>

              <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                <p>• {EDUCATION_AND_TEACHING.overseasTeaching}</p>
                <p>• {EDUCATION_AND_TEACHING.localTeaching}</p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border space-y-1 text-xs">
              <div className="font-bold">語言能力</div>
              <div className="opacity-80">
                • 英文：全英文看美劇、電影及文獻，並在美國休士頓教授過舞蹈
              </div>
              <div className="opacity-80">• 日文：持續學習精進中</div>
              <div className="opacity-80">• 中文：母語（繁體中文專業文案與企劃）</div>
            </div>
          </div>
        </div>
      </section>

      <section className="profile-section" aria-labelledby="proposals-title">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="interview-kicker">03 / VALUE PROPOSITION</p>
            <h2 id="proposals-title">我能為 Jstyle北海道帶來的四大價值</h2>
          </div>
          <Link href="/#line-workflow" className="interview-button">
            查看客服分流提案
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {JSTYLE_VALUE_PROPOSALS.map((prop) => (
            <div
              key={prop.id}
              className="rounded-2xl border p-5 flex flex-col justify-between interview-panel"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-4 w-1.5 rounded-full ${
                        prop.axis === "snow" ? "bg-(--sakura-petal)" : "bg-primary"
                      }`}
                    />
                    <span
                      className={`font-mono text-xs font-bold ${
                        prop.axis === "snow"
                          ? "text-accent-foreground"
                          : "text-primary"
                      }`}
                    >
                      PROPOSAL {prop.numberLabel} · {prop.axisLabel}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-extrabold mb-1.5">
                  {prop.title}
                </h3>
                <div className="text-xs font-medium opacity-65 mb-3">
                  對應事業：{prop.targetBusiness}
                </div>

                <div className="rounded-xl bg-muted p-3 mb-3 text-sm leading-relaxed">
                  <span className="font-bold">現況挑戰：</span>
                  <span className="opacity-85">{prop.currentPainPoint}</span>
                </div>

                <ul className="space-y-1.5 text-sm leading-relaxed mb-4">
                  {prop.proposedSolutions.map((sol) => (
                    <li key={sol} className="flex items-start gap-1.5">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                          prop.axis === "snow"
                            ? "text-accent-foreground"
                            : "text-primary"
                        }`}
                      />
                      <span>{sol}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-border space-y-2">
                <div className="text-xs">
                  <span className="font-bold text-primary">
                    過往實績佐證：
                  </span>
                  <span className="opacity-80">{prop.resumeProof}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {prop.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-section" aria-labelledby="roadmap-title">
        <header>
          <p className="interview-kicker">04 / ROADMAP</p>
          <h2 id="roadmap-title">加入 Jstyle北海道後的 30–60–90 天行動藍圖</h2>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {ROADMAP_30_60_90.map((r) => (
            <div
              key={r.phase}
              className="rounded-2xl border p-4.5 interview-panel"
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span
                  className={
                    r.axis === "snow"
                      ? "text-accent-foreground"
                      : "text-primary"
                  }
                >
                  {r.phase}
                </span>
                <span className="opacity-65">{r.timeframe}</span>
              </div>
              <h3 className="text-base font-bold mb-2">{r.title}</h3>
              <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                {r.deliverables.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs interview-panel"
      >
        <div>
          <span className="font-bold">
            Rhaenyra Liang × Jstyle北海道株式会社
          </span>
          <span className="opacity-65 ml-2">
            主動應徵數位履歷與成長提案網站
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`mailto:${CANDIDATE_PROFILE.email}`}
            className="inline-flex items-center gap-1.5 font-semibold text-primary underline"
          >
            <Mail className="size-4 shrink-0" aria-hidden="true" />
            {CANDIDATE_PROFILE.email}
          </a>
          <a
            href={CANDIDATE_PROFILE.resumePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold underline"
          >
            下載履歷 PDF
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
