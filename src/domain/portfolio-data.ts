import type {
  BusinessPillarId,
  ExperienceCategory,
  ExperienceCategoryFilter,
} from "./portfolio-domain";

export interface KeyMetricItem {
  readonly id: string;
  readonly value: string;
  readonly label: string;
  readonly detail: string;
  readonly accentAxis: "snow" | "sakura";
}

export interface WorkExperienceItem {
  readonly id: string;
  readonly company: string;
  readonly role: string;
  readonly period: string;
  readonly subRoles?: readonly string[];
  readonly categories: readonly ExperienceCategory[];
  readonly highlights: readonly string[];
  readonly jstyleRelevance: string;
  readonly accentAxis: "snow" | "sakura";
}

export interface SkillGroupItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly tools: readonly string[];
  readonly description: string;
  readonly accentAxis: "snow" | "sakura";
}

export interface JstyleValueProposal {
  readonly id: BusinessPillarId;
  readonly numberLabel: string;
  readonly axis: "snow" | "sakura";
  readonly axisLabel: string;
  readonly title: string;
  readonly targetBusiness: string;
  readonly currentPainPoint: string;
  readonly proposedSolutions: readonly string[];
  readonly expectedImpact: string;
  readonly resumeProof: string;
  readonly tags: readonly string[];
}

export interface RoadmapPhase {
  readonly phase: string;
  readonly timeframe: string;
  readonly title: string;
  readonly axis: "snow" | "sakura";
  readonly deliverables: readonly string[];
}

export const CANDIDATE_PROFILE = {
  name: "Rhaenyra Liang",
  chinesePositioning: "數位產品管理 × AI 營運自動化 × 零廣告自然成長",
  targetCompany: "Jstyle北海道株式会社",
  targetCompanyUrl: "https://www.jstylehokkaido.com/",
  rolePitch: "主動應徵提案｜產品經理・AI 營運工程・成長行銷夥伴",
  email: "rhaenyraliang1999@gmail.com",
  photoUrl: "/profile-photo.png",
  resumePdfUrl: "/rhaenyra-liang-jstyle-resume.pdf",
  coreTagline:
    "將 Jstyle「安心、順暢、有效率」的品牌承諾，透過 AI 營運自動化與百萬級自然流量引擎，轉化為可跨區複製的數位成長飛輪。",
  executiveSummary:
    "具備從 0 到 1 產品打造、AI 客服與 n8n 自動化建置、GA4/GTM 數據實驗，以及 54 天零廣告破萬下載、140 萬瀏覽的實戰經驗。熟悉前端工程與 UI/UX 設計系統，並擁有台美兩地實體授課與跨部門帶領經驗，能無縫串聯 Jstyle 在地旅遊、租車、滑雪三大事業與華語旅客數位體驗。",
} as const;

export const KEY_METRICS: readonly KeyMetricItem[] = [
  {
    id: "views",
    value: "140萬+",
    label: "零廣告自然瀏覽",
    detail: "Beacon 推廣啟動兩週內衝上台灣 App Store 免費新聞類排行榜第 2 名",
    accentAxis: "sakura",
  },
  {
    id: "downloads",
    value: "10,000+",
    label: "54 天不重複下載",
    detail: "從零經營 Threads 社群，完全無付費廣告投放達成破萬轉換與實質營收",
    accentAxis: "sakura",
  },
  {
    id: "ai_ops",
    value: "AI × n8n",
    label: "客服與自動化營運",
    detail: "曾任產品長與 AI 營運工程師，獨立開發線上客服管理系統與 AI 監控部署",
    accentAxis: "snow",
  },
  {
    id: "yt_growth",
    value: "15.59萬",
    label: "半個月影音曝光",
    detail: "YouTube 頻道透過 8 支影片與標題/縮圖 A/B 測試，首月由 0 成長至 2,100 訂閱",
    accentAxis: "snow",
  },
] as const;

