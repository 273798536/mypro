import {
  Strategy,
  StrategyRule,
  Member,
  MemberStatus,
  TouchRecord,
  TouchChannel,
  TransitionMatrix,
  StrategyComparisonResult,
} from '../types';
import { DataStore } from '../data/data-store';
import { MarkovChain } from '../core/markov-chain';
import { v4 as uuidv4 } from 'uuid';

const CHANNEL_EFFECTIVENESS: Record<TouchChannel, number> = {
  email: 0.15,
  sms: 0.12,
  push: 0.10,
  popup: 0.05,
  wechat: 0.18,
  phone: 0.25,
};

const CHANNEL_COST: Record<TouchChannel, number> = {
  email: 0.5,
  sms: 0.8,
  push: 0.3,
  popup: 0.1,
  wechat: 0.6,
  phone: 25.0,
};

export class StrategyEngine {
  private dataStore: DataStore;
  private markovChain: MarkovChain;
  private version: string;
  private source: string;

  constructor(
    dataStore: DataStore,
    markovChain: MarkovChain,
    version: string = '1.0.0',
    source: string = 'strategy-engine'
  ) {
    this.dataStore = dataStore;
    this.markovChain = markovChain;
    this.version = version;
    this.source = source;
  }

  evaluateMemberForStrategy(member: Member, strategy: Strategy): StrategyRule | null {
    if (!strategy.isActive) return null;

    const statusHistory = this.dataStore.getStatusHistoryByMember(member.id);
    if (statusHistory.length === 0) return null;

    const currentStatus = member.currentStatus;
    const lastStatusChange = statusHistory[statusHistory.length - 1];
    const daysInStatus = this.calculateDaysInStatus(lastStatusChange.date);

    const applicableRules = strategy.rules
      .filter(rule => rule.triggerStatus === currentStatus)
      .filter(rule => {
        if (rule.triggerDays < 0) {
          return daysInStatus >= Math.abs(rule.triggerDays);
        }
        return daysInStatus >= rule.triggerDays;
      })
      .filter(rule => this.checkCoolDown(member.id, rule.channel, rule.coolDownDays))
      .sort((a, b) => a.priority - b.priority);

    return applicableRules[0] || null;
  }

