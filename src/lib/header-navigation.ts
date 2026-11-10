import { INTERVIEW_WAYPOINTS } from "../domain/portfolio-data";

export type HeaderSection = "hero" | "job-desk" | "product-cases" | "proposal";

export interface HeaderNavItem {
  readonly id: HeaderSection;
  readonly label: string;
  readonly href: string;
  readonly hash: string;
}

export const HEADER_NAV_ITEMS: readonly HeaderNavItem[] = [
  { id: "hero", label: "簡介", href: "/", hash: "" },
  { id: "job-desk", label: "經歷", href: "#job-desk", hash: "#job-desk" },
  { id: "product-cases", label: "產品", href: "#product-cases", hash: "#product-cases" },
  { id: "proposal", label: "提案", href: "#proposal", hash: "#proposal" },
];

export const HEADER_SECTION_HREF: Readonly<Record<HeaderSection, string>> = {
  hero: "/",
  "job-desk": "#job-desk",
  "product-cases": "#product-cases",
  proposal: "#proposal",
};

export const HEADER_SECTION_HASH: Readonly<Record<HeaderSection, string>> = {
  hero: "",
  "job-desk": "#job-desk",
  "product-cases": "#product-cases",
  proposal: "#proposal",
};

export interface SectionTopOffsets {
  readonly jobDeskTop: number | null;
  readonly productCasesTop: number | null;
  readonly proposalTop: number | null;
}

export interface ScrollUrlSyncInput {
  readonly activeSection: HeaderSection;
  readonly pathname: string;
  readonly search: string;
  readonly currentHash: string;
}

export type UrlSyncOutcome =
  | { readonly kind: "unchanged" }
  | { readonly kind: "replace"; readonly nextUrl: string };

const MIN_SECTION_ACTIVE_TOP_PX = 96;
const SECTION_VIEWPORT_RATIO = 0.35;

const PROPOSAL_WAYPOINT_HASHES: ReadonlySet<string> = new Set(
  INTERVIEW_WAYPOINTS.map((waypoint) => `#${waypoint.id}`)
);

function assertFiniteNullableOffset(value: number | null, label: string): void {
  if (value !== null && !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number or null`);
  }
}

/**
 * Resolves which top-level section is currently active from each section's
 * viewport-relative top offset and the current viewport height.
 */
export function resolveActiveHeaderSection(
  offsets: SectionTopOffsets,
  viewportHeight: number
): HeaderSection {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new Error("Viewport height must be a positive finite number");
  }
  assertFiniteNullableOffset(offsets.jobDeskTop, "Job desk top offset");
  assertFiniteNullableOffset(offsets.productCasesTop, "Product cases top offset");
  assertFiniteNullableOffset(offsets.proposalTop, "Proposal top offset");

  const threshold = Math.max(
    MIN_SECTION_ACTIVE_TOP_PX,
    viewportHeight * SECTION_VIEWPORT_RATIO
  );

  if (offsets.proposalTop !== null && offsets.proposalTop <= threshold) {
    return "proposal";
  }
  if (offsets.productCasesTop !== null && offsets.productCasesTop <= threshold) {
    return "product-cases";
  }
  if (offsets.jobDeskTop !== null && offsets.jobDeskTop <= threshold) {
    return "job-desk";
  }
  return "hero";
}

/**
 * Maps a URL hash string (e.g. "#job-desk" or "#intro") to its owning top-level
 * header section, or null when the hash does not correspond to a known section.
 */
export function resolveSectionFromHash(hash: string): HeaderSection | null {
  const normalized = hash === "#" ? "" : hash;
  if (normalized === "") {
    return "hero";
  }
  if (normalized === "#job-desk") {
    return "job-desk";
  }
  if (normalized === "#product-cases") {
    return "product-cases";
  }
  if (normalized === "#proposal" || PROPOSAL_WAYPOINT_HASHES.has(normalized)) {
    return "proposal";
  }
  return null;
}

/**
 * Computes whether scrolling into `activeSection` requires replacing the
 * browser URL hash. Hero clears the hash to `/`, while Proposal preserves an
 * active sub-waypoint hash (such as `#intro`) until leaving Section 04.
 */
export function resolveScrollUrlTransition(
  input: ScrollUrlSyncInput
): UrlSyncOutcome {
  if (!input.pathname.startsWith("/")) {
    throw new Error("Pathname must start with '/'");
  }

  const normalizedCurrentHash = input.currentHash === "#" ? "" : input.currentHash;
  const targetHash =
    input.activeSection === "proposal" &&
    PROPOSAL_WAYPOINT_HASHES.has(normalizedCurrentHash)
      ? normalizedCurrentHash
      : HEADER_SECTION_HASH[input.activeSection];

  if (normalizedCurrentHash === targetHash && input.currentHash !== "#") {
    return { kind: "unchanged" };
  }

  return {
    kind: "replace",
    nextUrl: `${input.pathname}${input.search}${targetHash}`,
  };
}
