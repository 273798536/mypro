import type {
  GameState,
  PlayerAction,
  FundCard,
  NewsEvent,
  Round,
  RiskSlotState,
  RiskType,
} from "@/types";
import { INITIAL_FUNDS, INITIAL_CASH } from "@/data/funds";
import { NEWS_EVENTS, TOTAL_ROUNDS } from "@/data/events";
import {
  checkRebalRules,
  calculateDrawdown,
  calculateTradeFees,
  buildTraceLinks,
} from "@/engine/ruleEngine";

export function createInitialState(): GameState {
  return {
    phase: "idle",
    currentRound: 0,
    totalRounds: TOTAL_ROUNDS,
    funds: INITIAL_FUNDS.map((f) => ({ ...f, navHistory: [...f.navHistory] })),
    portfolio: {},
    cash: INITIAL_CASH,
    initialCash: INITIAL_CASH,
    rounds: [],
    newsEvents: [],
    roundPositions: [],
    drawdowns: [],
    feeRecords: [],
    riskTriggers: [],
    ruleFeedbacks: [],
    traceLinks: [],
    riskSlots: [
      { type: "行业集中", level: 0, maxLevel: 5, triggers: [] },
      { type: "手续费漏扣", level: 0, maxLevel: 5, triggers: [] },
      { type: "恐慌卖出", level: 0, maxLevel: 5, triggers: [] },
    ],
    pendingActions: [],
    report: null,
  };
}

export function startGame(state: GameState): GameState {
  const newState = createInitialState();
  newState.phase = "playing";
  newState.currentRound = 1;
  return advanceToRound(newState, 1);
}

function pickEvent(roundNumber: number): Omit<NewsEvent, "roundId"> {
  const idx = (roundNumber - 1) % NEWS_EVENTS.length;
  return NEWS_EVENTS[idx];
}

function advanceToRound(state: GameState, roundNumber: number): GameState {
  const roundId = `R${roundNumber}`;
  const eventData = pickEvent(roundNumber);
  const newsEvent: NewsEvent = { ...eventData, roundId };
  const round: Round = {
    roundId,
    roundNumber,
    eventId: newsEvent.eventId,
    marketDrawdown: newsEvent.impactRate,
  };

  return {
    ...state,
    currentRound: roundNumber,
    rounds: [...state.rounds, round],
    newsEvents: [...state.newsEvents, newsEvent],
    pendingActions: [],
  };
}

export function setPendingAction(
  state: GameState,
  fundId: string,
  action: PlayerAction["action"],
  shares: number
): GameState {
  const existing = state.pendingActions.find((a) => a.fundId === fundId);
  let newActions: PlayerAction[];
  if (existing) {
    newActions = state.pendingActions.map((a) =>
      a.fundId === fundId ? { ...a, action, shares } : a
    );
  } else {
    newActions = [...state.pendingActions, { fundId, action, shares }];
  }
  return { ...state, pendingActions: newActions };
}

export function removePendingAction(state: GameState, fundId: string): GameState {
  return {
    ...state,
    pendingActions: state.pendingActions.filter((a) => a.fundId !== fundId),
  };
}

