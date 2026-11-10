export type MountainPeakKind =
  | "yotei-cone"
  | "annupuri-twin"
  | "asahidake-ridge"
  | "moiwa-shoulder";

export type MountainValleyFlank = "left" | "right";

export interface MountainCardProfile {
  readonly kind: MountainPeakKind;
  readonly flank: MountainValleyFlank;
  readonly viewBox: string;
  readonly silhouettePath: string;
  readonly snowcapPath: string;
  readonly sunlitFacetPath: string;
  readonly ridgeCrestPath: string;
  readonly snowlipPath: string;
}

type PathCommand =
  | readonly ["M", number, number]
  | readonly ["L", number, number]
  | readonly ["Q", number, number, number, number]
  | readonly ["C", number, number, number, number, number, number]
  | readonly ["Z"];

interface PeakTemplate {
  readonly kind: MountainPeakKind;
  readonly silhouette: readonly PathCommand[];
  readonly snowcap: readonly PathCommand[];
  readonly sunlitFacet: readonly PathCommand[];
  readonly ridgeCrest: readonly PathCommand[];
  readonly snowlip: readonly PathCommand[];
}

export const MOUNTAIN_VIEWBOX_WIDTH = 640;
export const MOUNTAIN_VIEWBOX_HEIGHT = 420;
export const MOUNTAIN_VIEWBOX = `0 0 ${MOUNTAIN_VIEWBOX_WIDTH} ${MOUNTAIN_VIEWBOX_HEIGHT}`;

export const MOUNTAIN_PEAK_KINDS: readonly MountainPeakKind[] = [
  "yotei-cone",
  "annupuri-twin",
  "asahidake-ridge",
  "moiwa-shoulder",
];

