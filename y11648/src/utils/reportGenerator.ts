import type {
  OperationLog,
  DispatchReport,
  ScoreBreakdown,
  Task,
  GameState,
} from '../types';

export const generateScoreBreakdown = (
  tasks: Task[],
  logs: OperationLog[],
  duration: number
): ScoreBreakdown => {
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const totalTasks = tasks.length;

  const conflictCount = logs.filter((l) => l.type === 'conflict').length;
  const correctionCount = logs.filter((l) => l.isCorrection).length;
  const unhandledConflicts = logs.filter(
    (l) => l.type === 'conflict' && !l.isCorrection
  ).length;

  const efficiency = completedTasks.length > 0
    ? Math.max(0, 100 - (duration / 60000 - completedTasks.length * 30) * 2)
    : 0;

  const conflictAvoidance = Math.max(0, 100 - conflictCount * 15);

  const fuelLogs = logs.filter(
    (l) => l.type === 'conflict' && l.action.includes('燃油')
  );
  const fuelManagement = Math.max(0, 100 - fuelLogs.length * 20);

  const tideLogs = logs.filter(
    (l) => l.type === 'conflict' && l.action.includes('潮汐')
  );
  const tideUtilization = Math.max(0, 100 - tideLogs.length * 20);

  const operationNormative = Math.max(
    0,
    100 - correctionCount * 10 - unhandledConflicts * 15
  );

  const total =
    efficiency * 0.3 +
    conflictAvoidance * 0.25 +
    fuelManagement * 0.2 +
    tideUtilization * 0.15 +
    operationNormative * 0.1;

  return {
    total: Math.round(total),
    efficiency: Math.round(efficiency),
    conflictAvoidance: Math.round(conflictAvoidance),
    fuelManagement: Math.round(fuelManagement),
    tideUtilization: Math.round(tideUtilization),
    operationNormative: Math.round(operationNormative),
  };
};

export const generateReport = (state: GameState): DispatchReport => {
  const playDuration = state.currentTime - state.startTime;

  const conflictLogs = state.logs.filter((l) => l.type === 'conflict');
  const correctionLogs = state.logs.filter((l) => l.isCorrection);

  const correctedOperations: { original: OperationLog; correction: OperationLog }[] = [];
  correctionLogs.forEach((correction) => {
    if (correction.correctedLogId) {
      const original = state.logs.find((l) => l.id === correction.correctedLogId);
      if (original) {
        correctedOperations.push({ original, correction });
      }
    }
  });

  const unhandledEvents = conflictLogs.filter(
    (log) => !correctionLogs.some((c) => c.correctedLogId === log.id)
  );

  const needsReview = state.logs.filter((l) => {
    if (l.type !== 'conflict') return false;
    const hasCorrection = correctionLogs.some((c) => c.correctedLogId === l.id);
    return !hasCorrection && l.action.includes('紧迫');
  });

  const score = generateScoreBreakdown(state.tasks, state.logs, playDuration);

  return {
    gameId: state.id,
    level: state.level,
    totalTasks: state.tasks.length,
    completedTasks: state.tasks.filter((t) => t.status === 'completed').length,
    failedTasks: state.tasks.filter((t) => t.status === 'failed').length,
    score,
    unhandledEvents,
    correctedOperations,
    needsReview,
    operationTrail: state.logs,
    playDuration,
    completedAt: Date.now(),
  };
};

export const exportReportToJSON = (report: DispatchReport): string => {
  return JSON.stringify(
    {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      ...report,
    },
    null,
    2
  );
};

export const exportLogsToCSV = (logs: OperationLog[]): string => {
  const headers = [
    'Timestamp',
    'GameTime',
    'Type',
    'Action',
    'TargetId',
    'IsCorrection',
    'CorrectedLogId',
    'Source',
  ];

  const rows = logs.map((log) => [
    new Date(log.timestamp).toISOString(),
    new Date(log.gameTime).toLocaleTimeString(),
    log.type,
    log.action,
    log.targetId || '',
    log.isCorrection ? '是' : '否',
    log.correctedLogId || '',
    log.source,
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

export const downloadFile = (content: string, filename: string, type: string): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}分${seconds}秒`;
};

export const getScoreGrade = (score: number): string => {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

export const getScoreGradeColor = (grade: string): string => {
  const colors: Record<string, string> = {
    S: '#FBBF24',
    A: '#10B981',
    B: '#3B82F6',
    C: '#F59E0B',
    D: '#EF4444',
  };
  return colors[grade] || '#6B7280';
};
