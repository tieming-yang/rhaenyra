import type { Metadata } from "next";
import { InterviewHeader } from "@/components/interview-header";
import { ResumeShowcase } from "@/components/resume-showcase";
import "./resume-showcase.css";

export const metadata: Metadata = {
  title: "Rhaenyra Liang｜個人履歷",
};

export default function ProfilePage() {
  return (
    <>
      <InterviewHeader current="profile" />
      <main>
        <ResumeShowcase />
      </main>
    </>
  );
}
