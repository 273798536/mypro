import { SeededRandom, hashConfig } from './helpers';
import type {
  GameConfig,
  GameState,
  GameEvent,
  InterestPayment,
  ActiveProject,
  Deduction,
  Decision,
  RoundSnapshot,
  DebtConfig,
} from '../types';

const ROUND_INTEREST_FACTOR = 12;

function createInitialState(config: GameConfig): GameState {
  const interestPayments: InterestPayment[] = [];
  for (let i = 1; i <= config.totalRounds; i++) {
    interestPayments.push({
      round: i,
      amount: 0,
      paid: false,
      overdue: false,
      penalty: 0,
    });
  }

  return {
    config,
    currentRound: 1,
    totalRounds: config.totalRounds,
    cash: config.debt.totalDebt,
    debtBalance: config.debt.totalDebt,
    interestPayments,
    activeProjects: [],
    completedProjects: [],
    events: [],
    snapshots: [],
    isPaused: false,
    isGameOver: false,
    seed: config.seed || hashConfig(config),
    rating: null,
    deductions: [],
    totalInterestPaid: 0,
    totalProjectRevenue: 0,
    consecutiveNegativeRounds: 0,
  };
}

function scheduleEvents(config: GameConfig, seed: number): GameEvent[] {
  const rng = new SeededRandom(seed);
  const events: GameEvent[] = [];
  const totalRounds = config.totalRounds;
  const projectIds = config.projects.map((p) => p.id);

  for (let round = 2; round <= totalRounds; round++) {
    const roll = rng.next();

    if (roll < 0.12 && projectIds.length > 0) {
      const penaltyAmount = config.debt.totalDebt * config.debt.interestRate / ROUND_INTEREST_FACTOR * 0.5;
      events.push({
        id: `interest_miss_${round}`,
        type: 'interest_miss',
        round,
        description: `第${round}回合利息漏算：系统未计入本回合应还利息，下回合将补计并加收罚息`,
        impact: { penaltyAmount },
        resolved: false,
      });
    } else if (roll < 0.24 && projectIds.length > 0) {
      const delayRounds = rng.nextInt(1, 2);
      const targetIdx = rng.nextInt(0, projectIds.length - 1);
      events.push({
        id: `project_delay_${round}`,
        type: 'project_delay',
        round,
        description: `第${round}回合项目延期：某项目交付延后${delayRounds}回合，收益延迟到账`,
        impact: { delayRounds, projectId: projectIds[targetIdx] },
        resolved: false,
      });
    } else if (roll < 0.34) {
      const reduction = rng.nextFloat(0.3, 0.5);
      events.push({
        id: `revenue_decline_${round}`,
        type: 'revenue_decline',
        round,
        description: `第${round}回合收入下滑：本回合项目收入减少${Math.round(reduction * 100)}%`,
        impact: { revenueReduction: reduction },
        resolved: false,
      });
    }
  }

  return events;
}

function calculateInterestAmount(debtBalance: number, config: GameConfig, round: number): number {
  const rate =
    config.debt.interestType === 'floating' && config.debt.floatingRates
      ? config.debt.floatingRates[Math.min(round - 1, config.debt.floatingRates.length - 1)]
      : config.debt.interestRate;
  return debtBalance * rate / ROUND_INTEREST_FACTOR;
}

function collectProjectRevenue(
  activeProjects: ActiveProject[],
  currentRound: number,
  revenueReduction: number
): number {
  let totalRevenue = 0;

  for (const ap of activeProjects) {
    const elapsedRounds = currentRound - ap.startRound + 1;
    const effectiveRound = elapsedRounds - ap.delayRounds;

    if (effectiveRound > 0 && effectiveRound <= ap.card.revenuePerRound.length) {
      const baseRevenue = ap.card.revenuePerRound[effectiveRound - 1];
      const actualRevenue = baseRevenue * (1 - ap.revenueReduction) * (1 - revenueReduction);
      totalRevenue += actualRevenue;
    }
  }

  return totalRevenue;
}

