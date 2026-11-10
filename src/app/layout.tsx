import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rhaenyra Liang × Jstyle北海道株式会社｜個人履歷與面試提案簡報",
  description:
    "Rhaenyra Liang 應徵 Jstyle北海道株式会社 之互動式個人履歷與面試提案簡報網站——結合產品管理、AI 營運自動化、SEO/GEO 與零廣告百萬級社群成長實績。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Script
          src="/vendor/liquid-glass/components.js"
          type="module"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
