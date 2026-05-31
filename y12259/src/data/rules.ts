import type { Rule } from "@/types";

export const RULES: Rule[] = [
  {
    ruleId: "REBAL-01",
    category: "调仓",
    description: "单回合买入同一行业基金超过2只，触发行业集中风险",
    riskType: "行业集中",
  },
  {
    ruleId: "REBAL-02",
    category: "调仓",
    description: "卖出操作未扣手续费，触发手续费漏扣风险",
    riskType: "手续费漏扣",
  },
  {
    ruleId: "REBAL-03",
    category: "调仓",
    description: "单回合卖出超过3只基金，触发恐慌卖出风险",
    riskType: "恐慌卖出",
  },
  {
    ruleId: "REBAL-04",
    category: "调仓",
    description: "调仓后债券型占比低于20%，增加回撤风险敞口",
    riskType: "行业集中",
  },
  {
    ruleId: "DRAW-01",
    category: "回撤",
    description: "基金行业匹配新闻事件受影响行业时，按影响率计算回撤",
    riskType: "行业集中",
  },
  {
    ruleId: "DRAW-02",
    category: "回撤",
    description: "已触发行业集中的基金，回撤幅度额外增加30%",
    riskType: "行业集中",
  },
  {
    ruleId: "DRAW-03",
    category: "回撤",
    description: "手续费漏扣的基金，结算时补扣漏扣金额+滞纳金",
    riskType: "手续费漏扣",
  },
  {
    ruleId: "DRAW-04",
    category: "回撤",
    description: "恐慌卖出的基金，按卖出时净值与回合末净值差计算额外损失",
    riskType: "恐慌卖出",
  },
];
