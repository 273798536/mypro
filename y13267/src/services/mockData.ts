import {
  ComplaintPoint,
  ComplaintStatus,
  ComplaintSource,
  ComplaintRecord,
  JudgmentHistory,
  PhotoAttachment,
  TimelinePhase,
} from "@/types";

const SOURCES: ComplaintSource[] = ["12345热线", "社区信箱", "网格员上报", "媒体曝光", "其他"];
const STATUSES: ComplaintStatus[] = ["pending", "processing", "duplicate", "closed"];

const STREET_NAMES = [
  "中关村大街",
  "学院路",
  "知春路",
  "西土城路",
  "花园路",
  "北三环西路",
  "清华东路",
  "成府路",
  "王庄路",
  "学清路",
];

const COMMUNITY_NAMES = [
  "华清嘉园",
  "东升园",
  "中关村东路小区",
  "兰园社区",
  "塔院小区",
  "学知园",
  "健翔园",
  "花园东路小区",
];

const COMPLAINT_CONTENTS = [
  "楼下充电桩噪声扰民，夜间无法入睡",
  "小区充电位被燃油车长期霸占",
  "充电桩距离居民楼窗户过近，担心电磁辐射",
  "充电费用过高，公示不透明",
  "消防通道被充电车辆占用，存在安全隐患",
  "新增充电桩选址在单元门口，影响老人通行",
  "私拉电线充电现象严重，物业不作为",
  "充电桩运维不到位，故障桩长期不维修",
];

function rnd(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function rndInt(min: number, max: number) {
  return Math.floor(rnd(min, max + 1));
}

function rndPick<T>(arr: T[]): T {
  return arr[rndInt(0, arr.length - 1)];
}

function formatDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function generateRecords(pointId: string, count: number, baseTime: Date): ComplaintRecord[] {
  const records: ComplaintRecord[] = [];
  for (let i = 0; i < count; i++) {
    const t = new Date(baseTime.getTime() - rndInt(0, 30) * 86400000 - rndInt(0, 86400) * 1000);
    records.push({
      id: `${pointId}-rec-${i}`,
      pointId,
      complaintContent: rndPick(COMPLAINT_CONTENTS),
      complainant: `居民${rndInt(1000, 9999)}`,
      complaintTime: formatDate(t),
      timelineTag: ["投诉受理", "现场核查", "方案拟定", "公众反馈", "最终裁定"][rndInt(0, 4)],
    });
  }
  return records.sort((a, b) => a.complaintTime.localeCompare(b.complaintTime));
}

function generateHistory(pointId: string, count: number): JudgmentHistory[] {
  const history: JudgmentHistory[] = [];
  let currentJudgment = "待规划师判定";
  const judgments = [
    "待规划师判定",
    "建议移位至东侧50米",
    "存在消防冲突，重新选址",
    "与居民沟通后调整方案",
    "符合规划要求，准予备案",
  ];

  const baseTime = new Date("2026-05-01");
  for (let i = 0; i < count; i++) {
    const nextIdx = Math.min(judgments.indexOf(currentJudgment) + 1, judgments.length - 1);
    const nextJudgment = judgments[rndInt(nextIdx, judgments.length - 1)];
    const t = new Date(baseTime.getTime() + i * 3 * 86400000 + rndInt(0, 86400) * 1000);
    history.push({
      id: `${pointId}-hist-${i}`,
      pointId,
      judgmentBefore: currentJudgment,
      judgmentAfter: nextJudgment,
      operator: i === 0 ? "系统初判" : rndPick(["规划师小赵", "规划师小钱", "复核员老孙"]),
      modifiedAt: formatDate(t),
      changeReason: rndPick([
        "补充现场勘察数据",
        "收到居民新反馈意见",
        "街口冲突检测触发",
        "上级指导意见调整",
        "与相关部门协调结果",
      ]),
    });
    currentJudgment = nextJudgment;
  }
  return history;
}

function generatePhotos(pointId: string, count: number): PhotoAttachment[] {
  const photos: PhotoAttachment[] = [];
  const baseTime = new Date("2026-05-15");
  for (let i = 0; i < count; i++) {
    const t = new Date(baseTime.getTime() + i * 5 * 86400000);
    photos.push({
      id: `${pointId}-photo-${i}`,
      pointId,
      photoUrl: `https://picsum.photos/seed/${pointId}${i}/640/480`,
      uploader: rndPick(["规划师小赵", "网格员小李", "现场勘察员"]),
      uploadedAt: formatDate(t),
      remark: rndPick([
        "现场环境补录",
        "街口冲突细节",
        "居民楼间距测量",
        "消防通道核查",
        "充电桩位置标注",
      ]),
    });
  }
  return photos;
}

export function generateMockPoints(count = 24): ComplaintPoint[] {
  const points: ComplaintPoint[] = [];
  const centerLng = 116.337;
  const centerLat = 39.986;

  for (let i = 0; i < count; i++) {
    const id = `CP-${String(i + 1).padStart(4, "0")}`;
    const lng = centerLng + rnd(-0.025, 0.025);
    const lat = centerLat + rnd(-0.02, 0.02);
    const status: ComplaintStatus = rndPick(STATUSES);
    const source: ComplaintSource = rndPick(SOURCES);
    const isConflict = Math.random() < 0.35;
    const isDuplicate = status === "duplicate" || Math.random() < 0.2;
    const complaintCount = rndInt(isDuplicate ? 3 : 1, isDuplicate ? 12 : 5);

    const firstComplaintAt = new Date(`2026-0${rndInt(1, 4)}-${String(rndInt(1, 28)).padStart(2, "0")}`);
    const latestComplaintAt = new Date(firstComplaintAt.getTime() + rndInt(10, 60) * 86400000);

    const records = generateRecords(id, complaintCount, latestComplaintAt);
    const history = generateHistory(id, rndInt(1, 4));
    const photos = generatePhotos(id, rndInt(0, 3));

    points.push({
      id,
      lng,
      lat,
      source,
      status: isDuplicate ? "duplicate" : status,
      address: `${rndPick(STREET_NAMES)}${rndInt(1, 200)}号 · ${rndPick(COMMUNITY_NAMES)}`,
      isConflict,
      isDuplicate,
      currentJudgment: history.length > 0 ? history[history.length - 1].judgmentAfter : "待规划师判定",
      complaintCount,
      firstComplaintAt: formatDate(firstComplaintAt),
      latestComplaintAt: formatDate(latestComplaintAt),
      rawFields: {
        所属街道: rndPick(["中关村街道", "花园路街道", "学院路街道"]),
        社区编号: `SQ${rndInt(100, 999)}`,
        建议功率: `${rndPick(["7kW", "14kW", "22kW"])}交流`,
        桩位类型: rndPick(["壁挂式", "落地式"]),
      },
      records,
      history,
      photos,
    });
  }

  return points.sort((a, b) => (b.isConflict ? 1 : 0) - (a.isConflict ? 1 : 0));
}

export function generateTimelinePhases(): TimelinePhase[] {
  return [
    { key: "accept", label: "投诉受理", date: "04-08", description: "居民首次反馈问题" },
    { key: "survey", label: "现场核查", date: "04-18", description: "网格员与规划师现场勘察" },
    { key: "plan", label: "方案拟定", date: "05-05", description: "充电桩落位方案初稿" },
    { key: "feedback", label: "公众反馈", date: "05-20", description: "收集周边居民意见" },
    { key: "review", label: "冲突复核", date: "06-01", description: "街口/消防等冲突检测" },
    { key: "final", label: "最终裁定", date: "06-10", description: "规划部门最终判定" },
  ];
}
