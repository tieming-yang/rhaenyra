import { describe, expect, it } from "vitest";
import rawSite from "./site.json";
import zhHantCommon from "./locales/zh-Hant/common.json";
import zhHantExperience from "./locales/zh-Hant/experience.json";
import zhHantHero from "./locales/zh-Hant/hero.json";
import zhHantProducts from "./locales/zh-Hant/products.json";
import zhHantProposal from "./locales/zh-Hant/proposal.json";
import {
  DEFAULT_LOCALE,
  formatContentTemplate,
  getSiteContent,
  parseSiteContent,
  type RawSiteContentInput,
  type SupportedLocale,
} from "./index";

function createValidRawInput(): RawSiteContentInput {
  return structuredClone({
    locale: "zh-Hant",
    site: rawSite,
    bundle: {
      common: zhHantCommon,
      hero: zhHantHero,
      experience: zhHantExperience,
      products: zhHantProducts,
      proposal: zhHantProposal,
    },
  });
}

describe("getSiteContent", () => {
  it("loads and validates the default zh-Hant content bundle with shared site assets joined", () => {
    const content = getSiteContent();

    expect(DEFAULT_LOCALE).toBe("zh-Hant");
    expect(content.locale).toBe("zh-Hant");
    expect(content.site.profile.email).toBe("rhaenyraliang1999@gmail.com");
    expect(content.hero.cover.headline).toBe("梁紓寧");
    expect(content.hero.cover.watermark).toBe("Rhaenyra Liang");
    expect(content.common.header.nav).toEqual({
      hero: "簡介",
      "job-desk": "經歷",
      "product-cases": "產品",
      proposal: "自我推薦",
    });

    expect(content.experience.items.map((item) => item.id)).toEqual([
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
    expect(content.experience.items[0].logoSrc).toBe("/resume/jobs/beacon.webp");
    expect(content.experience.items[0].bullets).toHaveLength(4);
    expect(content.experience.items[1].bullets).toHaveLength(5);
    expect(content.experience.items[2].logoSrc).toBeUndefined();
    expect(content.experience.items[2].fallbackMark).toBe("HT");
    expect(content.experience.items[9].bullets).toHaveLength(2);

    expect(content.products.readCaseLabel).toBe("成果");
    expect(content.products.items.map((item) => item.id)).toEqual([
      "beacon",
      "pocket-wish",
      "n1ghtmare",
      "crispygrooves",
    ]);
    expect(content.products.items[0].details).toHaveLength(4);
    expect(content.products.items[1].details).toEqual([]);
    expect(content.products.items[2].details).toEqual([]);
    expect(content.products.items[3].details).toHaveLength(1);
    expect(content.products.items[0].previewSrc).toBeUndefined();
    expect(content.products.items[1].previewSrc).toBe(
      "/resume/screen-pocket-wish.webp"
    );

    expect(content.proposal.waypoints.map((item) => item.id)).toEqual([
      "why-hokkaido",
      "why-jstyle",
      "after-beacon",
      "core-strengths",
      "closing",
    ]);
    for (const waypoint of content.proposal.waypoints) {
      expect(waypoint.bullets).toHaveLength(3);
    }
  });

  it("throws when requesting an unsupported locale at runtime", () => {
    expect(() => getSiteContent("en" as unknown as SupportedLocale)).toThrow(
      "Unsupported locale: en"
    );
  });
});

describe("parseSiteContent validation", () => {
  it("rejects empty strings, invalid emails, invalid asset paths, and non-http URLs", () => {
    const emptyHeadline = createValidRawInput();
    (
      emptyHeadline.bundle.hero as { cover: { headline: string } }
    ).cover.headline = "   ";
    expect(() => parseSiteContent(emptyHeadline)).toThrow(
      "hero.cover.headline must be a non-empty string"
    );

    const badEmail = createValidRawInput();
    (badEmail.site as { profile: { email: string } }).profile.email =
      "not-an-email";
    expect(() => parseSiteContent(badEmail)).toThrow(
      "site.profile.email must be a valid email address"
    );

    const relativeAsset = createValidRawInput();
    (
      relativeAsset.site as { profile: { resumePdfHref: string } }
    ).profile.resumePdfHref = "resume.pdf";
    expect(() => parseSiteContent(relativeAsset)).toThrow(
      "site.profile.resumePdfHref must be a root-relative asset path starting with '/'"
    );

    const unsafeProtocol = createValidRawInput();
    (
      unsafeProtocol.site as {
        products: { beacon: { siteUrl: string } };
      }
    ).products.beacon.siteUrl = "javascript:alert(1)";
    expect(() => parseSiteContent(unsafeProtocol)).toThrow(
      "site.products.beacon.siteUrl must use http or https protocol"
    );
  });

  it("rejects empty or blank experience bullet arrays", () => {
    const emptyBullets = createValidRawInput();
    (
      emptyBullets.bundle.experience as {
        items: Array<{ bullets: string[] }>;
      }
    ).items[0].bullets = [];
    expect(() => parseSiteContent(emptyBullets)).toThrow(
      "experience.items[0].bullets must contain at least one entry"
    );

    const blankBullet = createValidRawInput();
    (
      blankBullet.bundle.experience as {
        items: Array<{ bullets: string[] }>;
      }
    ).items[0].bullets = ["   "];
    expect(() => parseSiteContent(blankBullet)).toThrow(
      "experience.items[0].bullets[0] must be a non-empty string"
    );
  });

  it("allows empty product details arrays while rejecting blank detail fields", () => {
    const validEmptyDetails = createValidRawInput();
    expect(() => parseSiteContent(validEmptyDetails)).not.toThrow();

    const blankDetailTitle = createValidRawInput();
    (
      blankDetailTitle.bundle.products as {
        items: Array<{ details: Array<{ title: string; text: string }> }>;
      }
    ).items[0].details[0].title = "   ";
    expect(() => parseSiteContent(blankDetailTitle)).toThrow(
      "products.items[0].details[0].title must be a non-empty string"
    );

    const blankDetailText = createValidRawInput();
    (
      blankDetailText.bundle.products as {
        items: Array<{ details: Array<{ title: string; text: string }> }>;
      }
    ).items[0].details[0].text = "   ";
    expect(() => parseSiteContent(blankDetailText)).toThrow(
      "products.items[0].details[0].text must be a non-empty string"
    );
  });

  it("enforces cross-file alignment between site.json and locale items", () => {
    const missingSharedExperience = createValidRawInput();
    delete (
      missingSharedExperience.site as {
        experiences: Record<string, unknown>;
      }
    ).experiences.beacon;
    expect(() => parseSiteContent(missingSharedExperience)).toThrow(
      "Missing site.experiences entry for locale item id: beacon"
    );

    const orphanSharedProduct = createValidRawInput();
    (
      orphanSharedProduct.site as {
        products: Record<string, unknown>;
      }
    ).products["extra-app"] = {
      siteUrl: "https://example.com/",
      artSrc: "/resume/extra.svg",
    };
    expect(() => parseSiteContent(orphanSharedProduct)).toThrow(
      "Orphan site.products entry has no matching locale item: extra-app"
    );

    const duplicateExperience = createValidRawInput();
    const items = (
      duplicateExperience.bundle.experience as {
        items: Array<{ id: string }>;
      }
    ).items;
    items[1].id = items[0].id;
    expect(() => parseSiteContent(duplicateExperience)).toThrow(
      "Duplicate experiences id: beacon"
    );
  });

  it("rejects reserved or duplicate proposal waypoint anchors and fewer than 2 waypoints", () => {
    const reservedAnchor = createValidRawInput();
    (
      reservedAnchor.bundle.proposal as { waypoints: Array<{ id: string }> }
    ).waypoints[0].id = "job-desk";
    expect(() => parseSiteContent(reservedAnchor)).toThrow(
      "proposal.waypoints[0].id 'job-desk' collides with a reserved page anchor id"
    );

    const singleWaypoint = createValidRawInput();
    (
      singleWaypoint.bundle.proposal as { waypoints: unknown[] }
    ).waypoints = [
      (singleWaypoint.bundle.proposal as { waypoints: unknown[] }).waypoints[0],
    ];
    expect(() => parseSiteContent(singleWaypoint)).toThrow(
      "proposal.waypoints must contain at least 2 waypoints"
    );

    const blankTitle = createValidRawInput();
    (
      blankTitle.bundle.proposal as {
        waypoints: Array<{ title: string }>;
      }
    ).waypoints[0].title = "   ";
    expect(() => parseSiteContent(blankTitle)).toThrow(
      "proposal.waypoints[0].title must be a non-empty string"
    );

    const blankSubtitle = createValidRawInput();
    (
      blankSubtitle.bundle.proposal as {
        waypoints: Array<{ subtitle: string }>;
      }
    ).waypoints[0].subtitle = "   ";
    expect(() => parseSiteContent(blankSubtitle)).toThrow(
      "proposal.waypoints[0].subtitle must be a non-empty string"
    );

    const emptyWaypointBullets = createValidRawInput();
    (
      emptyWaypointBullets.bundle.proposal as {
        waypoints: Array<{ bullets: unknown[] }>;
      }
    ).waypoints[0].bullets = [];
    expect(() => parseSiteContent(emptyWaypointBullets)).toThrow(
      "proposal.waypoints[0].bullets must contain at least one entry"
    );

    const blankWaypointBulletTitle = createValidRawInput();
    (
      blankWaypointBulletTitle.bundle.proposal as {
        waypoints: Array<{ bullets: Array<{ title: string; text: string }> }>;
      }
    ).waypoints[0].bullets[0].title = "   ";
    expect(() => parseSiteContent(blankWaypointBulletTitle)).toThrow(
      "proposal.waypoints[0].bullets[0].title must be a non-empty string"
    );

    const blankWaypointBulletText = createValidRawInput();
    (
      blankWaypointBulletText.bundle.proposal as {
        waypoints: Array<{ bullets: Array<{ title: string; text: string }> }>;
      }
    ).waypoints[0].bullets[0].text = "   ";
    expect(() => parseSiteContent(blankWaypointBulletText)).toThrow(
      "proposal.waypoints[0].bullets[0].text must be a non-empty string"
    );
  });

  it("validates required template placeholders and rejects unknown placeholders", () => {
    const missingToken = createValidRawInput();
    (
      missingToken.bundle.products as { previewAltTemplate: string }
    ).previewAltTemplate = "網站預覽";
    expect(() => parseSiteContent(missingToken)).toThrow(
      "products.previewAltTemplate must include placeholder {name}"
    );

    const unknownToken = createValidRawInput();
    (
      unknownToken.bundle.proposal as {
        trail: { markerAriaTemplate: string };
      }
    ).trail.markerAriaTemplate = "前往第 {step} 站：{title} ({unknown})";
    expect(() => parseSiteContent(unknownToken)).toThrow(
      "proposal.trail.markerAriaTemplate contains unsupported placeholder {unknown}"
    );

    const missingPrevTopicToken = createValidRawInput();
    (
      missingPrevTopicToken.bundle.proposal as {
        trail: { prevTopicAriaTemplate: string };
      }
    ).trail.prevTopicAriaTemplate = "前往上一站";
    expect(() => parseSiteContent(missingPrevTopicToken)).toThrow(
      "proposal.trail.prevTopicAriaTemplate must include placeholder {title}"
    );

    const missingNextTopicToken = createValidRawInput();
    (
      missingNextTopicToken.bundle.proposal as {
        trail: { nextTopicAriaTemplate: string };
      }
    ).trail.nextTopicAriaTemplate = "前往下一站";
    expect(() => parseSiteContent(missingNextTopicToken)).toThrow(
      "proposal.trail.nextTopicAriaTemplate must include placeholder {title}"
    );
  });
});

describe("formatContentTemplate", () => {
  it("substitutes placeholders and throws on missing or empty variables", () => {
    expect(
      formatContentTemplate("前往第 {step} 站：{title}", {
        step: 1,
        title: "從策略到實作",
      })
    ).toBe("前往第 1 站：從策略到實作");

    expect(() =>
      formatContentTemplate("{name} 網站預覽", {})
    ).toThrow("Missing template variable 'name' for '{name} 網站預覽'");

    expect(() =>
      formatContentTemplate("{name} 網站預覽", { name: "  " })
    ).toThrow("Template variable 'name' must not be empty");
  });
});
