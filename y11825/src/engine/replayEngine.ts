import type { GameState, GameStateSnapshot, SettlementResult } from '../types';

const STORAGE_KEY = 'volatility_tower_defense_snapshots';
const RESULTS_STORAGE_KEY = 'volatility_tower_defense_results';

export const recordGameSnapshot = (
  state: GameState,
  round: number
): GameStateSnapshot => {
  const snapshot: GameStateSnapshot = {
    ...JSON.parse(JSON.stringify(state)),
    snapshotRound: round,
    snapshotTime: Date.now(),
  };

  try {
    const existingSnapshots = loadAllSnapshots(state.sessionId);
    existingSnapshots.push(snapshot);

    const allSnapshots = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    allSnapshots[state.sessionId] = existingSnapshots;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSnapshots));
  } catch (e) {
    console.error('Failed to save snapshot:', e);
  }

  return snapshot;
};

export const loadAllSnapshots = (sessionId: string): GameStateSnapshot[] => {
  try {
    const allSnapshots = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return allSnapshots[sessionId] || [];
  } catch (e) {
    console.error('Failed to load snapshots:', e);
    return [];
  }
};

export const replayGame = (
  snapshots: GameStateSnapshot[],
  targetRound: number
): GameState | null => {
  const snapshot = snapshots.find((s) => s.snapshotRound === targetRound);
  if (snapshot) {
    const { snapshotRound, snapshotTime, ...state } = snapshot;
    return state as GameState;
  }

  const closestSnapshot = snapshots
    .filter((s) => s.snapshotRound <= targetRound)
    .sort((a, b) => b.snapshotRound - a.snapshotRound)[0];

  if (closestSnapshot) {
    const { snapshotRound, snapshotTime, ...state } = closestSnapshot;
    return state as GameState;
  }

  return null;
};

export const getReplayTimeline = (
  snapshots: GameStateSnapshot[]
): {
  round: number;
  timestamp: number;
  margin: number;
  volatility: number;
  score: number;
  hasEvent: boolean;
}[] => {
  return snapshots.map((s) => ({
    round: s.snapshotRound,
    timestamp: s.snapshotTime,
    margin: s.currentMargin,
    volatility: s.currentVolatility,
    score: s.score,
    hasEvent: s.actionLog.some((a) => a.round === s.snapshotRound),
  }));
};

export const saveSettlementResult = (result: SettlementResult): void => {
  try {
    const allResults = loadAllSettlementResults();
    const existingIndex = allResults.findIndex((r) => r.id === result.id);

    if (existingIndex >= 0) {
      allResults[existingIndex] = result;
    } else {
      allResults.push(result);
    }

    localStorage.setItem(
      RESULTS_STORAGE_KEY,
      JSON.stringify(
        allResults.map((r) => ({
          ...r,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
          volatilityEventsUsed: r.volatilityEventsUsed.map((e) => ({
            ...e,
            updatedAt: e.updatedAt instanceof Date ? e.updatedAt.toISOString() : e.updatedAt,
          })),
          optionCardsUsed: r.optionCardsUsed.map((c) => ({
            ...c,
            updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
          })),
        }))
      )
    );
  } catch (e) {
    console.error('Failed to save settlement result:', e);
  }
};

export const loadAllSettlementResults = (): SettlementResult[] => {
  try {
    const stored = localStorage.getItem(RESULTS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return parsed.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      volatilityEventsUsed: r.volatilityEventsUsed.map((e: any) => ({
        ...e,
        updatedAt: new Date(e.updatedAt),
      })),
      optionCardsUsed: r.optionCardsUsed.map((c: any) => ({
        ...c,
        updatedAt: new Date(c.updatedAt),
      })),
    }));
  } catch (e) {
    console.error('Failed to load settlement results:', e);
    return [];
  }
};

export const loadSettlementResult = (id: string): SettlementResult | null => {
  const allResults = loadAllSettlementResults();
  return allResults.find((r) => r.id === id) || null;
};

export const loadSettlementResultsBySession = (sessionId: string): SettlementResult[] => {
  const allResults = loadAllSettlementResults();
  return allResults.filter((r) => r.sessionId === sessionId);
};

export const deleteSettlementResult = (id: string): void => {
  try {
    const allResults = loadAllSettlementResults();
    const filtered = allResults.filter((r) => r.id !== id);

    localStorage.setItem(
      RESULTS_STORAGE_KEY,
      JSON.stringify(
        filtered.map((r) => ({
          ...r,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        }))
      )
    );
  } catch (e) {
    console.error('Failed to delete settlement result:', e);
  }
};

export const exportSettlementReport = (result: SettlementResult): string => {
  const reportLines: string[] = [];

  reportLines.push('='.repeat(60));
  reportLines.push('期权波动塔防 - 结算报告');
  reportLines.push('='.repeat(60));
  reportLines.push(`生成时间: ${result.createdAt.toLocaleString()}`);
  reportLines.push(`游戏会话: ${result.sessionId}`);
  reportLines.push(`最终得分: ${result.finalScore}`);
  reportLines.push(`评级: ${result.grade}`);
  reportLines.push('');

  reportLines.push('-'.repeat(60));
  reportLines.push('总结');
  reportLines.push('-'.repeat(60));
  reportLines.push(result.summary);
  reportLines.push('');

  reportLines.push('-'.repeat(60));
  reportLines.push('回合详情');
  reportLines.push('-'.repeat(60));

  const rounds = new Set(result.roundDetails.map((d) => d.round));
  rounds.forEach((round) => {
    const roundDetails = result.roundDetails.filter((d) => d.round === round);
    reportLines.push(`\n第 ${round} 回合:`);

    roundDetails.forEach((detail) => {
      const scoreSign = detail.scoreChange >= 0 ? '+' : '';
      reportLines.push(`  ${detail.description} (${scoreSign}${detail.scoreChange}分)`);
      reportLines.push(`    ${detail.humanReadableReason}`);
    });
  });

  reportLines.push('');
  reportLines.push('-'.repeat(60));
  reportLines.push('防御塔操作记录');
  reportLines.push('-'.repeat(60));

  result.towerActions.forEach((action) => {
    const scoreSign = action.scoreChange >= 0 ? '+' : '';
    reportLines.push(
      `第${action.round}回合 - ${action.cardName} - ${action.action} (${scoreSign}${action.scoreChange}分)`
    );
    reportLines.push(`  ${action.reason}`);
  });

  reportLines.push('');
  reportLines.push('='.repeat(60));

  return reportLines.join('\n');
};

export const clearSessionData = (sessionId: string): void => {
  try {
    const allSnapshots = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    delete allSnapshots[sessionId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSnapshots));

    const allResults = loadAllSettlementResults();
    const filteredResults = allResults.filter((r) => r.sessionId !== sessionId);
    localStorage.setItem(
      RESULTS_STORAGE_KEY,
      JSON.stringify(
        filteredResults.map((r) => ({
          ...r,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        }))
      )
    );
  } catch (e) {
    console.error('Failed to clear session data:', e);
  }
};
