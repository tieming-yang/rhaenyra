/**
 * Pure domain types, discriminated unions, and state transition policies
 * for the Rhaenyra Liang × Jstyle Hokkaido portfolio and interview slide deck.
 */

export type ExperienceCategory =
  | "product_management"
  | "ai_ops_engineering"
  | "growth_content"
  | "frontend_uiux";

export type ExperienceCategoryFilter = "all" | ExperienceCategory;

export type BusinessPillarId =
  | "line_ai_automation"
  | "organic_growth_funnel"
  | "seo_geo_analytics"
  | "coach_ops_collaboration";

export type PortfolioViewState =
  | {
      readonly kind: "slides";
      readonly activeSlideIndex: number;
      readonly totalSlides: number;
    }
  | {
      readonly kind: "profile";
      readonly categoryFilter: ExperienceCategoryFilter;
    };

export type SlideNavigationAction =
  | { readonly type: "next" }
  | { readonly type: "prev" }
  | { readonly type: "jump"; readonly targetIndex: number };

export type SlideTransitionOutcome =
  | {
      readonly status: "transitioned";
      readonly nextIndex: number;
      readonly progressPercent: number;
    }
  | {
      readonly status: "boundary_reached";
      readonly boundary: "start" | "end";
      readonly currentIndex: number;
      readonly progressPercent: number;
    }
  | {
      readonly status: "ignored_same_slide";
      readonly currentIndex: number;
      readonly progressPercent: number;
    };

export type JstyleCustomerInquiryInput =
  | {
      readonly service: "car_rental";
      readonly passengers: number;
      readonly largeLuggageCount: number;
      readonly season: "winter_snow" | "spring_sakura_summer";
      readonly region: "hokkaido" | "okayama_shikoku";
    }
  | {
      readonly service: "ski_school";
      readonly participants: number;
      readonly discipline: "ski" | "snowboard";
      readonly skillLevel: "first_timer" | "beginner_turns" | "intermediate_carving";
      readonly preferredArea: "sapporo_teine" | "niseko_rusutsu" | "furano";
    };

export type JstylePreQualificationOutcome =
  | {
      readonly status: "recommended";
      readonly service: "car_rental" | "ski_school";
      readonly headline: string;
      readonly primaryRecommendation: string;
      readonly vehicleOrCourseCode: string;
      readonly safetyAndInsuranceNotes: readonly string[];
      readonly lineRoutingTag: string;
      readonly automationActions: readonly string[];
    }
  | {
      readonly status: "requires_custom_charter";
      readonly reason: string;
      readonly suggestedAlternative: string;
      readonly lineRoutingTag: string;
      readonly automationActions: readonly string[];
    };

/**
 * Validates slide state invariants and computes 1-based percentage progress.
 */
export function computeSlideProgressPercent(
  activeSlideIndex: number,
  totalSlides: number
): number {
  if (!Number.isInteger(totalSlides) || totalSlides <= 0) {
    throw new Error(`Invalid totalSlides invariant: ${totalSlides}`);
  }
  if (
    !Number.isInteger(activeSlideIndex) ||
    activeSlideIndex < 0 ||
    activeSlideIndex >= totalSlides
  ) {
    throw new Error(
      `Slide index ${activeSlideIndex} out of bounds for totalSlides ${totalSlides}`
    );
  }
  return Math.round(((activeSlideIndex + 1) / totalSlides) * 100);
}

/**
 * Pure state transition policy for navigating the interview slide deck.
 * Returns an explicit discriminated union outcome without mutating state.
 */
export function transitionSlideDeck(
  currentState: Extract<PortfolioViewState, { readonly kind: "slides" }>,
  action: SlideNavigationAction
): SlideTransitionOutcome {
  const { activeSlideIndex, totalSlides } = currentState;
  const currentProgress = computeSlideProgressPercent(
    activeSlideIndex,
    totalSlides
  );

  switch (action.type) {
    case "next": {
      if (activeSlideIndex >= totalSlides - 1) {
        return {
          status: "boundary_reached",
          boundary: "end",
          currentIndex: activeSlideIndex,
          progressPercent: currentProgress,
        };
      }
      const nextIndex = activeSlideIndex + 1;
      return {
        status: "transitioned",
        nextIndex,
        progressPercent: computeSlideProgressPercent(nextIndex, totalSlides),
      };
    }
    case "prev": {
      if (activeSlideIndex <= 0) {
        return {
          status: "boundary_reached",
          boundary: "start",
          currentIndex: activeSlideIndex,
          progressPercent: currentProgress,
        };
      }
      const nextIndex = activeSlideIndex - 1;
      return {
        status: "transitioned",
        nextIndex,
        progressPercent: computeSlideProgressPercent(nextIndex, totalSlides),
      };
    }
    case "jump": {
      if (
        !Number.isInteger(action.targetIndex) ||
        action.targetIndex < 0 ||
        action.targetIndex >= totalSlides
      ) {
        throw new Error(
          `Invalid target slide index: ${action.targetIndex} (totalSlides: ${totalSlides})`
        );
      }
      if (action.targetIndex === activeSlideIndex) {
        return {
          status: "ignored_same_slide",
          currentIndex: activeSlideIndex,
          progressPercent: currentProgress,
        };
      }
      return {
        status: "transitioned",
        nextIndex: action.targetIndex,
        progressPercent: computeSlideProgressPercent(
          action.targetIndex,
          totalSlides
        ),
      };
    }
  }
}

