import {
  Contestant,
  Score,
  Submission,
  RankingRule,
  RankingEntry,
  TieBreakGroup,
  TieBreakRule,
} from '../types';

export function calculateWeightedScore(score: Score, rule: RankingRule): number {
  let weightedTotal = 0;
  for (const item of score.items) {
    const weightConfig = rule.scoreWeights.find((w) => w.category === item.category);
    const weight = weightConfig ? weightConfig.weight : item.weight;
    weightedTotal += item.points * weight;
  }
  return Math.round(weightedTotal * 100) / 100;
}

export function findTieBreakGroups(
  rankedList: { contestantId: string; score: number }[]
): TieBreakGroup[] {
  const groups: TieBreakGroup[] = [];
  let currentGroup: string[] = [];
  let currentScore: number | null = null;

  for (const entry of rankedList) {
    if (currentScore === null) {
      currentScore = entry.score;
      currentGroup = [entry.contestantId];
    } else if (Math.abs(entry.score - currentScore) < 0.001) {
      currentGroup.push(entry.contestantId);
    } else {
      if (currentGroup.length > 1) {
        groups.push({
          id: `tie_${Date.now()}_${groups.length}`,
          score: currentScore,
          contestantIds: currentGroup,
          status: 'pending',
        });
      }
      currentScore = entry.score;
      currentGroup = [entry.contestantId];
    }
  }

  if (currentGroup.length > 1) {
    groups.push({
      id: `tie_${Date.now()}_${groups.length}`,
      score: currentScore!,
      contestantIds: currentGroup,
      status: 'pending',
    });
  }

  return groups;
}

export function applyTieBreakRule(
  contestantIds: string[],
  rule: TieBreakRule,
  scores: Score[],
  submissions: Submission[]
): string[] {
  const contestantsWithValues: { id: string; value: number | string }[] = [];

  for (const cid of contestantIds) {
    if (rule.rule === 'submissionTime') {
      const submission = submissions.find((s) => s.contestantId === cid);
      contestantsWithValues.push({
        id: cid,
        value: submission ? submission.submitTime : '',
      });
    } else if (rule.rule === 'specificCategory' && rule.category) {
      const score = scores.find((s) => s.contestantId === cid);
      const item = score?.items.find((i) => i.category === rule.category);
      contestantsWithValues.push({
        id: cid,
        value: item ? item.points : 0,
      });
    } else {
      contestantsWithValues.push({ id: cid, value: 0 });
    }
  }

  return contestantsWithValues
    .sort((a, b) => {
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return rule.ascending ? a.value - b.value : b.value - a.value;
      }
      return rule.ascending
        ? String(a.value).localeCompare(String(b.value))
        : String(b.value).localeCompare(String(a.value));
    })
    .map((c) => c.id);
}

export function calculateRanking(
  contestants: Contestant[],
  scores: Score[],
  submissions: Submission[],
  rule: RankingRule,
  confirmedTieBreaks: Map<string, string[]> = new Map()
): {
  ranking: RankingEntry[];
  tieBreakGroups: TieBreakGroup[];
} {
  const weightedScores: { contestantId: string; score: number }[] = contestants.map((c) => {
    const score = scores.find((s) => s.contestantId === c.id);
    return {
      contestantId: c.id,
      score: score ? calculateWeightedScore(score, rule) : 0,
    };
  });

  const sortedByScore = [...weightedScores].sort((a, b) => b.score - a.score);
  const tieGroups = findTieBreakGroups(sortedByScore);

  const finalOrder: string[] = [];
  let processedIndex = 0;

  for (const entry of sortedByScore) {
    const tieGroup = tieGroups.find((g) => g.contestantIds.includes(entry.contestantId));

    if (!tieGroup) {
      if (!finalOrder.includes(entry.contestantId)) {
        finalOrder.push(entry.contestantId);
      }
      processedIndex++;
      continue;
    }

    if (tieGroup.contestantIds.every((id) => finalOrder.includes(id))) {
      processedIndex++;
      continue;
    }

    const confirmedOrder = confirmedTieBreaks.get(tieGroup.id);
    if (confirmedOrder) {
      for (const cid of confirmedOrder) {
        if (!finalOrder.includes(cid)) {
          finalOrder.push(cid);
        }
      }
    } else {
      let orderedIds = [...tieGroup.contestantIds];
      for (const tbRule of rule.tieBreakRules.sort((a, b) => a.order - b.order)) {
        if (orderedIds.length <= 1) break;
        if (tbRule.rule === 'manual') break;
        orderedIds = applyTieBreakRule(orderedIds, tbRule, scores, submissions);
      }
      for (const cid of orderedIds) {
        if (!finalOrder.includes(cid)) {
          finalOrder.push(cid);
        }
      }
    }
    processedIndex += tieGroup.contestantIds.length;
  }

  const ranking: RankingEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < finalOrder.length; i++) {
    const cid = finalOrder[i];
    const scoreData = weightedScores.find((s) => s.contestantId === cid)!;
    const prevScore = i > 0 ? weightedScores.find((s) => s.contestantId === finalOrder[i - 1]) : null;

    const isTied = prevScore && Math.abs(prevScore.score - scoreData.score) < 0.001;

    if (!isTied) {
      currentRank = i + 1;
    }

    const tieGroup = tieGroups.find((g) => g.contestantIds.includes(cid));

    ranking.push({
      id: `rank_${cid}_${Date.now()}`,
      contestantId: cid,
      rank: currentRank,
      score: scoreData.score,
      isTied: !!tieGroup,
      tieBreakStatus: tieGroup?.status === 'confirmed' ? 'confirmed' : tieGroup ? 'pending' : undefined,
    });
  }

  return { ranking, tieBreakGroups: tieGroups };
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