export function submitRound(state: GameState): GameState {
  const roundId = `R${state.currentRound}`;
  const newsEvent = state.newsEvents.find((ne) => ne.roundId === roundId)!;

  let newPortfolio = { ...state.portfolio };
  let newCash = state.cash;
  const newFunds = state.funds.map((f) => ({ ...f, navHistory: [...f.navHistory] }));

  const tradeFees = calculateTradeFees(state.pendingActions, state.funds, roundId);

  for (const act of state.pendingActions) {
    const fund = state.funds.find((f) => f.fundId === act.fundId)!;
    const nav = fund.navHistory[fund.navHistory.length - 1];
    const cost = nav * act.shares;
    const fee = cost * fund.feeRate;

    if (act.action === "买入") {
      if (newCash >= cost + fee) {
        newCash -= cost + fee;
        newPortfolio[act.fundId] = (newPortfolio[act.fundId] || 0) + act.shares;
      }
    } else if (act.action === "卖出") {
      const held = newPortfolio[act.fundId] || 0;
      const sellShares = Math.min(act.shares, held);
      if (sellShares > 0) {
        newCash += cost - fee;
        newPortfolio[act.fundId] = held - sellShares;
        if (newPortfolio[act.fundId] <= 0) {
          delete newPortfolio[act.fundId];
        }
      }
    }
  }

  const { triggers: rebalTriggers, feedbacks: rebalFeedbacks } = checkRebalRules(
    state.pendingActions,
    newFunds,
    newPortfolio,
    roundId,
    newsEvent.eventId
  );

  const { drawdowns, feeRecords: penaltyFees } = calculateDrawdown(
    newFunds,
    newPortfolio,
    newsEvent,
    rebalTriggers,
    roundId
  );

  let totalDrawdown = 0;
  for (const dd of drawdowns) {
    totalDrawdown += dd.drawdownAmount;
  }
  let totalPenalty = 0;
  for (const fr of penaltyFees) {
    totalPenalty += fr.feeAmount;
  }
  newCash -= totalDrawdown + totalPenalty;

  for (const dd of drawdowns) {
    const fund = newFunds.find((f) => f.fundId === dd.fundId);
    if (fund) {
      const lastNav = fund.navHistory[fund.navHistory.length - 1];
      fund.navHistory.push(Math.max(0.01, lastNav * (1 - dd.drawdownRate / 100)));
    }
  }
  for (const fid of Object.keys(newPortfolio)) {
    if (!drawdowns.find((dd) => dd.fundId === fid)) {
      const fund = newFunds.find((f) => f.fundId === fid);
      if (fund) {
        const lastNav = fund.navHistory[fund.navHistory.length - 1];
        fund.navHistory.push(lastNav * (1 - 0.005));
      }
    }
  }

  const allFeeRecords = [...tradeFees, ...penaltyFees];
  const allTriggers = [...rebalTriggers];
  const allFeedbacks = [...rebalFeedbacks];
  const newTraceLinks = buildTraceLinks(drawdowns, allFeeRecords, roundId);

  const newRiskSlots = state.riskSlots.map((slot) => {
    const relevant = allTriggers.filter((t) => t.riskType === slot.type);
    return {
      ...slot,
      level: Math.min(slot.maxLevel, slot.level + relevant.length),
      triggers: [...slot.triggers, ...relevant],
    };
  });

  const roundPositions = state.pendingActions.map((act) => ({
    id: `RP-${act.fundId}-${roundId}`,
    roundId,
    fundId: act.fundId,
    action: act.action,
    shares: act.shares,
    feeCharged: tradeFees.find((f) => f.fundId === act.fundId)?.feeAmount || 0,
    feeOmitted: false,
    feeOmitReason: "",
  }));

  return {
    ...state,
    phase: "settlement",
    portfolio: newPortfolio,
    cash: Math.round(newCash * 100) / 100,
    funds: newFunds,
    roundPositions: [...state.roundPositions, ...roundPositions],
    drawdowns: [...state.drawdowns, ...drawdowns],
    feeRecords: [...state.feeRecords, ...allFeeRecords],
    riskTriggers: [...state.riskTriggers, ...allTriggers],
    ruleFeedbacks: [...state.ruleFeedbacks, ...allFeedbacks],
    traceLinks: [...state.traceLinks, ...newTraceLinks],
    riskSlots: newRiskSlots,
    pendingActions: [],
  };
}

export function nextRound(state: GameState): GameState {
  if (state.currentRound >= state.totalRounds) {
    return generateReport(state);
  }
  const nextRoundNum = state.currentRound + 1;
  return advanceToRound({ ...state, phase: "playing" }, nextRoundNum);
}

export function generateReport(state: GameState): GameState {
  const totalPortfolioValue = Object.entries(state.portfolio).reduce(
    (sum, [fid, shares]) => {
      const fund = state.funds.find((f) => f.fundId === fid);
      if (!fund) return sum;
      return sum + fund.navHistory[fund.navHistory.length - 1] * shares;
    },
    0
  );
  const totalValue = state.cash + totalPortfolioValue;
  const totalScore = Math.max(0, Math.round(totalValue));

  const buildSection = (riskType: RiskType) => {
    const triggers = state.riskTriggers.filter((t) => t.riskType === riskType);
    const affectedFunds = [...new Set(triggers.flatMap((t) => t.fundIds))];
    const affectedRounds = [...new Set(triggers.map((t) => t.roundId))];
    return {
      totalTriggers: triggers.length,
      triggers,
      affectedFunds,
      affectedRounds,
    };
  };

  const rounds: GameState["report"]["rounds"] = state.rounds.map((round) => ({
    roundId: round.roundId,
    roundNumber: round.roundNumber,
    drawdowns: state.drawdowns.filter((d) => d.roundId === round.roundId),
    fees: state.feeRecords.filter((f) => f.roundId === round.roundId),
    feedbacks: state.ruleFeedbacks.filter((fb) => fb.roundId === round.roundId),
    riskTriggers: state.riskTriggers.filter((rt) => rt.roundId === round.roundId),
  }));

  const report = {
    totalScore,
    maxScore: state.initialCash,
    survivalRounds: state.currentRound,
    riskBreakdown: {
      industryConcentration: buildSection("行业集中"),
      feeOmission: buildSection("手续费漏扣"),
      panicSelling: buildSection("恐慌卖出"),
    },
    traceLinks: state.traceLinks,
    rounds,
  };

  return { ...state, phase: "report", report };
}
