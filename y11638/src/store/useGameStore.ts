import { create } from 'zustand';
import {
  Node,
  Member,
  Material,
  Level,
  GameSession,
  ReplayFrame,
  ImportStrategy,
  ImportLogEntry,
  ToolMode,
  FailureReason
} from '../types';
import { defaultMaterials } from '../data/materials';
import { levels as defaultLevels } from '../data/levels';
import { vehicles } from '../data/vehicles';

interface GameState {
  levels: Level[];
  currentLevel: Level | null;
  currentLevelId: string | null;
  
  nodes: Node[];
  members: Member[];
  selectedMaterial: string | null;
  selectedNode: string | null;
  hoveredNode: string | null;
  totalCost: number;
  windSetting: number;
  toolMode: ToolMode;
  
  materials: Material[];
  importHistory: ImportLogEntry[];
  
  isSimulating: boolean;
  simulationTime: number;
  vehicleProgress: number;
  currentVehicleIndex: number;
  maxStressThisSim: number;
  simWarnings: string[];
  
  currentSession: GameSession | null;
  sessions: GameSession[];
  replayFrames: ReplayFrame[];
  isReplaying: boolean;
  replayIndex: number;
  
  hasFailed: boolean;
  failureReason: FailureReason | null;
  failureMessage: string | null;
  failureMemberId: string | null;
  
  budgetWarnings: string[];
  
  showImportDialog: boolean;
  showResultPanel: boolean;
  
  setCurrentLevel: (id: string | null) => void;
  resetLevel: () => void;
  
  addNode: (x: number, y: number, isDeck?: boolean, isAnchor?: boolean) => string;
  selectNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  moveNode: (id: string, x: number, y: number) => void;
  deleteNode: (id: string) => void;
  
  connectNodes: (startId: string, endId: string) => boolean;
  deleteMember: (id: string) => void;
  
  setSelectedMaterial: (id: string | null) => void;
  setToolMode: (mode: ToolMode) => void;
  setWindSetting: (level: number) => void;
  
  importMaterials: (data: Material[], strategy: ImportStrategy, source?: string) => ImportLogEntry[];
  exportMaterials: () => Material[];
  setShowImportDialog: (show: boolean) => void;
  
  startSimulation: () => void;
  updateSimulation: (
    time: number,
    progress: number,
    vehicleIndex: number,
    stresses: { [memberId: string]: number },
    nodePositions: { [nodeId: string]: { x: number; y: number } },
    warnings: string[]
  ) => void;
  endSimulation: (success: boolean, reason?: FailureReason, message?: string, memberId?: string) => void;
  setShowResultPanel: (show: boolean) => void;
  
  startReplay: (sessionId: string) => void;
  stopReplay: () => void;
  setReplayIndex: (index: number) => void;
  
  exportResults: (sessionId: string, format: 'csv' | 'json') => string;
  deleteSession: (sessionId: string) => void;
  
  calculateScore: () => number;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const calculateMemberLength = (n1: Node, n2: Node) => {
  return Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2));
};

const calculateTotalCost = (members: Member[], materials: Material[], nodes: Node[]) => {
  let cost = 0;
  members.forEach(m => {
    const mat = materials.find(mat => mat.id === m.materialId);
    const start = nodes.find(n => n.id === m.startNodeId);
    const end = nodes.find(n => n.id === m.endNodeId);
    if (mat && start && end) {
      const length = calculateMemberLength(start, end) / 50;
      cost += mat.costPerMeter * length;
    }
  });
  return Math.round(cost);
};

