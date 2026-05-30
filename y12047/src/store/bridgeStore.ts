import { create } from 'zustand';
import type { Node, Member, BridgeVersion, RenderOptions } from '../types';
import { storageAdapter } from '../data/storageAdapter';
import { budgetCalculator } from '../engine/budgetCalculator';
import { compareVersions, generateVersionName, generateChangeLogs } from '../utils/diff';
import type { VersionDiff, ChangeLog } from '../types';

interface BridgeState {
  currentLevelId: string | null;
  currentVersionId: string | null;
  nodes: Node[];
  members: Member[];
  budget: number;
  renderOptions: RenderOptions;
  selectedMemberId: string | null;
  selectedNodeId: string | null;
  isDirty: boolean;
  versions: BridgeVersion[];
  versionDiff: VersionDiff | null;
  changeLogs: ChangeLog[];

  setCurrentLevelId: (levelId: string | null) => void;
  setCurrentVersionId: (versionId: string | null) => void;
  setNodes: (nodes: Node[]) => void;
  setMembers: (members: Member[]) => void;
  setBudget: (budget: number) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  updateMember: (memberId: string, updates: Partial<Member>) => void;
  setRenderOptions: (options: Partial<RenderOptions>) => void;
  setSelectedMemberId: (id: string | null) => void;
  setSelectedNodeId: (id: string | null) => void;
  setIsDirty: (dirty: boolean) => void;

  loadVersion: (versionId: string) => void;
  loadVersionsByLevel: (levelId: string) => void;
  saveVersion: (levelId: string, parentVersionId?: string, additionalBudget?: number) => BridgeVersion;
  createNewVersion: (
    levelId: string,
    nodes: Node[],
    members: Member[],
    budget: number,
    parentVersionId?: string
  ) => BridgeVersion;
  compareWithVersion: (versionId1: string, versionId2: string) => void;
  clearVersionDiff: () => void;

  loadFromPreset: (nodes: Node[], members: Member[], budget: number) => void;
  applyBoundaryCase: (setup: {
    nodes?: Partial<Node>[];
    members?: Partial<Member>[];
    budget?: number;
  }) => void;

  calculateTotalCost: () => number;
  checkBudgetExceeded: () => boolean;

  reset: () => void;
}

