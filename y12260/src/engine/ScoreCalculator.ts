import { PlacedDevice, Cable, WalkPath, Conflict, Level } from '@/types';
import { DEVICES } from '@/data/devices';

export interface ScoreCalculationResult {
  baseScore: number;
  deviceScore: number;
  cableScore: number;
  pathScore: number;
  timeBonus: number;
  penalties: number;
  totalScore: number;
  rating: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  details: {
    devices: { type: string; name: string; score: number }[];
    cables: { label: string; score: number }[];
    paths: { musician: string; score: number }[];
    conflicts: { description: string; penalty: number }[];
  };
}

export class ScoreCalculator {
  static calculate(
    placedDevices: PlacedDevice[],
    cables: Cable[],
    walkPaths: WalkPath[],
    conflicts: Conflict[],
    level: Level,
    timeLeft: number,
    totalTime: number
  ): ScoreCalculationResult {
    const deviceDetails: { type: string; name: string; score: number }[] = [];
    let deviceScore = 0;
    
    for (const device of placedDevices) {
      const deviceInfo = DEVICES[device.deviceType];
      const priorityMultiplier = deviceInfo.priority === 1 ? 1.5 : deviceInfo.priority === 2 ? 1.2 : 1;
      const score = Math.round(deviceInfo.score * priorityMultiplier);
      deviceScore += score;
      deviceDetails.push({
        type: device.deviceType,
        name: device.name,
        score
      });
    }
    
    const cableDetails: { label: string; score: number }[] = [];
    let cableScore = 0;
    for (const cable of cables) {
      const score = 25;
      cableScore += score;
      cableDetails.push({ label: cable.label, score });
    }
    
    const pathDetails: { musician: string; score: number }[] = [];
    let pathScore = 0;
    for (const path of walkPaths) {
      const score = 20;
      pathScore += score;
      pathDetails.push({ musician: path.musician, score });
    }
    
    const baseScore = deviceScore + cableScore + pathScore;
    
    const timeBonus = Math.round((timeLeft / totalTime) * 100);
    
    const conflictDetails: { description: string; penalty: number }[] = [];
    let penalties = 0;
    for (const conflict of conflicts) {
      penalties += conflict.penalty;
      conflictDetails.push({
        description: conflict.description,
        penalty: conflict.penalty
      });
    }
    
    const totalScore = Math.max(0, baseScore + timeBonus - penalties);
    
    const rating = this.getRating(totalScore, baseScore + timeBonus);
    
    return {
      baseScore,
      deviceScore,
      cableScore,
      pathScore,
      timeBonus,
      penalties,
      totalScore,
      rating,
      details: {
        devices: deviceDetails,
        cables: cableDetails,
        paths: pathDetails,
        conflicts: conflictDetails
      }
    };
  }

  private static getRating(totalScore: number, maxPossibleScore: number): 'S' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (maxPossibleScore === 0) return 'F';
    
    const percentage = totalScore / maxPossibleScore;
    
    if (percentage >= 0.95) return 'S';
    if (percentage >= 0.85) return 'A';
    if (percentage >= 0.70) return 'B';
    if (percentage >= 0.55) return 'C';
    if (percentage >= 0.40) return 'D';
    return 'F';
  }

  static getRatingColor(rating: string): string {
    const colors: Record<string, string> = {
      'S': '#FFD700',
      'A': '#A855F7',
      'B': '#06B6D4',
      'C': '#10B981',
      'D': '#F97316',
      'F': '#EF4444'
    };
    return colors[rating] || '#9CA3AF';
  }

  static getRatingDescription(rating: string): string {
    const descriptions: Record<string, string> = {
      'S': '完美！你就是舞台调度大师！零冲突、高效率，这场演出稳了！',
      'A': '优秀！整体规划非常出色，只有少量小问题需要微调。',
      'B': '良好！基本合格，但还有一些优化空间，可以做得更好。',
      'C': '及格！勉强能用，但现场可能会手忙脚乱，建议多练习。',
      'D': '危险！问题不少，真要这么布置，演出大概率要出状况。',
      'F': '失败！这布置根本没法用，赶紧重新规划吧！'
    };
    return descriptions[rating] || '';
  }
}
