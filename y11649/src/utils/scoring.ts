import type { RescueReport, Victim, WarningRecord, ActionRecord } from '@/types';

export const calculateScore = (
  victims: Victim[],
  warnings: WarningRecord[],
  actions: ActionRecord[],
  totalTime: number
): RescueReport => {
  const totalVictims = victims.length;
  const rescued = victims.filter(v => v.isRescued).length;
  const failed = victims.filter(v => v.isFailed).length;
  const unhandled = victims.filter(v => !v.isRescued && !v.isFailed).length;

  const resolvedWarnings = warnings.filter(w => w.isResolved);
  const corrected = resolvedWarnings.filter(w => w.correction).length;
  const needsConfirmation = warnings.filter(w => !w.isResolved).length;

  const successRate = totalVictims > 0 ? (rescued / totalVictims) * 40 : 0;

  const avgRescueTime = rescued > 0
    ? victims
        .filter(v => v.isRescued)
        .reduce((sum, v) => sum + (v.initialTime - v.timeRemaining), 0) / rescued
    : 0;
  const speedScore = Math.max(0, 30 - (avgRescueTime / 10));

  const equipmentActions = actions.filter(a => a.type === 'equip');
  const correctEquipment = equipmentActions.filter(a => a.details.correct as boolean).length;
  const equipmentScore = equipmentActions.length > 0
    ? (correctEquipment / equipmentActions.length) * 20
    : 20;

  const warningScore = warnings.length > 0
    ? Math.max(0, 10 - (warnings.length * 2))
    : 10;

  const score = Math.round(successRate + speedScore + equipmentScore + warningScore);

  let grade = 'F';
  if (score >= 90) grade = 'S';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 50) grade = 'D';

  return {
    totalVictims,
    rescued,
    failed,
    unhandled,
    corrected,
    needsConfirmation,
    warnings,
    totalTime,
    score,
    grade,
    breakdown: {
      successRate: Math.round(successRate * 10) / 10,
      speedScore: Math.round(speedScore * 10) / 10,
      equipmentScore: Math.round(equipmentScore * 10) / 10,
      warningScore: Math.round(warningScore * 10) / 10,
    },
  };
};
