import type { Showcase, LightObject, Material, TimelineEvent, PendingConfirm } from "./types";

export const showcases: Showcase[] = [
  { id: "sc-001", name: "青铜器展柜A", zone: "一层-先秦厅", type: "独立柜" },
  { id: "sc-002", name: "瓷器展柜B", zone: "一层-宋元厅", type: "通柜" },
  { id: "sc-003", name: "书画展柜C", zone: "二层-书画厅", type: "独立柜" },
];

export const lightObjects: LightObject[] = [
  { id: "lo-001", showcaseId: "sc-001", name: "聚光灯-左", intensity: 0.85, colorTemp: 3000, position: [-1.5, 3, 0], type: "spot" },
  { id: "lo-002", showcaseId: "sc-001", name: "聚光灯-右", intensity: 0.72, colorTemp: 3500, position: [1.5, 3, 0], type: "spot" },
  { id: "lo-003", showcaseId: "sc-001", name: "补光灯-上", intensity: 0.4, colorTemp: 4000, position: [0, 3.5, 1], type: "point" },
  { id: "lo-004", showcaseId: "sc-002", name: "顶灯-主", intensity: 0.9, colorTemp: 3200, position: [0, 3, -0.5], type: "spot" },
  { id: "lo-005", showcaseId: "sc-002", name: "侧灯-左", intensity: 0.6, colorTemp: 2800, position: [-2, 2.5, 0], type: "point" },
  { id: "lo-006", showcaseId: "sc-002", name: "侧灯-右", intensity: 0.65, colorTemp: 4500, position: [2, 2.5, 0], type: "point" },
  { id: "lo-007", showcaseId: "sc-003", name: "射灯-主", intensity: 0.78, colorTemp: 3500, position: [0, 2.8, 0], type: "spot" },
  { id: "lo-008", showcaseId: "sc-003", name: "环境灯", intensity: 0.3, colorTemp: 5000, position: [0, 1, 2], type: "ambient" },
];

export const materials: Material[] = [
  {
    id: "mat-001", relatedObjectId: "lo-001", type: "inspection_photo",
    title: "青铜器左灯巡检照-0610", content: "聚光灯左侧亮度正常，色温偏暖",
    importedAt: "2026-06-10T09:30:00", modifiedAt: "2026-06-10T09:30:00",
    hasRetraction: false, caliberChanged: false,
  },
  {
    id: "mat-002", relatedObjectId: "lo-002", type: "inspection_photo",
    title: "青铜器右灯巡检照-0610", content: "聚光灯右侧色温偏高，与左侧差异明显",
    importedAt: "2026-06-10T09:35:00", modifiedAt: "2026-06-11T14:20:00",
    hasRetraction: false, caliberChanged: true,
  },
  {
    id: "mat-003", relatedObjectId: "lo-002", type: "retraction_record",
    title: "撤回：右灯色温3500K→3000K", content: "0610巡检记录中右灯色温记为3500K，实际应为3000K，原记录有误",
    importedAt: "2026-06-11T14:20:00", modifiedAt: "2026-06-11T14:20:00",
    hasRetraction: true, caliberChanged: true,
  },
  {
    id: "mat-004", relatedObjectId: "lo-004", type: "inspection_photo",
    title: "瓷器主灯巡检照-0611", content: "顶灯主照度正常，色温稳定",
    importedAt: "2026-06-11T10:00:00", modifiedAt: "2026-06-11T10:00:00",
    hasRetraction: false, caliberChanged: false,
  },
  {
    id: "mat-005", relatedObjectId: "lo-006", type: "inspection_photo",
    title: "瓷器右灯巡检照-0611", content: "侧灯右侧色温偏冷，与左侧差异较大",
    importedAt: "2026-06-11T10:05:00", modifiedAt: "2026-06-11T10:05:00",
    hasRetraction: false, caliberChanged: false,
  },
  {
    id: "mat-006", relatedObjectId: "lo-005", type: "verbal_note",
    title: "口头说明：瓷器左侧灯位调整", content: "方案经理小赵口头通知：瓷器展柜左侧灯位因布展需要下调0.2m",
    importedAt: "2026-06-11T11:00:00", modifiedAt: "2026-06-11T16:30:00",
    hasRetraction: false, caliberChanged: true,
  },
  {
    id: "mat-007", relatedObjectId: "lo-007", type: "inspection_photo",
    title: "书画主射灯巡检照-0612", content: "射灯主照度达标，但光斑有偏移",
    importedAt: "2026-06-12T08:30:00", modifiedAt: "2026-06-12T08:30:00",
    hasRetraction: false, caliberChanged: false,
  },
];

