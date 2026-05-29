import type {
  ConversationCard,
  Decision,
  DecisionRecord,
  AgentResource,
  ResultStats,
  ErrorType,
  Level,
} from '@/types';
import { ruleEngine } from './ruleEngine';
import { ResourceManager } from './resourceManager';
import { generateMockCards } from '../data/mockCards';
import type { Difficulty } from '@/types';

export class GameEngine {
  private resourceManager: ResourceManager;
  private cardStartTime: number = 0;

  constructor() {
    this.resourceManager = new ResourceManager();
  }

  initGame(difficulty: Difficulty, cardCount: number = 10): {
    cards: ConversationCard[];
    resources: AgentResource;
  } {
    this.resourceManager.reset();
    const cards = generateMockCards(difficulty, cardCount);
    const resources = this.resourceManager.getResources();
    return { cards, resources };
  }

  startCardTimer(): void {
    this.cardStartTime = Date.now();
  }

  processDecision(
    card: ConversationCard,
    userDecision: Decision,
    resources: AgentResource
  ): {
    record: DecisionRecord;
    scoreChange: number;
    newResources: AgentResource;
    hint: string | null;
  } {
    const responseTime = Date.now() - this.cardStartTime;

    const { decision: correctDecision, matchedRules } = ruleEngine.determineCorrectDecision(
      card,
      resources
    );

    const isCorrect = userDecision === correctDecision;

    const { errorType, details } = ruleEngine.determineErrorType(
      userDecision,
      correctDecision,
      card,
      matchedRules.map(r => r.id)
    );

    const scoreChange = ruleEngine.calculateScore(
      isCorrect,
      errorType,
      responseTime,
      card.difficulty
    );

    if (userDecision === 'human') {
      this.resourceManager.assignAgent();
    } else if (userDecision === 'ai' && correctDecision === 'human') {
    } else {
      if (Math.random() > 0.5) {
        this.resourceManager.releaseAgent();
      }
    }

    this.resourceManager.randomFluctuate();

    const newResources = this.resourceManager.getResources();

    let hint: string | null = null;
    if (card.isDirty && card.dirtyDataAction === 'user_hint') {
      if (!card.botReply && card.botReplyHistory.length === 0) {
        hint = '💡 机器人回复缺失：此问题可能超出AI知识库范围，建议优先转人工';
      }
    }

    const record: DecisionRecord = {
      cardId: card.id,
      userDecision,
      correctDecision,
      isCorrect,
      errorType,
      errorDetails: details,
      matchedRules: matchedRules.map(r => r.id),
      responseTime,
      timestamp: Date.now(),
      dirtyDataHandled: card.isDirty,
      cardSnapshot: { ...card },
    };

    return { record, scoreChange, newResources, hint };
  }

  calculateStats(
    records: DecisionRecord[],
    finalScore: number,
    totalCards: number
  ): ResultStats {
    const correctCount = records.filter(r => r.isCorrect).length;
    const wrongCount = records.filter(r => !r.isCorrect).length;
    const accuracy = totalCards > 0 ? correctCount / totalCards : 0;
    const avgResponseTime =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.responseTime, 0) / records.length
        : 0;

    const errorBreakdown: Record<ErrorType, number> = {
      emotion_misjudge: 0,
      repeated_reply: 0,
      delayed_escalation: 0,
      wrong_diversion: 0,
      intent_misjudge: 0,
      resource_ignore: 0,
    };

    records.forEach(record => {
      if (record.errorType) {
        errorBreakdown[record.errorType]++;
      }
    });

    const ruleMatchBreakdown: Record<string, number> = {};
    records.forEach(record => {
      record.matchedRules.forEach(ruleId => {
        ruleMatchBreakdown[ruleId] = (ruleMatchBreakdown[ruleId] || 0) + 1;
      });
    });

    const dirtyDataHandled = records.filter(r => r.dirtyDataHandled).length;

    const level = this.calculateLevel(accuracy, finalScore, totalCards);

    return {
      totalCards,
      correctCount,
      wrongCount,
      accuracy,
      avgResponseTime,
      score: finalScore,
      errorBreakdown,
      ruleMatchBreakdown,
      dirtyDataHandled,
      level,
    };
  }

  private calculateLevel(
    accuracy: number,
    score: number,
    totalCards: number
  ): Level {
    const maxPossibleScore = totalCards * 20;
    const scoreRatio = maxPossibleScore > 0 ? score / maxPossibleScore : 0;
    const composite = accuracy * 0.6 + scoreRatio * 0.4;

    if (composite >= 0.9) return 'S';
    if (composite >= 0.8) return 'A';
    if (composite >= 0.7) return 'B';
    if (composite >= 0.6) return 'C';
    return 'D';
  }

  getResources(): AgentResource {
    return this.resourceManager.getResources();
  }

  getEscalationCost(): number {
    return this.resourceManager.getEscalationCost();
  }

  canEscalate(): { allowed: boolean; reason?: string } {
    return this.resourceManager.canEscalate();
  }
}

export const gameEngine = new GameEngine();
