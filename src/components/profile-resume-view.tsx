"use client";

import Image from "next/image";
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileDown,
  GraduationCap,
  Mail,
  Presentation,
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
import {
  resolveThemeTokens,
  type ExperienceCategoryFilter,
  type ModernThemeId,
} from "@/domain/portfolio-domain";
import { JstyleAiSimulator } from "./jstyle-ai-simulator";

interface ProfileResumeViewProps {
  readonly categoryFilter: ExperienceCategoryFilter;
  readonly themeId: ModernThemeId;
  readonly onChangeCategory: (category: ExperienceCategoryFilter) => void;
  readonly onSwitchToSlides: (slideIndex?: number) => void;
}

const FILTER_OPTIONS: readonly ExperienceCategoryFilter[] = [
  "all",
  "product_management",
  "ai_ops_engineering",
  "growth_content",
  "frontend_uiux",
];

export function ProfileResumeView({
  categoryFilter,
  themeId,
  onChangeCategory,
  onSwitchToSlides,
}: ProfileResumeViewProps) {
  const tokens = resolveThemeTokens(themeId);
  const filteredExperiences = filterWorkExperiences(
    WORK_EXPERIENCES,
    categoryFilter
  );

  const cardSurfaceClass = tokens.isDark
    ? "bg-slate-900/90 border-slate-800 text-slate-100"
    : "bg-white/95 border-slate-200/90 text-slate-900 shadow-xs";

  const heroSurfaceStyle = {
    background: tokens.surfaceHero,
    color: tokens.textHero,
    borderColor: tokens.borderHero,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-4 sm:px-6">
      {/* Hero Profile Banner */}
      <section
        className="rounded-3xl border p-6 sm:p-8 shadow-sm transition-all"
        style={heroSurfaceStyle}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-0.5 text-xs font-bold text-rose-500">
                Jstyle北海道株式会社・主動應徵履歷與賦能提案
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: tokens.textHeroMuted }}
              >
                產品管理｜軟體開發｜AI 營運自動化｜數據協作｜市場行銷
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-300/60 dark:border-slate-700 shadow-sm">
                <Image
                  src={CANDIDATE_PROFILE.photoUrl}
                  alt={CANDIDATE_PROFILE.name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {CANDIDATE_PROFILE.name}
                </h1>
                <p
                  className="text-xs sm:text-sm font-medium mt-0.5"
                  style={{ color: tokens.textHeroMuted }}
                >
                  {CANDIDATE_PROFILE.chinesePositioning}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <a
                    href={`mailto:${CANDIDATE_PROFILE.email}`}
                    className="inline-flex items-center gap-1 font-medium underline opacity-85 hover:opacity-100"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {CANDIDATE_PROFILE.email}
                  </a>
                </div>
              </div>
            </div>

            <p
              className="text-xs sm:text-sm leading-relaxed pt-1"
              style={{ color: tokens.textHeroMuted }}
            >
              {CANDIDATE_PROFILE.executiveSummary}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onSwitchToSlides(0)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors"
              >
                <Presentation className="h-4 w-4" />
                進入面試簡報模式（8 頁完整提案）
              </button>
              <a
                href={CANDIDATE_PROFILE.resumePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-400/40 px-3.5 py-2.5 text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                <FileDown className="h-4 w-4" />
                下載／檢視原始履歷 PDF
              </a>
            </div>
          </div>

          {/* 2x2 Key Metrics inside Hero */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-2.5">
            {KEY_METRICS.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border p-3.5 backdrop-blur-md"
                style={{
                  background: tokens.surfacePrimary,
                  color: tokens.textPrimary,
                  borderColor: tokens.borderSubtle,
                }}
              >
                <div
                  className={`h-1 w-6 rounded-full mb-2 ${
                    m.accentAxis === "snow" ? "bg-sky-500" : "bg-rose-500"
                  }`}
                />
                <div
                  className={`text-xl font-black tracking-tight ${
                    m.accentAxis === "snow"
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {m.value}
                </div>
                <div className="text-xs font-bold mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: What I Can Bring to Jstyle Hokkaido (4 Strategic Pillars) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Value Proposition for Jstyle Hokkaido
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
              我能為 Jstyle北海道 帶來的四大具體價值（結合現有業務 × 個人專長）
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onSwitchToSlides(3)}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 underline"
          >
            於簡報模式全螢幕檢視 →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {JSTYLE_VALUE_PROPOSALS.map((prop) => (
            <div
              key={prop.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between ${cardSurfaceClass}`}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-4 w-1.5 rounded-full ${
                        prop.axis === "snow" ? "bg-sky-500" : "bg-rose-500"
                      }`}
                    />
                    <span
                      className={`font-mono text-xs font-bold ${
                        prop.axis === "snow"
                          ? "text-sky-600 dark:text-sky-400"
                          : "text-rose-600 dark:text-rose-400"
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

                <div className="rounded-xl bg-slate-500/5 p-3 mb-3 text-xs leading-relaxed">
                  <span className="font-bold">現況挑戰：</span>
                  <span className="opacity-85">{prop.currentPainPoint}</span>
                </div>

                <ul className="space-y-1.5 text-xs leading-relaxed mb-4">
                  {prop.proposedSolutions.map((sol) => (
                    <li key={sol} className="flex items-start gap-1.5">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${
                          prop.axis === "snow"
                            ? "text-sky-500"
                            : "text-rose-500"
                        }`}
                      />
                      <span>{sol}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-2">
                <div className="text-xs">
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    過往實績佐證：
                  </span>
                  <span className="opacity-80">{prop.resumeProof}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {prop.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-slate-500/10 px-2 py-0.5 text-xs font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live AI Pre-Qualification Demo */}
        <JstyleAiSimulator themeId={themeId} />
      </section>

      {/* Section 2: Filterable Work & Project Experience Timeline */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                工作經歷與產品專案（Work & Project Experience）
              </h2>
              <p className="text-xs opacity-70">
                點擊右側標籤可依專業領域篩選相關經歷
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((cat) => {
              const active = cat === categoryFilter;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onChangeCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "border border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {filteredExperiences.map((exp) => (
            <div
              key={exp.id}
              className={`rounded-2xl border p-5 transition-all ${cardSurfaceClass}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`h-3.5 w-1.5 rounded-full ${
                        exp.accentAxis === "snow" ? "bg-sky-500" : "bg-rose-500"
                      }`}
                    />
                    <h3 className="text-base font-extrabold">{exp.company}</h3>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      ｜{exp.role}
                    </span>
                  </div>
                  {exp.subRoles && (
                    <div className="mt-1 flex flex-wrap gap-1.5 pl-3.5">
                      {exp.subRoles.map((sr) => (
                        <span
                          key={sr}
                          className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300"
                        >
                          {sr}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="rounded-lg bg-slate-500/10 px-2.5 py-1 font-mono text-xs font-medium">
                  {exp.period}
                </span>
              </div>

              <ul className="space-y-1.5 pl-3.5 text-xs sm:text-sm leading-relaxed opacity-90 mb-3">
                {exp.highlights.map((hl) => (
                  <li key={hl} className="list-disc">
                    {hl}
                  </li>
                ))}
              </ul>

              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs flex items-start gap-2 ${
                  exp.accentAxis === "snow"
                    ? "border-sky-500/25 bg-sky-500/5"
                    : "border-rose-500/25 bg-rose-500/5"
                }`}
              >
                <Sparkles
                  className={`h-4 w-4 shrink-0 mt-0.5 ${
                    exp.accentAxis === "snow"
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                />
                <div>
                  <span className="font-bold">對 Jstyle北海道 的直接助益：</span>
                  <span className="opacity-90">{exp.jstyleRelevance}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Skills Matrix & Education / Teaching */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {SKILL_GROUPS.map((sg) => (
            <div
              key={sg.id}
              className={`rounded-2xl border p-4.5 flex flex-col justify-between ${cardSurfaceClass}`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`h-3.5 w-1.5 rounded-full ${
                      sg.accentAxis === "snow" ? "bg-sky-500" : "bg-rose-500"
                    }`}
                  />
                  <h3 className="text-sm font-extrabold">{sg.title}</h3>
                </div>
                <p className="text-xs leading-relaxed opacity-80 mb-3">
                  {sg.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sg.tools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-medium"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className={`lg:col-span-4 rounded-2xl border p-5 flex flex-col justify-between ${cardSurfaceClass}`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <GraduationCap className="h-5 w-5" />
              <h3 className="text-sm font-extrabold">
                教育背景與台美教學經驗
              </h3>
            </div>

            <div className="rounded-xl bg-slate-500/5 p-3">
              <div className="text-xs font-bold">
                {EDUCATION_AND_TEACHING.degree}
              </div>
            </div>

            <div className="space-y-2 text-xs leading-relaxed opacity-85">
              <p>• {EDUCATION_AND_TEACHING.overseasTeaching}</p>
              <p>• {EDUCATION_AND_TEACHING.localTeaching}</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-1 text-xs">
            <div className="font-bold">語言能力</div>
            <div className="opacity-80">
              • 英文：全英文看美劇、電影及文獻，並在美國休士頓教授過舞蹈
            </div>
            <div className="opacity-80">• 日文：持續學習精進中</div>
            <div className="opacity-80">• 中文：母語（繁體中文專業文案與企劃）</div>
          </div>
        </div>
      </section>

      {/* Section 4: 30-60-90 Day Plan Summary */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold tracking-tight">
          加入 Jstyle北海道 後的 30-60-90 天行動藍圖
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {ROADMAP_30_60_90.map((r) => (
            <div
              key={r.phase}
              className={`rounded-2xl border p-4.5 ${cardSurfaceClass}`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span
                  className={
                    r.axis === "snow"
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-rose-600 dark:text-rose-400"
                  }
                >
                  {r.phase}
                </span>
                <span className="opacity-65">{r.timeframe}</span>
              </div>
              <div className="text-sm font-extrabold mb-2">{r.title}</div>
              <ul className="space-y-1.5 text-xs leading-relaxed opacity-85">
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
        className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${cardSurfaceClass}`}
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
            className="font-semibold text-rose-600 dark:text-rose-400 underline"
          >
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
