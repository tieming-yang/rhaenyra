import type { Metadata } from "next";
import { InterviewHeader } from "@/components/interview-header";
import { ProfileResumeView } from "@/components/profile-resume-view";

export const metadata: Metadata = {
  title: "Rhaenyra Liang｜個人履歷",
};

export default function ProfilePage() {
  return (
    <>
      <InterviewHeader current="profile" />
      <main>
        <ProfileResumeView />
      </main>
    </>
  );
}
