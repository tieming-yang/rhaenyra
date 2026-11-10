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

  const backGradId = `${idPrefix}-back`;
  const bodyGradId = `${idPrefix}-body`;
  const sunlitGradId = `${idPrefix}-sunlit`;
  const shadedGradId = `${idPrefix}-shaded`;
  const ridgeGradId = `${idPrefix}-ridge`;

  return (
    <div
      className="run-mountain-stage"
      data-peak={profile.kind}
      data-flank={profile.flank}
      data-peaks={profile.peakCount}
      aria-hidden="true"
    >
      <svg
        className="run-mountain-backdrop"
        viewBox={profile.viewBox}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id={backGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="14"
            x2="0"
            y2="116"
          >
            <stop
              offset="0%"
              stopColor="var(--mountain-back-top, #ebd0dc)"
              stopOpacity="0.68"
            />
            <stop
              offset="62%"
              stopColor="var(--mountain-back-mid, #f6e4ec)"
              stopOpacity="0.32"
            />
            <stop offset="100%" stopColor="var(--background)" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={bodyGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="8"
            x2="0"
            y2="424"
          >
            <stop
              offset="0%"
              stopColor="var(--mountain-peak-color)"
              stopOpacity="1"
            />
            <stop
              offset="28%"
              stopColor="var(--mountain-core-color)"
              stopOpacity="0.99"
            />
            <stop
              offset="58%"
              stopColor="var(--mountain-mid-color)"
              stopOpacity="0.9"
            />
            <stop offset="80%" stopColor="var(--background)" stopOpacity="0.38" />
            <stop offset="97%" stopColor="var(--background)" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={sunlitGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="8"
            x2="0"
            y2="118"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
            <stop offset="58%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop
              offset="100%"
              stopColor="var(--mountain-core-color)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient
            id={shadedGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="8"
            x2="0"
            y2="124"
          >
            <stop
              offset="0%"
              stopColor="var(--mountain-shade-top, #ebc8d7)"
              stopOpacity="0.88"
            />
            <stop
              offset="50%"
              stopColor="var(--mountain-shade-mid, #f6e1eb)"
              stopOpacity="0.48"
            />
            <stop
              offset="100%"
              stopColor="var(--mountain-core-color)"
              stopOpacity="0"
            />
          </linearGradient>
          <linearGradient
            id={ridgeGradId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="8"
            x2="0"
            y2="118"
          >
            <stop
              offset="0%"
              stopColor="var(--mountain-ridge-stroke)"
              stopOpacity="0.72"
            />
            <stop
              offset="50%"
              stopColor="var(--mountain-ridge-stroke)"
              stopOpacity="0.28"
            />
            <stop
              offset="100%"
              stopColor="var(--mountain-ridge-stroke)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <path d={profile.backRangePath} fill={`url(#${backGradId})`} />
        <path d={profile.silhouettePath} fill={`url(#${bodyGradId})`} />
        <path d={profile.sunlitFacesPath} fill={`url(#${sunlitGradId})`} />
        <path d={profile.shadedFacesPath} fill={`url(#${shadedGradId})`} />
        <path
          d={profile.areteRidgesPath}
          fill="none"
          stroke={`url(#${ridgeGradId})`}
          strokeWidth="1.2"
          strokeLinecap="butt"
          strokeLinejoin="miter"
          strokeMiterlimit="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
