import type {
  SensorRecord,
  WarehouseScheme,
  WarehouseZone,
  RiskLevel,
} from "@/types";

const CONCLUSIONS = [
  "C-01 A区方案距码头作业区过近，碰撞风险高",
  "C-02 B区方案消防水池容量不满足甲类库要求",
  "C-03 C区方案距办公区安全距离合规",
  "C-04 A区方案造价最低但环评通过率存疑",
  "C-05 B区方案堆场容量最优但征地成本偏高",
  "C-06 C区方案风险等级最低但运输成本增加",
  "C-07 推荐C区方案作为首选，B区作为备选",
  "C-08 旧版温湿度传感器漂移需全部重新校准",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function generateRecords(): SensorRecord[] {
  const records: SensorRecord[] = [];
  const zones: WarehouseZone[] = ["A", "B", "C"];
  const risks: RiskLevel[] = ["low", "low", "medium", "medium", "medium", "high", "high", "critical"];
  const baseDate = new Date("2026-05-01T08:00:00");

  const normalCount = 95;
  const oldVersionCount = 8;
  const withdrawnCount = 5;
  const verbalCount = 12;

  let row = 2;

  for (let i = 0; i < normalCount; i++) {
    const t = new Date(baseDate.getTime() + i * 3600_000 * 6);
    const zone = pick(zones, i * 3 + 1);
    const risk = pick(risks, i * 7 + 3);
    records.push({
      id: `REC-${String(i + 1).padStart(4, "0")}`,
      sourceRow: row++,
      recordType: "normal",
      timestamp: t.toISOString(),
      zone,
      riskLevel: risk,
      temperature: +(18 + Math.sin(i / 5) * 8 + (Math.random() - 0.5) * 4).toFixed(1),
      humidity: +(45 + Math.cos(i / 7) * 20 + (Math.random() - 0.5) * 8).toFixed(0),
      gasConcentration: +(0.02 + Math.random() * (risk === "critical" ? 0.8 : risk === "high" ? 0.35 : 0.1)).toFixed(3),
      description: `${zone}区${risk === "critical" ? "可燃气体浓度异常峰值" : risk === "high" ? "接近阈值" : "例行巡检"}记录，传感器SN-${1000 + i}`,
      affectsConclusions: i % 11 === 0 ? [CONCLUSIONS[i % CONCLUSIONS.length]] : i % 5 === 0 ? [CONCLUSIONS[(i + 2) % CONCLUSIONS.length], CONCLUSIONS[(i + 4) % CONCLUSIONS.length]] : [],
    });
  }

  for (let i = 0; i < oldVersionCount; i++) {
    const t = new Date(baseDate.getTime() + (i * 24 + 12) * 3600_000);
    const zone = pick(zones, i * 5 + 2);
    const replacingId = `REC-${String(30 + i * 7).padStart(4, "0")}`;
    records.push({
      id: `REC-OLD-${String(i + 1).padStart(3, "0")}`,
      sourceRow: row++,
      recordType: "old_version",
      timestamp: t.toISOString(),
      zone,
      riskLevel: pick(risks, i * 11),
      temperature: +(15 + Math.random() * 10).toFixed(1),
      humidity: +(35 + Math.random() * 30).toFixed(0),
      gasConcentration: +(0.02 + Math.random() * 0.2).toFixed(3),
      description: `【旧版】${zone}区原始数据记录，已被新版${replacingId}替代`,
      replacedBy: replacingId,
      affectsConclusions: [CONCLUSIONS[7], CONCLUSIONS[i % 6]],
    });
  }

  for (let i = 0; i < withdrawnCount; i++) {
    const t = new Date(baseDate.getTime() + (i * 48 + 6) * 3600_000);
    const zone = pick(zones, i * 9 + 4);
    const reasons = [
      "传感器安装位置错误，数据无效",
      "巡检人员误操作录入",
      "设备故障期间异常值",
      "重复录入，与前条重复",
      "现场条件变更需重新采集",
    ];
    records.push({
      id: `REC-WDR-${String(i + 1).padStart(3, "0")}`,
      sourceRow: row++,
      recordType: "withdrawn",
      timestamp: t.toISOString(),
      zone,
      riskLevel: pick(risks, i * 13 + 5),
      description: `【撤回】${zone}区数据，撤回原因：${reasons[i % reasons.length]}`,
      withdrawReason: reasons[i % reasons.length],
      affectsConclusions: i % 2 === 0 ? [CONCLUSIONS[(i + 1) % CONCLUSIONS.length]] : [],
    });
  }

  for (let i = 0; i < verbalCount; i++) {
    const t = new Date(baseDate.getTime() + (i * 30 + 20) * 3600_000);
    const zone = pick(zones, i * 17 + 8);
    const verbals = [
      "现场老李反映A区夜间常有车辆违停靠近库房",
      "码头调度会上提到下周有危化品集中到港",
      "安监站王工口头提醒消防通道需预留4米宽",
      "设计院陈工电话建议防雷接地电阻≤4Ω",
      "施工队反馈B区地下有旧管线需迁移",
      "港口公安要求库房监控保留90天以上",
      "环保局窗口说C区附近有湿地生态红线",
      "装卸班反映A区吊车回转半径覆盖库顶",
      "集团总工强调甲类库与丙类库间距≥12米",
      "物流部统计集装箱日周转率约180TEU",
      "气象局提供本区域年雷击日数约38天",
      "消防支队现场踏勘要求设环形消防车道",
    ];
    records.push({
      id: `REC-VRB-${String(i + 1).padStart(3, "0")}`,
      sourceRow: row++,
      recordType: "verbal",
      timestamp: t.toISOString(),
      zone,
      riskLevel: pick(risks, i * 19 + 7),
      description: verbals[i % verbals.length],
      affectsConclusions: [CONCLUSIONS[(i + 3) % CONCLUSIONS.length]],
    });
  }

  records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  records.forEach((r, idx) => {
    r.sourceRow = idx + 2;
  });

  return records;
}

export const MOCK_RECORDS: SensorRecord[] = generateRecords();

export const MOCK_SCHEMES: WarehouseScheme[] = [
  {
    id: "SCH-A",
    name: "A区方案 · 近码头前沿",
    zone: "A",
    position: { x: -40, y: 0, z: 20 },
    area: 2400,
    distanceToDock: 85,
    distanceToOffice: 420,
    riskLevel: "high",
    cost: 1860,
    capacity: 3200,
  },
  {
    id: "SCH-B",
    name: "B区方案 · 中部堆场",
    zone: "B",
    position: { x: 10, y: 0, z: -10 },
    area: 3100,
    distanceToDock: 210,
    distanceToOffice: 260,
    riskLevel: "medium",
    cost: 2380,
    capacity: 4500,
  },
  {
    id: "SCH-C",
    name: "C区方案 · 远岸后方",
    zone: "C",
    position: { x: 55, y: 0, z: -45 },
    area: 2800,
    distanceToDock: 380,
    distanceToOffice: 95,
    riskLevel: "low",
    cost: 2150,
    capacity: 3900,
  },
];

export function getConclusionById(id: string): string | undefined {
  return CONCLUSIONS.find((c) => c.startsWith(id));
}

export const ALL_CONCLUSIONS = CONCLUSIONS;
