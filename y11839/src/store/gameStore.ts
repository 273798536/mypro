import { create } from 'zustand';
import type {
  BridgeNode,
  BridgeMember,
  MaterialType,
  ActionRecord,
  ActionType,
  DiffEntry,
  MergeSnapshot,
  TestResult,
  OverloadEvent,
  GamePhase,
  BuildTool,
  GameConfig,
} from '../types';
import { MATERIALS } from '../types';
import { solveTruss, computeStressRatio, getOverloadReason, checkSupportStability } from '../utils/physics';
import { calculateTotalBudgetUsed } from '../utils/budget';
import { computeDiffs, generateIncomingChanges, applyMergeResolution } from '../utils/diff';

let idCounter = 0;
function genId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

function doRecordAction(type: ActionType, payload: unknown, structuralImpact = '无影响') {
  const state = useGameStore.getState();
  const action: ActionRecord = {
    timestamp: Date.now(),
    type,
    payload,
    resultingScore: 0,
    structuralImpact,
  };
  useGameStore.setState({ actionHistory: [...state.actionHistory, action] });
}

interface MergeState {
  isActive: boolean;
  incomingNodes: BridgeNode[];
  incomingMembers: BridgeMember[];
  diffs: DiffEntry[];
  resolution: Record<string, 'current' | 'incoming'>;
}

export interface OverloadDisplay {
  memberId: string;
  reason: string;
  force: number;
  stressRatio: number;
  vehiclePosition: number;
}

interface GameState {
  config: GameConfig;
  nodes: BridgeNode[];
  members: BridgeMember[];
  phase: GamePhase;
  buildTool: BuildTool;
  selectedNodeId: string | null;
  selectedMemberId: string | null;
  memberStartNodeId: string | null;
  newMemberMaterial: MaterialType;
  actionHistory: ActionRecord[];
  mergeSnapshots: MergeSnapshot[];
  mergeState: MergeState;
  testResult: TestResult | null;
  vehiclePosition: number;
  isTestRunning: boolean;
  overloadDisplay: OverloadDisplay | null;
  budget: number;
  budgetUsed: number;
  teacherMode: boolean;
  reviewStep: number;

