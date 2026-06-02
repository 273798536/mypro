import { create } from 'zustand';
import type { AppState, AppActions, OrganModel, DoseGrid, DoctorNote, DetectionIssue, ScreenshotRecord, OperationLog } from '../types';
import { mockOrgans, mockDoses, mockNotes, mockIssues, mockScreenshots, mockLogs } from '../data/mockData';

type AppStore = AppState & AppActions;

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useAppStore = create<AppStore>((set, get) => ({
  organs: mockOrgans,
  doses: mockDoses,
  notes: mockNotes,
  issues: mockIssues,
  screenshots: mockScreenshots,
  comparisons: [],
  logs: mockLogs,
  selectedOrganId: null,
  selectedDoseId: null,
  activeTab: 'workspace',
  isComparisonMode: false,
  comparisonOrganA: null,
  comparisonOrganB: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleOrganVisibility: (id) => set((state) => ({
    organs: state.organs.map((o) =>
      o.id === id ? { ...o, visible: !o.visible } : o
    ),
  })),

  setOrganOpacity: (id, opacity) => set((state) => ({
    organs: state.organs.map((o) =>
      o.id === id ? { ...o, opacity } : o
    ),
  })),

  toggleDoseVisibility: (id) => set((state) => ({
    doses: state.doses.map((d) =>
      d.id === id ? { ...d, visible: !d.visible } : d
    ),
  })),

  setDoseOpacity: (id, opacity) => set((state) => ({
    doses: state.doses.map((d) =>
      d.id === id ? { ...d, opacity } : d
    ),
  })),

  setDoseThreshold: (id, threshold) => set((state) => ({
    doses: state.doses.map((d) =>
      d.id === id ? { ...d, threshold } : d
    ),
  })),

  selectOrgan: (id) => set({ selectedOrganId: id }),

  selectDose: (id) => set({ selectedDoseId: id }),

  addOrgan: (organ) => {
    const newOrgan: OrganModel = { ...organ, id: `organ-${generateId()}` };
    set((state) => ({
      organs: [...state.organs, newOrgan],
    }));
    get().addLog({
      type: 'import',
      description: `导入${organ.name} ${organ.version}`,
      organIds: [newOrgan.id],
      doseIds: [],
      userId: 'current-user',
      userName: '当前用户',
      timestamp: new Date(),
    });
  },

  addDose: (dose) => {
    const newDose: DoseGrid = { ...dose, id: `dose-${generateId()}` };
    set((state) => ({
      doses: [...state.doses, newDose],
    }));
    get().addLog({
      type: 'import',
      description: `导入${dose.name}`,
      organIds: [dose.organId],
      doseIds: [newDose.id],
      userId: 'current-user',
      userName: '当前用户',
      timestamp: new Date(),
    });
  },

  addNote: (note) => {
    const newNote: DoctorNote = { ...note, id: `note-${generateId()}` };
    set((state) => ({
      notes: [...state.notes, newNote],
    }));
  },

  resolveIssue: (id) => set((state) => ({
    issues: state.issues.map((i) =>
      i.id === id ? { ...i, resolved: true } : i
    ),
  })),

  addScreenshot: (screenshot) => {
    const newScreenshot: ScreenshotRecord = {
      ...screenshot,
      id: `screenshot-${generateId()}`,
    };
    set((state) => ({
      screenshots: [...state.screenshots, newScreenshot],
    }));
    get().addLog({
      type: 'screenshot',
      description: `保存截图：${screenshot.name}`,
      organIds: screenshot.organIds,
      doseIds: screenshot.doseIds,
      userId: 'current-user',
      userName: '当前用户',
      timestamp: new Date(),
    });
  },

  setComparisonMode: (enabled) => set({
    isComparisonMode: enabled,
    comparisonOrganA: enabled ? get().selectedOrganId : null,
    comparisonOrganB: null,
  }),

  setComparisonOrgans: (organA, organB) => set({
    comparisonOrganA: organA,
    comparisonOrganB: organB,
  }),

  addLog: (log) => {
    const newLog: OperationLog = { ...log, id: `log-${generateId()}` };
    set((state) => ({
      logs: [newLog, ...state.logs].slice(0, 100),
    }));
  },

  runDetection: () => {
    const state = get();
    const newIssues: DetectionIssue[] = [];

    const organGroups = new Map<string, OrganModel[]>();
    state.organs.forEach((organ) => {
      const baseName = organ.name.replace(/\(.*\)/, '').trim();
      if (!organGroups.has(baseName)) {
        organGroups.set(baseName, []);
      }
      organGroups.get(baseName)!.push(organ);
    });

    organGroups.forEach((organs, name) => {
      if (organs.length > 1) {
        const base = organs[0];
        for (let i = 1; i < organs.length; i++) {
          const compare = organs[i];
          const posDiff = Math.sqrt(
            Math.pow(compare.position[0] - base.position[0], 2) +
            Math.pow(compare.position[1] - base.position[1], 2) +
            Math.pow(compare.position[2] - base.position[2], 2)
          );
          if (posDiff > 1) {
            newIssues.push({
              id: `issue-${generateId()}`,
              type: 'misalignment',
              severity: posDiff > 3 ? 'high' : posDiff > 2 ? 'medium' : 'low',
              organId: compare.id,
              versionA: base.version,
              versionB: compare.version,
              description: `${name}${compare.version}相对于${base.version}存在${posDiff.toFixed(1)}mm位移偏移`,
              position: compare.position,
              value: posDiff,
              threshold: 1.0,
              detectedTime: new Date(),
              resolved: false,
            });
          }
        }
      }
    });

    state.doses.forEach((dose) => {
      if (dose.maxDose > dose.threshold) {
        const organ = state.organs.find((o) => o.id === dose.organId);
        newIssues.push({
          id: `issue-${generateId()}`,
          type: 'overdose',
          severity: dose.maxDose > dose.threshold * 1.1 ? 'high' : 'medium',
          organId: dose.organId,
          doseId: dose.id,
          description: `${organ?.name || '器官'}最大剂量${dose.maxDose.toFixed(1)}Gy，超过阈值${dose.threshold}Gy`,
          value: dose.maxDose,
          threshold: dose.threshold,
          detectedTime: new Date(),
          resolved: false,
        });
      }
    });

    state.organs.forEach((organ) => {
      const organDoses = state.doses.filter((d) => d.organId === organ.id);
      organDoses.forEach((dose) => {
        if (organ.version !== dose.version) {
          const existingConflict = state.issues.find(
            (i) => i.type === 'version_conflict' && i.organId === organ.id && i.doseId === dose.id
          );
          if (!existingConflict) {
            newIssues.push({
              id: `issue-${generateId()}`,
              type: 'version_conflict',
              severity: 'low',
              organId: organ.id,
              doseId: dose.id,
              versionA: organ.version,
              versionB: dose.version,
              description: `${organ.name}版本${organ.version}与剂量版本${dose.version}不匹配`,
              detectedTime: new Date(),
              resolved: false,
            });
          }
        }
      });
    });

    set((prevState) => ({
      issues: [...prevState.issues, ...newIssues],
    }));

    get().addLog({
      type: 'detect',
      description: `运行问题检测，发现${newIssues.length}个新问题`,
      organIds: [],
      doseIds: [],
      userId: 'current-user',
      userName: '当前用户',
      timestamp: new Date(),
    });
  },
}));
