export type HeaderSection = "profile" | "proposal";

export const HEADER_SECTION_HASH: Readonly<Record<HeaderSection, string>> = {
  profile: "#profile",
  proposal: "#proposal",
};

const MIN_PROPOSAL_ACTIVE_TOP_PX = 96;
const PROPOSAL_VIEWPORT_RATIO = 0.35;

/**
 * Resolves which top-level header tab should be highlighted from the proposal
 * section's viewport-relative top offset and the current viewport height.
 */
export function resolveActiveHeaderSection(
  proposalTop: number | null,
  viewportHeight: number
): HeaderSection {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    throw new Error("Viewport height must be a positive finite number");
  }
  if (proposalTop === null) {
    return "profile";
  }
  if (!Number.isFinite(proposalTop)) {
    throw new Error("Proposal top offset must be a finite number");
  }

  const threshold = Math.max(
    MIN_PROPOSAL_ACTIVE_TOP_PX,
    viewportHeight * PROPOSAL_VIEWPORT_RATIO
  );
  return proposalTop <= threshold ? "proposal" : "profile";
}