  initGame: () => void;
  setPhase: (phase: GamePhase) => void;
  setBuildTool: (tool: BuildTool) => void;
  setNewMemberMaterial: (mat: MaterialType) => void;
  addNode: (x: number, y: number, type: 'deck' | 'support' | 'free') => void;
  moveNode: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  addMember: (nodeAId: string, nodeBId: string) => void;
  removeMember: (id: string) => void;
  selectMember: (id: string | null) => void;
  startMerge: () => void;
  resolveMerge: (resolution: Record<string, 'current' | 'incoming'>) => void;
  cancelMerge: () => void;
  recalculate: () => void;
  startTest: () => void;
  advanceVehicle: () => void;
  dismissOverload: () => void;
  setTeacherMode: (v: boolean) => void;
  setReviewStep: (step: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  config: {
    gridWidth: 28,
    gridHeight: 16,
    gridSize: 40,
    budget: 2000,
    vehicleLoad: 50,
    defaultCrossSection: 5,
    leftSupportX: 3,
    rightSupportX: 25,
    supportY: 12,
  },
  nodes: [],
  members: [],
  phase: 'building',
  buildTool: 'addNode',
  selectedNodeId: null,
  selectedMemberId: null,
  memberStartNodeId: null,
  newMemberMaterial: 'steel',
  actionHistory: [],
  mergeSnapshots: [],
  mergeState: {
    isActive: false,
    incomingNodes: [],
    incomingMembers: [],
    diffs: [],
    resolution: {},
  },
  testResult: null,
  vehiclePosition: 0,
  isTestRunning: false,
  overloadDisplay: null,
  budget: 2000,
  budgetUsed: 0,
  teacherMode: false,
  reviewStep: 0,

  initGame: () => {
    const cfg = get().config;
    const leftSupport: BridgeNode = {
      id: 'support-L',
      x: cfg.leftSupportX,
      y: cfg.supportY,
      type: 'support',
      isFixed: true,
    };
    const rightSupport: BridgeNode = {
      id: 'support-R',
      x: cfg.rightSupportX,
      y: cfg.supportY,
      type: 'support',
      isFixed: true,
    };
    const midDeck: BridgeNode = {
      id: 'deck-mid',
      x: Math.round((cfg.leftSupportX + cfg.rightSupportX) / 2),
      y: cfg.supportY,
      type: 'deck',
      isFixed: false,
    };
    set({
      nodes: [leftSupport, rightSupport, midDeck],
      members: [],
      phase: 'building',
      actionHistory: [],
      mergeSnapshots: [],
      testResult: null,
      vehiclePosition: 0,
      isTestRunning: false,
      overloadDisplay: null,
      budgetUsed: 0,
      reviewStep: 0,
    });
    get().recalculate();
  },

  setPhase: (phase) => set({ phase }),
  setBuildTool: (tool) => set({ buildTool: tool, memberStartNodeId: null }),
  setNewMemberMaterial: (mat) => set({ newMemberMaterial: mat }),

  addNode: (x, y, type) => {
    const id = genId('n');
    const node: BridgeNode = {
      id,
      x: Math.round(x * 2) / 2,
      y: Math.round(y * 2) / 2,
      type,
      isFixed: type === 'support',
    };
    set((state) => ({ nodes: [...state.nodes, node] }));
    get().recalculate();
    const overloadedAfter = get().members.filter((m) => m.stressRatio > 1.0).length;
    doRecordAction('ADD_NODE', { nodeId: id, x: node.x, y: node.y, type },
      overloadedAfter > 0 ? `新增节点后，${overloadedAfter}根杆件过载` : '无影响');
  },

  moveNode: (id, x, y) => {
    const snappedX = Math.round(x * 2) / 2;
    const snappedY = Math.round(y * 2) / 2;
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, x: snappedX, y: snappedY } : n
      ),
    }));
    get().recalculate();
    const overloadedAfter = get().members.filter((m) => m.stressRatio > 1.0).length;
    doRecordAction('MOVE_NODE', { nodeId: id, x: snappedX, y: snappedY },
      overloadedAfter > 0 ? `移动节点后，${overloadedAfter}根杆件过载` : '无影响');
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      members: state.members.filter((m) => m.nodeAId !== id && m.nodeBId !== id),
    }));
    get().recalculate();
    doRecordAction('REMOVE_NODE', { nodeId: id }, '移除节点及相关杆件');
  },

  selectNode: (id) => set({ selectedNodeId: id, selectedMemberId: null }),

  addMember: (nodeAId, nodeBId) => {
    const existing = get().members.find(
      (m) =>
        (m.nodeAId === nodeAId && m.nodeBId === nodeBId) ||
        (m.nodeAId === nodeBId && m.nodeBId === nodeAId)
    );
    if (existing) return;

    const id = genId('m');
    const mat = get().newMemberMaterial;
    const member: BridgeMember = {
      id,
      nodeAId,
      nodeBId,
      materialType: mat,
      crossSection: get().config.defaultCrossSection,
      internalForce: 0,
      allowableStress: MATERIALS[mat].allowableStress,
      stressRatio: 0,
    };
    set((state) => ({ members: [...state.members, member] }));
    get().recalculate();

    const newMember = get().members.find((m) => m.id === id);
    const impact = newMember && newMember.stressRatio > 1.0
      ? `新增杆件应力比 ${newMember.stressRatio.toFixed(2)}，已过载`
      : newMember ? `新增杆件应力比 ${newMember.stressRatio.toFixed(2)}，安全` : '无影响';
    doRecordAction('ADD_MEMBER', { memberId: id, nodeAId, nodeBId, material: mat }, impact);
  },

  removeMember: (id) => {
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
    }));
    get().recalculate();
    doRecordAction('REMOVE_MEMBER', { memberId: id }, '移除杆件，受力重新分布');
  },

  selectMember: (id) => set({ selectedMemberId: id, selectedNodeId: null }),

  startMerge: () => {
    const { nodes, members } = get();
    const incoming = generateIncomingChanges(nodes, members);
    const diffs = computeDiffs(nodes, members, incoming.nodes, incoming.members);

    if (diffs.length === 0) return;

    set({
      mergeState: {
        isActive: true,
        incomingNodes: incoming.nodes,
        incomingMembers: incoming.members,
        diffs,
        resolution: {},
      },
    });
  },

  resolveMerge: (resolution) => {
    const { nodes, members, mergeState } = get();
    if (!mergeState.isActive) return;

    const result = applyMergeResolution(
      nodes,
      members,
      mergeState.incomingNodes,
      mergeState.incomingMembers,
      mergeState.diffs,
      resolution
    );

    const snapshot: MergeSnapshot = {
      timestamp: Date.now(),
      diffs: mergeState.diffs,
      resolution,
    };

    set({
      nodes: result.nodes,
      members: result.members,
      mergeSnapshots: [...get().mergeSnapshots, snapshot],
      mergeState: {
        isActive: false,
        incomingNodes: [],
        incomingMembers: [],
        diffs: [],
        resolution: {},
      },
    });
    get().recalculate();

    const incomingCount = resolution && typeof resolution === 'object'
      ? Object.values(resolution).filter((v) => v === 'incoming').length
      : 0;
    doRecordAction('MERGE_RESOLVE',
      { diffs: mergeState.diffs.length, adoptedIncoming: incomingCount },
      `合并${mergeState.diffs.length}项差异，采纳${incomingCount}项新方案`);
  },

  cancelMerge: () => {
    set({
      mergeState: {
        isActive: false,
        incomingNodes: [],
        incomingMembers: [],
        diffs: [],
        resolution: {},
      },
    });
  },

  recalculate: () => {
    const { nodes, members } = get();

    const materialProps: Record<MaterialType, { elasticModulus: number; allowableStress: number }> = {
      steel: { elasticModulus: MATERIALS.steel.elasticModulus, allowableStress: MATERIALS.steel.allowableStress },
      aluminum: { elasticModulus: MATERIALS.aluminum.elasticModulus, allowableStress: MATERIALS.aluminum.allowableStress },
      wood: { elasticModulus: MATERIALS.wood.elasticModulus, allowableStress: MATERIALS.wood.allowableStress },
    };

    const result = solveTruss(nodes, members, materialProps);

    const updatedMembers = members.map((m) => {
      const force = result.memberForces[m.id] || 0;
      const mat = MATERIALS[m.materialType];
      const stressRatio = computeStressRatio(force, m.crossSection, mat.allowableStress);
      const overloadReason = getOverloadReason(force, stressRatio, m.crossSection, mat.allowableStress);
      return { ...m, internalForce: force, allowableStress: mat.allowableStress, stressRatio, overloadReason };
    });

    const updatedNodes = nodes.map((n) => {
      const reaction = result.supportReactions[n.id];
      if (n.type === 'support' && reaction) {
        const stability = checkSupportStability(n.id, reaction, n.type);
        return {
          ...n,
          reactionForce: reaction,
          isStable: stability.isStable,
          instabilityReason: stability.reason,
        };
      }
      const instInfo = result.instabilityInfo[n.id];
      if (instInfo) {
        return { ...n, isStable: false, instabilityReason: instInfo };
      }
      return { ...n, reactionForce: reaction, isStable: n.type !== 'support' ? true : (n.isStable ?? true), instabilityReason: undefined };
    });

    const nodePositions: Record<string, { x: number; y: number }> = {};
    for (const n of updatedNodes) {
      nodePositions[n.id] = { x: n.x, y: n.y };
    }
    const budgetUsed = calculateTotalBudgetUsed(updatedMembers, nodePositions, MATERIALS);

    set({ nodes: updatedNodes, members: updatedMembers, budgetUsed });
  },

  startTest: () => {
    set({ phase: 'testing', vehiclePosition: 0, isTestRunning: true, overloadDisplay: null, testResult: null });
  },

  advanceVehicle: () => {
    const { nodes, members, config, vehiclePosition, isTestRunning, overloadDisplay } = get();
    if (!isTestRunning || overloadDisplay) return;

    const cfg = config;
    const step = 0.5;
    const newPos = vehiclePosition + step;

    if (newPos > cfg.rightSupportX + 1) {
      finishTest(get, set);
      return;
    }

    const nearestNodeIds: string[] = [];
    let minDist = Infinity;
    for (const n of nodes) {
      if (n.type === 'deck' || n.type === 'support') {
        const dist = Math.abs(n.x - newPos);
        if (dist < minDist) {
          minDist = dist;
          nearestNodeIds.length = 0;
          nearestNodeIds.push(n.id);
        } else if (dist === minDist) {
          nearestNodeIds.push(n.id);
        }
      }
    }

    const loads: Record<string, { fx: number; fy: number }> = {};
    for (const nid of nearestNodeIds) {
      loads[nid] = { fx: 0, fy: cfg.vehicleLoad / nearestNodeIds.length };
    }

    const materialProps: Record<MaterialType, { elasticModulus: number; allowableStress: number }> = {
      steel: { elasticModulus: MATERIALS.steel.elasticModulus, allowableStress: MATERIALS.steel.allowableStress },
      aluminum: { elasticModulus: MATERIALS.aluminum.elasticModulus, allowableStress: MATERIALS.aluminum.allowableStress },
      wood: { elasticModulus: MATERIALS.wood.elasticModulus, allowableStress: MATERIALS.wood.allowableStress },
    };

    const result = solveTruss(nodes, members, materialProps, loads);

    let maxDeflection = 0;
    for (const nid of Object.keys(result.nodeDisplacements)) {
      const d = result.nodeDisplacements[nid];
      const defl = Math.sqrt(d.dx * d.dx + d.dy * d.dy);
      if (defl > maxDeflection) maxDeflection = defl;
    }

    const overloaded: string[] = [];
    const failed: string[] = [];
    const forces: Record<string, number> = {};
    const reasons: Record<string, string> = {};

    for (const m of members) {
      const force = result.memberForces[m.id] || 0;
      const mat = MATERIALS[m.materialType];
      const stressRatio = computeStressRatio(force, m.crossSection, mat.allowableStress);
      forces[m.id] = force;

      if (stressRatio > 1.0) {
        overloaded.push(m.id);
        reasons[m.id] = getOverloadReason(force, stressRatio, m.crossSection, mat.allowableStress) || '过载';
        if (stressRatio > 1.5) {
          failed.push(m.id);
        }
      }
    }

    if (overloaded.length > 0) {
      const firstOverloadMember = members.find((m) => m.id === overloaded[0]);
      const overloadEvt: OverloadEvent = {
        memberIds: overloaded,
        vehiclePosition: newPos,
        forces,
        reasons,
      };

      set({
        vehiclePosition: newPos,
        overloadDisplay: {
          memberId: overloaded[0],
          reason: reasons[overloaded[0]],
          force: forces[overloaded[0]],
          stressRatio: computeStressRatio(
            forces[overloaded[0]],
            firstOverloadMember?.crossSection || 5,
            MATERIALS[firstOverloadMember?.materialType || 'steel'].allowableStress
          ),
          vehiclePosition: newPos,
        },
      });

      const existingResult = get().testResult;
      const overloadEvents = [...(existingResult?.overloadEvents || []), overloadEvt];
      set({
        testResult: {
          vehicleCompleted: false,
          overloadedMemberIds: [...new Set([...(existingResult?.overloadedMemberIds || []), ...overloaded])],
          failedMemberIds: [...new Set([...(existingResult?.failedMemberIds || []), ...failed])],
          maxDeflection: Math.max(existingResult?.maxDeflection || 0, maxDeflection),
          overloadEvents,
          structuralIntegrityScore: 0,
          budgetEfficiencyScore: 0,
          totalScore: 0,
        },
      });
      return;
    }

    const existingResult = get().testResult;
    set({
      vehiclePosition: newPos,
      testResult: {
        vehicleCompleted: true,
        overloadedMemberIds: existingResult?.overloadedMemberIds || [],
        failedMemberIds: existingResult?.failedMemberIds || [],
        maxDeflection: Math.max(existingResult?.maxDeflection || 0, maxDeflection),
        overloadEvents: existingResult?.overloadEvents || [],
        structuralIntegrityScore: 0,
        budgetEfficiencyScore: 0,
        totalScore: 0,
      },
    });
  },

  dismissOverload: () => {
    const testResult = get().testResult;
    if (testResult && testResult.failedMemberIds.length > 0) {
      finishTest(get, set);
      return;
    }
    set({ overloadDisplay: null });
  },

  setTeacherMode: (v) => set({ teacherMode: v }),
  setReviewStep: (step) => set({ reviewStep: step }),
}));

function finishTest(
  get: () => GameState,
  set: (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void
) {
  const { testResult, budget, budgetUsed } = get();
  if (!testResult) return;

  const integrityScore = testResult.failedMemberIds.length > 0
    ? 0
    : testResult.overloadedMemberIds.length > 0
      ? Math.max(0, 60 - testResult.overloadedMemberIds.length * 10)
      : 100;

  const efficiencyScore = budgetUsed <= budget
    ? Math.round((budgetUsed / budget) * 100)
    : Math.max(0, 100 - (budgetUsed - budget));

  const totalScore = Math.round(integrityScore * 0.7 + efficiencyScore * 0.3);

  set({
    isTestRunning: false,
    phase: 'review',
    testResult: {
      ...testResult,
      structuralIntegrityScore: integrityScore,
      budgetEfficiencyScore: efficiencyScore,
      totalScore,
    },
    overloadDisplay: null,
  });

  doRecordAction('LOAD_TEST', { totalScore, integrityScore, efficiencyScore },
    totalScore >= 80 ? '测试通过，结构安全' : totalScore >= 50 ? '测试完成，存在过载' : '测试失败，结构破坏');
}
