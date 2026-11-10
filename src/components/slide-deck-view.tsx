"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileDown,
  Layers,
  Mail,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Users,
  Bot,
} from "lucide-react";
import {
  CANDIDATE_PROFILE,
  EDUCATION_AND_TEACHING,
  INTERVIEW_SLIDES,
  JSTYLE_ECOSYSTEM_OVERVIEW,
  JSTYLE_VALUE_PROPOSALS,
  KEY_METRICS,
  ROADMAP_30_60_90,
  SKILL_GROUPS,
} from "@/domain/portfolio-data";
import {
  computeSlideProgressPercent,
  type SlideNavigationAction,
} from "@/domain/portfolio-domain";
import { JstyleAiSimulator } from "./jstyle-ai-simulator";

interface SlideDeckViewProps {
  readonly activeSlideIndex: number;
  readonly onNavigate: (action: SlideNavigationAction) => void;
  readonly onSwitchToProfile: () => void;
}

export function SlideDeckView({
  activeSlideIndex,
  onNavigate,
  onSwitchToProfile,
}: SlideDeckViewProps) {
  const currentSlide = INTERVIEW_SLIDES[activeSlideIndex];
  const progressPercent = computeSlideProgressPercent(
    activeSlideIndex,
    INTERVIEW_SLIDES.length
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNavigate({ type: "next" });
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onNavigate({ type: "prev" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNavigate]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-4 sm:px-6">
      {/* Top Slide Progress & Quick Jump Bar */}
      <div
        className="mb-5 rounded-2xl border p-3 backdrop-blur-md interview-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 font-mono text-xs font-bold text-rose-600">
              SLIDE {currentSlide.slideNumber} / 0{INTERVIEW_SLIDES.length}
            </span>
            <span className="text-xs font-semibold opacity-75">
              {currentSlide.tag}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden sm:inline text-xs opacity-60 mr-2">
              可使用鍵盤 ← → 方向鍵翻頁
            </span>
            <button
              type="button"
              onClick={() => onNavigate({ type: "prev" })}
              disabled={activeSlideIndex === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold disabled:opacity-35 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              上一頁
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ type: "next" })}
              disabled={activeSlideIndex === INTERVIEW_SLIDES.length - 1}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white px-3 py-1 text-xs font-semibold disabled:opacity-35 hover:opacity-90 transition-opacity"
            >
              下一頁
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Slide Index Pills */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {INTERVIEW_SLIDES.map((s) => {
            const isActive = s.index === activeSlideIndex;
            const accentBar =
              s.axis === "snow"
                ? "bg-sky-500"
                : s.axis === "sakura"
                  ? "bg-rose-500"
                  : "bg-gradient-to-r from-sky-500 to-rose-500";
            return (
              <button
                key={s.slideNumber}
                type="button"
                onClick={() => onNavigate({ type: "jump", targetIndex: s.index })}
                className={`group relative overflow-hidden rounded-lg border px-2 py-1.5 text-left transition-all ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200/70 opacity-70 hover:opacity-100"
                }`}
              >
                <div className={`h-0.5 w-full rounded-full mb-1 ${accentBar}`} />
                <div className="font-mono text-xs font-bold leading-none">
                  {s.slideNumber}
                </div>
              </button>
            );
          })}
        </div>

        {/* Thin Progress Line */}
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-rose-500 to-rose-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Slide Stage */}
      <div className="space-y-4">
        {/* Slide Header Banner */}
        <div
          className="interview-panel rounded-2xl border p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-xs font-bold tracking-wider uppercase text-rose-500">
              {currentSlide.tag}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-snug mb-2">
            {currentSlide.title}
          </h1>
          <p
            className="text-xs sm:text-sm leading-relaxed"
          >
            {currentSlide.subtitle}
          </p>
        </div>

        {/* SLIDE 01: COVER */}
        {activeSlideIndex === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div
              className="lg:col-span-5 rounded-2xl border p-5 flex flex-col justify-between interview-panel"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 shadow-xs">
                  <Image
                    src={CANDIDATE_PROFILE.photoUrl}
                    alt={CANDIDATE_PROFILE.name}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600 mb-1">
                    Jstyle北海道 主動應徵
                  </div>
                  <h2 className="text-xl font-extrabold tracking-tight">
                    {CANDIDATE_PROFILE.name}
                  </h2>
                  <p className="text-xs opacity-75">
                    {CANDIDATE_PROFILE.chinesePositioning}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed opacity-85 mb-5">
                {CANDIDATE_PROFILE.executiveSummary}
              </p>

              <div className="space-y-2 pt-3 border-t border-slate-200/70">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate({ type: "next" })}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors"
                  >
                    開始瀏覽提案簡報
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onSwitchToProfile}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 transition-colors"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    切換至完整履歷視圖
                  </button>
                  <a
                    href={CANDIDATE_PROFILE.resumePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100 transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    原始履歷 PDF
                  </a>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {KEY_METRICS.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl border p-4 flex flex-col justify-between interview-panel"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`h-1.5 w-8 rounded-full ${
                          m.accentAxis === "snow" ? "bg-sky-500" : "bg-rose-500"
                        }`}
                      />
                      <span className="text-xs font-semibold opacity-60">
                        實戰量化指標
                      </span>
                    </div>
                    <div
                      className={`text-2xl sm:text-3xl font-black tracking-tight mb-1 ${
                        m.accentAxis === "snow"
                          ? "text-sky-600"
                          : "text-rose-600"
                      }`}
                    >
                      {m.value}
                    </div>
                    <div className="text-sm font-bold mb-1.5">{m.label}</div>
                  </div>
                  <p className="text-xs leading-relaxed opacity-75">
                    {m.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 02: WHO I AM (T-SHAPED CAPABILITIES) */}
        {activeSlideIndex === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {SKILL_GROUPS.map((sg) => (
                <div
                  key={sg.id}
                  className="rounded-2xl border p-4.5 flex flex-col justify-between interview-panel"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-4 w-1.5 rounded-full ${
                            sg.accentAxis === "snow"
                              ? "bg-sky-500"
                              : "bg-rose-500"
                          }`}
                        />
                        <h3 className="text-sm sm:text-base font-bold">
                          {sg.title}
                        </h3>
                      </div>
                      <span className="text-xs font-mono opacity-60">
                        {sg.subtitle}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-80 mb-3">
                      {sg.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60">
                    {sg.tools.map((t) => (
                      <span
                        key={t}
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          sg.accentAxis === "snow"
                            ? "bg-sky-500/10 text-sky-700"
                            : "bg-rose-500/10 text-rose-700"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 interview-panel"
            >
              <div>
                <div className="text-xs font-bold text-sky-600 mb-0.5">
                  獨特加分項：實體教學與跨文化溝通背景（國立臺灣藝術大學舞蹈學系）
                </div>
                <p className="text-xs opacity-80">
                  {EDUCATION_AND_TEACHING.overseasTeaching}{" "}
                  深刻理解「教練排課、學員分級與現場教學服務」的產業本質。
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-semibold">
                英語流利 · 日語持續精進中
              </span>
            </div>
          </div>
        )}

        {/* SLIDE 03: JSTYLE HOKKAIDO BUSINESS INSIGHT */}
        {activeSlideIndex === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {JSTYLE_ECOSYSTEM_OVERVIEW.map((pillar, idx) => (
                <div
                  key={pillar.name}
                  className="rounded-2xl border p-4 flex flex-col justify-between interview-panel"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-500/10">
                        CORE 0{idx + 1}
                      </span>
                      <span className="text-xs font-mono opacity-65">
                        {pillar.domain}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold mb-2">
                      {pillar.name}
                    </h3>
                    <div className="rounded-xl bg-slate-500/5 p-2.5 mb-2.5">
                      <div className="text-xs font-bold opacity-70 mb-0.5">
                        現有核心優勢
                      </div>
                      <p className="text-xs leading-relaxed opacity-85">
                        {pillar.currentStrength}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`rounded-xl border p-2.5 ${
                      pillar.axis === "snow"
                        ? "border-sky-500/25 bg-sky-500/5"
                        : "border-rose-500/25 bg-rose-500/5"
                    }`}
                  >
                    <div
                      className={`text-xs font-bold mb-0.5 ${
                        pillar.axis === "snow"
                          ? "text-sky-600"
                          : "text-rose-600"
                      }`}
                    >
                      數位與 AI 放大機會點
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">
                      {pillar.growthOpportunity}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 4 Pillars Summary Matrix */}
            <div className="rounded-2xl border p-4 interview-panel">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-2">
                Rhaenyra 為 Jstyle 規劃的四大成長槓桿（點擊可跳轉至對應提案頁）
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {JSTYLE_VALUE_PROPOSALS.map((prop, i) => (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() =>
                      onNavigate({ type: "jump", targetIndex: 3 + i })
                    }
                    className="text-left rounded-xl border border-slate-200/80 p-3 hover:border-rose-500/50 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span
                        className={
                          prop.axis === "snow"
                            ? "text-sky-600"
                            : "text-rose-600"
                        }
                      >
                        提案 {prop.numberLabel}
                      </span>
                      <span className="opacity-50">→ Slide 0{4 + i}</span>
                    </div>
                    <div className="text-xs font-bold leading-snug">
                      {prop.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 04: PROPOSAL 01 (AI LINE PRE-QUALIFICATION + LIVE SIMULATOR) */}
        {activeSlideIndex === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
              <div
                className="lg:col-span-5 rounded-2xl border p-4 interview-panel"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-sky-600 mb-1.5">
                  <Bot className="h-4 w-4" />
                  痛點診斷：三大 LINE 客服的旺季人力瓶頸
                </div>
                <p className="text-xs leading-relaxed opacity-85 mb-3">
                  {JSTYLE_VALUE_PROPOSALS[0].currentPainPoint}
                </p>
                <div className="rounded-xl bg-sky-500/10 p-2.5 text-xs">
                  <span className="font-bold text-sky-700">
                    過往實績佐證：
                  </span>{" "}
                  {JSTYLE_VALUE_PROPOSALS[0].resumeProof}
                </div>
              </div>

              <div
                className="lg:col-span-7 rounded-2xl border p-4 interview-panel"
              >
                <div className="text-xs font-bold text-rose-600 mb-2">
                  具體落地解法（AI 預審小卡 × n8n 自動派工 × 知識庫監控）
                </div>
                <ul className="space-y-2 text-xs leading-relaxed">
                  {JSTYLE_VALUE_PROPOSALS[0].proposedSolutions.map((sol) => (
                    <li key={sol} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-500 mt-0.5" />
                      <span>{sol}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Interactive Prototype */}
            <JstyleAiSimulator />
          </div>
        )}

        {/* SLIDE 05: PROPOSAL 02 (ZERO-AD ORGANIC GROWTH ENGINE) */}
        {activeSlideIndex === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div
              className="lg:col-span-5 rounded-2xl border p-5 flex flex-col justify-between interview-panel"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  為什麼 Jstyle 非常適合啟動 Threads 與短影音裂變？
                </div>
                <p className="text-xs sm:text-sm leading-relaxed opacity-85 mb-4">
                  {JSTYLE_VALUE_PROPOSALS[1].currentPainPoint}
                </p>

                <div className="space-y-2.5">
                  <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
                    <div className="text-xs font-bold text-rose-600 mb-1">
                      實戰驗證 1｜Beacon 守護臺灣
                    </div>
                    <p className="text-xs opacity-85">
                      從零經營 Threads，0 廣告預算於 54 天內累積{" "}
                      <strong>10,000+ 不重複下載</strong>、
                      <strong>140萬+ 瀏覽</strong>，兩週衝上台灣 App Store
                      排行榜第 2 名。
                    </p>
                  </div>

                  <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
                    <div className="text-xs font-bold text-sky-600 mb-1">
                      實戰驗證 2｜YouTube 頻道 0→2,100 訂閱
                    </div>
                    <p className="text-xs opacity-85">
                      僅靠 8 支影片與系統化標題、縮圖 A/B 測試，半個月累積{" "}
                      <strong>15.59 萬次自然曝光</strong>。
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-semibold text-rose-600">
                預期成果：{JSTYLE_VALUE_PROPOSALS[1].expectedImpact}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-3">
              {JSTYLE_VALUE_PROPOSALS[1].proposedSolutions.map((sol, idx) => (
                <div
                  key={sol}
                  className="rounded-2xl border p-4 interview-panel"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="rounded-md bg-rose-500/15 px-2 py-0.5 font-mono text-xs font-bold text-rose-600">
                      ACTION 0{idx + 1}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed">{sol}</p>
                </div>
              ))}

              <div
                className="rounded-2xl border p-4 interview-panel bg-gradient-to-r from-sky-500/5 to-rose-500/5"
              >
                <div className="text-xs font-bold mb-1">
                  立即可執行的內容企劃範例（北海道 × 岡山四國）
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-slate-200/70 p-2.5">
                    <div className="font-bold text-sky-600 mb-0.5">
                      冬季雪駕避坑系列
                    </div>
                    <div className="opacity-75">
                      「北海道租車最常犯的 5 個行李與保險錯誤」Threads 懶人包
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200/70 p-2.5">
                    <div className="font-bold text-rose-600 mb-0.5">
                      春櫻與夏秋包車企劃
                    </div>
                    <div className="opacity-75">
                      針對家庭孝親與攝影客群，推出「免自駕疲勞」客製包車動線對比
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200/70 p-2.5">
                    <div className="font-bold text-sky-600 mb-0.5">
                      岡山・四國跨區開箱
                    </div>
                    <div className="opacity-75">
                      將「北海道女婿」嚴選服務標準複製至瀨戶內海自駕新路線
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 06: PROPOSAL 03 (MULTI-SITE GA4 & AI SEARCH GEO) */}
        {activeSlideIndex === 5 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div
              className="lg:col-span-6 rounded-2xl border p-5 flex flex-col justify-between interview-panel"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 mb-2">
                  <BarChart3 className="h-4 w-4" />
                  多站點 GA4 + GTM 跨網域轉換漏斗建置
                </div>
                <p className="text-xs leading-relaxed opacity-85 mb-4">
                  目前旅客在 `jstylehokkaido.com`、`jstylerentalcar.com`、
                  `jstyleski.com` 與 `rezio.shop` 之間跳轉時，容易產生數據斷點。
                </p>

                <div className="space-y-2 text-xs">
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <div className="font-bold mb-0.5">
                      Step 1｜跨網域歸因 (Cross-Domain Attribution)
                    </div>
                    <div className="opacity-75">
                      追蹤旅客從哪支 YouTube 影片或哪篇 SEO
                      攻略進入網站，最終點擊哪一個 LINE 客服按鈕。
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 p-3">
                    <div className="font-bold mb-0.5">
                      Step 2｜A/B 測試與轉換率優化 (CRO)
                    </div>
                    <div className="opacity-75">
                      運用過往導入 Firebase Remote Config + n8n A/B
                      測試經驗，持續實測不同行動呼籲文案與版面配置。
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs opacity-75">
                對應技能：GA4 / GTM / Firebase A/B Testing / Next.js 前端實作
              </div>
            </div>

            <div
              className="lg:col-span-6 rounded-2xl border p-5 flex flex-col justify-between interview-panel"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 mb-2">
                  SEO × AI 可讀性（AIO / GEO）結構化工程
                </div>
                <p className="text-xs leading-relaxed opacity-85 mb-4">
                  越來越多台灣與香港旅客直接向 ChatGPT、Perplexity 或 Google AI
                  提問：「北海道冬天租車哪家有中文客服與 4WD 雪胎？」、「手稻滑雪場中文教練推薦？」
                </p>

                <div className="space-y-2 text-xs">
                  {JSTYLE_VALUE_PROPOSALS[2].proposedSolutions.map((sol) => (
                    <div
                      key={sol}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 flex items-start gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                      <span>{sol}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs font-semibold text-rose-600">
                實績佐證：{JSTYLE_VALUE_PROPOSALS[2].resumeProof}
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 07: PROPOSAL 04 (COACH OPS, NOTION SOP & B2B PITCHING) */}
        {activeSlideIndex === 6 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div
              className="lg:col-span-5 rounded-2xl border p-5 flex flex-col justify-between interview-panel"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 mb-2">
                  <Users className="h-4 w-4" />
                  為什麼我能快速融入「教練排課 × 跨國營運」？
                </div>
                <p className="text-xs leading-relaxed opacity-85 mb-4">
                  {JSTYLE_VALUE_PROPOSALS[3].currentPainPoint}
                </p>

                <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5 space-y-2 text-xs">
                  <div className="font-bold text-sky-700">
                    Crispygrooves 預約平台 PM × 台美實體授課經驗
                  </div>
                  <p className="opacity-85 leading-relaxed">
                    我曾親自擔任台灣與美國休士頓舞蹈教師，並以 AI
                    輔助開發「Crispygrooves
                    課程預約平台」，非常熟悉教練排班衝突、學員程度落差與課前溝通痛點。
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs opacity-75">
                同時具備 Thinker Data 產品長（CPO）帶領非科技背景成員之 Mentor
                經驗
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 gap-3">
              {JSTYLE_VALUE_PROPOSALS[3].proposedSolutions.map((sol, idx) => (
                <div
                  key={sol}
                  className="rounded-2xl border p-4 flex items-start gap-3 interview-panel"
                >
                  <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 font-mono text-xs font-bold text-sky-600">
                    0{idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm leading-relaxed">{sol}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLIDE 08: 30-60-90 DAY ROADMAP & CLOSING CTA */}
        {activeSlideIndex === 7 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {ROADMAP_30_60_90.map((phase) => (
                <div
                  key={phase.phase}
                  className="rounded-2xl border p-4.5 flex flex-col justify-between interview-panel"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                          phase.axis === "snow"
                            ? "bg-sky-500/15 text-sky-600"
                            : "bg-rose-500/15 text-rose-600"
                        }`}
                      >
                        {phase.phase}
                      </span>
                      <span className="text-xs font-semibold opacity-70">
                        {phase.timeframe}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold mb-3">
                      {phase.title}
                    </h3>
                    <ul className="space-y-2 text-xs leading-relaxed opacity-85">
                      {phase.deliverables.map((item) => (
                        <li key={item} className="flex items-start gap-1.5">
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                              phase.axis === "snow"
                                ? "bg-sky-500"
                                : "bg-rose-500"
                            }`}
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Closing Contact Card */}
            <div
              className="rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 interview-panel"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
                  Thank You · 感謝您的審閱與面談機會
                </div>
                <h3 className="text-base sm:text-lg font-extrabold mb-1">
                  準備好與 Jstyle北海道 一起打造更安心、順暢、有效率的日本自由行體驗
                </h3>
                <p className="text-xs opacity-75">
                  歡迎隨時點擊下方按鈕檢視完整時間軸履歷、下載 PDF，或直接與我聯繫。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={`mailto:${CANDIDATE_PROFILE.email}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {CANDIDATE_PROFILE.email}
                </a>
                <button
                  type="button"
                  onClick={onSwitchToProfile}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  <Layers className="h-3.5 w-3.5" />
                  查看完整履歷明細
                </button>
                <a
                  href={CANDIDATE_PROFILE.targetCompanyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity"
                >
                  Jstyle 官網
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Takeaway Bar */}
        <div
          className="rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs interview-panel"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sky-600 shrink-0">
              本頁核心結論：
            </span>
            <span className="opacity-85">{currentSlide.keyTakeaway}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate({ type: "prev" })}
              disabled={activeSlideIndex === 0}
              className="underline disabled:opacity-30"
            >
              Prev
            </button>
            <span className="opacity-30">|</span>
            <button
              type="button"
              onClick={() => onNavigate({ type: "next" })}
              disabled={activeSlideIndex === INTERVIEW_SLIDES.length - 1}
              className="underline disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
