import type {
  PlayerAction,
  FundCard,
  NewsEvent,
  RiskTrigger,
  RuleFeedback,
  FundDrawdown,
  FeeRecord,
  TraceLink,
  RiskType,
  ActionType,
} from "@/types";
import { RULES } from "@/data/rules";

let _id = 0;
const uid = (prefix: string) => `${prefix}-${++_id}`;

export function checkRebalRules(
  actions: PlayerAction[],
  funds: FundCard[],
  portfolio: Record<string, number>,
  roundId: string,
  eventId: string
): { triggers: RiskTrigger[]; feedbacks: RuleFeedback[] } {
  const triggers: RiskTrigger[] = [];
  const feedbacks: RuleFeedback[] = [];

  const buyActions = actions.filter((a) => a.action === "买入");
  const sellActions = actions.filter((a) => a.action === "卖出");

  const industryBuyCount: Record<string, string[]> = {};
  for (const act of buyActions) {
    const fund = funds.find((f) => f.fundId === act.fundId);
    if (!fund) continue;
    if (!industryBuyCount[fund.industry]) industryBuyCount[fund.industry] = [];
    industryBuyCount[fund.industry].push(act.fundId);
  }

  for (const [industry, fundIds] of Object.entries(industryBuyCount)) {
    if (fundIds.length > 2) {
      const rule = RULES.find((r) => r.ruleId === "REBAL-01")!;
      triggers.push({
        id: uid("RT"),
        roundId,
        riskType: "行业集中",
        eventId,
        fundIds,
        ruleId: rule.ruleId,
        description: `单回合买入${industry}行业基金${fundIds.length}只，超过2只上限，触发行业集中风险`,
      });
      feedbacks.push({
        id: uid("FB"),
        roundId,
        ruleId: rule.ruleId,
        violated: true,
        playerAction: `买入${industry}行业${fundIds.length}只基金`,
        correctAction: "单回合同一行业买入不超过2只",
        explanation: `回合调仓规则 REBAL-01：${rule.description}`,
      });
    }
  }

  if (sellActions.length > 0) {
    let feeOmitted = false;
    const omittedFundIds: string[] = [];
    for (const act of sellActions) {
      const fund = funds.find((f) => f.fundId === act.fundId);
      if (fund && fund.feeRate > 0) {
        feeOmitted = true;
        omittedFundIds.push(act.fundId);
      }
    }
    if (feeOmitted) {
      const rule = RULES.find((r) => r.ruleId === "REBAL-02")!;
      triggers.push({
        id: uid("RT"),
        roundId,
        riskType: "手续费漏扣",
        eventId,
        fundIds: omittedFundIds,
        ruleId: rule.ruleId,
        description: `卖出操作未正确扣除手续费，涉及${omittedFundIds.length}只基金，触发手续费漏扣风险`,
      });
      feedbacks.push({
        id: uid("FB"),
        roundId,
        ruleId: rule.ruleId,
        violated: true,
        playerAction: "卖出时未确认手续费扣减",
        correctAction: "每笔卖出操作必须扣减对应手续费",
        explanation: `回合调仓规则 REBAL-02：${rule.description}`,
      });
    }
  }

  if (sellActions.length > 3) {
    const rule = RULES.find((r) => r.ruleId === "REBAL-03")!;
    const fundIds = sellActions.map((a) => a.fundId);
    triggers.push({
      id: uid("RT"),
      roundId,
      riskType: "恐慌卖出",
      eventId,
      fundIds,
      ruleId: rule.ruleId,
      description: `单回合卖出${sellActions.length}只基金，超过3只上限，触发恐慌卖出风险`,
    });
    feedbacks.push({
      id: uid("FB"),
      roundId,
      ruleId: rule.ruleId,
      violated: true,
      playerAction: `单回合卖出${sellActions.length}只基金`,
      correctAction: "单回合卖出不超过3只基金",
      explanation: `回合调仓规则 REBAL-03：${rule.description}`,
    });
  }

  const totalShares = Object.values(portfolio).reduce((s, v) => s + v, 0);
  const bondShares = Object.entries(portfolio)
    .filter(([fid]) => {
      const f = funds.find((ff) => ff.fundId === fid);
      return f?.fundType === "债券型";
    })
    .reduce((s, [, v]) => s + v, 0);
  const bondRatio = totalShares > 0 ? bondShares / totalShares : 0;

  if (bondRatio < 0.2 && totalShares > 0) {
    const rule = RULES.find((r) => r.ruleId === "REBAL-04")!;
    triggers.push({
      id: uid("RT"),
      roundId,
      riskType: "行业集中",
      eventId,
      fundIds: funds
        .filter((f) => f.fundType !== "债券型")
        .map((f) => f.fundId),
      ruleId: rule.ruleId,
      description: `债券型占比仅${(bondRatio * 100).toFixed(1)}%，低于20%下限，回撤风险敞口增大`,
    });
    feedbacks.push({
      id: uid("FB"),
      roundId,
      ruleId: rule.ruleId,
      violated: true,
      playerAction: `债券型占比${(bondRatio * 100).toFixed(1)}%`,
      correctAction: "保持债券型占比不低于20%",
      explanation: `回合调仓规则 REBAL-04：${rule.description}`,
    });
  }

  if (triggers.length === 0) {
    const passedRules = ["REBAL-01", "REBAL-02", "REBAL-03", "REBAL-04"];
    for (const ruleId of passedRules) {
      const rule = RULES.find((r) => r.ruleId === ruleId)!;
      feedbacks.push({
        id: uid("FB"),
        roundId,
        ruleId: rule.ruleId,
        violated: false,
        playerAction: "符合规则",
        correctAction: "-",
        explanation: `${rule.category}规则 ${ruleId}：未违反`,
      });
    }
  }

  return { triggers, feedbacks };
}

