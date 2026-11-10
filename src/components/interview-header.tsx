import Link from "next/link";
import { FileDown } from "lucide-react";
import { CANDIDATE_PROFILE } from "@/domain/portfolio-data";

export function InterviewHeader({ current }: { readonly current: "run" | "profile" }) {
  return (
    <header className="interview-header">
      <div className="interview-header-inner">
        <Link href="/" className="interview-wordmark">{CANDIDATE_PROFILE.name}</Link>
        <nav className="interview-nav" aria-label="網站導覽">
          <Link href="/" aria-current={current === "run" ? "page" : undefined}>提案</Link>
          <Link href="/profile" aria-current={current === "profile" ? "page" : undefined}>履歷</Link>
        </nav>
        <a
          href={CANDIDATE_PROFILE.resumePdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="interview-pdf"
        >
          <FileDown className="hidden size-4 sm:block" aria-hidden="true" />
          履歷 PDF
        </a>
      </div>
    </header>
  );
}
