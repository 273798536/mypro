import { create } from 'zustand';
import { 
  BridgeNode, 
  BridgeMember, 
  GamePhase, 
  FailReason, 
  EvidenceRecord, 
  BudgetRecord, 
  VibrationFrame,
  LevelConfig 
} from '../types/bridge';
import { levels } from '../data/levels';

interface GameState {
  phase: GamePhase;
  currentLevel: LevelConfig | null;
  nodes: BridgeNode[];
  members: BridgeMember[];
  windLevel: number;
  targetWindLevel: number;
  budget: {
    total: number;
    used: number;
    history: BudgetRecord[];
  };
  failReason: FailReason;
  failDetail: string;
  evidenceChain: EvidenceRecord[];
  vibrationHistory: VibrationFrame[];
  selectedNodeId: string | null;
  selectedMemberId: string | null;
  version: number;
  startTime: number;
  endTime: number;
  gameId: string;

  setPhase: (phase: GamePhase) => void;
  selectLevel: (levelId: string) => void;
  startGame: () => void;
  updateNode: (nodeId: string, updates: Partial<BridgeNode>, remark?: string) => void;
  addMember: (member: Omit<BridgeMember, 'id' | 'currentStress'>) => void;
  removeMember: (memberId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedMember: (memberId: string | null) => void;
  addEvidence: (type: EvidenceRecord['type'], data: Record<string, any>, remark?: string) => void;
  addVibrationFrame: (frame: VibrationFrame) => void;
  setWindLevel: (level: number) => void;
  setGameOver: (success: boolean, reason?: FailReason, detail?: string) => void;
  resetGame: () => void;
  goToMenu: () => void;
}

const generateGameId = () => {
  return `bridge_game_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
};

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'menu',
  currentLevel: null,
  nodes: [],
  members: [],
  windLevel: 0,
  targetWindLevel: 0,
  budget: {
    total: 0,
    used: 0,
    history: []
  },
  failReason: null,
  failDetail: '',
  evidenceChain: [],
  vibrationHistory: [],
  selectedNodeId: null,
  selectedMemberId: null,
  version: 0,
  startTime: 0,
  endTime: 0,
  gameId: '',

  setPhase: (phase) => set({ phase }),

  selectLevel: (levelId) => {
    const level = levels.find(l => l.id === levelId);
    if (!level) return;

    const now = Date.now();
    const nodes: BridgeNode[] = level.initialNodes.map(n => ({
      ...n,
      version: 1,
      modifiedAt: now,
      modifier: 'system' as const,
      remark: n.fixed ? '固定支点' : '活动节点'
    }));

    const members: BridgeMember[] = level.initialMembers.map(m => ({
      ...m,
      id: m.id,
      currentStress: 0
    }));

    const initialUsed = members.reduce((sum, m) => sum + m.cost, 0);

    set({
      currentLevel: level,
      nodes,
      members,
      windLevel: 0,
      targetWindLevel: level.targetWindLevel,
      budget: {
        total: level.totalBudget,
        used: initialUsed,
        history: [{
          timestamp: now,
          action: '初始配置',
          amount: initialUsed,
          balance: level.totalBudget - initialUsed,
          version: 1,
          remark: '关卡初始杆件配置'
        }]
      },
      evidenceChain: [{
        timestamp: now,
        type: 'budget_change',
        version: 1,
        data: {
          action: '初始配置',
          amount: initialUsed,
          remaining: level.totalBudget - initialUsed
        }
      }],
      vibrationHistory: [],
      selectedNodeId: null,
      selectedMemberId: null,
      version: 1,
      phase: 'edit'
    });
  },

  startGame: () => {
    const now = Date.now();
    const gameId = generateGameId();
    
    set({
      phase: 'simulating',
      windLevel: 1,
      startTime: now,
      gameId,
      vibrationHistory: []
    });

    get().addEvidence('wind_level_up', {
      level: 1,
      force: 100 * 1
    }, '风载开始');
  },

  updateNode: (nodeId, updates, remark) => {
    const state = get();
    const newVersion = state.version + 1;
    const now = Date.now();

    const oldNode = state.nodes.find(n => n.id === nodeId);
    if (!oldNode) return;

    const newNodes = state.nodes.map(n => 
      n.id === nodeId 
        ? { ...n, ...updates, version: newVersion, modifiedAt: now, modifier: 'user' as const }
        : n
    );

    set({
      nodes: newNodes,
      version: newVersion
    });

    if (remark || updates.remark !== undefined) {
      get().addEvidence('remark_change', {
        nodeId,
        oldRemark: oldNode.remark || '',
        newRemark: updates.remark || remark || '',
        modifiedBy: 'user'
      }, remark || updates.remark);
    } else {
      get().addEvidence('node_modify', {
        nodeId,
        oldPosition: { x: oldNode.x, y: oldNode.y },
        newPosition: { x: updates.x ?? oldNode.x, y: updates.y ?? oldNode.y }
      }, remark);
    }
  },

  addMember: (memberData) => {
    const state = get();
    const newVersion = state.version + 1;
    const now = Date.now();

    const newMember: BridgeMember = {
      ...memberData,
      id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      currentStress: 0
    };

    const newUsed = state.budget.used + newMember.cost;

    if (newUsed > state.budget.total) {
      set({
        phase: 'failed',
        failReason: 'overbudget',
        failDetail: `添加杆件超出预算！预算剩余: ${state.budget.total - state.budget.used}，杆件费用: ${newMember.cost}`,
        endTime: now
      });
      return;
    }

    set({
      members: [...state.members, newMember],
      budget: {
        ...state.budget,
        used: newUsed,
        history: [...state.budget.history, {
          timestamp: now,
          action: '添加杆件',
          amount: newMember.cost,
          balance: state.budget.total - newUsed,
          version: newVersion,
          remark: `添加${newMember.type === 'damper' ? '阻尼器' : newMember.type === 'spring' ? '弹簧' : '横梁'}`
        }]
      },
      version: newVersion
    });

    get().addEvidence('member_add', {
      memberId: newMember.id,
      type: newMember.type,
      cost: newMember.cost,
      startNodeId: newMember.startNodeId,
      endNodeId: newMember.endNodeId
    }, `添加杆件，费用: ${newMember.cost}`);
  },

  removeMember: (memberId) => {
    const state = get();
    const newVersion = state.version + 1;
    const now = Date.now();

    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    const refund = Math.floor(member.cost * 0.5);
    const newUsed = state.budget.used - refund;

    set({
      members: state.members.filter(m => m.id !== memberId),
      budget: {
        ...state.budget,
        used: newUsed,
        history: [...state.budget.history, {
          timestamp: now,
          action: '移除杆件',
          amount: -refund,
          balance: state.budget.total - newUsed,
          version: newVersion,
          remark: '拆除杆件，50%退款'
        }]
      },
      version: newVersion,
      selectedMemberId: null
    });

    get().addEvidence('member_remove', {
      memberId,
      type: member.type,
      refund,
      cost: member.cost
    }, `移除杆件，退款: ${refund}`);
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setSelectedMember: (memberId) => set({ selectedMemberId: memberId }),

  addEvidence: (type, data, remark) => {
    const state = get();
    const record: EvidenceRecord = {
      timestamp: Date.now(),
      type,
      data,
      version: state.version,
      remark
    };
    set({
      evidenceChain: [...state.evidenceChain, record]
    });
  },

  addVibrationFrame: (frame) => {
    const state = get();
    set({
      vibrationHistory: [...state.vibrationHistory, frame].slice(-300)
    });

    if (frame.amplitude > 50) {
      const recentPeaks = state.evidenceChain.filter(
        e => e.type === 'vibration_peak' && Date.now() - e.timestamp < 2000
      );
      if (recentPeaks.length === 0) {
        get().addEvidence('vibration_peak', {
          amplitude: frame.amplitude,
          windLevel: frame.windLevel,
          maxStress: frame.maxStress
        }, `振动峰值: ${frame.amplitude.toFixed(1)}`);
      }
    }
  },

  setWindLevel: (level) => {
    const state = get();
    set({ windLevel: level });
    get().addEvidence('wind_level_up', {
      level,
      force: 100 * level
    }, `风载等级提升至 ${level}`);
  },

  setGameOver: (success, reason, detail) => {
    const now = Date.now();
    if (success) {
      set({
        phase: 'success',
        endTime: now
      });
      get().addEvidence('failure' as any, {
        result: 'success',
        finalWindLevel: get().windLevel
      }, '桥梁抵御住了所有风载！');
    } else {
      set({
        phase: 'failed',
        failReason: reason || null,
        failDetail: detail || '',
        endTime: now
      });
      get().addEvidence('failure', {
        result: 'failed',
        reason,
        detail,
        finalWindLevel: get().windLevel
      }, detail);
    }
  },

  resetGame: () => {
    const state = get();
    if (state.currentLevel) {
      get().selectLevel(state.currentLevel.id);
    }
  },

  goToMenu: () => {
    set({
      phase: 'menu',
      currentLevel: null,
      nodes: [],
      members: [],
      windLevel: 0,
      targetWindLevel: 0,
      budget: { total: 0, used: 0, history: [] },
      failReason: null,
      failDetail: '',
      evidenceChain: [],
      vibrationHistory: [],
      selectedNodeId: null,
      selectedMemberId: null,
      version: 0,
      startTime: 0,
      endTime: 0,
      gameId: ''
    });
  }
}));