/**
 * Pure domain policy simulating Jstyle Hokkaido's AI LINE pre-qualification assistant.
 * Evaluates luggage + passenger space constraints or ski instructor matching rules.
 */
export function evaluateJstyleInquiry(
  input: JstyleCustomerInquiryInput
): JstylePreQualificationOutcome {
  switch (input.service) {
    case "car_rental": {
      if (
        !Number.isInteger(input.passengers) ||
        input.passengers < 1 ||
        input.passengers > 20
      ) {
        throw new Error(`Invalid passenger count: ${input.passengers}`);
      }
      if (
        !Number.isInteger(input.largeLuggageCount) ||
        input.largeLuggageCount < 0 ||
        input.largeLuggageCount > 20
      ) {
        throw new Error(
          `Invalid large luggage count: ${input.largeLuggageCount}`
        );
      }

      // Cross-field capacity calculation: 1 large 28" suitcase takes ~1.2 seat-equivalents when winter coats/snowboards are present
      const winterMultiplier = input.season === "winter_snow" ? 1.25 : 1.0;
      const effectiveLoadUnits =
        input.passengers + Math.ceil(input.largeLuggageCount * winterMultiplier);

      if (input.passengers > 9 || effectiveLoadUnits > 14) {
        return {
          status: "requires_custom_charter",
          reason: `同行 ${input.passengers} 人搭配 ${input.largeLuggageCount} 件大行李已超過單台自駕租車安全載重上限`,
          suggestedAlternative:
            "建議轉介「Jstyle 專屬中文包車（綠牌海獅 / 雙車調度）」或拆分為 2 台 SUV 自駕方案",
          lineRoutingTag: "LINE_TAG:轉介旅遊包車客服 + 租車雙車報價",
          automationActions: [
            "n8n 自動同步需求至 Notion 客製包車派工表",
            "自動推播 Rezio 一日包車固定路線與點對點接送價目參考",
          ],
        };
      }

      const regionLabel =
        input.region === "hokkaido" ? "北海道據點" : "岡山・四國跨區據點";
      const seasonalNote =
        input.season === "winter_snow"
          ? "冬季標配 4WD 四輪驅動與高規格雪胎，並附雪地煞車距離與除雪教學短片"
          : "春櫻/夏季自駕含 ETC 卡片租借建議與熱門景點停車動線指南";

      if (effectiveLoadUnits <= 4 && input.largeLuggageCount <= 2) {
        return {
          status: "recommended",
          service: "car_rental",
          headline: `${regionLabel}｜輕巧都會／雙人自駕首選`,
          primaryRecommendation:
            "緊湊型 SUV / 掀背車（Toyota Raize / Yaris Cross 同級）",
          vehicleOrCourseCode: "JSTYLE-RENTAL-COMPACT-4WD",
          safetyAndInsuranceNotes: [
            seasonalNote,
            "建議加購完整免責補償 + NOC（營業損失賠償）安心方案，旅途突發狀況由中文客服即時協處",
          ],
          lineRoutingTag: "LINE_TAG:租車客服・標準快速核價",
          automationActions: [
            "AI 預填取還車時間與新千歲/札幌市區據點偏好",
            "GA4 觸發預審完成事件 (lead_prequalified_rental)",
          ],
        };
      }

      if (effectiveLoadUnits <= 7 && input.largeLuggageCount <= 4) {
        return {
          status: "recommended",
          service: "car_rental",
          headline: `${regionLabel}｜家庭與好友舒適休旅方案`,
          primaryRecommendation:
            "中大型休旅 / 7人座 MPV（Land Cruiser 250 / Voxy / Sienta 同級）",
          vehicleOrCourseCode: "JSTYLE-RENTAL-SUV-MPV-4WD",
          safetyAndInsuranceNotes: [
            seasonalNote,
            `已預留第三排收折空間以容納 ${input.largeLuggageCount} 件 28 吋行李箱`,
            "含中文取車交接檢核表與 24 小時事故聯繫支援說明",
          ],
          lineRoutingTag: "LINE_TAG:租車客服・休旅車型保留",
          automationActions: [
            "n8n 自動查詢合作車行（Suzuki / Family 等）即時庫存",
            "LINE 自動發送車廂行李擺放示意圖，減少人工重複解說",
          ],
        };
      }

      return {
        status: "recommended",
        service: "car_rental",
        headline: `${regionLabel}｜多人團體旗艦大空間方案`,
        primaryRecommendation:
          "Toyota Hiace 10人座大海獅 / Alphard 豪華商務車（配備 4WD 雪胎）",
        vehicleOrCourseCode: "JSTYLE-RENTAL-HIACE-10P",
        safetyAndInsuranceNotes: [
          seasonalNote,
          `寬敞尾廂可同時容納 ${input.passengers} 名乘客與 ${input.largeLuggageCount} 件大型行李／雪具袋`,
          "提醒確認台灣駕照日文譯本效期與對應車型駕駛資格",
        ],
        lineRoutingTag: "LINE_TAG:租車客服・Hiace旗艦車隊專席",
        automationActions: [
          "優先鎖定旺季稀缺 Hiace 4WD 車源並通知真人客服 15 分鐘內接手",
          "同步推送「自駕 vs. 中文司機包車」費用與體力比較小卡",
        ],
      };
    }

    case "ski_school": {
      if (
        !Number.isInteger(input.participants) ||
        input.participants < 1 ||
        input.participants > 12
      ) {
        throw new Error(`Invalid ski participants count: ${input.participants}`);
      }

      if (input.participants > 6) {
        return {
          status: "requires_custom_charter",
          reason: `${input.participants} 人團體上課若由單一教練帶領，會稀釋安全照護與動作指導品質`,
          suggestedAlternative:
            "建議由 Jstyle 20+ 國際認證中文教練團隊安排「雙教練分組教學（依程度/年齡拆組）」並搭配雪場專車接送",
          lineRoutingTag: "LINE_TAG:滑雪客服・雙教練團課專案",
          automationActions: [
            "n8n 自動檢索指定雪場時段可同時出勤之 2 名同語系教練",
            "自動生成含雪場包車接送之整合報價單草稿",
          ],
        };
      }

      const areaName =
        input.preferredArea === "sapporo_teine"
          ? "札幌近郊（手稻 Teine / 國際雪場）"
          : input.preferredArea === "niseko_rusutsu"
            ? "粉雪聖地（二世古 Niseko / 留壽都）"
            : "富良野滑雪場（Furano）";

      const disciplineName =
        input.discipline === "ski" ? "雙板滑雪 (Ski)" : "單板滑雪 (Snowboard)";

      const levelPlan =
        input.skillLevel === "first_timer"
          ? "零基礎安心破冰班（穿脫雪具、安全跌倒、平地滑行與初級綠線煞車控制）"
          : input.skillLevel === "beginner_turns"
            ? "初階進階班（S Turn 連續轉彎、纜車上下安全技巧與穩定控速）"
            : "中階粉雪與 Carving 精進班（紅黑線地形適應、重心轉換與北海道粉雪攻略）";

      return {
        status: "recommended",
        service: "ski_school",
        headline: `${areaName}｜${disciplineName}私人中文教練課程`,
        primaryRecommendation: `${ input.participants } 人專屬定製・${levelPlan}`,
        vehicleOrCourseCode: `JSTYLE-SKI-${input.discipline.toUpperCase()}-${input.skillLevel.toUpperCase()}`,
        safetyAndInsuranceNotes: [
          "全中文國際認證教練一對一／小班指導，消除語言隔閡與初學恐懼",
          "課前自動發送雪具租借尺寸表、防寒穿搭清單與雪場集合定位圖",
        ],
        lineRoutingTag: `LINE_TAG:滑雪客服・${areaName.slice(0, 4)}教練媒合`,
        automationActions: [
          "自動比對 20+ 教練排班表並預留時段",
          "串接租車／雪場專車接送加購詢問，提升客單價 (Cross-sell)",
        ],
      };
    }
  }
}