function calculateRating(state: GameState): 'A' | 'B' | 'C' | 'D' | 'F' {
  const netWorth = state.cash - state.debtBalance;
  const overdueCount = state.interestPayments.filter((ip) => ip.overdue).length;

  if (state.consecutiveNegativeRounds >= 2) return 'F';
  if (netWorth < 0 && state.consecutiveNegativeRounds >= 1) return 'D';
  if (netWorth >= 0 && overdueCount === 0) return 'A';
  if (netWorth >= 0 && overdueCount <= 1) return 'B';
  if (netWorth >= 0 && overdueCount <= 3) return 'C';
  return 'D';
}

export function initGame(config: GameConfig): GameState {
  const state = createInitialState(config);
  const events = scheduleEvents(config, state.seed);
  state.events = events;

  const firstPayment = state.interestPayments.find((ip) => ip.round === 1);
  if (firstPayment) {
    firstPayment.amount = calculateInterestAmount(state.debtBalance, config, 1);
  }

  return state;
}

export function processRound(
  state: GameState,
  decision: Decision,
  onEvent?: (event: GameEvent) => void
): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const round = decision.round;

  const payment = newState.interestPayments.find((ip) => ip.round === round);
  if (payment) {
    payment.amount = calculateInterestAmount(newState.debtBalance, newState.config, round);
  }

  const roundEvents = newState.events.filter((e) => e.round === round && !e.resolved);
  let revenueReduction = 0;

  for (const event of roundEvents) {
    event.resolved = true;
    onEvent?.(event);

    switch (event.type) {
      case 'interest_miss': {
        const penalty = event.impact.penaltyAmount || 0;
        newState.deductions.push({
          type: 'interest_miss',
          round,
          amount: penalty,
          description: `利息漏算罚金：${penalty.toFixed(0)}万元`,
        });
        if (payment) {
          payment.penalty += penalty;
        }
        const nextPayment = newState.interestPayments.find((ip) => ip.round === round + 1);
        if (nextPayment) {
          nextPayment.penalty += penalty;
        }
        break;
      }
      case 'project_delay': {
        const delayRounds = event.impact.delayRounds || 1;
        const projectId = event.impact.projectId;
        const targetProject = newState.activeProjects.find(
          (ap) => ap.card.id === projectId
        );
        if (targetProject) {
          targetProject.delayRounds += delayRounds;
        }
        newState.deductions.push({
          type: 'project_delay',
          round,
          amount: delayRounds * 500,
          description: `项目延期${delayRounds}回合，扣${(delayRounds * 500).toFixed(0)}万元`,
        });
        break;
      }
      case 'revenue_decline': {
        revenueReduction = event.impact.revenueReduction || 0.3;
        const declineAmount = collectProjectRevenue(newState.activeProjects, round, 0) * revenueReduction;
        newState.deductions.push({
          type: 'revenue_decline',
          round,
          amount: declineAmount,
          description: `收入下滑${Math.round(revenueReduction * 100)}%，损失${declineAmount.toFixed(0)}万元`,
        });
        break;
      }
    }
  }

  for (const projectId of decision.projectIds) {
    const card = newState.config.projects.find((p) => p.id === projectId);
    if (card && !newState.activeProjects.find((ap) => ap.card.id === projectId)) {
      newState.cash -= card.investmentAmount;
      newState.activeProjects.push({
        card,
        startRound: round,
        delayRounds: 0,
        revenueReduction: 0,
        roundsCollected: 0,
      });
    }
  }

  const revenue = collectProjectRevenue(newState.activeProjects, round, revenueReduction);
  newState.cash += revenue;
  newState.totalProjectRevenue += revenue;

  const currentInterestAmount = payment?.amount || calculateInterestAmount(newState.debtBalance, newState.config, round);
  const totalDue = currentInterestAmount + (payment?.penalty || 0);

  if (decision.repaymentType === 'full') {
    const repayAmount = Math.min(decision.repaymentAmount, newState.debtBalance + totalDue);
    newState.cash -= repayAmount;
    const interestPart = Math.min(totalDue, repayAmount);
    newState.totalInterestPaid += interestPart;
    newState.debtBalance -= (repayAmount - interestPart);
    if (payment) {
      payment.paid = true;
    }
  } else if (decision.repaymentType === 'minimum') {
    if (newState.cash >= totalDue) {
      newState.cash -= totalDue;
      newState.totalInterestPaid += totalDue;
      if (payment) {
        payment.paid = true;
      }
    } else {
      if (payment) {
        payment.overdue = true;
      }
      const nextPayment = newState.interestPayments.find((ip) => ip.round === round + 1);
      if (nextPayment) {
        nextPayment.penalty += totalDue * 0.5;
      }
    }
  } else {
    const partialAmount = Math.min(decision.repaymentAmount, newState.cash);
    newState.cash -= partialAmount;
    const interestPart = Math.min(totalDue, partialAmount);
    newState.totalInterestPaid += interestPart;
    newState.debtBalance -= Math.max(0, partialAmount - interestPart);
    if (interestPart >= totalDue && payment) {
      payment.paid = true;
    } else if (payment) {
      payment.overdue = true;
      const nextPayment = newState.interestPayments.find((ip) => ip.round === round + 1);
      if (nextPayment) {
        nextPayment.penalty += Math.max(0, totalDue - interestPart) * 0.5;
      }
    }
  }

  if (newState.debtBalance < 0) {
    newState.cash += Math.abs(newState.debtBalance);
    newState.debtBalance = 0;
  }

  const completedProjects: ActiveProject[] = [];
  const remainingProjects: ActiveProject[] = [];

  for (const ap of newState.activeProjects) {
    const elapsedRounds = round - ap.startRound + 1;
    const effectiveRound = elapsedRounds - ap.delayRounds;
    if (effectiveRound >= ap.card.duration) {
      completedProjects.push(ap);
    } else {
      remainingProjects.push(ap);
    }
  }

  newState.activeProjects = remainingProjects;
  newState.completedProjects = [...newState.completedProjects, ...completedProjects];

  const netWorth = newState.cash - newState.debtBalance;
  if (netWorth < 0) {
    newState.consecutiveNegativeRounds++;
  } else {
    newState.consecutiveNegativeRounds = 0;
  }

  const snapshot: RoundSnapshot = {
    round,
    cash: newState.cash,
    debtBalance: newState.debtBalance,
    totalInterestPaid: newState.totalInterestPaid,
    projectRevenue: newState.totalProjectRevenue,
    netWorth,
    decisions: [decision],
    events: roundEvents,
    interestPayments: newState.interestPayments.filter((ip) => ip.round === round),
  };
  newState.snapshots.push(snapshot);

  if (newState.consecutiveNegativeRounds >= 2 || round >= newState.totalRounds) {
    newState.isGameOver = true;
    newState.rating = calculateRating(newState);
    if (newState.consecutiveNegativeRounds >= 2) {
      newState.deductions.push({
        type: 'bankruptcy',
        round,
        amount: Math.abs(netWorth),
        description: '财政破产：净资产连续2回合为负',
      });
    }
  } else {
    newState.currentRound = round + 1;
    const nextPayment = newState.interestPayments.find((ip) => ip.round === round + 1);
    if (nextPayment) {
      nextPayment.amount = calculateInterestAmount(newState.debtBalance, newState.config, round + 1);
    }
  }

  return newState;
}

export function simulateGame(config: GameConfig, decisions: Decision[]): GameState {
  let state = initGame(config);
  for (const decision of decisions) {
    state = processRound(state, decision);
  }
  return state;
}

export function recalculateWithDebt(
  originalState: GameState,
  newDebt: DebtConfig
): GameState {
  const newConfig: GameConfig = {
    ...originalState.config,
    debt: newDebt,
  };

  const decisions: Decision[] = originalState.snapshots.flatMap((s) => s.decisions);
  return simulateGame(newConfig, decisions);
}