const PEAK_TEMPLATES: Readonly<Record<MountainPeakKind, PeakTemplate>> = {
  "yotei-cone": {
    kind: "yotei-cone",
    silhouette: [
      ["M", 0, 420],
      ["L", 0, 404],
      ["C", 34, 310, 62, 168, 102, 100],
      ["C", 146, 38, 214, 20, 286, 13],
      ["Q", 320, 18.5, 354, 13],
      ["C", 426, 20, 494, 38, 538, 100],
      ["C", 578, 168, 606, 310, 640, 404],
      ["L", 640, 420],
      ["Z"],
    ],
    snowcap: [
      ["M", 162, 58],
      ["C", 198, 30, 242, 18, 286, 13],
      ["Q", 320, 18.5, 354, 13],
      ["C", 398, 18, 442, 30, 478, 58],
      ["Q", 436, 74, 396, 60],
      ["Q", 358, 82, 320, 66],
      ["Q", 282, 82, 244, 60],
      ["Q", 204, 74, 162, 58],
      ["Z"],
    ],
    sunlitFacet: [
      ["M", 320, 16.5],
      ["Q", 337, 15.5, 354, 13],
      ["C", 410, 20, 466, 36, 514, 78],
      ["Q", 442, 92, 382, 74],
      ["Q", 342, 54, 320, 16.5],
      ["Z"],
    ],
    ridgeCrest: [
      ["M", 92, 114],
      ["C", 140, 44, 212, 20, 286, 13],
      ["Q", 320, 18.5, 354, 13],
      ["C", 428, 20, 500, 44, 548, 114],
      ["M", 320, 17],
      ["Q", 304, 52, 276, 92],
      ["M", 348, 14.5],
      ["Q", 374, 48, 408, 86],
    ],
    snowlip: [
      ["M", 162, 58],
      ["Q", 204, 74, 244, 60],
      ["Q", 282, 82, 320, 66],
      ["Q", 358, 82, 396, 60],
      ["Q", 436, 74, 478, 58],
    ],
  },
  "annupuri-twin": {
    kind: "annupuri-twin",
    silhouette: [
      ["M", 0, 420],
      ["L", 0, 402],
      ["C", 32, 306, 60, 164, 98, 96],
      ["C", 142, 34, 204, 16, 266, 11],
      ["C", 294, 11, 314, 25, 340, 25],
      ["C", 364, 25, 384, 16, 412, 17],
      ["C", 468, 22, 514, 48, 550, 104],
      ["C", 584, 170, 610, 308, 640, 404],
      ["L", 640, 420],
      ["Z"],
    ],
    snowcap: [
      ["M", 146, 60],
      ["C", 182, 28, 224, 14, 266, 11],
      ["C", 294, 11, 314, 25, 340, 25],
      ["C", 364, 25, 384, 16, 412, 17],
      ["C", 448, 21, 480, 36, 506, 62],
      ["Q", 462, 76, 422, 62],
      ["Q", 380, 80, 340, 65],
      ["Q", 294, 84, 248, 62],
      ["Q", 196, 76, 146, 60],
      ["Z"],
    ],
    sunlitFacet: [
      ["M", 266, 11],
      ["C", 294, 11, 314, 25, 340, 25],
      ["Q", 326, 64, 292, 86],
      ["Q", 274, 48, 266, 11],
      ["Z"],
    ],
    ridgeCrest: [
      ["M", 88, 110],
      ["C", 136, 38, 200, 15, 266, 11],
      ["C", 294, 11, 314, 25, 340, 25],
      ["C", 364, 25, 384, 16, 412, 17],
      ["C", 470, 23, 518, 52, 558, 114],
      ["M", 266, 11],
      ["Q", 252, 48, 226, 88],
      ["M", 412, 17],
      ["Q", 430, 50, 456, 84],
    ],
    snowlip: [
      ["M", 146, 60],
      ["Q", 196, 76, 248, 62],
      ["Q", 294, 84, 340, 65],
      ["Q", 380, 80, 422, 62],
      ["Q", 462, 76, 506, 62],
    ],
  },
  "asahidake-ridge": {
    kind: "asahidake-ridge",
    silhouette: [
      ["M", 0, 420],
      ["L", 0, 400],
      ["C", 34, 302, 62, 158, 104, 88],
      ["C", 148, 28, 198, 11, 252, 9],
      ["C", 292, 9, 332, 24, 382, 32],
      ["C", 442, 42, 498, 62, 542, 108],
      ["C", 580, 164, 608, 306, 640, 404],
      ["L", 640, 420],
      ["Z"],
    ],
    snowcap: [
      ["M", 138, 56],
      ["C", 174, 22, 212, 10, 252, 9],
      ["C", 292, 9, 332, 24, 382, 32],
      ["C", 424, 39, 462, 50, 494, 68],
      ["Q", 446, 80, 398, 66],
      ["Q", 346, 84, 296, 64],
      ["Q", 248, 82, 204, 60],
      ["Q", 170, 70, 138, 56],
      ["Z"],
    ],
    sunlitFacet: [
      ["M", 252, 9],
      ["C", 292, 9, 332, 24, 382, 32],
      ["Q", 350, 68, 304, 84],
      ["Q", 272, 46, 252, 9],
      ["Z"],
    ],
    ridgeCrest: [
      ["M", 92, 104],
      ["C", 140, 32, 194, 11, 252, 9],
      ["C", 292, 9, 332, 24, 382, 32],
      ["C", 444, 42, 502, 64, 550, 118],
      ["M", 252, 9],
      ["Q", 272, 46, 304, 84],
      ["M", 364, 29],
      ["Q", 392, 58, 428, 92],
    ],
    snowlip: [
      ["M", 138, 56],
      ["Q", 170, 70, 204, 60],
      ["Q", 248, 82, 296, 64],
      ["Q", 346, 84, 398, 66],
      ["Q", 446, 80, 494, 68],
    ],
  },
  "moiwa-shoulder": {
    kind: "moiwa-shoulder",
    silhouette: [
      ["M", 0, 420],
      ["L", 0, 404],
      ["C", 32, 308, 60, 166, 102, 98],
      ["C", 138, 50, 178, 36, 218, 34],
      ["C", 254, 32, 286, 13, 334, 12],
      ["C", 398, 12, 476, 34, 534, 96],
      ["C", 576, 158, 606, 304, 640, 404],
      ["L", 640, 420],
      ["Z"],
    ],
    snowcap: [
      ["M", 156, 64],
      ["C", 178, 44, 198, 35, 218, 34],
      ["C", 254, 32, 286, 13, 334, 12],
      ["C", 384, 12, 442, 28, 488, 60],
      ["Q", 442, 76, 398, 62],
      ["Q", 354, 82, 310, 64],
      ["Q", 264, 80, 224, 62],
      ["Q", 190, 74, 156, 64],
      ["Z"],
    ],
    sunlitFacet: [
      ["M", 334, 12],
      ["C", 384, 12, 442, 28, 488, 60],
      ["Q", 424, 82, 364, 70],
      ["Q", 344, 40, 334, 12],
      ["Z"],
    ],
    ridgeCrest: [
      ["M", 92, 112],
      ["C", 132, 54, 174, 36, 218, 34],
      ["C", 254, 32, 286, 13, 334, 12],
      ["C", 400, 12, 480, 36, 544, 108],
      ["M", 334, 12],
      ["Q", 316, 48, 290, 86],
      ["M", 218, 34],
      ["Q", 238, 62, 262, 92],
    ],
    snowlip: [
      ["M", 156, 64],
      ["Q", 190, 74, 224, 62],
      ["Q", 264, 80, 310, 64],
      ["Q", 354, 82, 398, 62],
      ["Q", 442, 76, 488, 60],
    ],
  },
};