export const useBridgeStore = create<BridgeState>((set, get) => ({
  currentLevelId: null,
  currentVersionId: null,
  nodes: [],
  members: [],
  budget: 0,
  renderOptions: {
    showDeformation: true,
    deformationScale: 10,
    showForces: true,
    showStressColors: true,
    showLabels: true,
  },
  selectedMemberId: null,
  selectedNodeId: null,
  isDirty: false,
  versions: [],
  versionDiff: null,
  changeLogs: [],

  setCurrentLevelId: (levelId) => set({ currentLevelId: levelId }),
  setCurrentVersionId: (versionId) => set({ currentVersionId: versionId }),
  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setMembers: (members) => set({ members, isDirty: true }),
  setBudget: (budget) => set({ budget, isDirty: true }),

  updateNode: (nodeId, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates } : n
      ),
      isDirty: true,
    })),

  updateMember: (memberId, updates) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId ? { ...m, ...updates } : m
      ),
      isDirty: true,
    })),

  setRenderOptions: (options) =>
    set((state) => ({
      renderOptions: { ...state.renderOptions, ...options },
    })),

  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),

  loadVersion: (versionId) => {
    const version = storageAdapter.getVersionById(versionId);
    if (version) {
      set({
        currentVersionId: versionId,
        nodes: version.nodes,
        members: version.members,
        budget: version.budget,
        isDirty: false,
      });
    }
  },

  loadVersionsByLevel: (levelId) => {
    const versions = storageAdapter.getVersionsByLevelId(levelId);
    set({ versions });
  },

  saveVersion: (levelId, parentVersionId, additionalBudget = 0) => {
    const { nodes, members, budget: currentBudget } = get();
    const newBudget = currentBudget + additionalBudget;
    return get().createNewVersion(levelId, nodes, members, newBudget, parentVersionId);
  },

  createNewVersion: (levelId, nodes, members, budget, parentVersionId) => {
    const versionNumber = storageAdapter.getNextVersionNumber(levelId);
    const currentUser = storageAdapter.getCurrentUser();
    
    const baseName = parentVersionId
      ? storageAdapter.getVersionById(parentVersionId)?.name.split(' V')[0] || '桥梁设计'
      : '桥梁设计';

    const version: BridgeVersion = {
      id: storageAdapter.generateId('v-'),
      levelId,
      versionNumber,
      parentVersionId,
      name: generateVersionName(baseName, versionNumber),
      budget,
      changeDescription: '',
      createdAt: new Date().toISOString(),
      createdBy: currentUser,
      nodes: JSON.parse(JSON.stringify(nodes)),
      members: JSON.parse(JSON.stringify(members)),
    };

    if (parentVersionId) {
      const parentVersion = storageAdapter.getVersionById(parentVersionId);
      if (parentVersion) {
        const diff = compareVersions(parentVersion, version);
        version.changeDescription = diff.description;
        
        const logs = generateChangeLogs(parentVersion, version);
        logs.forEach((log) => storageAdapter.saveChangeLog(log));
        
        set({ versionDiff: diff, changeLogs: logs });
      }
    }

    storageAdapter.saveVersion(version);
    
    const versions = storageAdapter.getVersionsByLevelId(levelId);
    set({
      versions,
      currentVersionId: version.id,
      isDirty: false,
    });

    return version;
  },

  compareWithVersion: (versionId1, versionId2) => {
    const v1 = storageAdapter.getVersionById(versionId1);
    const v2 = storageAdapter.getVersionById(versionId2);
    
    if (v1 && v2) {
      const diff = compareVersions(v1, v2);
      const logs = generateChangeLogs(v1, v2);
      set({ versionDiff: diff, changeLogs: logs });
    }
  },

  clearVersionDiff: () => set({ versionDiff: null, changeLogs: [] }),

  loadFromPreset: (nodes, members, budget) => {
    set({
      nodes: JSON.parse(JSON.stringify(nodes)),
      members: JSON.parse(JSON.stringify(members)),
      budget,
      isDirty: true,
    });
  },

  applyBoundaryCase: (setup) => {
    const { nodes: currentNodes, members: currentMembers, budget: currentBudget } = get();
    
    let newNodes = [...currentNodes];
    let newMembers = [...currentMembers];
    let newBudget = currentBudget;

    if (setup.nodes) {
      for (const nodeUpdate of setup.nodes) {
        if (nodeUpdate.id) {
          newNodes = newNodes.map((n) =>
            n.id === nodeUpdate.id ? { ...n, ...nodeUpdate } : n
          );
        }
      }
    }

    if (setup.members) {
      for (const memberUpdate of setup.members) {
        if (memberUpdate.id) {
          newMembers = newMembers.map((m) =>
            m.id === memberUpdate.id ? { ...m, ...memberUpdate } : m
          );
        }
      }
    }

    if (setup.budget !== undefined) {
      newBudget = setup.budget;
    }

    set({
      nodes: newNodes,
      members: newMembers,
      budget: newBudget,
      isDirty: true,
    });
  },

  calculateTotalCost: () => {
    const { nodes, members } = get();
    return budgetCalculator.calculateTotalCost(members, nodes);
  },

  checkBudgetExceeded: () => {
    const { nodes, members, budget } = get();
    return budgetCalculator.checkBudgetExceeded(members, nodes, budget);
  },

  reset: () => {
    set({
      currentLevelId: null,
      currentVersionId: null,
      nodes: [],
      members: [],
      budget: 0,
      selectedMemberId: null,
      selectedNodeId: null,
      isDirty: false,
      versions: [],
      versionDiff: null,
      changeLogs: [],
    });
  },
}));
