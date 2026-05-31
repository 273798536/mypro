import type { Question, ExamStrategy, ExamPaper, DuplicateGroup, DifficultyDrift, DifficultyLevel, KnowledgeCategory, KnowledgeTag } from '../types';

const DIFFICULTY_RANGES: Record<DifficultyLevel, [number, number]> = {
  easy: [0.8, 1.0],
  medium: [0.5, 0.8],
  hard: [0.2, 0.5],
};

const CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  rhythm: '节奏',
  harmony: '和声',
  melody: '旋律',
  interval: '音程',
  chord: '和弦',
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: '易',
  medium: '中',
  hard: '难',
};

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function textSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
}

function arraySimilarity<T>(a: T[], b: T[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const intersection = a.filter(x => b.includes(x));
  const union = [...new Set([...a, ...b])];
  return intersection.length / union.length;
}

export function calculateQuestionSimilarity(q1: Question, q2: Question): number {
  const titleSim = textSimilarity(q1.title, q2.title);
  const optionsSim = arraySimilarity(q1.options, q2.options);
  const tagsSim = arraySimilarity(q1.tags, q2.tags);
  return 0.4 * titleSim + 0.3 * optionsSim + 0.3 * tagsSim;
}

export function detectDuplicates(questions: Question[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const processed = new Set<string>();
  const now = Date.now();

  for (let i = 0; i < questions.length; i++) {
    if (processed.has(questions[i].id)) continue;
    const group: string[] = [questions[i].id];
    let maxSim = 0;

    for (let j = i + 1; j < questions.length; j++) {
      if (processed.has(questions[j].id)) continue;
      const sim = calculateQuestionSimilarity(questions[i], questions[j]);
      if (sim > 0.7) {
        group.push(questions[j].id);
        maxSim = Math.max(maxSim, sim);
        processed.add(questions[j].id);
      }
    }

    if (group.length > 1) {
      groups.push({
        id: `dup-${now}-${i}`,
        questionIds: group,
        similarity: maxSim,
        detectedAt: now,
        status: 'detected',
      });
    }
    processed.add(questions[i].id);
  }

  return groups;
}

export function calculateCorrectRate(question: Question): number {
  if (question.answerRecords.length === 0) return 0.6;
  const correct = question.answerRecords.filter(r => r.isCorrect).length;
  return correct / question.answerRecords.length;
}

export function detectDifficultyDrift(questions: Question[]): DifficultyDrift[] {
  const drifts: DifficultyDrift[] = [];
  const now = Date.now();

  for (const q of questions) {
    if (q.answerRecords.length < 10) continue;

    const actualRate = calculateCorrectRate(q);
    const [minExpected, maxExpected] = DIFFICULTY_RANGES[q.difficulty];
    const expectedMid = (minExpected + maxExpected) / 2;

    let driftScore = 0;
    if (actualRate > maxExpected) {
      driftScore = Math.abs(actualRate - maxExpected) / (1 - maxExpected);
    } else if (actualRate < minExpected) {
      driftScore = Math.abs(actualRate - minExpected) / minExpected;
    }

    if (driftScore > 0.2) {
      drifts.push({
        id: `drift-${now}-${q.id}`,
        questionId: q.id,
        expectedDifficulty: q.difficulty,
        actualDifficulty: actualRate,
        driftScore: Math.min(driftScore, 1),
        detectedAt: now,
        status: 'pending',
      });
    }
  }

  return drifts;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateExam(
  strategy: ExamStrategy,
  questions: Question[],
  knowledgeTags: KnowledgeTag[]
): ExamPaper {
  const eligibleQuestions = questions.filter(
    q => q.status === 'active' && !strategy.excludeQuestionIds.includes(q.id)
  );

  const targetEasy = Math.round(strategy.totalQuestions * strategy.difficultyDistribution.easy);
  const targetMedium = Math.round(strategy.totalQuestions * strategy.difficultyDistribution.medium);
  const targetHard = strategy.totalQuestions - targetEasy - targetMedium;

  const questionsByDifficulty = {
    easy: shuffle(eligibleQuestions.filter(q => q.difficulty === 'easy')),
    medium: shuffle(eligibleQuestions.filter(q => q.difficulty === 'medium')),
    hard: shuffle(eligibleQuestions.filter(q => q.difficulty === 'hard')),
  };

  const selected: Question[] = [];

  function selectByDifficulty(pool: Question[], count: number, categoryTargets: Record<KnowledgeCategory, number>) {
    const result: Question[] = [];
    const categoryCounts: Record<KnowledgeCategory, number> = {
      rhythm: 0, harmony: 0, melody: 0, interval: 0, chord: 0
    };

    for (const q of pool) {
      if (result.length >= count) break;

      const questionCategories = q.tags
        .map(t => knowledgeTags.find(kt => kt.id === t)?.category)
        .filter(Boolean) as KnowledgeCategory[];

      const needsCategory = questionCategories.some(
        cat => categoryCounts[cat] < Math.round(count * categoryTargets[cat])
      );

      if (needsCategory || result.length < count * 0.5) {
        result.push(q);
        questionCategories.forEach(cat => { categoryCounts[cat]++; });
      }
    }

    if (result.length < count) {
      for (const q of pool) {
        if (result.length >= count) break;
        if (!result.includes(q)) {
          result.push(q);
        }
      }
    }

    return result;
  }

  selected.push(...selectByDifficulty(questionsByDifficulty.easy, targetEasy, strategy.categoryDistribution));
  selected.push(...selectByDifficulty(questionsByDifficulty.medium, targetMedium, strategy.categoryDistribution));
  selected.push(...selectByDifficulty(questionsByDifficulty.hard, targetHard, strategy.categoryDistribution));

  const actualDifficulty = {
    easy: selected.filter(q => q.difficulty === 'easy').length / selected.length,
    medium: selected.filter(q => q.difficulty === 'medium').length / selected.length,
    hard: selected.filter(q => q.difficulty === 'hard').length / selected.length,
  };

  const actualCategory: Record<KnowledgeCategory, number> = {
    rhythm: 0, harmony: 0, melody: 0, interval: 0, chord: 0
  };
  selected.forEach(q => {
    q.tags.forEach(t => {
      const tag = knowledgeTags.find(kt => kt.id === t);
      if (tag) actualCategory[tag.category]++;
    });
  });
  Object.keys(actualCategory).forEach(key => {
    const k = key as KnowledgeCategory;
    actualCategory[k] = actualCategory[k] / selected.length;
  });

  let balanceScore = 1;
  ['easy', 'medium', 'hard'].forEach(d => {
    const diff = d as DifficultyLevel;
    balanceScore -= Math.abs(
      actualDifficulty[diff] - strategy.difficultyDistribution[diff]
    ) / 3;
  });
  (['rhythm', 'harmony', 'melody', 'interval', 'chord'] as KnowledgeCategory[]).forEach(cat => {
    if (strategy.categoryDistribution[cat] > 0) {
      balanceScore -= Math.abs(
        actualCategory[cat] - strategy.categoryDistribution[cat]
      ) / 10;
    }
  });
  balanceScore = Math.max(0, Math.min(1, balanceScore));

  return {
    id: `exam-${Date.now()}`,
    name: strategy.name || `试卷-${new Date().toLocaleDateString()}`,
    createdAt: Date.now(),
    strategy,
    questions: shuffle(selected),
    balanceScore,
  };
}

export function getCategoryLabel(category: KnowledgeCategory): string {
  return CATEGORY_LABELS[category];
}

export function getDifficultyLabel(difficulty: DifficultyLevel): string {
  return DIFFICULTY_LABELS[difficulty];
}

export function getDifficultyColor(difficulty: DifficultyLevel): string {
  const colors: Record<DifficultyLevel, string> = {
    easy: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    hard: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[difficulty];
}

export function getTagStatusColor(status: string): string {
  const colors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    missing: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
