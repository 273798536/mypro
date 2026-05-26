import { Chemical, ShelfSlot, RiskEvent, Severity } from '../types';

export class ScoringEngine {
  private static readonly BASE_PLACE_SCORE = 100;
  private static readonly CATEGORY_MATCH_BONUS = 50;
  private static readonly PERFECT_BONUS = 500;

  public static calculatePlacementScore(
    chemical: Chemical,
    slot: ShelfSlot,
    risks: RiskEvent[]
  ): { score: number; breakdown: { label: string; value: number }[] } {
    const breakdown: { label: string; value: number }[] = [];
    let totalScore = 0;

    totalScore += this.BASE_PLACE_SCORE;
    breakdown.push({ label: '基础摆放分', value: this.BASE_PLACE_SCORE });

    if (slot.allowedCategories.length > 0 && slot.allowedCategories.includes(chemical.category)) {
      totalScore += this.CATEGORY_MATCH_BONUS;
      breakdown.push({ label: '类别匹配加分', value: this.CATEGORY_MATCH_BONUS });
    }

    const totalPenalty = risks.reduce((sum, risk) => sum + risk.penalty, 0);
    if (totalPenalty > 0) {
      totalScore -= totalPenalty;
      breakdown.push({ label: '风险扣分', value: -totalPenalty });
    }

    return { score: Math.max(0, totalScore), breakdown };
  }

  public static calculateTimeBonus(timeRemaining: number, totalTime: number): number {
    if (timeRemaining <= 0) return 0;
    const ratio = timeRemaining / totalTime;
    return Math.round(200 * ratio);
  }

  public static calculatePerfectBonus(hasZeroRisks: boolean): number {
    return hasZeroRisks ? this.PERFECT_BONUS : 0;
  }

  public static getSeverityColor(severity: Severity): string {
    switch (severity) {
      case Severity.CRITICAL: return '#e74c3c';
      case Severity.DANGER: return '#e67e22';
      case Severity.WARNING: return '#f39c12';
      default: return '#95a5a6';
    }
  }

  public static getSeverityLabel(severity: Severity): string {
    switch (severity) {
      case Severity.CRITICAL: return '严重';
      case Severity.DANGER: return '危险';
      case Severity.WARNING: return '警告';
      default: return '未知';
    }
  }

  public static getGrade(score: number, maxScore: number): { grade: string; color: string } {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) return { grade: 'S', color: '#f1c40f' };
    if (percentage >= 80) return { grade: 'A', color: '#2ecc71' };
    if (percentage >= 70) return { grade: 'B', color: '#3498db' };
    if (percentage >= 60) return { grade: 'C', color: '#9b59b6' };
    if (percentage >= 40) return { grade: 'D', color: '#e67e22' };
    return { grade: 'F', color: '#e74c3c' };
  }

  public static getMaxPossibleScore(chemicalCount: number): number {
    return chemicalCount * (this.BASE_PLACE_SCORE + this.CATEGORY_MATCH_BONUS) + this.PERFECT_BONUS + 200;
  }
}
