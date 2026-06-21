export const CONCLUSION_STATUS = {
  PENDING: "待审核",
  PASSED: "可放行",
  NEED_MORE: "待补材料",
  MANUAL_OVERRIDDEN: "人工改判",
} as const;

export const EVENT_TYPE = {
  SAMPLE_CREATED: "样本生成",
  ALGO_JUDGED: "算法判定",
  GRAY_RELEASED: "灰度发布",
  MANUAL_CORRECTED: "人工修正",
  POLLUTION_MARKED: "污染标记",
  DECISION_MADE: "放行决策",
} as const;

export const POLLUTION_STATUS = {
  CLEAN: "正常",
  SUSPICIOUS: "疑似污染",
  CONFIRMED: "验证集污染",
} as const;

export const DECISION_CATEGORY = {
  NEED_MORE: "待补材料",
  PASSED: "可放行",
} as const;

export const EVENT_COLORS: Record<string, { bg: string; dot: string; text: string; border: string }> = {
  SAMPLE_CREATED: { bg: "bg-signal-cyan/10", dot: "bg-signal-cyan", text: "text-signal-cyan", border: "border-signal-cyan/40" },
  ALGO_JUDGED: { bg: "bg-signal-violet/10", dot: "bg-signal-violet", text: "text-signal-violet", border: "border-signal-violet/40" },
  GRAY_RELEASED: { bg: "bg-signal-cyan/10", dot: "bg-signal-cyan", text: "text-signal-cyan", border: "border-signal-cyan/40" },
  MANUAL_CORRECTED: { bg: "bg-signal-amber/10", dot: "bg-signal-amber", text: "text-signal-amber", border: "border-signal-amber/40" },
  POLLUTION_MARKED: { bg: "bg-signal-red/10", dot: "bg-signal-red", text: "text-signal-red", border: "border-signal-red/40" },
  DECISION_MADE: { bg: "bg-signal-green/10", dot: "bg-signal-green", text: "text-signal-green", border: "border-signal-green/40" },
};

export const CONCLUSION_COLORS: Record<string, string> = {
  PENDING: "tag bg-signal-slate/20 text-signal-slate border border-signal-slate/30",
  PASSED: "tag bg-signal-green/15 text-signal-green border border-signal-green/30",
  NEED_MORE: "tag bg-signal-amber/15 text-signal-amber border border-signal-amber/30",
  MANUAL_OVERRIDDEN: "tag bg-signal-violet/15 text-signal-violet border border-signal-violet/30",
};

export const POLLUTION_COLORS: Record<string, string> = {
  CLEAN: "tag bg-signal-green/10 text-signal-green/80 border border-signal-green/20",
  SUSPICIOUS: "tag bg-signal-amber/10 text-signal-amber border border-signal-amber/25",
  CONFIRMED: "tag bg-signal-red/15 text-signal-red border border-signal-red/40",
};

export type ConclusionKey = keyof typeof CONCLUSION_STATUS;
export type EventTypeKey = keyof typeof EVENT_TYPE;
export type PollutionKey = keyof typeof POLLUTION_STATUS;
export type DecisionCategoryKey = keyof typeof DECISION_CATEGORY;
