import { Athlete, Event, Score, TieBreakRule, RankingResult, RankingStep, StepStatus } from '../types';

interface RuleApplicationResult {
  resolved: boolean;
  rankedAthletes: string[];
  remainingTies: string[][];
  explanation: string;
  scores: Record<string, number>;
}

type RuleHandler = (
  tiedAthletes: string[],
  weightedScores: Record<string, Record<string, number>>,
  rawScores: Record<string, Record<string, number>>,
  events: Event[],
  params?: Record<string, any>
) => RuleApplicationResult;

const ruleHandlers: Record<string, RuleHandler> = {
  highest_single: (tiedAthletes, weightedScores, rawScores, events) => {
    const athleteScores: Record<string, number> = {};
    
    tiedAthletes.forEach(id => {
      const scores = Object.values(weightedScores[id] || {});
      athleteScores[id] = scores.length > 0 ? Math.max(...scores) : 0;
    });

    const sorted = [...tiedAthletes].sort((a, b) => athleteScores[b] - athleteScores[a]);
    const remainingTies = findRemainingTies(sorted, athleteScores);

    return {
      resolved: remainingTies.length === 0,
      rankedAthletes: sorted,
      remainingTies,
      explanation: '按所有项目中的最高加权单项成绩排序',
      scores: athleteScores,
    };
  },

  most_first: (tiedAthletes, weightedScores, rawScores, events) => {
    const firstPlaceCounts: Record<string, number> = {};
    
    tiedAthletes.forEach(id => {
      firstPlaceCounts[id] = 0;
    });

    events.forEach(event => {
      const eventScores = tiedAthletes
        .map(id => ({ id, score: rawScores[id]?.[event.id] || 0 }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

      if (eventScores.length > 0 && eventScores[0].score > 0) {
        const maxScore = eventScores[0].score;
        eventScores.forEach(s => {
          if (s.score === maxScore) {
            firstPlaceCounts[s.id] = (firstPlaceCounts[s.id] || 0) + 1;
          }
        });
      }
    });

    const sorted = [...tiedAthletes].sort((a, b) => firstPlaceCounts[b] - firstPlaceCounts[a]);
    const remainingTies = findRemainingTies(sorted, firstPlaceCounts);

    return {
      resolved: remainingTies.length === 0,
      rankedAthletes: sorted,
      remainingTies,
      explanation: '按各单项中获得第一名的次数排序',
      scores: firstPlaceCounts,
    };
  },

  best_second: (tiedAthletes, weightedScores, rawScores, events) => {
    const athleteScores: Record<string, number> = {};
    
    tiedAthletes.forEach(id => {
      const scores = Object.values(weightedScores[id] || {})
        .sort((a, b) => b - a);
      athleteScores[id] = scores.length >= 2 ? scores[1] : 0;
    });

    const sorted = [...tiedAthletes].sort((a, b) => athleteScores[b] - athleteScores[a]);
    const remainingTies = findRemainingTies(sorted, athleteScores);

    return {
      resolved: remainingTies.length === 0,
      rankedAthletes: sorted,
      remainingTies,
      explanation: '按所有项目中的次高加权单项成绩排序',
      scores: athleteScores,
    };
  },

  best_third: (tiedAthletes, weightedScores, rawScores, events) => {
    const athleteScores: Record<string, number> = {};
    
    tiedAthletes.forEach(id => {
      const scores = Object.values(weightedScores[id] || {})
        .sort((a, b) => b - a);
      athleteScores[id] = scores.length >= 3 ? scores[2] : 0;
    });

    const sorted = [...tiedAthletes].sort((a, b) => athleteScores[b] - athleteScores[a]);
    const remainingTies = findRemainingTies(sorted, athleteScores);

    return {
      resolved: remainingTies.length === 0,
      rankedAthletes: sorted,
      remainingTies,
      explanation: '按所有项目中的第三高加权单项成绩排序',
      scores: athleteScores,
    };
  },

  custom: (tiedAthletes, weightedScores, rawScores, events, params) => {
    const customWeights = params?.weights as Record<string, number> || {};
    const athleteScores: Record<string, number> = {};
    
    tiedAthletes.forEach(id => {
      let score = 0;
      Object.entries(weightedScores[id] || {}).forEach(([eventId, s]) => {
        score += s * (customWeights[eventId] || 1);
      });
      athleteScores[id] = score;
    });

    const sorted = [...tiedAthletes].sort((a, b) => athleteScores[b] - athleteScores[a]);
    const remainingTies = findRemainingTies(sorted, athleteScores);

    return {
      resolved: remainingTies.length === 0,
      rankedAthletes: sorted,
      remainingTies,
      explanation: params?.explanation || '按自定义权重计算总分排序',
      scores: athleteScores,
    };
  },
};

function findRemainingTies(sortedAthletes: string[], scores: Record<string, number>): string[][] {
  const ties: string[][] = [];
  let currentTie: string[] = [];
  let lastScore: number | null = null;

  sortedAthletes.forEach(id => {
    const score = scores[id];
    if (lastScore === score) {
      if (currentTie.length === 0) {
        currentTie = [sortedAthletes[sortedAthletes.indexOf(id) - 1], id];
      } else {
        currentTie.push(id);
      }
    } else {
      if (currentTie.length > 1) {
        ties.push([...currentTie]);
      }
      currentTie = [];
      lastScore = score;
    }
  });

  if (currentTie.length > 1) {
    ties.push([...currentTie]);
  }

  return ties;
}

function findTieGroups(athletes: string[], scores: Record<string, number>): string[][] {
  const groups: string[][] = [];
  const scoreMap: Record<number, string[]> = {};

  athletes.forEach(id => {
    const score = scores[id];
    if (!scoreMap[score]) {
      scoreMap[score] = [];
    }
    scoreMap[score].push(id);
  });

  Object.values(scoreMap).forEach(group => {
    if (group.length > 1) {
      groups.push(group);
    }
  });

  return groups;
}

export function calculateRankings(
  athletes: Athlete[],
  events: Event[],
  scores: Score[],
  rules: TieBreakRule[]
): RankingResult[] {
  const weightedScores: Record<string, Record<string, number>> = {};
  const rawScores: Record<string, Record<string, number>> = {};
  const totalScores: Record<string, number> = {};

  athletes.forEach(athlete => {
    weightedScores[athlete.id] = {};
    rawScores[athlete.id] = {};
    totalScores[athlete.id] = 0;
  });

  scores.forEach(score => {
    if (score.status !== 'forfeit') {
      const event = events.find(e => e.id === score.eventId);
      if (event && athletes.find(a => a.id === score.athleteId)) {
        const weighted = score.value * event.weight;
        weightedScores[score.athleteId][score.eventId] = weighted;
        rawScores[score.athleteId][score.eventId] = score.value;
        totalScores[score.athleteId] += weighted;
      }
    }
  });

  const sortedByTotal = [...athletes]
    .map(a => a.id)
    .sort((a, b) => totalScores[b] - totalScores[a]);

  const tieGroups = findTieGroups(sortedByTotal, totalScores);

  const results: Record<string, RankingResult> = {};
  athletes.forEach(athlete => {
    results[athlete.id] = {
      athleteId: athlete.id,
      rank: 0,
      totalScore: totalScores[athlete.id],
      weightedScores: { ...weightedScores[athlete.id] },
      steps: [],
    };
  });

  const enabledRules = rules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority);

  let stepNumber = 0;
  const allSteps: RankingStep[] = [];

  function processTieGroup(group: string[], ruleIndex: number, parentSteps: RankingStep[]) {
    if (group.length <= 1 || ruleIndex >= enabledRules.length) {
      if (group.length > 1) {
        const stuckStep: RankingStep = {
          stepNumber: ++stepNumber,
          ruleId: 'stuck',
          ruleName: '卡壳 - 规则用尽',
          status: 'stuck',
          tiedAthletes: group,
          explanation: '所有同分规则已用尽，仍有同分选手需人工确认',
          scores: group.reduce((acc, id) => {
            acc[id] = totalScores[id];
            return acc;
          }, {} as Record<string, number>),
        };
        allSteps.push(stuckStep);
        group.forEach(id => {
          results[id].steps = [...parentSteps, stuckStep];
          results[id].tieBreakRule = '卡壳';
        });
      }
      return;
    }

    const rule = enabledRules[ruleIndex];
    const handler = ruleHandlers[rule.type];
    
    if (!handler) {
      processTieGroup(group, ruleIndex + 1, parentSteps);
      return;
    }

    const result = handler(group, weightedScores, rawScores, events, rule.params);
    
    const step: RankingStep = {
      stepNumber: ++stepNumber,
      ruleId: rule.id,
      ruleName: rule.name,
      status: result.resolved ? 'resolved' : 'tied',
      tiedAthletes: group,
      explanation: result.explanation,
      scores: result.scores,
    };
    
    allSteps.push(step);

    const newSteps = [...parentSteps, step];

    if (result.resolved) {
      group.forEach(id => {
        results[id].steps = newSteps;
        results[id].tieBreakRule = rule.name;
      });
    } else {
      result.remainingTies.forEach(tie => {
        processTieGroup(tie, ruleIndex + 1, newSteps);
      });
      
      const resolvedInStep = group.filter(id => 
        !result.remainingTies.some(tie => tie.includes(id))
      );
      resolvedInStep.forEach(id => {
        results[id].steps = newSteps;
        results[id].tieBreakRule = rule.name;
      });
    }
  }

  tieGroups.forEach(group => {
    processTieGroup(group, 0, []);
  });

  const finalOrder = sortAthletesWithTiebreaks(
    sortedByTotal,
    totalScores,
    results
  );

  let currentRank = 1;
  for (let i = 0; i < finalOrder.length; i++) {
    const id = finalOrder[i];
    if (i === 0 || totalScores[finalOrder[i - 1]] !== totalScores[id]) {
      currentRank = i + 1;
    }
    results[id].rank = currentRank;
  }

  return Object.values(results).sort((a, b) => a.rank - b.rank);
}

function sortAthletesWithTiebreaks(
  initialOrder: string[],
  totalScores: Record<string, number>,
  results: Record<string, RankingResult>
): string[] {
  return [...initialOrder].sort((a, b) => {
    if (totalScores[b] !== totalScores[a]) {
      return totalScores[b] - totalScores[a];
    }

    const stepsA = results[a].steps;
    const stepsB = results[b].steps;

    for (let i = 0; i < Math.max(stepsA.length, stepsB.length); i++) {
      const stepA = stepsA[i];
      const stepB = stepsB[i];
      
      if (stepA && stepB && stepA.ruleId === stepB.ruleId) {
        const scoreA = stepA.scores[a] || 0;
        const scoreB = stepB.scores[b] || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
      }
    }

    return a.localeCompare(b);
  });
}

export function getStuckSteps(results: RankingResult[]): RankingStep[] {
  const stuckSteps: RankingStep[] = [];
  const seenStepKeys = new Set<string>();

  results.forEach(result => {
    result.steps.forEach(step => {
      const key = `${step.stepNumber}-${step.ruleId}`;
      if (step.status === 'stuck' && !seenStepKeys.has(key)) {
        seenStepKeys.add(key);
        stuckSteps.push(step);
      }
    });
  });

  return stuckSteps;
}

export function getAthleteRankPath(
  athleteId: string,
  results: RankingResult[]
): { step: RankingStep; position: number }[] {
  const result = results.find(r => r.athleteId === athleteId);
  if (!result) return [];

  return result.steps.map((step, index) => {
    const sortedAthletes = [...step.tiedAthletes].sort(
      (a, b) => (step.scores[b] || 0) - (step.scores[a] || 0)
    );
    return {
      step,
      position: sortedAthletes.indexOf(athleteId) + 1,
    };
  });
}
