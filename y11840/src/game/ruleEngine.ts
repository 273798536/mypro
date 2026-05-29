import type {
  ConversationCard,
  AgentResource,
  Decision,
  DiversionRule,
  ErrorType,
} from '@/types';
import { DIVERSION_RULES } from './rules';

export class RuleEngine {
  matchRules(
    card: ConversationCard,
    resources: AgentResource
  ): DiversionRule[] {
    const matchedRules = DIVERSION_RULES.filter(rule =>
      rule.condition(card, resources)
    );
    return matchedRules.sort((a, b) => a.priority - b.priority);
  }

  determineCorrectDecision(
    card: ConversationCard,
    resources: AgentResource
  ): { decision: Decision; matchedRules: DiversionRule[] } {
    const matchedRules = this.matchRules(card, resources);

    if (matchedRules.length === 0) {
      return { decision: 'ai', matchedRules: [] };
    }

    const highestPriority = matchedRules[0].priority;
    const topRules = matchedRules.filter(r => r.priority === highestPriority);

    const needsHuman = topRules.some(
      r =>
        r.category === 'emotion' ||
        r.category === 'intent' ||
        r.category === 'special' ||
        r.category === 'bot_limit'
    );

    const needsObserve = topRules.some(
      r => r.id === 'R007'
    );

    let decision: Decision;
    if (needsObserve && resources.busyLevel === 'critical') {
      decision = 'observe';
    } else if (needsHuman) {
      decision = 'human';
    } else {
      decision = 'ai';
    }

    if (card.requiredDecision) {
      decision = card.requiredDecision;
    }

    return { decision, matchedRules };
  }

  determineErrorType(
    userDecision: Decision,
    correctDecision: Decision,
    card: ConversationCard,
    matchedRules: string[]
  ): { errorType: ErrorType | null; details: string | null } {
    if (userDecision === correctDecision) {
      return { errorType: null, details: null };
    }

    if (matchedRules.includes('R001') || matchedRules.includes('R009')) {
      if (userDecision !== 'human') {
        return {
          errorType: 'emotion_misjudge',
          details: `客户情绪为${card.emotion}，${matchedRules.includes('R009') ? '且置信度过低' : ''}，应转人工处理`,
        };
      }
    }

    if (matchedRules.includes('R002') || matchedRules.includes('R003') || matchedRules.includes('R008') || matchedRules.includes('R011')) {
      if (userDecision !== 'human') {
        return {
          errorType: 'intent_misjudge',
          details: `客户意图为${card.intent}，需人工介入处理`,
        };
      }
    }

    if (matchedRules.includes('R004')) {
      if (userDecision !== 'human') {
        return {
          errorType: 'repeated_reply',
          details: '机器人已重复回复多次，继续AI处理会引起客户不满',
        };
      }
    }

    if (matchedRules.includes('R005')) {
      if (userDecision === 'ai') {
        return {
          errorType: 'repeated_reply',
          details: '机器人无法提供有效回复，应转人工处理',
        };
      }
    }

    if (matchedRules.includes('R007') && correctDecision === 'observe') {
      if (userDecision === 'human') {
        return {
          errorType: 'resource_ignore',
          details: '坐席资源紧张，非紧急问题应先观察或AI处理',
        };
      }
    }

    if (matchedRules.includes('R006') && correctDecision === 'human') {
      if (userDecision !== 'human') {
        return {
          errorType: 'resource_ignore',
          details: '坐席资源空闲，不满情绪客户可优先转人工',
        };
      }
    }

    if (matchedRules.includes('R010')) {
      if (userDecision !== 'human') {
        return {
          errorType: 'delayed_escalation',
          details: '包含特殊标记（VIP/紧急），需立即转人工',
        };
      }
    }

    return {
      errorType: 'wrong_diversion',
      details: `正确决策应为${correctDecision === 'human' ? '转人工' : correctDecision === 'ai' ? 'AI处理' : '继续观察'}，您选择了${userDecision === 'human' ? '转人工' : userDecision === 'ai' ? 'AI处理' : '继续观察'}`,
    };
  }

  calculateScore(
    isCorrect: boolean,
    errorType: ErrorType | null,
    responseTime: number,
    difficulty: string
  ): number {
    const baseScore = difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 5;
    const timeBonus = responseTime < 5000 ? 5 : responseTime < 10000 ? 3 : responseTime < 15000 ? 1 : 0;

    if (isCorrect) {
      return baseScore + timeBonus;
    }

    const penaltyMap: Record<string, number> = {
      emotion_misjudge: 8,
      intent_misjudge: 7,
      repeated_reply: 6,
      delayed_escalation: 10,
      resource_ignore: 5,
      wrong_diversion: 4,
    };

    const penalty = errorType ? penaltyMap[errorType] : 5;
    return -penalty;
  }
}

export const ruleEngine = new RuleEngine();