function mirrorX(x: number): number {
  return Math.round((MOUNTAIN_VIEWBOX_WIDTH - x) * 100) / 100;
}

function serializePathCommands(
  commands: readonly PathCommand[],
  mirrorHorizontal: boolean
): string {
  return commands
    .map((cmd) => {
      switch (cmd[0]) {
        case "M":
        case "L": {
          const x = mirrorHorizontal ? mirrorX(cmd[1]) : cmd[1];
          return `${cmd[0]} ${x} ${cmd[2]}`;
        }
        case "Q": {
          const x1 = mirrorHorizontal ? mirrorX(cmd[1]) : cmd[1];
          const x = mirrorHorizontal ? mirrorX(cmd[3]) : cmd[3];
          return `Q ${x1} ${cmd[2]}, ${x} ${cmd[4]}`;
        }
        case "C": {
          const x1 = mirrorHorizontal ? mirrorX(cmd[1]) : cmd[1];
          const x2 = mirrorHorizontal ? mirrorX(cmd[3]) : cmd[3];
          const x = mirrorHorizontal ? mirrorX(cmd[5]) : cmd[5];
          return `C ${x1} ${cmd[2]}, ${x2} ${cmd[4]}, ${x} ${cmd[6]}`;
        }
        case "Z":
          return "Z";
      }
    })
    .join(" ");
}

/**
 * Builds the pure SVG path geometry for a specific Hokkaido mountain peak and valley flank,
 * mirroring horizontal coordinates when positioned on the right flank of the ski run.
 */
export function buildMountainCardProfile(
  kind: MountainPeakKind,
  flank: MountainValleyFlank
): MountainCardProfile {
  if (!Object.hasOwn(PEAK_TEMPLATES, kind)) {
    throw new Error(`Unsupported mountain peak kind: ${String(kind)}`);
  }
  if (flank !== "left" && flank !== "right") {
    throw new Error(`Unsupported mountain valley flank: ${String(flank)}`);
  }

  const mirrorHorizontal = flank === "right";
  const template = PEAK_TEMPLATES[kind];

  return {
    kind,
    flank,
    viewBox: MOUNTAIN_VIEWBOX,
    silhouettePath: serializePathCommands(template.silhouette, mirrorHorizontal),
    snowcapPath: serializePathCommands(template.snowcap, mirrorHorizontal),
    sunlitFacetPath: serializePathCommands(template.sunlitFacet, mirrorHorizontal),
    ridgeCrestPath: serializePathCommands(template.ridgeCrest, mirrorHorizontal),
    snowlipPath: serializePathCommands(template.snowlip, mirrorHorizontal),
  };
}

/**
 * Resolves the Hokkaido mountain silhouette profile for a given proposal waypoint index,
 * alternating peak shapes and mirroring odd/even flanks so ridges frame the ski valley.
 */
export function getMountainCardProfile(waypointIndex: number): MountainCardProfile {
  if (!Number.isInteger(waypointIndex) || waypointIndex < 0) {
    throw new Error("waypointIndex must be a non-negative integer");
  }

  const kind = MOUNTAIN_PEAK_KINDS[waypointIndex % MOUNTAIN_PEAK_KINDS.length];
  const flank: MountainValleyFlank = waypointIndex % 2 === 0 ? "left" : "right";

  return buildMountainCardProfile(kind, flank);
}
