import type { GameState, Point, ScoreResult, ReplayRecord, ScanRecord } from '../types/game';
import { manhattanDistance } from './gridUtils';

export function calculateScore(
  gameState: GameState,
  guessPosition: Point
): ScoreResult {
  const actualPosition = gameState.submarine.position;
  const distance = manhattanDistance(guessPosition, actualPosition);
  
  const distanceScore = Math.max(0, 1000 - distance * 100);
  const turnEfficiency = Math.max(0, 500 - gameState.turn * 50);
  const energyBonus = Math.round(gameState.energy * 2);
  const accuracy = Math.max(0, 100 - distance * 10);
  
  const totalScore = distanceScore + turnEfficiency + energyBonus;
  
  return {
    score: Math.max(0, totalScore),
    accuracy,
    distance,
    distanceScore,
    turnEfficiency,
    energyBonus
  };
}

export function getScoreGrade(score: number): { grade: string; color: string; label: string } {
  if (score >= 1200) return { grade: 'S', color: 'text-yellow-400', label: '完美' };
  if (score >= 1000) return { grade: 'A', color: 'text-green-400', label: '优秀' };
  if (score >= 800) return { grade: 'B', color: 'text-blue-400', label: '良好' };
  if (score >= 600) return { grade: 'C', color: 'text-purple-400', label: '及格' };
  if (score >= 400) return { grade: 'D', color: 'text-orange-400', label: '欠佳' };
  return { grade: 'F', color: 'text-red-400', label: '失败' };
}

export function analyzeFailureReason(
  gameState: GameState,
  guessPosition: Point
): string[] {
  const reasons: string[] = [];
  const actualPosition = gameState.submarine.position;
  const distance = manhattanDistance(guessPosition, actualPosition);
  
  if (distance > 3) {
    reasons.push(`定位偏差过大：与实际位置相差 ${distance} 格`);
  }
  
  if (gameState.energy < gameState.maxEnergy * 0.2) {
    reasons.push('能量管理不佳：剩余能量不足20%');
  }
  
  const scanEfficiency = gameState.scanHistory.length / gameState.turn;
  if (scanEfficiency < 0.5) {
    reasons.push('扫描效率偏低：平均每回合扫描不足0.5次');
  }
  
  const strongScans = gameState.scanHistory.filter(s => s.echoStrength >= 60).length;
  if (strongScans < 2) {
    reasons.push('有效回波过少：强回波信号不足2次');
  }
  
  if (gameState.turn >= gameState.maxTurns * 0.9) {
    reasons.push('时间管理不佳：使用了超过90%的回合数');
  }
  
  const noiseAffectedScans = gameState.scanHistory.filter(s => s.hasNoise).length;
  const totalScans = gameState.scanHistory.length;
  if (totalScans > 0 && noiseAffectedScans / totalScans > 0.5) {
    reasons.push('受噪声影响严重：超过一半的扫描受到干扰');
  }
  
  if (reasons.length === 0) {
    reasons.push('需要更多练习来提升推理能力');
  }
  
  return reasons;
}

export function generateSuccessTips(scoreResult: ScoreResult): string[] {
  const tips: string[] = [];
  
  if (scoreResult.distance > 0) {
    tips.push('尝试更密集地扫描可疑区域以缩小范围');
  }
  
  if (scoreResult.turnEfficiency < 300) {
    tips.push('提高决策效率可以获得更高的回合奖励分');
  }
  
  if (scoreResult.energyBonus < 100) {
    tips.push('保留更多能量可以获得额外奖励分');
  }
  
  if (tips.length === 0) {
    tips.push('表现出色！尝试挑战更高难度的关卡');
  }
  
  return tips;
}

export function analyzeFailureReasonFromReplay(
  replay: ReplayRecord
): string[] {
  const reasons: string[] = [];
  const guessPosition = replay.guessPosition;
  const actualPosition = replay.actualPosition;

  if (guessPosition) {
    const distance = manhattanDistance(guessPosition, actualPosition);
    if (distance > 3) {
      reasons.push(`定位偏差过大：与实际位置相差 ${distance} 格`);
    }
  } else {
    reasons.push('未提交猜测位置');
  }

  if (replay.failReason === '能量已耗尽') {
    reasons.push('能量耗尽：扫描次数过多或能量管理不当');
  }

  if (replay.failReason === '回合数已用尽') {
    reasons.push('回合用尽：决策时间不足，需要更快推理');
  }

  const scanHistory = replay.scanHistory;
  if (scanHistory.length < 3) {
    reasons.push('扫描次数过少：信息收集不足');
  }

  const strongScans = scanHistory.filter(s => s.echoStrength >= 60).length;
  if (strongScans < 2 && scanHistory.length > 0) {
    reasons.push('有效回波过少：强回波信号不足2次');
  }

  const noiseAffectedScans = scanHistory.filter(s => s.hasNoise).length;
  const totalScans = scanHistory.length;
  if (totalScans > 0 && noiseAffectedScans / totalScans > 0.5) {
    reasons.push('受噪声影响严重：超过一半的扫描受到干扰');
  }

  if (reasons.length === 0) {
    reasons.push('需要更多练习来提升推理能力');
  }

  return reasons;
}