export const JSTYLE_VALUE_PROPOSALS: readonly JstyleValueProposal[] = [
  {
    id: "line_ai_automation",
    numberLabel: "01",
    axis: "snow",
    axisLabel: "營運效率與客服自動化（冬雪穩定軸）",
    title: "三大 LINE 官方客服 AI 智慧分流與 n8n 自動化工作流",
    targetBusiness: "旅遊 LINE 客服・租車 LINE 客服・滑雪 LINE 客服",
    currentPainPoint:
      "Jstyle 設有三個獨立 LINE 客服管道，旺季時大量重複性諮詢（如：幾人幾件行李要租哪台車？雪胎與 NOC 保險怎麼算？初學滑雪選哪個雪場？）耗費客服人力，且跨時區／夜間詢問容易流失。",
    proposedSolutions: [
      "導入【LINE AI 智慧預審助手】：旅客加入 LINE 時，透過互動小卡自動收集「出發日期、人數、行李件數、滑雪程度」，即時回傳車型或課程初篩建議。",
      "建立【n8n 跨平台自動化派單】：將預審完成的精準需求自動寫入 Notion / 內部派工表，再交由真人客服進行最終確認與收款，縮短 60% 重複問答時間。",
      "建置【AI 回覆表現監控與知識庫】：彙整北海道雪地事故對應、取還車規範與保險條款，確保客服回覆一致且零失誤。",
    ],
    expectedImpact: "大幅降低旺季第一線客服重複詢問負擔，提升夜間與跨時區詢價留存率",
    resumeProof:
      "Thinker Data：開發線上客服管理聊天系統、建置營運與 AI 回覆表現監控並串接自動化部署；Crispygrooves：AI 輔助開發課程預約與師生管理平台。",
    tags: ["LINE 客服分流", "n8n 自動化", "AI 客服監控", "預約工作流"],
  },
  {
    id: "organic_growth_funnel",
    numberLabel: "02",
    axis: "sakura",
    axisLabel: "自然流量與跨區破圈（春櫻成長軸）",
    title: "零廣告社群成長飛輪 ×「北海道女婿」IP 多平台裂變",
    targetBusiness: "YouTube (@HokkaidoJerry)・Instagram・Threads・岡山/四國新業務",
    currentPainPoint:
      "已有優質的「北海道女婿」YouTube 與 IG 內容資產，但長影音製作成本高；同時租車業務正從北海道拓展至「岡山、四國」，需要高觸及、低成本的破圈獲客管道。",
    proposedSolutions: [
      "打造【Threads 零廣告高轉換漏斗】：將 YouTube 深度攻略（新千歲機場動線、雪地自駕避坑、岡山四國租車攻略）拆解為高互動 Threads 懶人包與討論串，精準導流至官網與 LINE。",
      "導入【標題與縮圖 A/B 測試機制】：運用數據化測試方法優化 YouTube / Reels 點擊率（CTR），並以 Linear + Figma 標準化影音產製排程。",
      "規劃【KOL 互惠與季節主題策展】：結合過往破萬粉絲 KOL 互惠與精品策展經驗，發起「春櫻自駕企劃」、「粉雪早鳥團」等主題活動。",
    ],
    expectedImpact: "以 0 付費廣告預算開拓 Threads 新客池，加速岡山・四國新區域品牌知名度",
    resumeProof:
      "Beacon：從零經營 Threads 無廣告 54 天破 10,000+ 下載、140萬+ 瀏覽、App Store 第 2 名；YouTube 創作者：1 個月 0→2,100 訂閱、半個月 15.59 萬曝光。",
    tags: ["Threads 零廣告成長", "YouTube 縮圖 A/B 測試", "KOL 互惠企劃", "跨區品牌推廣"],
  },
  {
    id: "seo_geo_analytics",
    numberLabel: "03",
    axis: "sakura",
    axisLabel: "數據追蹤與搜尋霸權（春櫻成長軸）",
    title: "多站點 GA4 跨網域漏斗追蹤 × SEO 與 AI 搜尋可讀性（GEO）",
    targetBusiness: "jstylehokkaido.com・jstylerentalcar.com・jstyleski.com・rezio.shop",
    currentPainPoint:
      "集團旗下擁有品牌主站、租車網、滑雪學校網與 Rezio 商城等多個獨立網域，難以完整追蹤「看影片/文章 → 點擊子網站 → 加入 LINE 諮詢」的真實轉換率；且現代旅客大量使用 ChatGPT / AI 搜尋規劃行程。",
    proposedSolutions: [
      "建置【GA4 + GTM 跨網域轉換漏斗】：打通主站至三大事業子站與 LINE 點擊事件，量化每篇旅遊文章與每支影片帶來的實際詢價貢獻。",
      "強化【SEO 與 AI 可讀性（AIO / GEO）】：針對「北海道中文包車推薦」、「北海道雪胎租車」、「二世古中文滑雪教練」等高意圖關鍵字，優化結構化資料（Schema）與問答段落，讓 ChatGPT / Google AI 優先引用 Jstyle。",
      "前端 UI/UX 敏捷優化：直接動手調整著陸頁（Landing Page）行動呼籲（CTA）動線與行動版閱讀體驗，降低跳出率。",
    ],
    expectedImpact: "看清全站流量轉換瓶頸，搶佔傳統搜尋與 AI 旅遊問答雙重自然流量入口",
    resumeProof:
      "Beacon & TVBS：主導官網 SEO 與 AI 內容可讀性優化；Thinker Data：導入 GA4/GTM 並結合 Firebase 與 n8n 建立 A/B 測試環境。",
    tags: ["GA4 / GTM 跨站追蹤", "SEO & AI 可讀性 (GEO)", "轉換率優化 (CRO)", "前端 UI/UX 實作"],
  },
  {
    id: "coach_ops_collaboration",
    numberLabel: "04",
    axis: "snow",
    axisLabel: "組織協作與商務拓展（冬雪穩定軸）",
    title: "20+ 滑雪教練預約協作、台日團隊 Notion 知識庫與 B2B 商務提案",
    targetBusiness: "內部跨國營運團隊・滑雪學校教練團・日本在地合作廠商",
    currentPainPoint:
      "隨著教練團隊擴展至 20 人以上、業務延伸至日本多地區，課程排班、包車司機調度、新進人員培訓與外部廠商（飯店、車行、雪場）商務對接需要更系統化的數位工具支援。",
    proposedSolutions: [
      "優化【教練排課與學員聯繫流程】：借鏡 Crispygrooves 課程預約平台開發經驗，協助梳理教練排班、學員程度表單與課前通知體驗。",
      "建立【Notion 企業知識庫與敏捷看板】：系統化整理北海道四季動線、租車理賠 SOP、雪場規範與行銷素材庫，讓台日遠端與現場團隊高效同步。",
      "支援【B2B 商務合作簡報與提案】：製作高品質中/日/英合作簡報與合作意向書（MOU），支援「廠商合作洽詢」之外部對接。",
    ],
    expectedImpact: "縮短新進人員與季節性教練培訓週期，提升跨部門與外部廠商合作效率",
    resumeProof:
      "Thinker Data：擔任產品長與非科技背景成員 Mentor，建立 Notion 知識庫、Jira 看板、Figma 設計系統與 B2B 商務提案簡報；台美兩地專業教學與跨文化溝通經驗。",
    tags: ["Notion 知識庫 SOP", "預約平台產品經驗", "跨部門敏捷管理", "B2B 商務提案"],
  },
] as const;

