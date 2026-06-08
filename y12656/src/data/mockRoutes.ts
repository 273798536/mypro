import type { FlightRoute } from "@/types";

const generateProfileData = (
  baseHeight: number,
  variance: number,
  points: number,
  withCliff?: { start: number; end: number; drop: number }
): number[] => {
  const data: number[] = [];
  for (let i = 0; i < points; i++) {
    let h = baseHeight + Math.sin(i * 0.05) * variance + (Math.random() - 0.5) * 3;
    if (withCliff && i >= withCliff.start && i <= withCliff.end) {
      h -= withCliff.drop * (1 - Math.abs(i - (withCliff.start + withCliff.end) / 2) / ((withCliff.end - withCliff.start) / 2));
    }
    data.push(Math.round(h * 10) / 10);
  }
  return data;
};

const generateCoordinates = (
  count: number,
  missingRange?: { start: number; end: number }
) => {
  const coords = [];
  for (let i = 0; i < count; i++) {
    const hasMissing = missingRange && i >= missingRange.start && i <= missingRange.end;
    coords.push({
      x: hasMissing ? NaN : 116.3 + i * 0.001,
      y: hasMissing ? NaN : 39.9 + Math.sin(i * 0.1) * 0.002,
      z: 500 + i * 2 + (Math.random() - 0.5) * 5,
      timestamp: `2024-06-${String(1 + (i % 28)).padStart(2, "0")} 08:${String((i * 3) % 60).padStart(2, "0")}:00`,
    });
  }
  return coords;
};

