import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rhaenyra Liang × Jstyle北海道株式会社｜面試提案與履歷",
  description:
    "沿著單板滑雪路線，探索 Rhaenyra Liang 為 Jstyle北海道 提出的產品、AI 營運與自然成長提案。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