export const WORK_EXPERIENCES: readonly WorkExperienceItem[] = [
  {
    id: "beacon",
    company: "Beacon 守護臺灣",
    role: "共同創辦人暨產品工程師",
    period: "2026/03 – 至今（主要產品開發與推廣：2026/03–2026/10）",
    categories: ["product_management", "growth_content", "frontend_uiux"],
    highlights: [
      "社群與自然成長：從零經營 Threads，以無付費廣告方式推廣產品；啟動後 54 天內累積逾 10,000 次不重複下載。",
      "曝光與產品能見度：內容累積逾 140 萬次瀏覽；推廣開始兩週內，達成台灣 App Store 免費新聞類排行榜第 2 名。",
      "SEO 與 AI 可讀性：參與官網 SEO，針對搜尋引擎與 AI 的內容辨識與理解（AIO / GEO）進行結構化優化。",
      "產品與使用者溝通：包辦競品研究、產品設計、官網實作、QA 測試與社群經營，直接與使用者互動並實現商業營收。",
    ],
    jstyleRelevance:
      "可直接複製「0 廣告預算 Threads 自然獲客 + SEO/AI 可讀性優化」經驗，為 Jstyle 北海道全季旅遊及岡山/四國新區域帶來高轉換自然流量。",
    accentAxis: "sakura",
  },
  {
    id: "thinker-data",
    company: "Thinker Data（新創團隊）",
    role: "產品管理與 AI 營運",
    period: "2024/11 – 2026/06",
    subRoles: [
      "產品經理 (2024/11 – 2025/06)",
      "產品長 CPO (2025/06 – 2026/01)",
      "AI 營運工程師 (2026/02 – 2026/06)",
    ],
    categories: [
      "product_management",
      "ai_ops_engineering",
      "growth_content",
      "frontend_uiux",
    ],
    highlights: [
      "AI 自動化與技術支援：開發線上客服管理聊天系統，建置營運與 AI 回覆表現監控，完成系統串接至自動化部署；支援官網開發、除錯及整合測試。",
      "數據追蹤與實驗：導入 GA4／GTM，並以 Firebase Remote Config 與 n8n 建立 A/B 測試基礎環境。",
      "跨團隊溝通與培育：串聯工程、設計與行銷，以敏捷流程對齊優先順序；擔任 Mentor 帶領非科技背景行銷成員熟悉產品、工作流程與行銷策略。",
      "商務提案：製作產品合作簡報與合作意向書（MOU），向外部廠商說明產品價值及合作方案，支援商務對接。",
      "遠端流程與協作：建立 Notion 文件系統、公司知識庫及 Jira 專案看板，導入 Figma 設計系統與 GitHub 程式碼審查流程。",
    ],
    jstyleRelevance:
      "完美對應 Jstyle「旅遊、租車、滑雪三大 LINE 客服分流自動化」、「多網站 GA4 轉換追蹤」與「台日跨團隊 Notion SOP 知識庫建置」。",
    accentAxis: "snow",
  },
  {
    id: "crispygrooves",
    company: "Crispygrooves（產品專案）",
    role: "舞蹈預約平台產品經理",
    period: "2026/08 – 2026/10",
    categories: ["product_management", "ai_ops_engineering", "frontend_uiux"],
    highlights: [
      "運用 AI 輔助規劃與開發客製化舞蹈／皮拉提斯預約平台。",
      "深入訪談一線教學者，將老師實際排課、管理課程時段與學生聯繫需求轉化為直覺的數位產品功能。",
    ],
    jstyleRelevance:
      "與 Jstyle 旗下「20+ 中文滑雪教練排課、學員程度分級與包車預約調度」具備高度同構性，能快速理解教練與客服痛點並數位化。",
    accentAxis: "snow",
  },
  {
    id: "eternal-story",
    company: "Eternal Story",
    role: "網站開發與 UI/UX（兼職）",
    period: "2024/01 – 2024/06",
    categories: ["frontend_uiux"],
    highlights: [
      "維護公司官方網站並開發新功能模組。",
      "導入統一的設計系統（Design System），維持網站介面與品牌視覺呈現的一致性。",
    ],
    jstyleRelevance:
      "協助 Jstyle 統一集團主站、租車網與滑雪學校網的跨站品牌視覺與使用者體驗。",
    accentAxis: "snow",
  },
  {
    id: "youtube-creator",
    company: "YouTube 自媒體頻道",
    role: "數位內容創作者",
    period: "2023/12 – 2024/01",
    categories: ["growth_content"],
    highlights: [
      "內容成長：僅透過 8 支影片，在 1 個月內將頻道訂閱人數由 0 快速成長至 2,100 人。",
      "內容測試與製作管理：系統化測試標題、縮圖與主題，半個月累積 15.59 萬次曝光；使用 Linear 與 Figma 規劃影片製作流程及追蹤進度。",
    ],
    jstyleRelevance:
      "直接賦能 Jstyle「北海道女婿」YouTube 頻道與官網「影音介紹」專區，透過縮圖/標題數據實驗放大既有影音資產效益。",
    accentAxis: "sakura",
  },
  {
    id: "tvbs",
    company: "TVBS 聯利媒體",
    role: "前端工程實習生",
    period: "2023/08 – 2023/12",
    categories: ["frontend_uiux", "growth_content"],
    highlights: [
      "參與三項大型網站開發與維護，並支援技術端 SEO 優化。",
      "導入設計系統及使用者流程圖（User Flow），同時參與實習生社群經營與內容發想。",
    ],
    jstyleRelevance:
      "兼具媒體業內容敏銳度與前端技術力，能快速優化 Jstyle 旅遊攻略文章頁的 SEO 結構與載入體驗。",
    accentAxis: "sakura",
  },
  {
    id: "dentall",
    company: "dentall 台灣牙e通",
    role: "軟體工程實習生",
    period: "2023/02 – 2023/08",
    categories: ["frontend_uiux", "product_management", "ai_ops_engineering"],
    highlights: [
      "獨立研究與規劃 Web App 新功能，完成初步 UI/UX 設計及前端實作。",
      "向決策者提案與展示互動 Demo，功能成功獲採納並整合至團隊 AI 產品中。",
    ],
    jstyleRelevance:
      "具備獨立從「發現問題 → 製作互動原型 Demo → 落地整合 AI 產品」的閉環執行力。",
    accentAxis: "snow",
  },
  {
    id: "curating-and-kol",
    company: "博樂工作室 & NutureFit",
    role: "策展行銷實習生 / 社群行銷實習生",
    period: "2022/05 – 2022/09",
    categories: ["growth_content"],
    highlights: [
      "博樂工作室（2022/08–2022/09）：協助精品品牌活動策展、簡報製作及品牌與製作廠商聯繫，包含 LV 相關合作專案。",
      "NutureFit（2022/05–2022/07）：撰寫互惠推廣企劃，促成與粉絲數逾萬的 KOL 合作；規劃 Instagram 內容與粉絲互動活動。",
    ],
    jstyleRelevance:
      "以精品級審美把關品牌呈現，並能獨立洽談旅遊/滑雪 KOL 互惠合作，擴大 Jstyle 在華語自由行圈的口碑。",
    accentAxis: "sakura",
  },
] as const;