  private calculateDaysInStatus(dateStr: string): number {
    const statusDate = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - statusDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private checkCoolDown(memberId: string, channel: TouchChannel, coolDownDays: number): boolean {
    const lastTouch = this.dataStore.getLastTouchByMember(memberId, channel);
    if (!lastTouch) return true;

    const lastTouchDate = new Date(lastTouch.timestamp);
    const now = new Date();
    const daysSinceLastTouch = Math.floor((now.getTime() - lastTouchDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysSinceLastTouch >= coolDownDays;
  }

  executeStrategyForMember(member: Member, strategy: Strategy): TouchRecord | null {
    const rule = this.evaluateMemberForStrategy(member, strategy);
    if (!rule) return null;

    const touchRecord = this.dataStore.addTouchRecord({
      memberId: member.id,
      channel: rule.channel,
      type: rule.type,
      strategyId: strategy.id,
    });

    return touchRecord;
  }

  runAllStrategies(): TouchRecord[] {
    const executed: TouchRecord[] = [];
    const members = this.dataStore.getAllMembers();
    const strategies = this.dataStore.getActiveStrategies();

    for (const member of members) {
      for (const strategy of strategies) {
        const touch = this.executeStrategyForMember(member, strategy);
        if (touch) {
          executed.push(touch);
          break;
        }
      }
    }

    return executed;
  }

  applyStrategyToMatrix(
    baseMatrix: TransitionMatrix,
    strategy: Strategy
  ): TransitionMatrix {
    const newMatrix = baseMatrix.matrix.map(row => [...row]);
    const states = this.markovChain.getStates();

    strategy.rules.forEach(rule => {
      const fromIdx = states.indexOf(rule.triggerStatus);
      if (fromIdx === -1) return;

      const effectiveness = CHANNEL_EFFECTIVENESS[rule.channel] || 0.1;
      const activeIdx = states.indexOf('active');
      const churnedIdx = states.indexOf('churned');
      const silentIdx = states.indexOf('silent');

      if (rule.type === 'winback' || rule.type === 'renewal_reminder') {
        if (churnedIdx !== -1 && newMatrix[fromIdx][churnedIdx] > 0) {
          const churnReduction = newMatrix[fromIdx][churnedIdx] * effectiveness * 0.5;
          newMatrix[fromIdx][churnedIdx] -= churnReduction;
          if (activeIdx !== -1) {
            newMatrix[fromIdx][activeIdx] += churnReduction * 0.7;
          }
          if (silentIdx !== -1) {
            newMatrix[fromIdx][silentIdx] += churnReduction * 0.3;
          }
        }
      }

      if (rule.type === 'exclusive_offer') {
        if (activeIdx !== -1 && fromIdx !== activeIdx) {
          const activeIncrease = effectiveness * 0.3;
          if (newMatrix[fromIdx][churnedIdx] > activeIncrease) {
            newMatrix[fromIdx][churnedIdx] -= activeIncrease;
            newMatrix[fromIdx][activeIdx] += activeIncrease;
          }
        }
      }
    });

    newMatrix.forEach((row, i) => {
      const rowSum = row.reduce((a, b) => a + b, 0);
      if (Math.abs(rowSum - 1) > 0.0001) {
        const scale = 1 / rowSum;
        newMatrix[i] = row.map(v => v * scale);
      }
    });

    return {
      ...baseMatrix,
      matrix: newMatrix,
      calculatedAt: new Date().toISOString(),
      source: this.source,
    };
  }

  compareStrategies(
    baseMatrix: TransitionMatrix,
    strategies: Strategy[],
    baselineRetention: number,
    memberCount: number = 1000,
    avgLtv: number = 500
  ): StrategyComparisonResult[] {
    const results: StrategyComparisonResult[] = [];

    for (const strategy of strategies) {
      const modifiedMatrix = this.applyStrategyToMatrix(baseMatrix, strategy);
      const steadyState = this.markovChain.calculateSteadyState(modifiedMatrix.matrix);
      const churnedIdx = this.markovChain.getStates().indexOf('churned');

      const improvedRetention = 1 - steadyState[churnedIdx];
      const liftPercentage = ((improvedRetention - baselineRetention) / baselineRetention) * 100;

      const retainedIncrease = memberCount * (improvedRetention - baselineRetention);
      const estimatedLtvGain = retainedIncrease * avgLtv;

      const touchCount = Math.ceil(memberCount * 0.3 * strategy.rules.length);
      const costEstimate = strategy.rules.reduce((sum, rule) => {
        return sum + touchCount * (CHANNEL_COST[rule.channel] || 1);
      }, 0);

      const roi = costEstimate > 0 ? (estimatedLtvGain - costEstimate) / costEstimate : 0;

      results.push({
        strategyId: strategy.id,
        strategyName: strategy.name,
        baselineRetention,
        improvedRetention,
        liftPercentage,
        estimatedLtvGain,
        touchCount,
        costEstimate,
        roi,
      });
    }

    return results.sort((a, b) => b.roi - a.roi);
  }

  getChannelCost(channel: TouchChannel): number {
    return CHANNEL_COST[channel] || 1;
  }

  getChannelEffectiveness(channel: TouchChannel): number {
    return CHANNEL_EFFECTIVENESS[channel] || 0.1;
  }

  simulateStrategyImpact(
    strategy: Strategy,
    baseMatrix: TransitionMatrix,
    periods: number = 30,
    initialDistribution: number[]
  ): {
    distributionHistory: number[][];
    churnRate: number[];
    retentionRate: number[];
  } {
    const modifiedMatrix = this.applyStrategyToMatrix(baseMatrix, strategy);

    const config = {
      seed: 42,
      periods,
      initialDistribution,
      strategyId: strategy.id,
      version: this.version,
      source: this.source,
    };

    const result = this.markovChain.predict(modifiedMatrix, config);

    return {
      distributionHistory: result.distributionHistory,
      churnRate: result.churnProbability,
      retentionRate: result.retentionRate,
    };
  }
}
