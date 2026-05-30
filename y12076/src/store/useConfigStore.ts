import { create } from 'zustand';
import { MagnetConfig, FieldLineParams, ConfigConflict, IssueReport, InteractionState, EditorSource } from '../types';

interface ConfigState {
  magnets: MagnetConfig[];
  fieldLineParams: FieldLineParams;
  conflicts: ConfigConflict[];
  issues: IssueReport[];
  interaction: InteractionState;
  fieldLineVersion: number;
  
  addMagnet: (magnet: Omit<MagnetConfig, 'id' | 'lastModifiedAt'>) => void;
  updateMagnet: (id: string, updates: Partial<MagnetConfig>, source: EditorSource) => void;
  reversePole: (id: string) => void;
  updateFieldLineParams: (params: Partial<FieldLineParams>) => void;
  addConflict: (conflict: Omit<ConfigConflict, 'id'>) => void;
  resolveConflict: (conflictId: string, resolution: 'keep-A' | 'keep-B' | 'merge') => void;
  addIssue: (issue: Omit<IssueReport, 'id'>) => void;
  clearIssue: (issueId: string) => void;
  setInteraction: (state: Partial<InteractionState>) => void;
  resetAll: () => void;
  triggerFieldLineRegeneration: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const defaultMagnet: MagnetConfig = {
  id: 'magnet-1',
  position: { x: 0, y: 0, z: 0 },
  poleDirection: 'N',
  rotation: { x: 0, y: 0, z: 0 },
  strength: 1.0,
  lastModifiedBy: 'user',
  lastModifiedAt: Date.now(),
};

const defaultParams: FieldLineParams = {
  sampleDensity: 5,
  maxFieldStrength: 100,
  lineCount: 20,
  maxLength: 200,
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  magnets: [defaultMagnet],
  fieldLineParams: defaultParams,
  conflicts: [],
  issues: [],
  interaction: {
    isDragging: false,
    isPaused: false,
    isPlaying: false,
    currentTime: 0,
    dragTarget: null,
  },
  fieldLineVersion: 0,

  addMagnet: (magnet) => set((state) => ({
    magnets: [...state.magnets, { ...magnet, id: generateId(), lastModifiedAt: Date.now() }],
  })),

  updateMagnet: (id, updates, source) => set((state) => {
    const magnet = state.magnets.find(m => m.id === id);
    if (!magnet) return state;

    const newMagnet = { 
      ...magnet, 
      ...updates, 
      lastModifiedBy: source,
      lastModifiedAt: Date.now() 
    };

    const conflicts: ConfigConflict[] = [];
    
    if (magnet.lastModifiedBy !== source && 
        magnet.lastModifiedBy !== undefined && 
        source !== 'user') {
      if ((magnet.lastModifiedBy === 'position-editor' && source === 'pole-editor') ||
          (magnet.lastModifiedBy === 'pole-editor' && source === 'position-editor')) {
        conflicts.push({
          id: generateId(),
          type: 'position-vs-pole',
          magnetId: id,
          description: '磁体位置和磁极方向由不同人员编辑，可能存在配置不一致',
          sideA: {
            source: magnet.lastModifiedBy === 'position-editor' ? '磁体位置维护者' : '磁极方向维护者',
            value: magnet.lastModifiedBy === 'position-editor' ? magnet.position : magnet.poleDirection,
            timestamp: magnet.lastModifiedAt,
          },
          sideB: {
            source: source === 'position-editor' ? '磁体位置维护者' : '磁极方向维护者',
            value: source === 'position-editor' ? updates.position : updates.poleDirection,
            timestamp: Date.now(),
          },
          resolved: false,
        });
      }
    }

    return {
      magnets: state.magnets.map(m => m.id === id ? newMagnet : m),
      conflicts: [...state.conflicts, ...conflicts],
      fieldLineVersion: state.fieldLineVersion + 1,
    };
  }),

  reversePole: (id) => set((state) => {
    const magnet = state.magnets.find(m => m.id === id);
    if (!magnet) return state;

    const newDirection = magnet.poleDirection === 'N' ? 'S' : 'N';

    return {
      magnets: state.magnets.map(m => 
        m.id === id 
          ? { 
              ...m, 
              poleDirection: newDirection,
              rotation: { 
                ...m.rotation, 
                y: m.rotation.y + Math.PI 
              },
              lastModifiedBy: 'user',
              lastModifiedAt: Date.now() 
            } 
          : m
      ),
      fieldLineVersion: state.fieldLineVersion + 1,
    };
  }),

  updateFieldLineParams: (params) => set((state) => {
    const newParams = { ...state.fieldLineParams, ...params };
    const issues: IssueReport[] = [];

    if (newParams.sampleDensity > 8) {
      issues.push({
        id: generateId(),
        type: 'sample-too-dense',
        title: '采样密度过高',
        plainTextExplanation: '采样过密就像用显微镜看地图，看得太细了，电脑算不过来。',
        technicalDetails: `当前采样密度: ${newParams.sampleDensity}，建议值: 3-7。高密度会导致场线计算时间增加${(newParams.sampleDensity - 5) * 30}%。`,
        solution: '将采样密度滑块向左拉到5-7之间，教学演示用默认值5就够清楚了。',
        relatedRecords: ['field-line-performance-log-' + Date.now()],
      });
    }

    return {
      fieldLineParams: newParams,
      issues: [...state.issues, ...issues],
      fieldLineVersion: state.fieldLineVersion + 1,
    };
  }),

  addConflict: (conflict) => set((state) => ({
    conflicts: [...state.conflicts, { ...conflict, id: generateId() }],
  })),

  resolveConflict: (conflictId, resolution) => set((state) => ({
    conflicts: state.conflicts.map(c => 
      c.id === conflictId 
        ? { ...c, resolved: true, resolution } 
        : c
    ),
  })),

  addIssue: (issue) => set((state) => ({
    issues: [...state.issues, { ...issue, id: generateId() }],
  })),

  clearIssue: (issueId) => set((state) => ({
    issues: state.issues.filter(i => i.id !== issueId),
  })),

  setInteraction: (newState) => set((state) => ({
    interaction: { ...state.interaction, ...newState },
  })),

  resetAll: () => set({
    magnets: [defaultMagnet],
    fieldLineParams: defaultParams,
    conflicts: [],
    issues: [],
    interaction: {
      isDragging: false,
      isPaused: false,
      isPlaying: false,
      currentTime: 0,
      dragTarget: null,
    },
    fieldLineVersion: 0,
  }),

  triggerFieldLineRegeneration: () => set((state) => ({
    fieldLineVersion: state.fieldLineVersion + 1,
  })),
}));
