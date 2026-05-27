import { Case, GameRecord, Grade, Mistake, RiskType, UserAnswer } from '@/types/game';

export const calculateScore = (
  caseData: Case,
  markedRisks: Record<string, RiskType>,
  timeRemaining: number,
  startTime: number
): { score: number; maxScore: number; grade: Grade; mistakes: Mistake[]; answers: UserAnswer[] } => {
  const answers: UserAnswer[] = [];
  const mistakes: Mistake[] = [];
  let totalPoints = 0;
  let maxScore = 0;

  caseData.correctAnswers.forEach((answerKey) => {
    const material = caseData.materials.find(m => m.id === answerKey.materialId);
    const userMarked = markedRisks[answerKey.materialId];
    const userMarkedRisk = !!userMarked;
    const isCorrect = userMarkedRisk === answerKey.shouldMarkRisk;

    maxScore += answerKey.points;

    answers.push({
      materialId: answerKey.materialId,
      markedRisk: userMarkedRisk,
      riskType: userMarked || null,
      isCorrect,
      timestamp: Date.now()
    });

    if (isCorrect) {
      totalPoints += answerKey.points;
    } else {
      let pointsLost = answerKey.points;
      if (answerKey.riskType === 'exemption' && !userMarkedRisk) {
        pointsLost = answerKey.points;
      }
      mistakes.push({
        materialId: answerKey.materialId,
        materialTitle: material?.title || '未知材料',
        userAnswer: userMarkedRisk,
        correctAnswer: answerKey.shouldMarkRisk,
        pointsLost,
        explanation: answerKey.explanation,
        source: material?.source || '未知来源'
      });
    }
  });

  const timeBonus = Math.max(0, Math.floor((timeRemaining / caseData.timeLimit) * 20));
  totalPoints += timeBonus;
  maxScore += 20;

  const percentage = (totalPoints / maxScore) * 100;
  let grade: Grade = 'D';
  if (percentage >= 90) grade = 'S';
  else if (percentage >= 80) grade = 'A';
  else if (percentage >= 70) grade = 'B';
  else if (percentage >= 60) grade = 'C';

  return {
    score: totalPoints,
    maxScore,
    grade,
    mistakes,
    answers
  };
};

export const createGameRecord = (
  caseData: Case,
  scoreResult: ReturnType<typeof calculateScore>,
  startTime: number
): GameRecord => {
  const endTime = Date.now();
  return {
    id: `record-${Date.now()}`,
    caseId: caseData.id,
    caseTitle: caseData.title,
    startTime,
    endTime,
    totalTime: Math.floor((endTime - startTime) / 1000),
    score: scoreResult.score,
    maxScore: scoreResult.maxScore,
    grade: scoreResult.grade,
    answers: scoreResult.answers,
    mistakes: scoreResult.mistakes,
    exported: false
  };
};

export const generateHash = (record: GameRecord): string => {
  const data = JSON.stringify({
    id: record.id,
    score: record.score,
    answers: record.answers,
    timestamp: record.endTime
  });
  return btoa(unescape(encodeURIComponent(data))).slice(0, 16);
};

export const verifyRecord = (record: GameRecord): boolean => {
  if (!record.exportHash) return true;
  const expectedHash = generateHash(record);
  return record.exportHash === expectedHash;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const getRiskTypeName = (riskType: RiskType): string => {
  const names: Record<string, string> = {
    duplicate: '票据重复',
    exemption: '保单免责',
    timeout: '补料超时',
    missing: '材料缺失'
  };
  return names[riskType || ''] || '未知风险';
};

export const getMaterialTypeName = (type: string): string => {
  const names: Record<string, string> = {
    claim: '理赔卡',
    invoice: '票据',
    photo: '照片',
    policy: '保单规则',
    emotion: '客户情绪',
    report: '结案报告'
  };
  return names[type] || '未知类型';
};

export const getDifficultyName = (difficulty: string): string => {
  const names: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  };
  return names[difficulty] || '未知';
};

export const getGradeColor = (grade: Grade): string => {
  const colors: Record<Grade, string> = {
    S: '#ffd700',
    A: '#10b981',
    B: '#3b82f6',
    C: '#f59e0b',
    D: '#ef4444'
  };
  return colors[grade];
};