export const timelineEvents: TimelineEvent[] = [
  {
    id: "evt-001", timestamp: "2026-06-10T09:30:00", type: "import",
    description: "导入巡检照片：青铜器左灯", relatedObjectId: "lo-001", relatedMaterialId: "mat-001",
    status: "confirmed", isCaliberChange: false,
  },
  {
    id: "evt-002", timestamp: "2026-06-10T09:35:00", type: "import",
    description: "导入巡检照片：青铜器右灯（原始记录3500K）", relatedObjectId: "lo-002", relatedMaterialId: "mat-002",
    status: "modified", isCaliberChange: true,
  },
  {
    id: "evt-003", timestamp: "2026-06-11T10:00:00", type: "import",
    description: "导入巡检照片：瓷器主灯", relatedObjectId: "lo-004", relatedMaterialId: "mat-004",
    status: "confirmed", isCaliberChange: false,
  },
  {
    id: "evt-004", timestamp: "2026-06-11T10:05:00", type: "import",
    description: "导入巡检照片：瓷器右灯（色温偏冷）", relatedObjectId: "lo-006", relatedMaterialId: "mat-005",
    status: "pending", isCaliberChange: false,
  },
  {
    id: "evt-005", timestamp: "2026-06-11T11:00:00", type: "note",
    description: "口头说明：瓷器左侧灯位调整", relatedObjectId: "lo-005", relatedMaterialId: "mat-006",
    status: "pending", isCaliberChange: true,
  },
  {
    id: "evt-006", timestamp: "2026-06-11T14:20:00", type: "retraction",
    description: "撤回：右灯色温3500K→3000K，原记录有误", relatedObjectId: "lo-002", relatedMaterialId: "mat-003",
    status: "retracted", isCaliberChange: true,
  },
  {
    id: "evt-007", timestamp: "2026-06-11T16:30:00", type: "modification",
    description: "口头说明更新：瓷器左侧灯位调整（补充影响说明）", relatedObjectId: "lo-005", relatedMaterialId: "mat-006",
    status: "modified", isCaliberChange: true,
  },
  {
    id: "evt-008", timestamp: "2026-06-12T08:30:00", type: "import",
    description: "导入巡检照片：书画主射灯", relatedObjectId: "lo-007", relatedMaterialId: "mat-007",
    status: "pending", isCaliberChange: false,
  },
];

export const pendingConfirms: PendingConfirm[] = [
  {
    id: "pc-001",
    reason: "相邻点位色温差过大：青铜器展柜左灯3000K vs 右灯3500K，差异500K超出阈值",
    impactScope: ["lo-001", "lo-002"],
    relatedObjectIds: ["lo-001", "lo-002"],
    createdAt: "2026-06-10T09:40:00",
    resolved: false,
  },
  {
    id: "pc-002",
    reason: "相邻点位色温差过大：瓷器展柜左灯2800K vs 右灯4500K，差异1700K严重超出阈值",
    impactScope: ["lo-005", "lo-006"],
    relatedObjectIds: ["lo-005", "lo-006"],
    createdAt: "2026-06-11T10:10:00",
    resolved: false,
  },
];

export const timelineDates = [
  "2026-06-10",
  "2026-06-11",
  "2026-06-12",
];
