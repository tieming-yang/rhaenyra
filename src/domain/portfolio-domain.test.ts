import { describe, expect, it } from "vitest";
import { filterWorkExperiences, WORK_EXPERIENCES } from "./portfolio-data";
import { createWorkBadge, RESUME_BADGES } from "./resume-showcase-data";

describe("filterWorkExperiences", () => {
  it("filters work experiences purely by category", () => {
    expect(filterWorkExperiences(WORK_EXPERIENCES, "all").length).toBe(
      WORK_EXPERIENCES.length
    );
    const aiItems = filterWorkExperiences(
      WORK_EXPERIENCES,
      "ai_ops_engineering"
    );
    expect(aiItems.length).toBeGreaterThan(0);
    expect(
      aiItems.every((item) => item.categories.includes("ai_ops_engineering"))
    ).toBe(true);
  });
});

describe("RESUME_BADGES", () => {
  it("orders all 10 badges newest-to-oldest along the resume timeline", () => {
    expect(RESUME_BADGES.map((badge) => badge.id)).toEqual([
      "beacon",
      "thinker-data",
      "houston-teaching",
      "eternal-story",
      "youtube-creator",
      "tvbs",
      "dentall",
      "bole",
      "nuturefit",
      "taiwan-teaching",
    ]);

    for (const badge of RESUME_BADGES) {
      expect(badge.company.length).toBeGreaterThan(0);
      expect(badge.role.length).toBeGreaterThan(0);
      expect(badge.period.length).toBeGreaterThan(0);
      expect(badge.note.length).toBeGreaterThan(0);
    }
  });

  it("throws when creating a badge for an unknown work experience id", () => {
    expect(() => createWorkBadge("non-existent-id", "note")).toThrow(
      "Missing work experience entry for badge id: non-existent-id"
    );
  });
});
