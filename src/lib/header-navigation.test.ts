import { describe, expect, it } from "vitest";
import {
  HEADER_SECTION_HASH,
  resolveActiveHeaderSection,
  type HeaderSection,
} from "./header-navigation";

describe("resolveActiveHeaderSection", () => {
  it("highlights profile when proposal section is absent or below the active threshold", () => {
    expect(resolveActiveHeaderSection(null, 900)).toBe("profile");
    expect(resolveActiveHeaderSection(316, 900)).toBe("profile");
    expect(resolveActiveHeaderSection(1800, 900)).toBe("profile");
  });

  it("switches to proposal at the viewport ratio threshold and while scrolled inside proposal", () => {
    expect(resolveActiveHeaderSection(315, 900)).toBe("proposal");
    expect(resolveActiveHeaderSection(0, 900)).toBe("proposal");
    expect(resolveActiveHeaderSection(-640, 900)).toBe("proposal");
  });

  it("enforces a minimum pixel threshold on short viewports", () => {
    expect(resolveActiveHeaderSection(97, 200)).toBe("profile");
    expect(resolveActiveHeaderSection(96, 200)).toBe("proposal");
  });

  it("maps every HeaderSection union member to an anchor hash", () => {
    const sections: readonly HeaderSection[] = ["profile", "proposal"];
    expect(sections.map((section) => HEADER_SECTION_HASH[section])).toEqual([
      "#profile",
      "#proposal",
    ]);
  });

  it("throws on malformed viewportHeight or proposalTop inputs", () => {
    expect(() => resolveActiveHeaderSection(100, 0)).toThrow(
      "Viewport height must be a positive finite number"
    );
    expect(() => resolveActiveHeaderSection(100, -50)).toThrow(
      "Viewport height must be a positive finite number"
    );
    expect(() => resolveActiveHeaderSection(100, Number.NaN)).toThrow(
      "Viewport height must be a positive finite number"
    );
    expect(() => resolveActiveHeaderSection(Number.NaN, 800)).toThrow(
      "Proposal top offset must be a finite number"
    );
    expect(() =>
      resolveActiveHeaderSection(Number.POSITIVE_INFINITY, 800)
    ).toThrow("Proposal top offset must be a finite number");
  });
});