export const SKILL_GROUPS: readonly SkillGroupItem[] = [
  {
    id: "content_social",
    title: "內容企劃與社群自然成長",
    subtitle: "Zero-Ad Viral Growth & Creator Ops",
    tools: ["Threads", "Instagram", "YouTube", "CapCut", "Final Cut Pro", "KOL 互惠企劃"],
    description:
      "擅長以零廣告預算打造破百萬瀏覽之社群內容漏斗，從腳本企劃、剪輯製作到互動活動與 KOL 互惠洽談皆具實戰成果。",
    accentAxis: "sakura",
  },
  {
    id: "ai_seo_tech",
    title: "AI 營運自動化與 SEO / GEO",
    subtitle: "AI Workflow, SEO & Frontend Dev",
    tools: ["n8n", "ChatGPT / Claude Code", "SEO & AI 可讀性", "Next.js / React", "UI/UX (Figma)", "API / 資料庫基礎"],
    description:
      "能親自開發線上客服管理系統、串接 n8n 自動化流程，並優化網站 SEO 與 AI 搜尋引擎可讀性，將技術直接轉化為營運效率。",
    accentAxis: "snow",
  },
  {
    id: "data_experiment",
    title: "數據追蹤與 A/B 測試實驗",
    subtitle: "Analytics & Conversion Optimization",
    tools: ["GA4", "Google Tag Manager (GTM)", "Firebase Remote Config", "標題與縮圖測試", "A/B Testing"],
    description:
      "以數據驅動決策，建置從內容曝光、網站瀏覽到最終詢價轉換的完整追蹤指標，持續透過實驗提升點擊率與轉換率。",
    accentAxis: "sakura",
  },
  {
    id: "pm_collaboration",
    title: "產品管理、遠端協作與跨文化溝通",
    subtitle: "Product Ops & Cross-Cultural Teaching",
    tools: ["Notion 知識庫", "Jira / Linear", "敏捷開發流程", "B2B 商務簡報", "英文流利（美國授課）", "日文持續學習中"],
    description:
      "曾任產品長並具備台灣與美國休士頓第一線授課經驗，擅長將複雜資訊結構化，帶領非技術背景成員並支援跨國商務對接。",
    accentAxis: "snow",
  },
] as const;

