import { describe, expect, it } from "vitest";
import {
  HEADER_NAV_ITEMS,
  HEADER_SECTION_HASH,
  HEADER_SECTION_HREF,
  resolveActiveHeaderSection,
  resolveScrollUrlTransition,
  resolveSectionFromHash,
  type HeaderSection,
  type UrlSyncOutcome,
} from "./header-navigation";

describe("resolveActiveHeaderSection", () => {
  it("highlights hero when all sections are absent or below the active threshold", () => {
    expect(
      resolveActiveHeaderSection(
        { jobDeskTop: null, productCasesTop: null, proposalTop: null },
        900
      )
    ).toBe("hero");

    expect(
      resolveActiveHeaderSection(
        { jobDeskTop: 316, productCasesTop: 1200, proposalTop: 2100 },
        900
      )
    ).toBe("hero");
  });

  it("transitions across job-desk, product-cases, and proposal as sections cross the threshold", () => {
    expect(
      resolveActiveHeaderSection(
        { jobDeskTop: 315, productCasesTop: 980, proposalTop: 1850 },
        900
      )
    ).toBe("job-desk");

    expect(
      resolveActiveHeaderSection(
        { jobDeskTop: -420, productCasesTop: 315, proposalTop: 1120 },
        900
      )
    ).toBe("product-cases");

    expect(
      resolveActiveHeaderSection(
        { jobDeskTop: -1300, productCasesTop: -540, proposalTop: 315 },
        900
      )
    ).toBe("proposal");

    expect(
      resolveActiveHeaderSection(
        { jobDeskTop: -1940, productCasesTop: -1180, proposalTop: -640 },
        900
      )
    ).toBe("proposal");
  });

  it("enforces a minimum 96px threshold on short viewports", () => {
    expect(
      resolveActiveHeaderSection(
        { jobDeskTop: 97, productCasesTop: 300, proposalTop: 600 },
        200
      )
    ).toBe("hero");

    expect(
      resolveActiveHeaderSection(
        { jobDeskTop: 96, productCasesTop: 300, proposalTop: 600 },
        200
      )
    ).toBe("job-desk");
  });

  it("maps every HeaderSection union member consistently across href, hash, and nav items", () => {
    const sections: readonly HeaderSection[] = [
      "hero",
      "job-desk",
      "product-cases",
      "proposal",
    ];
    expect(HEADER_NAV_ITEMS.map((item) => item.id)).toEqual(sections);
    expect(sections.map((section) => HEADER_SECTION_HREF[section])).toEqual([
      "/",
      "#job-desk",
      "#product-cases",
      "#proposal",
    ]);
    expect(sections.map((section) => HEADER_SECTION_HASH[section])).toEqual([
      "",
      "#job-desk",
      "#product-cases",
      "#proposal",
    ]);
  });

  it("throws on malformed viewportHeight or non-finite section offsets", () => {
    const validOffsets = {
      jobDeskTop: 100,
      productCasesTop: 400,
      proposalTop: 800,
    };

    expect(() => resolveActiveHeaderSection(validOffsets, 0)).toThrow(
      "Viewport height must be a positive finite number"
    );
    expect(() => resolveActiveHeaderSection(validOffsets, -50)).toThrow(
      "Viewport height must be a positive finite number"
    );
    expect(() => resolveActiveHeaderSection(validOffsets, Number.NaN)).toThrow(
      "Viewport height must be a positive finite number"
    );
    expect(() =>
      resolveActiveHeaderSection(
        { ...validOffsets, jobDeskTop: Number.NaN },
        800
      )
    ).toThrow("Job desk top offset must be a finite number or null");
    expect(() =>
      resolveActiveHeaderSection(
        { ...validOffsets, productCasesTop: Number.NEGATIVE_INFINITY },
        800
      )
    ).toThrow("Product cases top offset must be a finite number or null");
    expect(() =>
      resolveActiveHeaderSection(
        { ...validOffsets, proposalTop: Number.POSITIVE_INFINITY },
        800
      )
    ).toThrow("Proposal top offset must be a finite number or null");
  });
});

describe("resolveSectionFromHash", () => {
  it("resolves top-level hashes, empty hash, and proposal waypoints", () => {
    expect(resolveSectionFromHash("")).toBe("hero");
    expect(resolveSectionFromHash("#")).toBe("hero");
    expect(resolveSectionFromHash("#job-desk")).toBe("job-desk");
    expect(resolveSectionFromHash("#product-cases")).toBe("product-cases");
    expect(resolveSectionFromHash("#proposal")).toBe("proposal");
    expect(resolveSectionFromHash("#why-hokkaido")).toBe("proposal");
    expect(resolveSectionFromHash("#closing")).toBe("proposal");
    expect(resolveSectionFromHash("#proposal-finish")).toBe("proposal");
    expect(resolveSectionFromHash("#unknown-anchor")).toBeNull();
  });
});

describe("resolveScrollUrlTransition", () => {
  function describeOutcome(outcome: UrlSyncOutcome): string {
    switch (outcome.kind) {
      case "unchanged":
        return "unchanged";
      case "replace":
        return `replace:${outcome.nextUrl}`;
    }
  }

  it("clears the hash to '/' when entering hero and stays unchanged at '/'", () => {
    expect(
      describeOutcome(
        resolveScrollUrlTransition({
          activeSection: "hero",
          pathname: "/",
          search: "",
          currentHash: "",
        })
      )
    ).toBe("unchanged");

    expect(
      describeOutcome(
        resolveScrollUrlTransition({
          activeSection: "hero",
          pathname: "/",
          search: "?lang=zh",
          currentHash: "#job-desk",
        })
      )
    ).toBe("replace:/?lang=zh");

    expect(
      describeOutcome(
        resolveScrollUrlTransition({
          activeSection: "hero",
          pathname: "/",
          search: "",
          currentHash: "#",
        })
      )
    ).toBe("replace:/");
  });

  it("updates the hash for job-desk, product-cases, and proposal", () => {
    expect(
      describeOutcome(
        resolveScrollUrlTransition({
          activeSection: "job-desk",
          pathname: "/",
          search: "",
          currentHash: "",
        })
      )
    ).toBe("replace:/#job-desk");

    expect(
      describeOutcome(
        resolveScrollUrlTransition({
          activeSection: "product-cases",
          pathname: "/",
          search: "",
          currentHash: "#job-desk",
        })
      )
    ).toBe("replace:/#product-cases");

    expect(
      describeOutcome(
        resolveScrollUrlTransition({
          activeSection: "proposal",
          pathname: "/",
          search: "",
          currentHash: "#product-cases",
        })
      )
    ).toBe("replace:/#proposal");
  });

  it("preserves proposal sub-waypoint hashes while inside proposal and replaces them when leaving", () => {
    expect(
      describeOutcome(
        resolveScrollUrlTransition({
          activeSection: "proposal",
          pathname: "/",
          search: "",
          currentHash: "#why-hokkaido",
        })
      )
    ).toBe("unchanged");

    expect(
      describeOutcome(
        resolveScrollUrlTransition({
          activeSection: "product-cases",
          pathname: "/",
          search: "",
          currentHash: "#why-hokkaido",
        })
      )
    ).toBe("replace:/#product-cases");
  });

  it("throws when pathname does not start with '/'", () => {
    expect(() =>
      resolveScrollUrlTransition({
        activeSection: "hero",
        pathname: "relative-path",
        search: "",
        currentHash: "",
      })
    ).toThrow("Pathname must start with '/'");
  });
});
