import type { ParamExplanation } from "@/types";

export const PARAM_EXPLANATIONS: Record<string, ParamExplanation> = {
  width: {
    key: "width",
    name: "风廊宽度",
    explanation:
      "风廊宽度决定通风廊道的横向空间，直接影响气流通过能力。一般主干风廊建议不小于30米，以确保城市通风效果。",
  },
  height: {
    key: "height",
    name: "风廊高度",
    explanation:
      "风廊高度控制建筑顶部的净空要求，与两侧建筑高度比例通常建议为1:1.5，避免形成峡谷效应阻碍通风。",
  },
  angle: {
    key: "angle",
    name: "风廊偏角",
    explanation:
      "风廊偏角指相对于主导风向的偏转角度，偏角控制在±30度以内可最大化通风效率，偏角过大会导致气流受阻。",
  },
  setback: {
    key: "setback",
    name: "建筑退距",
    explanation:
      "建筑退距是建筑到风廊边界的距离，用于确保风廊的连续性。退距不足会导致风廊截面收窄，降低通风效果。",
  },
};

export const COLLISION_TYPE_EXPLANATIONS: Record<string, string> = {
  overlap: "体块重叠：两个建筑体块在空间上发生交叉，违反规划红线要求，需立即调整。",
  corridor_violation:
    "侵入风廊：建筑体块超出风廊控制边界，会阻挡气流路径，影响城市通风廊道的完整性。",
  setback_insufficient:
    "退距不足：建筑距风廊边界小于规范要求，可能形成风廊瓶颈，降低整体通风效率。",
};

export const SEVERITY_LABELS: Record<string, string> = {
  high: "严重",
  medium: "中等",
  low: "轻微",
};
