"use client";

import { useId } from "react";
import { getMountainCardProfile } from "@/lib/mountain-card-shape";

interface MountainCardBackdropProps {
  readonly index: number;
}

export function MountainCardBackdrop({ index }: MountainCardBackdropProps) {
  const rawId = useId();
  const idPrefix = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const profile = getMountainCardProfile(index);

  const bodyGradId = `${idPrefix}-body`;
  const capGradId = `${idPrefix}-cap`;
  const facetGradId = `${idPrefix}-facet`;
  const crestGradId = `${idPrefix}-crest`;
  const lipGradId = `${idPrefix}-lip`;

  return (
    <div
      className="run-mountain-stage"
      data-peak={profile.kind}
      data-flank={profile.flank}
      aria-hidden="true"
    >
      <svg
        className="run-mountain-backdrop"
        viewBox={profile.viewBox}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id={bodyGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="8"
            x2="0"
            y2="408"
          >
            <stop offset="0%" stopColor="var(--mountain-peak-color)" stopOpacity="1" />
            <stop offset="30%" stopColor="var(--mountain-core-color)" stopOpacity="0.98" />
            <stop offset="58%" stopColor="var(--mountain-mid-color)" stopOpacity="0.88" />
            <stop offset="80%" stopColor="var(--background)" stopOpacity="0.38" />
            <stop offset="97%" stopColor="var(--background)" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={capGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="8"
            x2="0"
            y2="88"
          >
            <stop offset="0%" stopColor="var(--mountain-cap-top)" stopOpacity="0.95" />
            <stop offset="62%" stopColor="var(--mountain-cap-mid)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--mountain-core-color)" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={facetGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="8"
            x2="0"
            y2="96"
          >
            <stop offset="0%" stopColor="var(--mountain-facet-color)" stopOpacity="0.36" />
            <stop offset="68%" stopColor="var(--mountain-facet-color)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--mountain-facet-color)" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={crestGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="9"
            x2="0"
            y2="118"
          >
            <stop offset="0%" stopColor="var(--mountain-ridge-stroke)" stopOpacity="0.62" />
            <stop offset="48%" stopColor="var(--mountain-ridge-stroke)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--mountain-ridge-stroke)" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={lipGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="54"
            x2="0"
            y2="88"
          >
            <stop offset="0%" stopColor="var(--mountain-ridge-stroke)" stopOpacity="0.36" />
            <stop offset="100%" stopColor="var(--mountain-ridge-stroke)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={profile.silhouettePath} fill={`url(#${bodyGradId})`} />
        <path d={profile.snowcapPath} fill={`url(#${capGradId})`} />
        <path d={profile.sunlitFacetPath} fill={`url(#${facetGradId})`} />
        <path
          d={profile.snowlipPath}
          fill="none"
          stroke={`url(#${lipGradId})`}
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={profile.ridgeCrestPath}
          fill="none"
          stroke={`url(#${crestGradId})`}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
