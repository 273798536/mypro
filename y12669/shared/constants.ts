import type { AnomalyDetail, AnomalyType } from "./types";

export const ANOMALY_META: Record<AnomalyType, AnomalyDetail> = {
  TIME_MISMATCH: {
    type: "TIME_MISMATCH",
    name: "时间参数不匹配",
    description:
      "记录的时间参数与风险备注中提及的时间存在不一致。系统在交叉校验时发现两者差值超过允许阈值（±5分钟），可能导致风险判定失效。",
    icon: "clock",
    color: "#EF4444",
    impact: "关联到该时间点的所有风险等级、张力计算与剖面图判定都需要重新复核，不建议直接使用。",
    nextActionType: "calibrate",
    suggestions: [
      {
        action: "修正时间参数",
        description:
          "以实际测量的时间为准，修正记录中的 timeParameter 字段，保存后系统将自动重新计算风险。",
      },
      {
        action: "更新风险备注",
        description:
          "如果时间参数正确，请修改风险备注中的时间描述，确保两者一致。",
      },
    ],
    blockingReason:
      "时间参数是绳索张力、角度风险评估的基准数据，基准不准确将导致下游所有计算结果不可信，因此该记录被拦截，不能进入导出报告。",
  },
  RISK_NOTE_MISSING: {
    type: "RISK_NOTE_MISSING",
    name: "风险备注缺失",
    description: "该记录缺少风险备注字段，或备注内容不足以支撑风险判定（字数 < 10 或不含关键指标说明）。",
    icon: "alert-triangle",
    color: "#F59E0B",
    impact: "周会复核时无法追溯风险来源，导出报告也将缺少必要的决策依据。",
    nextActionType: "material",
    suggestions: [
      {
        action: "补充风险备注",
        description:
          "请至少填写 10 字以上的风险说明，包含：角度值、张力读数、现场环境判断。",
      },
    ],
    blockingReason:
      "风险备注是展馆讲解员对现场情况的主观判断，缺少备注意味着该记录仅有机器数据、无人文复核，按规程不可纳入正式报告。",
  },
  TRANSPARENT_OCCLUSION: {
    type: "TRANSPARENT_OCCLUSION",
    name: "透明遮挡误读",
    description:
      "角度传感器在采样过程中遇到透明介质遮挡（如保护罩、反光玻璃），自动校正算法判定本次读数偏差超过 7°，存在误读风险。",
    icon: "eye-off",
    color: "#8B5CF6",
    impact:
      "当前绳索角度值可能偏小或偏大，直接影响剖面计算结果，以及后续的载荷安全判定。",
    nextActionType: "calibrate",
    suggestions: [
      {
        action: "调整遮挡参数并重新计算",
        description:
          "在修正页中将「透明遮挡系数」由 0 调整为 0.3~0.7，系统将按校正公式重新解算角度。",
      },
      {
        action: "重新进行角度测量",
        description:
          "建议回到现场移除遮挡物后重新测量，确保数据一次到位。",
      },
    ],
    blockingReason:
      "透明遮挡误读属于系统性偏差，而非随机噪声。若直接放行，会让运维组看到失真的角度数据，进而做出错误的载荷判断，因此该记录必须拦截并修正。",
  },
  PARAM_OUT_OF_RANGE: {
    type: "PARAM_OUT_OF_RANGE",
    name: "参数超出范围",
    description:
      "绳索角度、长度或张力至少一项超出系统允许的合理范围（角度 0~180°、长度 5~200m、张力 0~5000kgf）。",
    icon: "trending-up",
    color: "#F97316",
    impact: "极值可能触发安全告警误报或漏报，剖面图展示也会出现扭曲。",
    nextActionType: "calibrate",
    suggestions: [
      {
        action: "调整参数到允许范围",
        description:
          "逐项核对角度、长度、张力三项参数，修正为现场实际测量值。",
      },
    ],
    blockingReason:
      "越界参数会污染统计图表，并让后续批次的数据对比失去意义，系统默认阻止该类记录进入正式数据集。",
  },
  DATA_FORMAT_ERROR: {
    type: "DATA_FORMAT_ERROR",
    name: "数据格式错误",
    description:
      "导入的记录字段格式不符合规范（如时间字符串无法解析、数值中出现非数字字符等）。",
    icon: "file-x",
    color: "#6B7280",
    impact: "该记录无法参与任何计算与展示，必须重新整理。",
    nextActionType: "material",
    suggestions: [
      {
        action: "修正数据格式",
        description:
          "按 ISO-8601 格式填写时间，数值字段只保留数字与小数点。",
      },
    ],
    blockingReason:
      "格式错误的数据无法持久化入库，若强行进入报告，会导致运维组无法二次分析，因此必须在导入阶段拦截。",
  },
};

export const STATUS_META = {
  normal: { label: "正常", className: "badge-success" },
  anomaly: { label: "异常", className: "badge-danger" },
  corrected: { label: "已修正", className: "badge-info" },
  pending: { label: "待处理", className: "badge-warning" },
} as const;

export const SAFETY_THRESHOLDS = {
  ANGLE_MAX: 60,
  ANGLE_MIN: 15,
  TENSION_MAX: 3500,
  TENSION_MIN: 200,
} as const;