export const mockRoutes: FlightRoute[] = [
  {
    id: "FLIGHT-2024-0087",
    routeCode: "FLIGHT-2024-0087",
    missionName: "京北山区巡检-A7段",
    createdAt: "2024-06-08 09:23:15",
    dataSource: "地面站v3.2.1 / 大疆M300 RTK",
    sourceChain: ["原始航测数据_0608.kml", "高度解算_20240608.log", "人工初检报告_v1.docx"],
    coordinates: generateCoordinates(120),
    profileData: generateProfileData(520, 25, 120),
    riskLevel: "high",
    heightDeviation: 18.3,
    anomalyTypes: ["camera_view_lost", "height_deviation"],
    status: "pending",
    isArchived: false,
    viewSnapshots: [
      {
        id: "vs-001",
        name: "初始视角",
        createdAt: "2024-06-08 09:25:00",
        createdBy: "李工",
        cameraParams: { panX: 0, panY: 0, zoom: 1, visibleRange: [0, 119] },
        notes: "导入时默认视角",
      },
    ],
    currentViewId: "vs-001",
    riskNoteHistory: [
      {
        id: "rn-0087-v1",
        version: 1,
        content:
          "该段航线在海拔480-530米区间飞行，途经铁塔2座，已按规范设置50米净空。北侧山体距离航线最近约120米，评估认为风险可控。",
        createdAt: "2024-06-08 10:15:00",
        createdBy: "张仿真",
        conclusion: "safe",
      },
    ],
    handlingOpinions: [
      {
        id: "op-001",
        type: "auto_suggestion",
        content:
          "检测到相机视角参数panX/panY记录为null，建议：1) 从相邻航段外推恢复；2) 重新导出原始日志进行视角重建。",
        createdAt: "2024-06-08 10:20:00",
        createdBy: "SYSTEM",
        status: "proposed",
      },
    ],
    threeStepReview: {
      rerun: { status: "not_started" },
      supplement: { status: "not_started" },
      manualConfirm: { status: "not_started" },
    },
    cameraViewIssue: {
      isReported: true,
      lostParams: ["panX", "panY", "zoom"],
      repairAttempts: 2,
      lastRepairAt: "2024-06-08 11:05:00",
      repairHistory: [
        {
          attemptedAt: "2024-06-08 10:30:00",
          attemptedBy: "李工",
          result: "failed",
          method: "日志重放恢复",
        },
        {
          attemptedAt: "2024-06-08 11:05:00",
          attemptedBy: "王仿真",
          result: "failed",
          method: "相邻航段外推插值",
        },
      ],
    },
  },
  {
    id: "FLIGHT-2024-0092",
    routeCode: "FLIGHT-2024-0092",
    missionName: "冀东电力廊道巡检-B3",
    createdAt: "2024-06-07 14:02:38",
    dataSource: "地面站v3.1.8 / 飞马D2000",
    sourceChain: ["航线规划_冀东B3.waypoints", "飞行记录_0607.bin", "初检异常标记.xlsx"],
    coordinates: generateCoordinates(180),
    profileData: generateProfileData(610, 18, 180, { start: 72, end: 90, drop: 45 }),
    riskLevel: "critical",
    heightDeviation: 23.7,
    anomalyTypes: ["height_deviation"],
    status: "rerun_done",
    isArchived: false,
    viewSnapshots: [
      {
        id: "vs-092-a",
        name: "全局视角",
        createdAt: "2024-06-07 14:10:00",
        createdBy: "赵工",
        cameraParams: { panX: 0, panY: 0, zoom: 1, visibleRange: [0, 179] },
      },
      {
        id: "vs-092-b",
        name: "断崖区段放大",
        createdAt: "2024-06-07 15:22:00",
        createdBy: "赵工",
        cameraParams: { panX: 60, panY: -20, zoom: 2.5, visibleRange: [60, 110] },
        notes: "聚焦1200-1500米区段断崖",
      },
    ],
    currentViewId: "vs-092-b",
    riskNoteHistory: [
      {
        id: "rn-0092-v1",
        version: 1,
        content:
          "B3段整体高度偏差正常。注意在里程1200-1500米处有断崖式高度下降，最大落差45米，对应区域存在已废弃的架空光缆，建议现场复核。",
        createdAt: "2024-06-07 16:30:00",
        createdBy: "陈仿真",
        conclusion: "warning",
      },
    ],
    handlingOpinions: [
      {
        id: "op-092-1",
        type: "auto_suggestion",
        content: "高度偏差23.7m超出阈值15m，建议标记为高风险并提交人工复核。",
        createdAt: "2024-06-07 14:15:00",
        createdBy: "SYSTEM",
        status: "accepted",
      },
      {
        id: "op-092-2",
        type: "manual_input",
        content: "已联系现场组，确认断崖处光缆于上月拆除，可下调风险等级。",
        createdAt: "2024-06-07 17:00:00",
        createdBy: "陈仿真",
        status: "proposed",
      },
    ],
    threeStepReview: {
      rerun: {
        status: "passed",
        executedAt: "2024-06-07 18:10:00",
        executedBy: "系统自动",
        result: "重算后偏差为23.1m，与初值误差<3%，确认数据有效",
        deviationBefore: 23.7,
        deviationAfter: 23.1,
      },
      supplement: { status: "not_started" },
      manualConfirm: { status: "not_started" },
    },
  },
  {
    id: "FLIGHT-2024-0103",
    routeCode: "FLIGHT-2024-0103",
    missionName: "津滨管线巡检-C12段",
    createdAt: "2024-06-06 11:45:22",
    dataSource: "地面站v3.2.0 / 纵横CW-25",
    sourceChain: ["航迹记录_0606.gpx", "高度剖面_103.csv"],
    coordinates: generateCoordinates(150, { start: 65, end: 82 }),
    profileData: generateProfileData(480, 12, 150),
    riskLevel: "medium",
    heightDeviation: 9.8,
    anomalyTypes: ["coordinate_missing"],
    status: "supplemented",
    isArchived: false,
    viewSnapshots: [
      {
        id: "vs-103-1",
        name: "默认视角",
        createdAt: "2024-06-06 11:50:00",
        createdBy: "刘工",
        cameraParams: { panX: 0, panY: 0, zoom: 1, visibleRange: [0, 149] },
      },
    ],
    riskNoteHistory: [
      {
        id: "rn-0103-v1",
        version: 1,
        content:
          "C12段航线整体平稳，中段里程700-900米区间坐标数据缺失18个连续点（机载GPS短时失锁），已通过惯性导航推算补全，但精度降级。",
        createdAt: "2024-06-06 13:20:00",
        createdBy: "刘仿真",
        conclusion: "warning",
      },
    ],
    handlingOpinions: [
      {
        id: "op-103-1",
        type: "auto_suggestion",
        content: "检测到18个连续坐标点缺失，建议补录或使用插值恢复。",
        createdAt: "2024-06-06 11:55:00",
        createdBy: "SYSTEM",
        status: "accepted",
      },
    ],
    threeStepReview: {
      rerun: { status: "not_started" },
      supplement: {
        status: "completed",
        supplementedAt: "2024-06-06 14:00:00",
        supplementedBy: "刘仿真",
        supplementedFields: ["coordinates[65..82]"],
      },
      manualConfirm: { status: "not_started" },
    },
  },
  {
    id: "FLIGHT-2024-0115",
    routeCode: "FLIGHT-2024-0115",
    missionName: "鲁中光伏基地巡检-D5",
    createdAt: "2024-06-05 08:30:10",
    dataSource: "地面站v3.2.1 / 大疆M350",
    sourceChain: ["飞行任务_D5.mission", "遥测数据_0605.json", "风险评估初版.pdf", "风险评估修订版.pdf"],
    coordinates: generateCoordinates(200),
    profileData: generateProfileData(560, 20, 200),
    riskLevel: "high",
    heightDeviation: 14.2,
    anomalyTypes: ["risk_note_conflict"],
    status: "pending",
    isArchived: false,
    viewSnapshots: [
      {
        id: "vs-115-1",
        name: "初始视角",
        createdAt: "2024-06-05 08:35:00",
        createdBy: "周工",
        cameraParams: { panX: 0, panY: 0, zoom: 1, visibleRange: [0, 199] },
      },
    ],
    riskNoteHistory: [
      {
        id: "rn-0115-v1",
        version: 1,
        content:
          "D5段航线位于光伏基地北侧净空区，周边最高障碍物为光伏板支架3.5米，航线高度560米，净空裕度充足，评估为安全，可按计划执行。",
        createdAt: "2024-06-05 09:10:00",
        createdBy: "周仿真",
        conclusion: "safe",
      },
      {
        id: "rn-0115-v2",
        version: 2,
        content:
          "补充说明：经复核，该段航线途经110kV架空输电线路（基地北侧东西向走廊），导线最高挂点460米，与航线最小垂直距离仅100米，低于公司规范要求的150米安全裕度。评估结论调整为危险，建议抬升航线高度至少60米或绕行。",
        createdAt: "2024-06-05 14:25:00",
        createdBy: "吴仿真",
        conclusion: "dangerous",
      },
    ],
    currentNoteId: "rn-0115-v2",
    handlingOpinions: [
      {
        id: "op-115-1",
        type: "auto_suggestion",
        content: "检测到v1与v2结论不一致（safe→dangerous），差异率约63%，请人工仲裁。",
        createdAt: "2024-06-05 14:30:00",
        createdBy: "SYSTEM",
        status: "proposed",
      },
    ],
    threeStepReview: {
      rerun: { status: "not_started" },
      supplement: { status: "not_started" },
      manualConfirm: { status: "not_started" },
    },
  },
  {
    id: "FLIGHT-2024-0121",
    routeCode: "FLIGHT-2024-0121",
    missionName: "苏南水网巡检-E2段",
    createdAt: "2024-06-04 16:18:40",
    dataSource: "地面站v3.1.5 / 极侠XMission",
    sourceChain: ["航飞数据_E2.dat"],
    coordinates: generateCoordinates(100),
    profileData: generateProfileData(450, 15, 40),
    riskLevel: "medium",
    heightDeviation: 8.5,
    anomalyTypes: ["profile_incomplete"],
    status: "pending",
    isArchived: false,
    viewSnapshots: [
      {
        id: "vs-121-1",
        name: "默认视角",
        createdAt: "2024-06-04 16:22:00",
        createdBy: "孙工",
        cameraParams: { panX: 0, panY: 0, zoom: 1, visibleRange: [0, 99] },
      },
    ],
    riskNoteHistory: [
      {
        id: "rn-0121-v1",
        version: 1,
        content:
          "E2段剖面图数据不完整，仅前40%有数据。初步可见前半段净空裕度充足，后半段缺失无法评估，需补全后再审。",
        createdAt: "2024-06-04 17:00:00",
        createdBy: "孙仿真",
        conclusion: "pending",
      },
    ],
    handlingOpinions: [
      {
        id: "op-121-1",
        type: "auto_suggestion",
        content: "剖面数据点仅40个，低于最少50个阈值。建议重新导出完整剖面或补录缺失段。",
        createdAt: "2024-06-04 16:25:00",
        createdBy: "SYSTEM",
        status: "proposed",
      },
    ],
    threeStepReview: {
      rerun: { status: "not_started" },
      supplement: { status: "not_started" },
      manualConfirm: { status: "not_started" },
    },
  },
  {
    id: "FLIGHT-2024-0056",
    routeCode: "FLIGHT-2024-0056",
    missionName: "沪杭廊道常规巡检-A1",
    createdAt: "2024-06-03 07:55:00",
    dataSource: "地面站v3.2.1 / 大疆M300 RTK",
    sourceChain: ["标准航线_A1.kmz", "遥测_0603.bin", "复核报告_已签.pdf"],
    coordinates: generateCoordinates(220),
    profileData: generateProfileData(580, 10, 220),
    riskLevel: "low",
    heightDeviation: 4.2,
    anomalyTypes: [],
    status: "all_completed",
    isArchived: false,
    viewSnapshots: [
      {
        id: "vs-056-1",
        name: "默认",
        createdAt: "2024-06-03 08:00:00",
        createdBy: "郑工",
        cameraParams: { panX: 0, panY: 0, zoom: 1, visibleRange: [0, 219] },
      },
    ],
    riskNoteHistory: [
      {
        id: "rn-0056-v1",
        version: 1,
        content: "A1段为常规巡检航线，已飞行50架次，本次数据与历史基线偏差4.2米，无异常。",
        createdAt: "2024-06-03 09:00:00",
        createdBy: "郑仿真",
        conclusion: "safe",
      },
    ],
    handlingOpinions: [
      {
        id: "op-056-1",
        type: "manual_input",
        content: "历史航线，数据稳定，直接放行。",
        createdAt: "2024-06-03 09:15:00",
        createdBy: "郑仿真",
        status: "accepted",
      },
    ],
    threeStepReview: {
      rerun: {
        status: "passed",
        executedAt: "2024-06-03 08:05:00",
        executedBy: "系统自动",
        result: "数据一致",
        deviationBefore: 4.2,
        deviationAfter: 4.2,
      },
      supplement: {
        status: "not_needed",
      },
      manualConfirm: {
        status: "confirmed",
        confirmedAt: "2024-06-03 09:30:00",
        confirmedBy: "郑仿真",
        signature: "ZHENG_20240603",
        comments: "正常放行",
      },
    },
  },
];
