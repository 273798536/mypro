import type { ModelVersion } from "@/utils/types";

export const VERSIONS: ModelVersion[] = [
  {
    id: "v2.3.0",
    releasedAt: "2026-05-01T08:00:00Z",
    threshold: 0.72,
    description: "基线稳定版，召回率92%，误报率控制在3.5%",
  },
  {
    id: "v2.4.0",
    releasedAt: "2026-05-20T10:30:00Z",
    threshold: 0.70,
    description: "特征工程升级，新增12维行为特征，阈值下调以保召回",
  },
  {
    id: "v2.4.1",
    releasedAt: "2026-06-10T09:15:00Z",
    threshold: 0.74,
    description: "修复误报问题，对小样本场景重新训练embedding层",
  },
  {
    id: "v2.5.0-rc",
    releasedAt: "2026-06-18T14:00:00Z",
    threshold: 0.75,
    description: "灰度候选版，拟解决边界样本被平均数覆盖的问题，windowSize降至3",
  },
];
