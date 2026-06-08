import type {
  BuildingBlock,
  OperationLog,
  SectionConclusion,
  SectionPlane,
  SunlightDataset,
  TraceChain,
} from "@/types";

const DAY = 86400000;

export const MOCK_DATASETS: SunlightDataset[] = [
  {
    id: "ds-001",
    fileName: "教学楼A栋_春季日照.json",
    contentHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60001",
    importedAt: Date.now() - 2 * DAY,
    buildingName: "教学楼A栋",
    importSource: "同事转发_李老师",
  },
  {
    id: "ds-002",
    fileName: "教学楼B栋_冬至日日照.json",
    contentHash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60002",
    importedAt: Date.now() - 5 * DAY,
    buildingName: "教学楼B栋",
    importSource: "规划院导出_v2",
  },
];

export const MOCK_BUILDING_BLOCKS: BuildingBlock[] = [
  { id: "b1", datasetId: "ds-001", name: "主楼",     position: [0, 0, 0],     size: [30, 15, 20] },
  { id: "b2", datasetId: "ds-001", name: "东翼楼",   position: [26, 0, -4],   size: [10, 12, 12] },
  { id: "b3", datasetId: "ds-001", name: "西翼楼",   position: [-26, 0, -4],  size: [10, 12, 12] },
  { id: "b4", datasetId: "ds-001", name: "连廊",     position: [0, 0, -14],   size: [40, 5, 4] },
  { id: "b5", datasetId: "ds-002", name: "B栋主体",  position: [0, 0, 0],     size: [36, 20, 16] },
];

export const MOCK_SECTION_PLANES: SectionPlane[] = [
  {
    id: "p1",
    datasetId: "ds-001",
    index: 1,
    normalAxis: "Y",
    position: 6,
    status: "normal",
  },
  {
    id: "p2",
    datasetId: "ds-001",
    index: 2,
    normalAxis: "Y",
    position: 12,
    status: "overrun",
    overrunNote: "超出日照间距控制线0.8m，东翼楼遮挡西翼楼3层教室",
  },
  {
    id: "p3",
    datasetId: "ds-001",
    index: 3,
    normalAxis: "Y",
    position: 3,
    status: "resolved",
    overrunNote: "原剖切面越过场地红线",
    resolutionNote: "将剖切位置从5m回调至3m，与规划红线对齐",
  },
  {
    id: "p4",
    datasetId: "ds-001",
    index: 4,
    normalAxis: "X",
    position: 0,
    status: "normal",
  },
  {
    id: "p5",
    datasetId: "ds-002",
    index: 1,
    normalAxis: "Y",
    position: 10,
    status: "overrun",
    overrunNote: "冬至日满窗日照不足1小时，越出规范控制线0.5m",
  },
];

export const MOCK_CONCLUSIONS: SectionConclusion[] = [
  {
    id: "c1",
    planeId: "p1",
    content:
      "剖面1-1(6m标高)：教学楼A栋主楼与东西翼楼间距均满足大寒日2小时日照要求，教室窗地比1/5.2，符合规范。",
    generatedAt: Date.now() - 2 * DAY + 3600_000,
    operator: "李老师",
    isLinkedTo3D: true,
  },
  {
    id: "c2",
    planeId: "p2",
    content:
      "剖面2-2(12m标高)：东翼楼对西翼楼3层西侧教室形成遮挡，超出日照控制线0.8m，建议调整东翼楼挑檐长度或移动西翼楼1.2m。",
    generatedAt: Date.now() - DAY,
    operator: "王老师",
    isLinkedTo3D: true,
  },
  {
    id: "c3",
    planeId: "p3",
    content:
      "剖面3-3(3m标高)：已与场地规划红线对齐，入口连廊底层架空，不影响人行通道净高，满足日照分析要求。",
    generatedAt: Date.now() - 3 * 3600_000,
    operator: "张老师",
    isLinkedTo3D: true,
  },
  {
    id: "c4",
    planeId: "p4",
    content: "剖面4-4(X=0)：南北向日照投影无异常，楼体自遮挡在可接受范围内。",
    generatedAt: Date.now() - 2 * 3600_000,
    operator: "李老师",
    isLinkedTo3D: true,
  },
  {
    id: "c5",
    planeId: "p5",
    content:
      "教学楼B栋冬至日剖面：南侧3层教室满窗日照仅48分钟，不足规范1小时，需调整北侧住宅楼高度或建筑退让。",
    generatedAt: Date.now() - 5 * 3600_000,
    operator: "王老师",
    isLinkedTo3D: true,
  },
];

