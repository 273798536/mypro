import type { ReplayRecord, VersionComparison } from "@/types"

export const replayRecords: ReplayRecord[] = [
  {
    id: "rec-001",
    title: "影子流量基线回放-2024Q4",
    status: "processed",
    recordType: "normal",
    featureLateFlag: false,
    materials: [
      { type: "training_log", description: "Q4 基线模型训练日志，含完整参数快照", revised: false },
      { type: "supplementary_note", description: "训练环境变更说明（GPU 集群迁移）", revised: false },
    ],
    createdAt: "2024-12-15 09:30",
    updatedAt: "2024-12-16 14:20",
  },
  {
    id: "rec-002",
    title: "影子流量漂移回放-2025W03",
    status: "pending_material",
    recordType: "supplementary",
    featureLateFlag: false,
    materials: [
      { type: "training_log", description: "W03 漂移检测模型训练日志", revised: true, revisedAt: "2025-01-22 11:05", revisedContent: "原始日志缺少学习率调整记录，后补 lr=0.001→0.0005" },
      { type: "supplementary_note", description: "值班小林后补备注：漂移阈值由 0.8 调至 0.75", revised: true, revisedAt: "2025-01-23 16:30", revisedContent: "补充说明阈值调整原因——线上 A/B 实验反馈" },
      { type: "verbal_note", description: "口头说明：W03 周会讨论结论", revised: false },
    ],
    createdAt: "2025-01-20 10:00",
    updatedAt: "2025-01-23 16:30",
  },
  {
    id: "rec-003",
    title: "影子流量特征迟到回放-2025W05",
    status: "manual_override",
    recordType: "anomaly",
    featureLateFlag: true,
    materials: [
      { type: "training_log", description: "W05 特征迟到异常训练日志", revised: false },
      { type: "supplementary_note", description: "特征迟到说明：用户画像特征延迟 2 小时入库", revised: true, revisedAt: "2025-02-04 09:15", revisedContent: "修正特征迟到时长为 3 小时，含重算结果" },
      { type: "verbal_note", description: "口头说明：特征管道故障初步排查", revised: true, revisedAt: "2025-02-05 14:00", revisedContent: "更新为正式故障报告编号 INC-20250205-003" },
    ],
    createdAt: "2025-02-03 08:45",
    updatedAt: "2025-02-05 14:00",
  },
  {
    id: "rec-004",
    title: "影子流量阈值调整回放-2025W06",
    status: "pending_material",
    recordType: "normal",
    featureLateFlag: true,
    materials: [
      { type: "training_log", description: "W06 阈值调优训练日志", revised: false },
      { type: "supplementary_note", description: "待补：阈值敏感性分析报告", revised: false },
    ],
    createdAt: "2025-02-10 11:00",
    updatedAt: "2025-02-10 11:00",
  },
]

export const versionComparisons: Record<string, VersionComparison> = {
  "rec-001": {
    recordId: "rec-001",
    sampleChange: { previous: 12000, current: 12000, delta: 0 },
    thresholdChange: { previous: 0.85, current: 0.85, reason: "基线版本无阈值调整" },
    manualCorrections: [],
    metricChanges: [
      { name: "精确率", previous: 0.92, current: 0.92, unit: "%" },
      { name: "召回率", previous: 0.88, current: 0.88, unit: "%" },
      { name: "F1", previous: 0.90, current: 0.90, unit: "%" },
    ],
  },
  "rec-002": {
    recordId: "rec-002",
    sampleChange: { previous: 8500, current: 9200, delta: 700 },
    thresholdChange: { previous: 0.80, current: 0.75, reason: "线上 A/B 实验反馈，漂移检测灵敏度不足" },
    manualCorrections: [
      {
        field: "漂移判定阈值",
        previousValue: 0.80,
        correctedValue: 0.75,
        correctedBy: "小林",
        correctedAt: "2025-01-22 11:05",
        reason: "A/B 实验显示原阈值漏检率偏高",
      },
    ],
    metricChanges: [
      { name: "精确率", previous: 0.89, current: 0.86, unit: "%" },
      { name: "召回率", previous: 0.78, current: 0.84, unit: "%" },
      { name: "F1", previous: 0.83, current: 0.85, unit: "%" },
    ],
  },
  "rec-003": {
    recordId: "rec-003",
    sampleChange: { previous: 6000, current: 5400, delta: -600 },
    thresholdChange: { previous: 0.78, current: 0.72, reason: "特征迟到导致样本分布偏移，降低阈值减少误判" },
    manualCorrections: [
      {
        field: "特征迟到时长",
        previousValue: "2小时",
        correctedValue: "3小时",
        correctedBy: "小林",
        correctedAt: "2025-02-04 09:15",
        reason: "重新核查管道日志，实际延迟为3小时",
      },
      {
        field: "异常判定结果",
        previousValue: "疑似漂移",
        correctedValue: "特征迟到导致伪漂移",
        correctedBy: "项目经理",
        correctedAt: "2025-02-05 10:00",
        reason: "确认特征迟到为根因，非真实流量漂移",
      },
    ],
    metricChanges: [
      { name: "精确率", previous: 0.81, current: 0.79, unit: "%" },
      { name: "召回率", previous: 0.75, current: 0.82, unit: "%" },
      { name: "F1", previous: 0.78, current: 0.80, unit: "%" },
    ],
  },
  "rec-004": {
    recordId: "rec-004",
    sampleChange: { previous: 10000, current: 10000, delta: 0 },
    thresholdChange: { previous: 0.85, current: 0.80, reason: "待确认：需补充阈值敏感性分析" },
    manualCorrections: [],
    metricChanges: [
      { name: "精确率", previous: 0.91, current: 0.88, unit: "%" },
      { name: "召回率", previous: 0.82, current: 0.86, unit: "%" },
      { name: "F1", previous: 0.86, current: 0.87, unit: "%" },
    ],
  },
}
