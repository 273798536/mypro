import type {
  SampleRecord,
  SamplingStep,
  UnstableRecord,
  ParamVersion,
  ChartPoint,
} from "@/types";

export const mockSamples: SampleRecord[] = [
  {
    id: "s001",
    name: "用户A-订单001",
    value: 1280,
    category: "高价值",
    dataIssue: "normal",
  },
  {
    id: "s002",
    name: "用户B-订单002",
    value: 450,
    category: "普通",
    dataIssue: "normal",
  },
  {
    id: "s003",
    name: "用户C-订单003",
    value: undefined,
    category: "普通",
    dataIssue: "missing_field",
  },
  {
    id: "s004",
    name: "用户D-订单004",
    value: 2100,
    category: "高价值",
    alias: "VIP客户D-钻石单",
    dataIssue: "alias",
  },
  {
    id: "s005",
    name: "用户E-订单005",
    value: 890,
    category: "普通",
    dataIssue: "normal",
  },
  {
    id: "s006",
    name: "用户F-订单006",
    value: 3200,
    category: "高价值",
    remark: "该订单为活动补贴单，金额含平台返现2000元",
    dataIssue: "remark",
  },
  {
    id: "s007",
    name: "用户G-订单007",
    value: 650,
    category: undefined,
    dataIssue: "missing_field",
  },
  {
    id: "s008",
    name: "用户H-订单008",
    value: 1780,
    category: "高价值",
    dataIssue: "normal",
  },
  {
    id: "s009",
    name: "用户I-订单009",
    value: 920,
    category: "普通",
    alias: "老客户I-复购单",
    dataIssue: "alias",
  },
  {
    id: "s010",
    name: "用户J-订单010",
    value: 560,
    category: "普通",
    dataIssue: "normal",
  },
  {
    id: "s011",
    name: "用户K-订单011",
    value: 4500,
    category: "高价值",
    remark: "异常大额订单，风控已标记但未拦截",
    dataIssue: "remark",
  },
  {
    id: "s012",
    name: "用户L-订单012",
    value: 780,
    category: "普通",
    dataIssue: "normal",
  },
];

export const mockSteps: SamplingStep[] = [
  {
    stepIndex: 1,
    title: "原始数据载入",
    description: "导入 12 条订单记录，包含缺字段、别名、补充备注等脏数据",
    params: { source: "orders_2025_q1.csv", encoding: "utf-8" },
    affectedSampleIds: ["s001", "s002", "s003", "s004", "s005", "s006", "s007", "s008", "s009", "s010", "s011", "s012"],
    resultDelta: "载入 12 条，字段完整 9 条，存在问题 3 条",
  },
  {
    stepIndex: 2,
    title: "参数初始化",
    description: "加载参数版本 v1：抽样率 10%，分层键 category",
    params: { sampleRate: 0.1, stratifyKey: "category", seed: 42 },
    affectedSampleIds: [],
    resultDelta: "参数就绪，预计抽样 1-2 条",
  },
  {
    stepIndex: 3,
    title: "缺字段处理",
    description: "使用同类别均值填充缺失值；s003 缺 value，s007 缺 category",
    params: { strategy: "mean_fill", fallbackCategory: "未分类" },
    affectedSampleIds: ["s003", "s007"],
    resultDelta: "s003.value = 1185.7（均值填充），s007.category = 未分类",
    note: "均值来自剩余 11 条记录的 value 平均值",
  },
  {
    stepIndex: 4,
    title: "别名去重",
    description: "检测 alias 字段，s004 和 s009 存在别名，保留主名称并添加别名映射",
    params: { dedupKey: "name", keepAlias: true },
    affectedSampleIds: ["s004", "s009"],
    resultDelta: "去重后仍为 12 条（别名非重复记录），映射关系已记录",
  },
  {
    stepIndex: 5,
    title: "排序与稳定性检查",
    description: "按 value 降序排序，检测到 s011 与 s004 值相邻但分类差异大，排序不稳定",
    params: { sortKey: "value", order: "desc", stableCheck: true },
    affectedSampleIds: ["s011", "s004", "s008"],
    resultDelta: "排序触发不稳定警告，s011 进入待确认区",
    triggerUnstable: true,
    note: "s011(4500) 与 s006(3200) 差距大但 s011 为异常单，可能影响分层占比",
  },
  {
    stepIndex: 6,
    title: "分层抽样执行",
    description: "按 category 分层，每层按抽样率 12% 抽取（参数已从 v2 回滚至 v3）",
    params: { sampleRate: 0.12, stratifyKey: "category" },
    affectedSampleIds: ["s001", "s006", "s005", "s010"],
    resultDelta: "抽取 4 条：高价值 2 条，普通 2 条，抽样率 33.3%",
  },
  {
    stepIndex: 7,
    title: "结果输出",
    description: "生成最终样本集，统计指标：均值、中位数、分层占比",
    params: { outputFormat: "json", includeMetadata: true },
    affectedSampleIds: ["s001", "s006", "s005", "s010"],
    resultDelta: "样本均值 = 1482.5，总体均值 = 1596.3，偏差 = -7.1%",
  },
];

export const mockUnstableRecords: UnstableRecord[] = [
  {
    id: "u001",
    sampleId: "s011",
    description: "排序时 s011(value=4500) 为异常大额订单，风控已标记但未拦截，可能拉高高价值分层均值",
    impactedMetrics: ["高价值分层占比 +0.3%", "样本均值偏移 +12.5", "中位数不受影响"],
    reviewer: "小孟",
    status: "pending",
    createdAt: "2026-06-22 10:24",
  },
];

export const mockParamVersions: ParamVersion[] = [
  {
    version: "v1",
    changedBy: "小孟",
    changedAt: "2026-06-20 14:00",
    beforeParams: {},
    afterParams: { sampleRate: 0.1, stratifyKey: "category" },
    changeNote: "初始参数设定，按行业标准 10% 抽样率",
  },
  {
    version: "v2",
    changedBy: "同学（未记录）",
    changedAt: "2026-06-21 09:15",
    beforeParams: { sampleRate: 0.1, stratifyKey: "category" },
    afterParams: { sampleRate: 0.15, stratifyKey: "value" },
    changeNote: "参数被修改但未留下变更记录，抽样率提高且分层键改为 value",
  },
  {
    version: "v3",
    changedBy: "小孟",
    changedAt: "2026-06-22 09:45",
    beforeParams: { sampleRate: 0.15, stratifyKey: "value" },
    afterParams: { sampleRate: 0.12, stratifyKey: "category" },
    changeNote: "回滚分层键为 category，抽样率折中为 12%",
  },
];

export function generateChartPoints(samples: SampleRecord[]): ChartPoint[] {
  return samples
    .filter((s) => s.value !== undefined || s.filledValue !== undefined)
    .map((s, idx) => ({
      x: idx + 1,
      y: s.value ?? s.filledValue ?? 0,
      sampleId: s.id,
      isOutlier: s.id === "s011" || s.id === "s006",
      label: s.name,
    }));
}
