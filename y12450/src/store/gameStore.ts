import { create } from 'zustand';
import {
  GameState,
  Bond,
  Coupon,
  PutOption,
  DefaultEvent,
  RailwayNode,
  GameError,
  GameSettlement,
  SourceInfo,
  NodeStatus,
  ErrorType
} from '../types';
import { createSampleBond, createSampleCoupons, createSamplePutOption, createSampleDefaultEvent, createSampleSources } from '../data/sampleData';
import { LEVELS } from '../data/levels';

interface GameActions {
  initLevel: (levelId: string, playerName: string) => void;
  processNode: (nodeId: string, playerChoice?: Record<string, unknown>) => boolean;
  setCurrentNode: (index: number) => void;
  addError: (error: Omit<GameError, 'triggeredAt'>) => void;
  selectBond: (bondId: string | null) => void;
  calculateSettlement: () => void;
  resetGame: () => void;
  backfillDefault: (defaultData: Omit<DefaultEvent, 'id' | 'isBackfilled' | 'backfilledAt'>) => void;
  getNodeById: (nodeId: string) => RailwayNode | undefined;
  getAffectedDetails: (defaultId: string) => string[];
}

const initialState: GameState = {
  phase: 'setup',
  currentLevelId: '',
  currentNodeIndex: 0,
  bonds: [],
  coupons: [],
  putOptions: [],
  defaultEvents: [],
  sources: [],
  railwayNodes: [],
  errors: [],
  settlement: null,
  playerName: '',
  selectedBondId: null
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  initLevel: (levelId: string, playerName: string) => {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;

    const sources = createSampleSources();
    const bond = createSampleBond(levelId);
    const coupons = createSampleCoupons(bond, levelId);
    const putOption = level.hasPutOption ? createSamplePutOption(bond) : null;
    const defaultEvent = level.hasDefaultEvent ? createSampleDefaultEvent(bond, levelId) : null;

    const nodes: RailwayNode[] = [];
    let position = 0;

    nodes.push({
      id: 'node-start',
      type: 'bond_start',
      name: '债券发行站',
      position: position++,
      status: 'pending',
      bondId: bond.id
    });

    coupons.forEach((coupon, index) => {
      if (level.hasDefaultEvent && index >= 6) return;
      
      nodes.push({
        id: `node-coupon-${coupon.period}`,
        type: 'coupon_station',
        name: `第${coupon.period}期票息站`,
        position: position++,
        status: 'pending',
        bondId: bond.id,
        couponId: coupon.id
      });
    });

    if (level.hasPutOption && putOption) {
      nodes.push({
        id: 'node-put',
        type: 'put_junction',
        name: '回售岔道口',
        position: position++,
        status: 'pending',
        bondId: bond.id,
        putId: putOption.id
      });
    }

    if (level.hasDefaultEvent && defaultEvent) {
      const couponIndex = nodes.findIndex(n => n.couponId === 'coupon-006');
      if (couponIndex > -1) {
        nodes.splice(couponIndex + 1, 0, {
          id: 'node-default',
          type: 'default_trap',
          name: '违约隧道',
          position: couponIndex + 1,
          status: 'pending',
          bondId: bond.id,
          defaultId: defaultEvent.id
        });
      }
    }

    nodes.push({
      id: 'node-destination',
      type: 'destination',
      name: '到期兑付站',
      position: position,
      status: 'pending',
      bondId: bond.id
    });

    set({
      phase: 'playing',
      currentLevelId: levelId,
      currentNodeIndex: 0,
      bonds: [bond],
      coupons,
      putOptions: putOption ? [putOption] : [],
      defaultEvents: defaultEvent ? [defaultEvent] : [],
      sources,
      railwayNodes: nodes,
      errors: [],
      settlement: null,
      playerName,
      selectedBondId: bond.id
    });
  },

  processNode: (nodeId: string, playerChoice?: Record<string, unknown>): boolean => {
    const state = get();
    const nodeIndex = state.railwayNodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return false;

    const node = state.railwayNodes[nodeIndex];
    const { playerName } = state;
    let hasError = false;

    const updateNodeStatus = (status: NodeStatus, error?: GameError) => {
      const newNodes = [...state.railwayNodes];
      newNodes[nodeIndex] = {
        ...node,
        status,
        processedAt: new Date(),
        processedBy: playerName,
        error
      };
      set({ railwayNodes: newNodes });
    };

    switch (node.type) {
      case 'bond_start':
        updateNodeStatus('completed');
        break;

      case 'coupon_station': {
        const coupon = state.coupons.find(c => c.id === node.couponId);
        if (!coupon) break;

        const playerDate = playerChoice?.paymentDate as Date | undefined;
        const expectedDate = coupon.paymentDate;

        if (coupon.isDeferred) {
          if (!playerChoice?.acknowledgeDeferral) {
            hasError = true;
            const error: GameError = {
              type: 'coupon_deferral_missed',
              message: `票息顺延未识别：第${coupon.period}期票息因${coupon.deferralReason}需要顺延2天`,
              triggeredBy: playerName,
              triggeredAt: new Date(),
              blockedStep: `第${coupon.period}期票息支付`,
              nextAction: '查看托管行提供的付息通知，注意节假日调整后的支付日期',
              nodeId: node.id
            };
            get().addError(error);
            updateNodeStatus('failed', error);
          } else {
            updateNodeStatus('completed');
          }
        } else if (playerDate && Math.abs(playerDate.getTime() - expectedDate.getTime()) > 86400000) {
          hasError = true;
          const error: GameError = {
            type: 'timing_error',
            message: `票息支付日期错误：应为${expectedDate.toLocaleDateString()}，输入为${playerDate.toLocaleDateString()}`,
            triggeredBy: playerName,
            triggeredAt: new Date(),
            blockedStep: `第${coupon.period}期票息支付日期确认`,
            nextAction: '核对债券募集说明书中的付息日程表',
            nodeId: node.id
          };
          get().addError(error);
          updateNodeStatus('failed', error);
        } else {
          updateNodeStatus('completed');
        }
        break;
      }

      case 'put_junction': {
        const putOption = state.putOptions.find(p => p.id === node.putId);
        if (!putOption) break;

        const playerExerciseChoice = playerChoice?.exercise as boolean | undefined;

        if (playerExerciseChoice === undefined) {
          hasError = true;
          const error: GameError = {
            type: 'put_option_missed',
            message: '回售选择权未行使：未在回售登记期内做出选择',
            triggeredBy: playerName,
            triggeredAt: new Date(),
            blockedStep: '回售选择权行使',
            nextAction: '查看交易员提供的回售通知，在截止日前提交回售或继续持有指令',
            nodeId: node.id
          };
          get().addError(error);
          updateNodeStatus('failed', error);
        } else {
          const newPutOptions = state.putOptions.map(p =>
            p.id === putOption.id ? { ...p, isExercised: playerExerciseChoice, isSelected: true } : p
          );
          set({ putOptions: newPutOptions });
          updateNodeStatus('completed');
        }
        break;
      }

      case 'default_trap': {
        const defaultEvent = state.defaultEvents.find(d => d.id === node.defaultId);
        if (!defaultEvent) break;

        const playerJudgement = playerChoice?.judgement as string | undefined;

        if (playerJudgement !== 'default') {
          hasError = true;
          const error: GameError = {
            type: 'default_misjudged',
            message: '违约误判：未能识别票息未支付已构成实质性违约',
            triggeredBy: playerName,
            triggeredAt: new Date(),
            blockedStep: '信用风险评估与违约判定',
            nextAction: '查看风控提供的违约预警报告，启动违约处置流程',
            nodeId: node.id
          };
          get().addError(error);
          updateNodeStatus('failed', error);
        } else {
          updateNodeStatus('completed');
        }
        break;
      }

      case 'destination':
        updateNodeStatus('completed');
        get().calculateSettlement();
        set({ phase: 'completed' });
        break;
    }

    if (!hasError && node.type !== 'destination') {
      const nextIndex = nodeIndex + 1;
      set({ currentNodeIndex: nextIndex });
      const newNodes = [...get().railwayNodes];
      if (newNodes[nextIndex]) {
        newNodes[nextIndex] = { ...newNodes[nextIndex], status: 'active' };
        set({ railwayNodes: newNodes });
      }
    }

    return !hasError;
  },

  setCurrentNode: (index: number) => {
    set({ currentNodeIndex: index });
  },

  addError: (error: Omit<GameError, 'triggeredAt'>) => {
    set(state => ({
      errors: [...state.errors, { ...error, triggeredAt: new Date() }]
    }));
  },

  selectBond: (bondId: string | null) => {
    set({ selectedBondId: bondId });
  },

  calculateSettlement: () => {
    const state = get();
    const { railwayNodes, coupons, putOptions, defaultEvents, errors } = state;

    const paidCoupons = railwayNodes.filter(
      n => n.type === 'coupon_station' && n.status === 'completed'
    ).length;

    const deferredCoupons = coupons.filter(c => c.isDeferred).length;
    const putExercised = putOptions.some(p => p.isExercised);
    const defaultCount = defaultEvents.length;

    let finalAmount = 0;
    const faceValue = state.bonds[0]?.faceValue || 0;
    const couponAmount = coupons[0]?.amount || 0;

    finalAmount += paidCoupons * couponAmount;

    if (!defaultCount || defaultEvents.every(d => d.isResolved)) {
      if (!putExercised) {
        finalAmount += faceValue;
      }
    }

    const settlement: GameSettlement = {
      totalCoupons: coupons.length,
      paidCoupons,
      deferredCoupons,
      putExercised,
      defaultEvents: defaultCount,
      finalAmount,
      details: railwayNodes.map(n => ({
        nodeId: n.id,
        nodeName: n.name,
        status: n.status,
        amount: n.type === 'coupon_station' ? coupons.find(c => c.id === n.couponId)?.amount : undefined,
        date: n.type === 'coupon_station' ? coupons.find(c => c.id === n.couponId)?.paymentDate : undefined,
        error: n.error
      })),
      errors,
      completedAt: new Date()
    };

    set({ settlement });
  },

  resetGame: () => {
    set(initialState);
  },

  backfillDefault: (defaultData: Omit<DefaultEvent, 'id' | 'isBackfilled' | 'backfilledAt'>) => {
    const newDefault: DefaultEvent = {
      ...defaultData,
      id: `default-backfill-${Date.now()}`,
      isBackfilled: true,
      backfilledAt: new Date()
    };

    set(state => ({
      defaultEvents: [...state.defaultEvents, newDefault]
    }));
  },

  getNodeById: (nodeId: string) => {
    return get().railwayNodes.find(n => n.id === nodeId);
  },

  getAffectedDetails: (defaultId: string) => {
    const state = get();
    const defaultEvent = state.defaultEvents.find(d => d.id === defaultId);
    if (!defaultEvent) return [];

    return defaultEvent.impactDetails;
  }
}));