export const EDUCATION_AND_TEACHING = {
  degree: "國立臺灣藝術大學｜舞蹈學系 學士 (2018 – 2022)",
  overseasTeaching:
    "2025｜於美國休士頓舞蹈機構全英文教授舞蹈，具備優秀的跨文化現場溝通、學員引導與臨場應變能力。",
  localTeaching:
    "2018 – 2023｜於臺灣舞蹈機構、學校與健身房授課（涵蓋專業訓練學生與一般成人），並具幼兒英文動畫舞蹈編排與指導經驗——深刻理解「教練／教學服務業」的排課邏輯與學員心理。",
} as const;

export const ROADMAP_30_60_90: readonly RoadmapPhase[] = [
  {
    phase: "Phase 01",
    timeframe: "Day 1 – Day 30",
    title: "盤點數位觸點、建立數據基線與客服高頻 QA 知識庫",
    axis: "snow",
    deliverables: [
      "全面盤點集團主站、租車網 (jstylerentalcar)、滑雪網 (jstyleski) 與 Rezio 之 GA4 / GTM 事件追蹤，補齊跨站轉換斷點。",
      "訪談旅遊、租車、滑雪三大 LINE 客服團隊，整理前 30 大高頻重複問題（車型行李配置、冬季雪胎保險、雪場分級）建立 Notion 標準知識庫。",
      "分析「北海道女婿」YouTube 與 IG 既有高表現內容，制定 Threads 裂變與官網 SEO / AI 可讀性優化清單。",
    ],
  },
  {
    phase: "Phase 02",
    timeframe: "Day 31 – Day 60",
    title: "啟動 LINE AI 預審原型與零廣告自然流量成長實驗",
    axis: "sakura",
    deliverables: [
      "上線「租車人數×行李試算」與「滑雪初篩」互動導引流程，透過 n8n 自動將結構化需求派發給對應客服，縮短首次報價時間。",
      "啟動 Threads × IG × YouTube 短長內容連動與標題/縮圖 A/B 測試，針對當季主題（北海道深度遊 & 岡山/四國租車新線）衝刺自然觸及。",
      "優化官網核心服務頁之結構化資料（Schema）與常見問答，提升在 ChatGPT 與 Google AI 搜尋中的品牌引用率。",
    ],
  },
  {
    phase: "Phase 03",
    timeframe: "Day 61 – Day 90",
    title: "跨事業交叉銷售自動化、教練排課協作優化與規模化複製",
    axis: "snow",
    deliverables: [
      "建立「租車/包車 ↔ 滑雪課程 ↔ 餐廳住宿代訂」自動化交叉推薦（Cross-sell）機制，提升單一旅客客單價（LTV）。",
      "協助優化 20+ 滑雪教練與包車團隊之內部排程與行前通知 SOP，並建立 AI 回覆與轉換表現監控儀表板。",
      "產出季度數據洞察報告與 B2B 商務合作提案模板，助力 Jstyle 持續拓展日本跨區域版圖。",
    ],
  },
] as const;

