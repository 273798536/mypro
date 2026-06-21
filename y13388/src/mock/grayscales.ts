import type { GrayConfig } from "@/utils/types";

export const GRAY_CONFIGS: GrayConfig[] = [
  {
    id: "gs-230-stable",
    name: "smooth-7d-10pct",
    ratio: 0.1,
    windowSize: 7,
    versionId: "v2.3.0",
    createdBy: "算法组-张伟",
    createdAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "gs-240-wide",
    name: "smooth-15d-15pct",
    ratio: 0.15,
    windowSize: 15,
    versionId: "v2.4.0",
    createdBy: "算法组-李娜",
    createdAt: "2026-05-20T11:00:00Z",
  },
  {
    id: "gs-241-conservative",
    name: "smooth-5d-12pct",
    ratio: 0.12,
    windowSize: 5,
    versionId: "v2.4.1",
    createdBy: "算法组-李娜",
    createdAt: "2026-06-10T10:00:00Z",
  },
  {
    id: "gs-250-aggressive",
    name: "smooth-3d-20pct",
    ratio: 0.2,
    windowSize: 3,
    versionId: "v2.5.0-rc",
    createdBy: "算法组-张伟",
    createdAt: "2026-06-18T15:00:00Z",
  },
];
