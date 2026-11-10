import { WORK_EXPERIENCES } from "./portfolio-data";

export interface ResumeBadgeJob {
  readonly id: string;
  readonly company: string;
  readonly role: string;
  readonly period: string;
  readonly note: string;
}

const workExperienceById = new Map(
  WORK_EXPERIENCES.map((experience) => [experience.id, experience])
);

/**
 * Builds a badge entry from canonical `WORK_EXPERIENCES` metadata, throwing if the experience id is unknown.
 */
export function createWorkBadge(id: string, note: string): ResumeBadgeJob {
  const experience = workExperienceById.get(id);
  if (!experience) {
    throw new Error(`Missing work experience entry for badge id: ${id}`);
  }
  return {
    id: experience.id,
    company: experience.company,
    role: experience.role,
    period: experience.period,
    note,
  };
}

/**
 * Work, internship, and teaching badges ordered newest-to-oldest along the resume timeline.
 */
export const RESUME_BADGES: readonly ResumeBadgeJob[] = [
  createWorkBadge(
    "beacon",
    "從產品設計、官網與測試到 Threads 社群經營，推廣後 54 天內突破一萬次不重複下載。"
  ),
  createWorkBadge(
    "thinker-data",
    "歷任產品經理、產品長與 AI 營運工程師，建立 AI 客服監控、數據實驗與跨部門協作流程。"
  ),
  {
    id: "houston-teaching",
    company: "美國休士頓",
    role: "舞蹈教學",
    period: "2025",
    note: "於舞蹈機構以全英文授課，帶領不同背景的學員。",
  },
  createWorkBadge(
    "eternal-story",
    "維護官方網站、開發新功能，並導入一致的品牌介面與設計系統。"
  ),
  createWorkBadge(
    "youtube-creator",
    "透過 8 支影片與標題、縮圖測試，一個月內從零累積至 2,100 位訂閱者。"
  ),
  createWorkBadge(
    "tvbs",
    "參與三項大型網站開發與維護，支援技術 SEO、使用者流程與設計系統。"
  ),
  createWorkBadge(
    "dentall",
    "研究並實作 Web App 新功能，展示互動原型後獲團隊採納。"
  ),
  {
    id: "bole",
    company: "博樂工作室",
    role: "策展行銷實習生",
    period: "2022/08 – 2022/09",
    note: "協助精品品牌活動策展、簡報製作及品牌與製作廠商之間的聯繫。",
  },
  {
    id: "nuturefit",
    company: "NutureFit",
    role: "社群行銷實習生",
    period: "2022/05 – 2022/07",
    note: "撰寫互惠推廣企劃，洽談 KOL 合作，並規劃 Instagram 內容與粉絲活動。",
  },
  {
    id: "taiwan-teaching",
    company: "臺灣",
    role: "舞蹈教學",
    period: "2018 – 2023",
    note: "於舞蹈機構、學校與健身房授課，對象涵蓋專業訓練學生及成人。",
  },
];

interface ResumeProduct {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly title: string;
  readonly summary: string;
  readonly display: string;
  readonly caption: string;
  readonly details: readonly { readonly title: string; readonly text: string }[];
  readonly site: string;
  readonly preview?: string;
}

export const RESUME_PRODUCTS: readonly ResumeProduct[] = [
  {
    id: "beacon",
    name: "Beacon",
    category: "社區安全 App",
    title: "讓附近的安全訊息更容易取得",
    summary: "整合安全地圖、事件回報與 SOS，協助使用者掌握周遭狀況並通知信任的人。",
    display: "10,000+",
    caption: "54 天內的零廣告不重複下載",
    site: "https://beaconapp.club/",
    details: [
      { title: "產品", text: "使用者可查看附近的安全事件、回報現場狀況，並透過 SOS 或一鍵報平安與緊急聯絡人互動。" },
      { title: "角色", text: "共同創辦人暨產品工程師，參與競品研究、產品設計、官網實作、測試與社群經營。" },
      { title: "成果", text: "Threads 內容累積逾 140 萬次瀏覽。推廣啟動後 54 天累積逾 10,000 次不重複下載。" },
    ],
  },
  {
    id: "pocket-wish",
    name: "Pocket Wish",
    category: "願望清單 App",
    title: "把心願留在口袋裡",
    summary: "收藏想要的物品、整理自己的許願池，讓朋友更容易找到合適的禮物。",
    display: "Wish",
    caption: "WISHLISTS & GIFT INSPIRATION",
    site: "https://pocketwish.win/",
    preview: "/resume/screen-pocket-wish.webp",
    details: [
      { title: "產品", text: "用願望清單保存和整理平常發現的物品，讓分享願望變得容易。" },
      { title: "送禮流程", text: "朋友可以參考分享的清單，挑選並保留想送的禮物，方便協調送禮。" },
    ],
  },
  {
    id: "n1ghtmare",
    name: "n1ghtmare",
    category: "日語學習 RPG",
    title: "讓日語練習成為一段冒險",
    summary: "把漢字、單字、文法與閱讀練習放進瀏覽器 RPG，以冒險的方式複習日語。",
    display: "N5–N1",
    caption: "JAPANESE LEARNING RPG",
    site: "https://n1ghtmare.org/",
    preview: "/resume/screen-n1ghtmare.webp",
    details: [
      { title: "產品", text: "在瀏覽器探索 RPG 世界，練習涵蓋預估 JLPT N5 至 N1 程度的原創題目。" },
      { title: "學習體驗", text: "支援訪客遊玩，將題目與解析放進遊戲流程，並提供回顧練習的空間。" },
    ],
  },
  {
    id: "crispygrooves",
    name: "CrispyGrooves",
    category: "預約平台",
    title: "把教室的工作流程帶進手機",
    summary: "以一線教師的排課與聯繫需求為起點，規劃舞蹈與皮拉提斯預約平台。",
    display: "01",
    caption: "BOOKING STUDIO",
    site: "https://crispygrooves.norman-tmy.workers.dev/",
    preview: "/resume/screen-crispygrooves.webp",
    details: [
      { title: "情境", text: "教學者需要同時管理不同課程時段、老師的排課及學生聯繫。" },
      { title: "做法", text: "訪談一線教師，以行動優先的預約流程呈現課程與時段，並用 AI 輔助規劃和開發。" },
      { title: "角色", text: "舞蹈預約平台產品經理，2026/08 – 2026/10。" },
    ],
  },
];