export function calculateDrawdown(
  funds: FundCard[],
  portfolio: Record<string, number>,
  newsEvent: NewsEvent,
  riskTriggers: RiskTrigger[],
  roundId: string
): { drawdowns: FundDrawdown[]; feeRecords: FeeRecord[] } {
  const drawdowns: FundDrawdown[] = [];
  const feeRecords: FeeRecord[] = [];

  const industryConcentrationFunds = new Set<string>();
  const feeOmissionFunds = new Set<string>();
  const panicSellFunds = new Set<string>();

  for (const rt of riskTriggers) {
    if (rt.riskType === "行业集中") {
      rt.fundIds.forEach((fid) => industryConcentrationFunds.add(fid));
    }
    if (rt.riskType === "手续费漏扣") {
      rt.fundIds.forEach((fid) => feeOmissionFunds.add(fid));
    }
    if (rt.riskType === "恐慌卖出") {
      rt.fundIds.forEach((fid) => panicSellFunds.add(fid));
    }
  }

  for (const [fundId, shares] of Object.entries(portfolio)) {
    if (shares <= 0) continue;
    const fund = funds.find((f) => f.fundId === fundId);
    if (!fund) continue;

    const isAffected = newsEvent.affectedIndustries.includes(fund.industry);
    if (!isAffected) continue;

    let drawdownRate = newsEvent.impactRate;
    let ruleApplied = "DRAW-01";

    if (industryConcentrationFunds.has(fundId)) {
      drawdownRate *= 1.3;
      ruleApplied = "DRAW-02";
    }

    const currentNav = fund.navHistory[fund.navHistory.length - 1];
    const drawdownAmount = currentNav * shares * drawdownRate;

    drawdowns.push({
      id: uid("DD"),
      roundId,
      fundId,
      eventId: newsEvent.eventId,
      drawdownAmount: Math.round(drawdownAmount * 100) / 100,
      drawdownRate: Math.round(drawdownRate * 10000) / 100,
      ruleApplied,
    });

    if (feeOmissionFunds.has(fundId)) {
      const omittedFee = currentNav * shares * fund.feeRate;
      const penalty = omittedFee * 0.5;
      feeRecords.push({
        id: uid("FR"),
        roundId,
        fundId,
        actionType: "卖出",
        feeAmount: Math.round((omittedFee + penalty) * 100) / 100,
        omitted: false,
        omitReason: `DRAW-03：补扣手续费${omittedFee.toFixed(2)}+滞纳金${penalty.toFixed(2)}`,
      });
    }
  }

  for (const fid of panicSellFunds) {
    const shares = portfolio[fid] || 0;
    if (shares <= 0) continue;
    const fund = funds.find((f) => f.fundId === fid);
    if (!fund) continue;
    const currentNav = fund.navHistory[fund.navHistory.length - 1];
    const penalty = currentNav * shares * 0.02;
    feeRecords.push({
      id: uid("FR"),
      roundId,
      fundId: fid,
      actionType: "卖出",
      feeAmount: Math.round(penalty * 100) / 100,
      omitted: false,
      omitReason: "DRAW-04：恐慌卖出额外损失",
    });
  }

  return { drawdowns, feeRecords };
}

export function calculateTradeFees(
  actions: PlayerAction[],
  funds: FundCard[],
  roundId: string
): FeeRecord[] {
  return actions
    .filter((a) => a.action === "卖出" || a.action === "买入")
    .map((act) => {
      const fund = funds.find((f) => f.fundId === act.fundId)!;
      const nav = fund.navHistory[fund.navHistory.length - 1];
      const fee = nav * act.shares * fund.feeRate;
      return {
        id: uid("FR"),
        roundId,
        fundId: act.fundId,
        actionType: act.action,
        feeAmount: Math.round(fee * 100) / 100,
        omitted: false,
        omitReason: "",
      };
    });
}

export function buildTraceLinks(
  drawdowns: FundDrawdown[],
  feeRecords: FeeRecord[],
  roundId: string
): TraceLink[] {
  const fundMap = new Map<string, { dd?: FundDrawdown; fr?: FeeRecord }>();

  for (const dd of drawdowns) {
    if (!fundMap.has(dd.fundId)) fundMap.set(dd.fundId, {});
    fundMap.get(dd.fundId)!.dd = dd;
  }
  for (const fr of feeRecords) {
    if (!fundMap.has(fr.fundId)) fundMap.set(fr.fundId, {});
    fundMap.get(fr.fundId)!.fr = fr;
  }

  const links: TraceLink[] = [];
  for (const [fundId, data] of fundMap) {
    const dd = data.dd;
    links.push({
      fundId,
      eventId: dd?.eventId || "",
      drawdownId: dd?.id || "",
      feeRecordId: data.fr?.id || "",
      roundId,
    });
  }
  return links;
}

export const RISK_COLORS: Record<RiskType, string> = {
  行业集中: "#E63946",
  手续费漏扣: "#F4A261",
  恐慌卖出: "#7B2D8E",
};

export const RISK_LABELS: Record<RiskType, string> = {
  行业集中: "行业集中",
  手续费漏扣: "手续费漏扣",
  恐慌卖出: "恐慌卖出",
};

export function getActionLabel(action: ActionType): string {
  return action;
}
