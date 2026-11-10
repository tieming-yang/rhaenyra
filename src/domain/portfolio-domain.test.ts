import { describe, expect, it } from "vitest";
import {
  computeSlideProgressPercent,
  evaluateJstyleInquiry,
  resolveThemeTokens,
  transitionSlideDeck,
} from "./portfolio-domain";
import {
  filterWorkExperiences,
  INTERVIEW_SLIDES,
  WORK_EXPERIENCES,
} from "./portfolio-data";

describe("computeSlideProgressPercent", () => {
  it("computes 1-based percentage accurately across valid bounds", () => {
    expect(computeSlideProgressPercent(0, 8)).toBe(13);
    expect(computeSlideProgressPercent(3, 8)).toBe(50);
    expect(computeSlideProgressPercent(7, 8)).toBe(100);
  });

  it("throws immediately when totalSlides or activeSlideIndex violates invariants", () => {
    expect(() => computeSlideProgressPercent(0, 0)).toThrow(
      /Invalid totalSlides/
    );
    expect(() => computeSlideProgressPercent(-1, 8)).toThrow(/out of bounds/);
    expect(() => computeSlideProgressPercent(8, 8)).toThrow(/out of bounds/);
    expect(() => computeSlideProgressPercent(1.5, 8)).toThrow(/out of bounds/);
  });
});

describe("transitionSlideDeck", () => {
  it("transitions forward and backward within valid slide bounds", () => {
    const initial = {
      kind: "slides" as const,
      activeSlideIndex: 2,
      totalSlides: INTERVIEW_SLIDES.length,
    };

    const nextOutcome = transitionSlideDeck(initial, { type: "next" });
    expect(nextOutcome).toEqual({
      status: "transitioned",
      nextIndex: 3,
      progressPercent: 50,
    });

    const prevOutcome = transitionSlideDeck(initial, { type: "prev" });
    expect(prevOutcome).toEqual({
      status: "transitioned",
      nextIndex: 1,
      progressPercent: 25,
    });
  });

  it("returns explicit boundary_reached outcome at start and end without throwing", () => {
    const atStart = {
      kind: "slides" as const,
      activeSlideIndex: 0,
      totalSlides: 8,
    };
    expect(transitionSlideDeck(atStart, { type: "prev" })).toEqual({
      status: "boundary_reached",
      boundary: "start",
      currentIndex: 0,
      progressPercent: 13,
    });

    const atEnd = {
      kind: "slides" as const,
      activeSlideIndex: 7,
      totalSlides: 8,
    };
    expect(transitionSlideDeck(atEnd, { type: "next" })).toEqual({
      status: "boundary_reached",
      boundary: "end",
      currentIndex: 7,
      progressPercent: 100,
    });
  });

  it("handles jump action for new target, same slide, and out-of-bounds target", () => {
    const state = {
      kind: "slides" as const,
      activeSlideIndex: 1,
      totalSlides: 8,
    };
    expect(transitionSlideDeck(state, { type: "jump", targetIndex: 1 })).toEqual({
      status: "ignored_same_slide",
      currentIndex: 1,
      progressPercent: 25,
    });

    expect(transitionSlideDeck(state, { type: "jump", targetIndex: 5 })).toEqual({
      status: "transitioned",
      nextIndex: 5,
      progressPercent: 75,
    });

    expect(() =>
      transitionSlideDeck(state, { type: "jump", targetIndex: 99 })
    ).toThrow(/Invalid target slide index/);
  });
});

describe("evaluateJstyleInquiry", () => {
  it("recommends compact 4WD SUV for 2 passengers with 2 suitcases in winter Hokkaido", () => {
    const outcome = evaluateJstyleInquiry({
      service: "car_rental",
      passengers: 2,
      largeLuggageCount: 1,
      season: "winter_snow",
      region: "hokkaido",
    });

    expect(outcome.status).toBe("recommended");
    if (outcome.status === "recommended") {
      expect(outcome.vehicleOrCourseCode).toBe("JSTYLE-RENTAL-COMPACT-4WD");
      expect(outcome.headline).toContain("北海道據點");
    }
  });

  it("recommends mid-large SUV/MPV for family of 4 with 2 large suitcases in Okayama/Shikoku", () => {
    const outcome = evaluateJstyleInquiry({
      service: "car_rental",
      passengers: 4,
      largeLuggageCount: 2,
      season: "spring_sakura_summer",
      region: "okayama_shikoku",
    });

    expect(outcome.status).toBe("recommended");
    if (outcome.status === "recommended") {
      expect(outcome.vehicleOrCourseCode).toBe("JSTYLE-RENTAL-SUV-MPV-4WD");
      expect(outcome.headline).toContain("岡山・四國跨區據點");
    }
  });

  it("recommends Hiace 10-seater for 6 passengers with 5 suitcases", () => {
    const outcome = evaluateJstyleInquiry({
      service: "car_rental",
      passengers: 6,
      largeLuggageCount: 5,
      season: "winter_snow",
      region: "hokkaido",
    });

    expect(outcome.status).toBe("recommended");
    if (outcome.status === "recommended") {
      expect(outcome.vehicleOrCourseCode).toBe("JSTYLE-RENTAL-HIACE-10P");
    }
  });

  it("returns requires_custom_charter when passenger + luggage load exceeds single self-drive safety limit", () => {
    const outcome = evaluateJstyleInquiry({
      service: "car_rental",
      passengers: 9,
      largeLuggageCount: 8,
      season: "winter_snow",
      region: "hokkaido",
    });

    expect(outcome.status).toBe("requires_custom_charter");
    if (outcome.status === "requires_custom_charter") {
      expect(outcome.lineRoutingTag).toContain("轉介旅遊包車客服");
    }
  });

  it("evaluates ski school inquiry and escalates large group (>6) to dual-instructor charter", () => {
    const normalSki = evaluateJstyleInquiry({
      service: "ski_school",
      participants: 2,
      discipline: "snowboard",
      skillLevel: "first_timer",
      preferredArea: "sapporo_teine",
    });
    expect(normalSki.status).toBe("recommended");

    const largeGroupSki = evaluateJstyleInquiry({
      service: "ski_school",
      participants: 8,
      discipline: "ski",
      skillLevel: "beginner_turns",
      preferredArea: "niseko_rusutsu",
    });
    expect(largeGroupSki.status).toBe("requires_custom_charter");
  });

  it("throws immediately on malformed inquiry counts", () => {
    expect(() =>
      evaluateJstyleInquiry({
        service: "car_rental",
        passengers: 0,
        largeLuggageCount: 2,
        season: "winter_snow",
        region: "hokkaido",
      })
    ).toThrow(/Invalid passenger count/);

    expect(() =>
      evaluateJstyleInquiry({
        service: "car_rental",
        passengers: 2,
        largeLuggageCount: -1,
        season: "winter_snow",
        region: "hokkaido",
      })
    ).toThrow(/Invalid large luggage count/);
  });
});

describe("resolveThemeTokens & filterWorkExperiences", () => {
  it("resolves all 3 refined Plan B theme palettes", () => {
    expect(resolveThemeTokens("B1").isDark).toBe(false);
    expect(resolveThemeTokens("B2").surfaceHero).toBe("#0F172A");
    expect(resolveThemeTokens("B3").isDark).toBe(true);
  });

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
