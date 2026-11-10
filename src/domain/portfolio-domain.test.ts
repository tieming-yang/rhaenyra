import { describe, expect, it } from "vitest";
import { filterWorkExperiences, WORK_EXPERIENCES } from "./portfolio-data";

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
