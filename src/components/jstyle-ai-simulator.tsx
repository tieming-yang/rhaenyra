"use client";

import { useState } from "react";
import {
  Car,
  CheckCircle2,
  MountainSnow,
  Sparkles,
  Workflow,
  AlertTriangle,
} from "lucide-react";
import {
  evaluateJstyleInquiry,
  type ModernThemeId,
} from "@/domain/portfolio-domain";

interface JstyleAiSimulatorProps {
  readonly themeId: ModernThemeId;
}

export function JstyleAiSimulator({ themeId }: JstyleAiSimulatorProps) {
  const [serviceTab, setServiceTab] = useState<"car_rental" | "ski_school">(
    "car_rental"
  );

  // Car rental state
  const [passengers, setPassengers] = useState<number>(4);
  const [largeLuggage, setLargeLuggage] = useState<number>(3);
  const [season, setSeason] = useState<"winter_snow" | "spring_sakura_summer">(
    "winter_snow"
  );
  const [region, setRegion] = useState<"hokkaido" | "okayama_shikoku">(
    "hokkaido"
  );

  // Ski school state
  const [skiParticipants, setSkiParticipants] = useState<number>(2);
  const [discipline, setDiscipline] = useState<"ski" | "snowboard">(
    "snowboard"
  );
  const [skillLevel, setSkillLevel] = useState<
    "first_timer" | "beginner_turns" | "intermediate_carving"
  >("first_timer");
  const [preferredArea, setPreferredArea] = useState<
    "sapporo_teine" | "niseko_rusutsu" | "furano"
  >("sapporo_teine");

  const isDark = themeId === "B3";

  const evaluation =
    serviceTab === "car_rental"
      ? evaluateJstyleInquiry({
          service: "car_rental",
          passengers,
          largeLuggageCount: largeLuggage,
          season,
          region,
        })
      : evaluateJstyleInquiry({
          service: "ski_school",
          participants: skiParticipants,
          discipline,
          skillLevel,
          preferredArea,
        });

  return (
    <div
      className={`rounded-2xl border p-4 md:p-5 transition-colors ${
        isDark
          ? "border-slate-700/80 bg-slate-900/90 text-slate-100"
          : "border-slate-200/90 bg-white/95 text-slate-900 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="text-xs font-bold tracking-tight">
              互動式產品原型 Demo｜Jstyle LINE 客服 AI 預審與 n8n 自動派單模擬器
            </div>
            <div className="text-xs opacity-65">
              調整左側旅客參數，即時預覽純函式規則與 AI 如何為「租車／滑雪 LINE 客服」完成前置分流
            </div>
          </div>
        </div>

        {/* Service Switcher */}
        <div
          className={`inline-flex rounded-lg p-0.5 border text-xs ${
            isDark
              ? "border-slate-700 bg-slate-800/90"
              : "border-slate-200 bg-slate-100/80"
          }`}
        >
          <button
            type="button"
            onClick={() => setServiceTab("car_rental")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-all ${
              serviceTab === "car_rental"
                ? "bg-sky-600 text-white shadow-xs"
                : "opacity-70 hover:opacity-100"
            }`}
          >
            <Car className="h-3.5 w-3.5" />
            租車車型 × 行李試算
          </button>
          <button
            type="button"
            onClick={() => setServiceTab("ski_school")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-all ${
              serviceTab === "ski_school"
                ? "bg-rose-600 text-white shadow-xs"
                : "opacity-70 hover:opacity-100"
            }`}
          >
            <MountainSnow className="h-3.5 w-3.5" />
            中文滑雪教練媒合
          </button>
        </div>
      </div>

      {/* Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left Controls */}
        <div
          className={`lg:col-span-5 rounded-xl border p-3.5 flex flex-col justify-between space-y-3 ${
            isDark
              ? "border-slate-800 bg-slate-950/60"
              : "border-slate-200/80 bg-slate-50/70"
          }`}
        >
          {serviceTab === "car_rental" ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>乘客人數（大人＋孩童）</span>
                  <span className="text-sky-600 font-bold">{passengers} 位</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>28 吋大型行李箱／雪具袋數量</span>
                  <span className="text-rose-600 font-bold">
                    {largeLuggage} 件
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={largeLuggage}
                  onChange={(e) => setLargeLuggage(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-xs font-medium opacity-75 mb-1">
                    出發季節
                  </label>
                  <select
                    value={season}
                    onChange={(e) =>
                      setSeason(
                        e.target.value as
                          | "winter_snow"
                          | "spring_sakura_summer"
                      )
                    }
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                      isDark
                        ? "border-slate-700 bg-slate-900 text-slate-100"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <option value="winter_snow">冬季雪地（需 4WD 雪胎）</option>
                    <option value="spring_sakura_summer">
                      春櫻／夏秋自駕
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium opacity-75 mb-1">
                    取車區域
                  </label>
                  <select
                    value={region}
                    onChange={(e) =>
                      setRegion(
                        e.target.value as "hokkaido" | "okayama_shikoku"
                      )
                    }
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                      isDark
                        ? "border-slate-700 bg-slate-900 text-slate-100"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <option value="hokkaido">北海道（札幌／新千歲）</option>
                    <option value="okayama_shikoku">
                      岡山・四國（跨區新線）
                    </option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>預約上課人數</span>
                  <span className="text-rose-600 font-bold">
                    {skiParticipants} 位學員
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={skiParticipants}
                  onChange={(e) => setSkiParticipants(Number(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium opacity-75 mb-1">
                    滑行項目
                  </label>
                  <select
                    value={discipline}
                    onChange={(e) =>
                      setDiscipline(e.target.value as "ski" | "snowboard")
                    }
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                      isDark
                        ? "border-slate-700 bg-slate-900 text-slate-100"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <option value="snowboard">單板 (Snowboard)</option>
                    <option value="ski">雙板 (Ski)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium opacity-75 mb-1">
                    目標雪場區域
                  </label>
                  <select
                    value={preferredArea}
                    onChange={(e) =>
                      setPreferredArea(
                        e.target.value as
                          | "sapporo_teine"
                          | "niseko_rusutsu"
                          | "furano"
                      )
                    }
                    className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                      isDark
                        ? "border-slate-700 bg-slate-900 text-slate-100"
                        : "border-slate-200 bg-white text-slate-900"
                    }`}
                  >
                    <option value="sapporo_teine">札幌手稻 / 國際</option>
                    <option value="niseko_rusutsu">二世古 / 留壽都</option>
                    <option value="furano">富良野雪場</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium opacity-75 mb-1">
                  學員目前程度
                </label>
                <select
                  value={skillLevel}
                  onChange={(e) =>
                    setSkillLevel(
                      e.target.value as
                        | "first_timer"
                        | "beginner_turns"
                        | "intermediate_carving"
                    )
                  }
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                    isDark
                      ? "border-slate-700 bg-slate-900 text-slate-100"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <option value="first_timer">
                    完全零基礎（第一次接觸雪具）
                  </option>
                  <option value="beginner_turns">
                    初階（可綠線煞車，想練連續轉彎）
                  </option>
                  <option value="intermediate_carving">
                    中階（想挑戰紅黑線與北海道粉雪）
                  </option>
                </select>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs opacity-75">
            <span>預期減省客服人工詢問時間</span>
            <span className="font-bold text-emerald-600">≈ 60% – 70%</span>
          </div>
        </div>

        {/* Right Output Panel */}
        <div
          className={`lg:col-span-7 rounded-xl border p-3.5 flex flex-col justify-between ${
            evaluation.status === "recommended"
              ? isDark
                ? "border-sky-500/30 bg-sky-950/20"
                : "border-sky-200/90 bg-sky-50/40"
              : isDark
                ? "border-rose-500/30 bg-rose-950/20"
                : "border-rose-200/90 bg-rose-50/40"
          }`}
        >
          {evaluation.status === "recommended" ? (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {evaluation.headline}
                </span>
                <span className="rounded-md bg-sky-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-sky-700 dark:text-sky-300">
                  {evaluation.vehicleOrCourseCode}
                </span>
              </div>

              <div className="text-sm font-extrabold">
                推薦方案：{evaluation.primaryRecommendation}
              </div>

              <ul className="space-y-1 text-xs opacity-85">
                {evaluation.safetyAndInsuranceNotes.map((note) => (
                  <li key={note} className="flex items-start gap-1.5">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                  超出標準自駕／單一教練安全上限・自動啟動跨事業轉介
                </span>
              </div>

              <div className="text-xs font-semibold opacity-85">
                原因：{evaluation.reason}
              </div>

              <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                AI 轉介方案：{evaluation.suggestedAlternative}
              </div>
            </div>
          )}

          {/* n8n & LINE Routing Footer */}
          <div
            className={`mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                <Workflow className="h-3.5 w-3.5" />
                n8n 自動化分流與後續動作：
              </span>
              <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-mono text-white dark:bg-slate-800">
                {evaluation.lineRoutingTag}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {evaluation.automationActions.map((act) => (
                <div
                  key={act}
                  className={`rounded-lg px-2.5 py-1 text-xs border ${
                    isDark
                      ? "border-slate-800 bg-slate-900/80"
                      : "border-slate-200/80 bg-white/90"
                  }`}
                >
                  • {act}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