export const MOCK_OPERATION_LOGS: OperationLog[] = [
  {
    id: "op-1",
    roundId: "round-demo",
    type: "import",
    targetId: "ds-001",
    timestamp: Date.now() - 7200_000,
    detail: { fileName: "教学楼A栋_春季日照.json", strategy: "new" },
    cameraSnapshot: {
      position: [55, 50, 70],
      target: [0, 5, 0],
    },
  },
  {
    id: "op-2",
    roundId: "round-demo",
    type: "select_plane",
    targetId: "p2",
    timestamp: Date.now() - 6600_000,
    detail: { planeIndex: 2, status: "overrun" },
    cameraSnapshot: {
      position: [20, 22, 30],
      target: [0, 12, 0],
    },
  },
  {
    id: "op-3",
    roundId: "round-demo",
    type: "mark_overrun",
    targetId: "p2",
    timestamp: Date.now() - 6000_000,
    detail: { note: "超出日照间距控制线0.8m，东翼楼遮挡西翼楼3层教室" },
    cameraSnapshot: {
      position: [15, 18, 25],
      target: [0, 12, 0],
    },
  },
  {
    id: "op-4",
    roundId: "round-demo",
    type: "link_conclusion",
    targetId: "c2",
    timestamp: Date.now() - 5400_000,
    detail: { planeId: "p2", conclusionId: "c2" },
    cameraSnapshot: {
      position: [20, 22, 30],
      target: [0, 12, 0],
    },
  },
  {
    id: "op-5",
    roundId: "round-demo",
    type: "select_plane",
    targetId: "p3",
    timestamp: Date.now() - 4200_000,
    detail: { planeIndex: 3, status: "resolved" },
    cameraSnapshot: {
      position: [-10, 12, 22],
      target: [0, 3, 0],
    },
  },
  {
    id: "op-6",
    roundId: "round-demo",
    type: "resolve_overrun",
    targetId: "p3",
    timestamp: Date.now() - 3600_000,
    detail: { note: "剖切位置回调至3m，与规划红线对齐" },
    cameraSnapshot: {
      position: [-8, 10, 18],
      target: [0, 3, 0],
    },
  },
  {
    id: "op-7",
    roundId: "round-demo",
    type: "export_screenshot",
    targetId: "p3",
    timestamp: Date.now() - 3000_000,
    detail: { fileName: "20260609_教学楼A栋_剖面3.png" },
    cameraSnapshot: {
      position: [-8, 10, 18],
      target: [0, 3, 0],
    },
  },
];

export const MOCK_TRACE_CHAINS: TraceChain[] = [
  {
    id: "tc-p2",
    planeId: "p2",
    sourceDataset: "ds-001",
    importTime: Date.now() - 2 * DAY,
    operatorName: "王老师",
    correctionAction: "标记越界，建议调整东翼楼挑檐或退让西翼楼1.2m",
    conclusionId: "c2",
  },
  {
    id: "tc-p3",
    planeId: "p3",
    sourceDataset: "ds-001",
    importTime: Date.now() - 2 * DAY,
    operatorName: "张老师",
    correctionAction: "剖切位置从5m回调至3m，与规划红线对齐",
    conclusionId: "c3",
  },
];