export const INTERVIEW_WAYPOINTS = [
  {
    id: "intro",
    label: "INTRO",
    title: "為北海道旅程設計更順暢的體驗",
    description: "以產品管理、AI 營運自動化與自然成長經驗，協助 Jstyle 串起旅遊、租車和滑雪服務。",
  },
  {
    id: "experience",
    label: "EXPERIENCE",
    title: "從策略到實作",
    description: "從 0 到 1 做產品、前端與自動化。Beacon 在 54 天零廣告投放下累積破萬次不重複下載與 140 萬次瀏覽。",
  },
  {
    id: "jstyle",
    label: "JSTYLE HOKKAIDO",
    title: "從北海道走向岡山與四國",
    description: "旅遊規劃、租車與滑雪已有在地服務基礎。下一步是讓顧客跨區諮詢時，依然容易找到對的服務。",
  },
  {
    id: "line-workflow",
    label: "LINE WORKFLOW",
    title: "讓 LINE 客服少問一步",
    description: "由 AI 整理旅客的日期、人數和需求，再透過 n8n 將租車、包車與滑雪諮詢分流給對應團隊。",
  },
  {
    id: "organic-growth",
    label: "ORGANIC GROWTH",
    title: "讓短影音帶來自然詢問",
    description: "將「北海道女婿」的 YouTube 素材拆成 Threads 與短影音企劃，測試哪些主題能為北海道、岡山與四國帶來詢問。",
  },
  {
    id: "search",
    label: "ANALYTICS & SEARCH",
    title: "看見從搜尋到預約的路徑",
    description: "以 GA4 和 GTM 追蹤各站到 LINE 的轉換，再整理常見旅遊問答，讓搜尋引擎與 AI 更容易理解服務內容。",
  },
  {
    id: "coach-ops",
    label: "COACH OPERATIONS",
    title: "把教練排課和行前通知串起來",
    description: "統整教練時段、學員程度與課前提醒，並用 Notion 文件協助台日團隊與合作夥伴交接。",
  },
  {
    id: "roadmap",
    label: "30 / 60 / 90",
    title: "把提案拆成三個階段",
    description: "先盤點數據與客服需求，再驗證分流與內容實驗，最後推進教練排課和跨事業加購。",
  },
] as const;

export const CATEGORY_LABELS: Readonly<
  Record<ExperienceCategoryFilter, string>
> = {
  all: "全部經歷",
  product_management: "產品管理與策略",
  ai_ops_engineering: "AI 營運與自動化",
  growth_content: "社群成長與內容行銷",
  frontend_uiux: "前端開發與 UI/UX",
};

/**
 * Pure filter helper returning work experiences matching the selected category.
 */
export function filterWorkExperiences(
  experiences: readonly WorkExperienceItem[],
  filter: ExperienceCategoryFilter
): readonly WorkExperienceItem[] {
  if (filter === "all") {
    return experiences;
  }
  return experiences.filter((item) => item.categories.includes(filter));
}
