import type {
  CablewayObject,
  TimestampState,
  Anomaly,
  MaterialItem,
  Annotation,
  HistoryLog,
  ViewSnapshot,
} from "@/shared/types";

export const PLAYBACK_DURATION = 3600;

export const cablewayObjects: CablewayObject[] = [
  {
    id: "station-main",
    name: "主站房",
    type: "STATION",
    floor: "2F",
    unit: "第2层",
    position: [0, 0, 0],
  },
  {
    id: "tower-01",
    name: "1号支架",
    type: "TOWER",
    floor: "1F",
    unit: "第1层",
    position: [-18, 6, -10],
  },
  {
    id: "tower-02",
    name: "2号支架",
    type: "TOWER",
    floor: "1F",
    unit: "第1层",
    position: [18, 5, -8],
  },
  {
    id: "tower-03",
    name: "3号支架",
    type: "TOWER",
    floor: "3F",
    unit: "第3层",
    position: [0, 10, -28],
  },
  {
    id: "car-01",
    name: "吊厢01",
    type: "CAR",
    floor: "2F",
    unit: "第2层",
    position: [-10, 4, -5],
  },
  {
    id: "car-02",
    name: "吊厢02",
    type: "CAR",
    floor: "2F",
    unit: "第2层",
    position: [10, 4, -5],
  },
  {
    id: "car-03",
    name: "吊厢03",
    type: "CAR",
    floor: "3F",
    unit: "第3层",
    position: [0, 8, -20],
  },
  {
    id: "cable-main",
    name: "主钢缆",
    type: "CABLE",
    floor: "2F",
    unit: "第2层",
    position: [0, 5, -14],
  },
];

export const timestampStates: TimestampState[] = (() => {
  const arr: TimestampState[] = [];
  cablewayObjects.forEach((obj, oi) => {
    for (let t = 0; t <= PLAYBACK_DURATION; t += 180) {
      const roll = (oi * 37 + t) % 100;
      const status =
        roll < 8 ? "ERROR" : roll < 22 ? "WARNING" : "NORMAL";
      arr.push({
        id: `ts-${obj.id}-${t}`,
        objectId: obj.id,
        timestamp: t,
        status,
        detail:
          status === "ERROR"
            ? "参数超限"
            : status === "WARNING"
            ? "指标逼近阈值"
            : "运行正常",
      });
    }
  });
  return arr;
})();

export const anomalies: Anomaly[] = [
  {
    id: "anom-001",
    objectId: "tower-03",
    timestamp: 720,
    severity: "CRITICAL",
    description: "3号支架塔顶振动值超阈值 2.3m/s²",
    resolved: "PENDING",
  },
  {
    id: "anom-002",
    objectId: "car-01",
    timestamp: 1440,
    severity: "MAJOR",
    description: "吊厢01门控传感器信号断续",
    resolved: "CONFIRMED",
    resolver: "阿乔",
  },
  {
    id: "anom-003",
    objectId: "cable-main",
    timestamp: 2160,
    severity: "CRITICAL",
    description: "主钢缆张力波动异常，瞬时差 12kN",
    resolved: "PENDING",
  },
  {
    id: "anom-004",
    objectId: "station-main",
    timestamp: 2700,
    severity: "MINOR",
    description: "主站房候车区温湿度略高",
    resolved: "RESOLVED",
    resolver: "阿乔",
  },
  {
    id: "anom-005",
    objectId: "car-03",
    timestamp: 3060,
    severity: "MAJOR",
    description: "吊厢03减速制动响应延迟 0.4s",
    resolved: "PENDING",
  },
];

export const materialItems: MaterialItem[] = [
  {
    id: "mat-001",
    title: "3号支架振动检测报告",
    status: "NEED_FIX",
    reason: "报告未附第三方校准证书，振动时程曲线缺失 10:00-11:00 数据段",
    owner: "检测组-林工",
  },
  {
    id: "mat-002",
    title: "主钢缆年度探伤记录",
    status: "PASS",
    reason: "断丝率 0.12% < 限值 0.5%，探伤机构资质在有效期内",
    owner: "机务组-王工",
  },
  {
    id: "mat-003",
    title: "吊厢01门控系统更换单",
    status: "NEED_FIX",
    reason: "更换单缺少旧件去向与批次序列号对照",
    owner: "运维组-赵工",
  },
  {
    id: "mat-004",
    title: "主站房消防巡检记录",
    status: "PASS",
    reason: "本月四次巡检均签字齐全，烟感与喷淋压力测试通过",
    owner: "站务组-陈主管",
  },
  {
    id: "mat-005",
    title: "吊厢03制动响应复测方案",
    status: "NEED_FIX",
    reason: "方案未明确环境温度与载荷工况，缺少判定阈值引用来源",
    owner: "检测组-林工",
  },
  {
    id: "mat-006",
    title: "紧急疏散演练签到与影像",
    status: "PASS",
    reason: "签到率 100%，影像覆盖上下客区与救援通道，演练小结已归档",
    owner: "站务组-陈主管",
  },
];

export const seedAnnotations: Annotation[] = [
  {
    id: "ann-001",
    objectId: "tower-03",
    timestamp: 720,
    content: "3号支架此段振动值得重点复核，建议调取同期风速数据对照。",
    author: "阿乔",
    status: "ACTIVE",
    mixedWarning: false,
    createdAt: Date.now() - 3600_000,
  },
  {
    id: "ann-002",
    objectId: "car-01",
    timestamp: 1440,
    content: "第2层吊厢01门控传感器已换件，待复测。（注：此条已撤回）",
    author: "阿乔",
    status: "REVOKED",
    mixedWarning: false,
    createdAt: Date.now() - 2400_000,
  },
];

export const seedHistory: HistoryLog[] = [
  {
    id: "log-001",
    action: "ANNOTATE",
    targetId: "ann-001",
    after: { status: "ACTIVE" },
    operator: "阿乔",
    createdAt: Date.now() - 3600_000,
  },
  {
    id: "log-002",
    action: "ANNOTATE",
    targetId: "ann-002",
    after: { status: "ACTIVE" },
    operator: "阿乔",
    createdAt: Date.now() - 2400_000,
  },
  {
    id: "log-003",
    action: "REVOKE",
    targetId: "ann-002",
    before: { status: "ACTIVE" },
    after: { status: "REVOKED" },
    operator: "阿乔",
    createdAt: Date.now() - 1800_000,
  },
  {
    id: "log-004",
    action: "CONFIRM",
    targetId: "anom-002",
    before: { resolved: "PENDING" },
    after: { resolved: "CONFIRMED" },
    operator: "阿乔",
    createdAt: Date.now() - 1200_000,
  },
];

export const seedSnapshots: ViewSnapshot[] = [];