export const useGameStore = create<GameState>((set, get) => ({
  levels: defaultLevels,
  currentLevel: null,
  currentLevelId: null,
  
  nodes: [],
  members: [],
  selectedMaterial: null,
  selectedNode: null,
  hoveredNode: null,
  totalCost: 0,
  windSetting: 0,
  toolMode: 'connect',
  
  materials: [...defaultMaterials],
  importHistory: [],
  
  isSimulating: false,
  simulationTime: 0,
  vehicleProgress: 0,
  currentVehicleIndex: 0,
  maxStressThisSim: 0,
  simWarnings: [],
  
  currentSession: null,
  sessions: [],
  replayFrames: [],
  isReplaying: false,
  replayIndex: 0,
  
  hasFailed: false,
  failureReason: null,
  failureMessage: null,
  failureMemberId: null,
  
  budgetWarnings: [],
  
  showImportDialog: false,
  showResultPanel: false,
  
  setCurrentLevel: (id) => {
    if (!id) {
      set({ currentLevel: null, currentLevelId: null });
      get().resetLevel();
      return;
    }
    const level = get().levels.find(l => l.id === id);
    if (level) {
      set({ currentLevel: level, currentLevelId: id });
      get().resetLevel();
    }
  },
  
  resetLevel: () => {
    const level = get().currentLevel;
    if (!level) return;
    
    const nodes: Node[] = level.anchors.map((a, i) => ({
      id: `anchor_${i}`,
      x: a.x,
      y: a.y,
      isAnchor: true,
      isDeck: true
    }));
    
    set({
      nodes,
      members: [],
      selectedNode: null,
      hoveredNode: null,
      totalCost: 0,
      windSetting: level.windLoad,
      isSimulating: false,
      simulationTime: 0,
      vehicleProgress: 0,
      currentVehicleIndex: 0,
      maxStressThisSim: 0,
      simWarnings: [],
      hasFailed: false,
      failureReason: null,
      failureMessage: null,
      failureMemberId: null,
      budgetWarnings: [],
      showResultPanel: false,
      isReplaying: false,
      replayIndex: 0,
      replayFrames: []
    });
  },
  
  addNode: (x, y, isDeck = false, isAnchor = false) => {
    const id = generateId();
    const newNode: Node = { id, x, y, isAnchor, isDeck };
    set(state => ({ nodes: [...state.nodes, newNode] }));
    return id;
  },
  
  selectNode: (id) => set({ selectedNode: id }),
  setHoveredNode: (id) => set({ hoveredNode: id }),
  
  moveNode: (id, x, y) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, x, y } : n)
    }));
    set(state => ({ totalCost: calculateTotalCost(state.members, state.materials, state.nodes) }));
  },
  
  deleteNode: (id) => {
    const node = get().nodes.find(n => n.id === id);
    if (!node || node.isAnchor) return;
    
    set(state => {
      const newNodes = state.nodes.filter(n => n.id !== id);
      const newMembers = state.members.filter(m => m.startNodeId !== id && m.endNodeId !== id);
      return {
        nodes: newNodes,
        members: newMembers,
        selectedNode: state.selectedNode === id ? null : state.selectedNode,
        totalCost: calculateTotalCost(newMembers, state.materials, newNodes)
      };
    });
  },
  
  connectNodes: (startId, endId) => {
    if (startId === endId) return false;
    
    const state = get();
    const materialId = state.selectedMaterial || state.materials[0]?.id;
    if (!materialId) return false;
    
    const exists = state.members.some(m =>
      (m.startNodeId === startId && m.endNodeId === endId) ||
      (m.startNodeId === endId && m.endNodeId === startId)
    );
    if (exists) return false;
    
    const material = state.materials.find(m => m.id === materialId);
    if (!material) return false;
    
    const startNode = state.nodes.find(n => n.id === startId);
    const endNode = state.nodes.find(n => n.id === endId);
    if (!startNode || !endNode) return false;
    
    const length = calculateMemberLength(startNode, endNode) / 50;
    const memberCost = material.costPerMeter * length;
    
    if (state.totalCost + memberCost > (state.currentLevel?.budget || 0)) {
      const budget = state.currentLevel?.budget || 0;
      const msg = `预算超支！添加此杆件需 ${Math.round(memberCost)} 元，剩余预算仅 ${budget - state.totalCost} 元`;
      set({ budgetWarnings: [...state.budgetWarnings, msg] });
      return false;
    }
    
    const newMember: Member = {
      id: generateId(),
      startNodeId: startId,
      endNodeId: endId,
      materialId,
      stress: 0,
      maxStress: material.maxCompression,
      broken: false
    };
    
    set(state => {
      const newMembers = [...state.members, newMember];
      return {
        members: newMembers,
        totalCost: calculateTotalCost(newMembers, state.materials, state.nodes)
      };
    });
    
    return true;
  },
  
  deleteMember: (id) => {
    set(state => {
      const newMembers = state.members.filter(m => m.id !== id);
      return {
        members: newMembers,
        totalCost: calculateTotalCost(newMembers, state.materials, state.nodes)
      };
    });
  },
  
  setSelectedMaterial: (id) => set({ selectedMaterial: id }),
  setToolMode: (mode) => set({ toolMode: mode }),
  setWindSetting: (level) => set({ windSetting: Math.max(0, Math.min(3, level)) }),
  
  importMaterials: (data, strategy, source) => {
    const state = get();
    const logs: ImportLogEntry[] = [];
    const now = Date.now();
    
    let newMaterials = [...state.materials];
    
    data.forEach(mat => {
      const existingIndex = newMaterials.findIndex(m => m.id === mat.id);
      const existing = existingIndex >= 0 ? newMaterials[existingIndex] : null;
      
      const newMat: Material = {
        ...mat,
        source: source || mat.source || '导入',
        importedAt: now,
        revision: existing ? (existing.revision || 1) + 1 : 1
      };
      
      let action: ImportLogEntry['action'];
      
      if (existing) {
        if (strategy === 'ignore') {
          action = 'ignored';
        } else if (strategy === 'overwrite') {
          newMaterials[existingIndex] = newMat;
          action = 'overwritten';
        } else {
          const altId = `${mat.id}_${now}`;
          newMaterials.push({ ...newMat, id: altId, name: `${mat.name} (导入)` });
          action = 'appended';
        }
      } else {
        newMaterials.push(newMat);
        action = 'appended';
      }
      
      logs.push({
        materialId: existing ? mat.id : (action === 'appended' ? newMat.id : mat.id),
        action,
        timestamp: now,
        previousSource: existing?.source,
        newSource: newMat.source
      });
    });
    
    set({
      materials: newMaterials,
      importHistory: [...state.importHistory, ...logs]
    });
    
    return logs;
  },
  
  exportMaterials: () => {
    return get().materials;
  },
  
  setShowImportDialog: (show) => set({ showImportDialog: show }),
  
  startSimulation: () => {
    const state = get();
    if (state.members.length === 0) return;
    
    const session: GameSession = {
      id: generateId(),
      levelId: state.currentLevelId!,
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      members: JSON.parse(JSON.stringify(state.members)),
      totalCost: state.totalCost,
      windSetting: state.windSetting,
      startTime: Date.now(),
      success: false,
      replayData: [],
      maxStressRecorded: 0,
      warnings: []
    };
    
    set({
      isSimulating: true,
      simulationTime: 0,
      vehicleProgress: 0,
      currentVehicleIndex: 0,
      maxStressThisSim: 0,
      simWarnings: [],
      hasFailed: false,
      failureReason: null,
      failureMessage: null,
      failureMemberId: null,
      currentSession: session,
      replayFrames: [],
      isReplaying: false
    });
  },
  
  updateSimulation: (time, progress, vehicleIndex, stresses, nodePositions, warnings) => {
    const state = get();
    if (!state.isSimulating) return;
    
    const members = state.members.map(m => ({
      ...m,
      stress: stresses[m.id] || 0,
      broken: stresses[m.id] !== undefined && Math.abs(stresses[m.id]) > m.maxStress
    }));
    
    const maxStress = Math.max(state.maxStressThisSim, ...Object.values(stresses).map(s => Math.abs(s)));
    
    const frame: ReplayFrame = {
      timestamp: time,
      nodePositions,
      memberStresses: stresses,
      vehiclePosition: progress,
      budgetUsed: state.totalCost,
      warnings
    };
    
    set({
      simulationTime: time,
      vehicleProgress: progress,
      currentVehicleIndex: vehicleIndex,
      maxStressThisSim: maxStress,
      simWarnings: warnings,
      members,
      replayFrames: [...state.replayFrames, frame]
    });
  },
  
  endSimulation: (success, reason, message, memberId) => {
    const state = get();
    
    const session = state.currentSession;
    if (session) {
      const score = success ? get().calculateScore() : 0;
      let stars = 0;
      if (score >= 1500) stars = 3;
      else if (score >= 1200) stars = 2;
      else if (score >= 900) stars = 1;
      
      const updatedSession: GameSession = {
        ...session,
        endTime: Date.now(),
        success,
        failureReason: reason,
        failureMessage: message,
        failureMemberId: memberId,
        score,
        stars,
        replayData: state.replayFrames,
        maxStressRecorded: state.maxStressThisSim,
        warnings: state.simWarnings
      };
      
      set({
        isSimulating: false,
        hasFailed: !success,
        failureReason: reason || null,
        failureMessage: message || null,
        failureMemberId: memberId || null,
        currentSession: updatedSession,
        sessions: [...state.sessions, updatedSession],
        showResultPanel: true
      });
    } else {
      set({
        isSimulating: false,
        hasFailed: !success,
        failureReason: reason || null,
        failureMessage: message || null,
        failureMemberId: memberId || null
      });
    }
  },
  
  setShowResultPanel: (show) => set({ showResultPanel: show }),
  
  startReplay: (sessionId) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    set({
      currentSession: session,
      replayFrames: session.replayData,
      isReplaying: true,
      replayIndex: 0
    });
  },
  
  stopReplay: () => {
    set({ isReplaying: false, replayIndex: 0 });
  },
  
  setReplayIndex: (index) => set({ replayIndex: Math.max(0, Math.min(index, get().replayFrames.length - 1)) }),
  
  exportResults: (sessionId, format) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session) return '';
    
    const level = get().levels.find(l => l.id === session.levelId);
    const vehicleList = level?.vehicles.map(vid => vehicles.find(v => v.id === vid)?.name || vid).join(', ');
    
    if (format === 'json') {
      return JSON.stringify({
        level: level?.name,
        success: session.success,
        score: session.score,
        stars: session.stars,
        totalCost: session.totalCost,
        budget: level?.budget,
        windSetting: session.windSetting,
        vehicles: vehicleList,
        maxStress: session.maxStressRecorded,
        duration: session.endTime ? (session.endTime - session.startTime) / 1000 : 0,
        failureReason: session.failureReason,
        failureMessage: session.failureMessage,
        warnings: session.warnings,
        members: session.members.map(m => ({
          material: get().materials.find(mat => mat.id === m.materialId)?.name,
          maxStress: Math.max(...session.replayData.map(f => Math.abs(f.memberStresses[m.id] || 0))).toFixed(2)
        }))
      }, null, 2);
    } else {
      const lines = [
        '桥梁受力搭建赛 - 成绩报告',
        `关卡: ${level?.name}`,
        `结果: ${session.success ? '通过' : '失败'}`,
        `得分: ${session.score}`,
        `星级: ${'★'.repeat(session.stars || 0)}${'☆'.repeat(3 - (session.stars || 0))}`,
        `花费: ${session.totalCost} / ${level?.budget}`,
        `风载等级: ${session.windSetting}`,
        `测试车辆: ${vehicleList}`,
        `最大应力: ${session.maxStressRecorded.toFixed(2)}`,
        `用时: ${session.endTime ? ((session.endTime - session.startTime) / 1000).toFixed(1) : 0}秒`,
        '',
        '失败原因:',
        session.failureMessage || '无',
        '',
        '警告信息:',
        session.warnings.length > 0 ? session.warnings.join('\n') : '无',
        '',
        '杆件受力统计:',
        '材料,最大应力'
      ];
      
      session.members.forEach(m => {
        const matName = get().materials.find(mat => mat.id === m.materialId)?.name || '未知';
        const maxS = Math.max(...session.replayData.map(f => Math.abs(f.memberStresses[m.id] || 0))).toFixed(2);
        lines.push(`${matName},${maxS}`);
      });
      
      return lines.join('\n');
    }
  },
  
  deleteSession: (sessionId) => {
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      currentSession: state.currentSession?.id === sessionId ? null : state.currentSession
    }));
  },
  
  calculateScore: () => {
    const state = get();
    const level = state.currentLevel;
    if (!level) return 0;
    
    const baseScore = 1000;
    const budgetBonus = Math.max(0, (level.budget - state.totalCost) / level.budget * 500);
    
    let stressPenalty = 0;
    const maxStressRatio = state.maxStressThisSim / Math.min(...state.materials.map(m => m.maxCompression));
    if (maxStressRatio > 0.8) stressPenalty = 200;
    else if (maxStressRatio > 0.6) stressPenalty = 100;
    
    const warningPenalty = state.simWarnings.length * 20;
    
    const session = state.currentSession;
    let timeBonus = 0;
    if (session && session.endTime) {
      const duration = (session.endTime - session.startTime) / 1000;
      const standardTime = 60;
      timeBonus = Math.max(0, (1 - duration / standardTime) * 200);
    }
    
    return Math.round(baseScore + budgetBonus + timeBonus - stressPenalty - warningPenalty);
  }
}));
