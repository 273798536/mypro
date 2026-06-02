import { create } from 'zustand';
import type {
  StageModel,
  SmokeMachine,
  StageLight,
  WindConfig,
  SmokeParticle,
  Issue,
  IssueType,
  IssueSeverity,
  IssueStatus,
  EffectReport,
  FilterState,
  PlaybackState,
  ValidationResult,
  ExportState,
  Vector3,
  VisibilitySample,
  AuditLogEntry,
} from '../types';
import {
  sampleStage,
  sampleSmokeMachines,
  sampleLights,
  sampleWindConfigs,
  sampleIssues,
  sampleReports,
  generateId,
} from '../data/sampleData';

interface StageState {
  stage: StageModel;
  smokeMachines: SmokeMachine[];
  lights: StageLight[];
  windConfigs: WindConfig[];
  particles: SmokeParticle[];
  issues: Issue[];
  reports: EffectReport[];
  visibilitySamples: VisibilitySample[];
  auditLog: AuditLogEntry[];
  filters: FilterState;
  playback: PlaybackState;
  validation: ValidationResult | null;
  exportState: ExportState;
  selectedObjectId: string | null;
  selectedObjectType: string | null;
  activeTab: 'issues' | 'machines' | 'lights' | 'reports' | 'validation';
}

interface StageActions {
  setPlaybackTime: (time: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleFilter: (key: keyof FilterState, value?: unknown) => void;
  setVisibilityThreshold: (threshold: number) => void;
  setTimeRange: (start: number, end: number) => void;
  selectObject: (id: string | null, type: string | null) => void;
  setActiveTab: (tab: StageState['activeTab']) => void;
  updateIssueStatus: (issueId: string, status: IssueStatus, notes?: string) => void;
  addIssue: (issue: Omit<Issue, 'id' | 'detectedAt'>) => void;
  toggleSmokeMachine: (id: string) => void;
  toggleLight: (id: string) => void;
  updateSmokeMachine: (id: string, updates: Partial<SmokeMachine>) => void;
  updateWindConfig: (index: number, updates: Partial<WindConfig>) => void;
  updateParticles: (particles: SmokeParticle[]) => void;
  runValidation: () => ValidationResult;
  runDetection: () => Issue[];
  exportData: () => string;
  importData: (data: string) => boolean;
  generateReport: () => EffectReport;
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  toggleIssueTypeFilter: (type: IssueType) => void;
}

function vec3Add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vec3Scale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vec3Distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export const useStageStore = create<StageState & StageActions>((set, get) => ({
  stage: sampleStage,
  smokeMachines: sampleSmokeMachines,
  lights: sampleLights,
  windConfigs: sampleWindConfigs,
  particles: [],
  issues: sampleIssues,
  reports: sampleReports,
  visibilitySamples: [],
  auditLog: [],
  filters: {
    selectedObjectIds: [],
    selectedIssueTypes: [],
    timeRange: { start: 0, end: 240 },
    showSmoke: true,
    showStage: true,
    showLights: true,
    showMachines: true,
    showObstacles: true,
    showFlowArrows: false,
    visibilityThreshold: 50,
  },
  playback: {
    isPlaying: false,
    currentTime: 0,
    duration: 240,
    speed: 1,
  },
  validation: null,
  exportState: {
    lastExportData: null,
    lastExportAt: null,
    exportCount: 0,
  },
  selectedObjectId: null,
  selectedObjectType: null,
  activeTab: 'issues',

  setPlaybackTime: (time: number) => {
    const state = get();
    const clampedTime = Math.max(0, Math.min(state.playback.duration, time));
    set((prev) => ({
      playback: { ...prev.playback, currentTime: clampedTime },
    }));
  },

  togglePlayback: () => {
    set((prev) => ({
      playback: { ...prev.playback, isPlaying: !prev.playback.isPlaying },
    }));
  },

  setPlaybackSpeed: (speed: number) => {
    set((prev) => ({
      playback: { ...prev.playback, speed },
    }));
  },

  toggleFilter: (key, value) => {
    set((prev) => {
      if (typeof prev.filters[key] === 'boolean') {
        return {
          filters: {
            ...prev.filters,
            [key]: value !== undefined ? value : !prev.filters[key],
          },
        };
      }
      return prev;
    });
  },

  setVisibilityThreshold: (threshold: number) => {
    set((prev) => ({
      filters: { ...prev.filters, visibilityThreshold: threshold },
    }));
  },

  setTimeRange: (start: number, end: number) => {
    set((prev) => ({
      filters: { ...prev.filters, timeRange: { start, end } },
    }));
  },

  selectObject: (id, type) => {
    set({ selectedObjectId: id, selectedObjectType: type });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  updateIssueStatus: (issueId, status, notes) => {
    set((prev) => ({
      issues: prev.issues.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status,
              reviewedBy: 'Current User',
              reviewedAt: new Date().toISOString(),
              notes: notes || issue.notes,
            }
          : issue
      ),
    }));
    get().addAuditLog({
      action: 'update_issue_status',
      objectId: issueId,
      objectType: 'Issue',
      user: 'Current User',
      details: { status, notes },
    });
  },

  addIssue: (issue) => {
    const newIssue: Issue = {
      ...issue,
      id: generateId('issue'),
      detectedAt: new Date().toISOString(),
    };
    set((prev) => ({
      issues: [...prev.issues, newIssue],
    }));
    return newIssue;
  },

  toggleSmokeMachine: (id) => {
    set((prev) => ({
      smokeMachines: prev.smokeMachines.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    }));
  },

  toggleLight: (id) => {
    set((prev) => ({
      lights: prev.lights.map((l) =>
        l.id === id ? { ...l, enabled: !l.enabled } : l
      ),
    }));
  },

  updateSmokeMachine: (id, updates) => {
    set((prev) => ({
      smokeMachines: prev.smokeMachines.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },

  updateWindConfig: (index, updates) => {
    set((prev) => ({
      windConfigs: prev.windConfigs.map((w, i) =>
        i === index ? { ...w, ...updates } : w
      ),
    }));
  },

  updateParticles: (particles) => {
    set({ particles });
  },

  runValidation: () => {
    const state = get();
    const issues: Issue[] = [];

    const sourceMap = new Map<string, string[]>();
    [...state.smokeMachines, ...state.lights].forEach((obj) => {
      const existing = sourceMap.get(obj.source) || [];
      sourceMap.set(obj.source, [...existing, obj.id]);
    });

    let duplicateImportsOk = true;
    sourceMap.forEach((ids, source) => {
      if (ids.length > 1) {
        duplicateImportsOk = false;
        const existingIssue = state.issues.find(
          (i) => i.type === 'duplicate_import' && i.relatedObjectIds.join(',') === ids.join(',')
        );
        if (!existingIssue) {
          issues.push({
            id: generateId('issue'),
            type: 'duplicate_import' as IssueType,
            severity: 'info' as IssueSeverity,
            status: 'pending_review' as IssueStatus,
            title: '重复导入检测',
            description: `从 ${source} 导入了 ${ids.length} 个对象，请确认是否为有意配置。`,
            relatedObjectIds: ids,
            relatedObjectTypes: ids.map(() => 'SmokeMachine'),
            timestamp: state.playback.currentTime,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    });

    let abnormalRetentionOk = true;
    const now = state.playback.currentTime;
    state.smokeMachines.forEach((machine) => {
      if (machine.endTime < now - 30 && machine.endTime > 0) {
        const particlesFromMachine = state.particles.filter(
          (p) => p.sourceMachineId === machine.id && p.age > p.maxAge * 0.8
        );
        if (particlesFromMachine.length > machine.emissionRate * 0.5) {
          abnormalRetentionOk = false;
          const existingIssue = state.issues.find(
            (i) => i.type === 'abnormal_retention' && i.relatedObjectIds.includes(machine.id)
          );
          if (!existingIssue) {
            issues.push({
              id: generateId('issue'),
              type: 'abnormal_retention' as IssueType,
              severity: 'warning' as IssueSeverity,
              status: 'pending_review' as IssueStatus,
              title: '烟雾异常滞留',
              description: `烟雾机 "${machine.name}" 已关闭 ${Math.round(now - machine.endTime)} 秒，但仍有大量烟雾颗粒滞留。`,
              relatedObjectIds: [machine.id],
              relatedObjectTypes: ['SmokeMachine'],
              timestamp: now,
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }
    });

    let exportConsistencyOk = true;
    if (state.exportState.lastExportData) {
      const currentExport = JSON.stringify({
        stage: state.stage,
        smokeMachines: state.smokeMachines,
        lights: state.lights,
        windConfigs: state.windConfigs,
      });
      if (currentExport !== state.exportState.lastExportData) {
        exportConsistencyOk = false;
      }
    }

    const result: ValidationResult = {
      isValid: duplicateImportsOk && abnormalRetentionOk && exportConsistencyOk,
      issues,
      checks: {
        duplicateImports: duplicateImportsOk,
        abnormalRetention: abnormalRetentionOk,
        exportConsistency: exportConsistencyOk,
      },
    };

    if (issues.length > 0) {
      set((prev) => ({
        issues: [...prev.issues, ...issues],
        validation: result,
      }));
    } else {
      set({ validation: result });
    }

    return result;
  },

  runDetection: () => {
    const state = get();
    const detectedIssues: Issue[] = [];
    const now = state.playback.currentTime;

    const samplePositions: Vector3[] = [
      { x: 0, y: 1.5, z: 0 },
      { x: -3, y: 1.5, z: -2 },
      { x: 3, y: 1.5, z: -2 },
      { x: 0, y: 1.5, z: -4 },
      { x: 0, y: 1.5, z: 3 },
    ];

    samplePositions.forEach((pos, idx) => {
      const nearbyParticles = state.particles.filter(
        (p) => vec3Distance(p.position, pos) < 2
      );
      const density = Math.min(1, nearbyParticles.length / 50);
      const visibility = (1 - density) * 100;

      const existingSample = state.visibilitySamples.find(
        (s) => Math.abs(s.timestamp - now) < 0.1 && s.position.x === pos.x
      );
      if (!existingSample) {
        set((prev) => ({
          visibilitySamples: [
            ...prev.visibilitySamples,
            {
              timestamp: now,
              position: pos,
              visibility,
              smokeDensity: density,
            },
          ],
        }));
      }

      if (visibility < state.filters.visibilityThreshold) {
        const existingIssue = state.issues.find(
          (i) =>
            i.type === 'smoke_obstruction' &&
            Math.abs(i.timestamp - now) < 5 &&
            i.relatedObjectIds.some((id) => id.includes('smoke'))
        );
        if (!existingIssue) {
          detectedIssues.push({
            id: generateId('issue'),
            type: 'smoke_obstruction' as IssueType,
            severity: 'warning' as IssueSeverity,
            status: 'pending_review' as IssueStatus,
            title: '烟雾遮挡表演区',
            description: `采样点 ${idx + 1} 能见度仅 ${visibility.toFixed(1)}%，低于阈值 ${state.filters.visibilityThreshold}%。`,
            relatedObjectIds: state.smokeMachines.filter((m) => m.enabled && now >= m.startTime && now <= m.endTime).map((m) => m.id),
            relatedObjectTypes: state.smokeMachines.filter((m) => m.enabled).map(() => 'SmokeMachine'),
            timestamp: now,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    });

    state.windConfigs.forEach((wind, idx) => {
      if (now >= wind.startTime && now <= wind.endTime) {
        if (wind.direction.z > 0) {
          const existingIssue = state.issues.find(
            (i) => i.type === 'wind_direction_error' && i.timestamp >= wind.startTime
          );
          if (!existingIssue) {
            detectedIssues.push({
              id: generateId('issue'),
              type: 'wind_direction_error' as IssueType,
              severity: 'error' as IssueSeverity,
              status: 'pending_review' as IssueStatus,
              title: '风向设置可能反向',
              description: `风配置 ${idx + 1} 的 Z 轴分量为正 (${wind.direction.z.toFixed(2)})，指向观众席反向。`,
              relatedObjectIds: [`wind-config-${idx + 1}`],
              relatedObjectTypes: ['WindConfig'],
              timestamp: now,
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }
    });

    state.lights.forEach((light) => {
      if (!light.enabled) return;
      const lightDir = vec3Normalize({
        x: light.target.x - light.position.x,
        y: light.target.y - light.position.y,
        z: light.target.z - light.position.z,
      });
      let totalDensity = 0;
      for (let t = 0; t < 1; t += 0.1) {
        const samplePoint = {
          x: light.position.x + lightDir.x * t * 10,
          y: light.position.y + lightDir.y * t * 10,
          z: light.position.z + lightDir.z * t * 10,
        };
        const nearby = state.particles.filter(
          (p) => vec3Distance(p.position, samplePoint) < 1
        );
        totalDensity += nearby.length / 30;
      }
      if (totalDensity > 0.5) {
        const existingIssue = state.issues.find(
          (i) => i.type === 'light_penetration' && i.relatedObjectIds.includes(light.id)
        );
        if (!existingIssue) {
          detectedIssues.push({
            id: generateId('issue'),
            type: 'light_penetration' as IssueType,
            severity: 'warning' as IssueSeverity,
            status: 'pending_review' as IssueStatus,
            title: '灯光穿雾问题',
            description: `灯光 "${light.name}" 的光线路径上烟雾密度较高 (${totalDensity.toFixed(2)})，可能导致光柱过度可见。`,
            relatedObjectIds: [light.id],
            relatedObjectTypes: ['StageLight'],
            timestamp: now,
            detectedAt: new Date().toISOString(),
          });
        }
      }
    });

    if (detectedIssues.length > 0) {
      set((prev) => ({
        issues: [...prev.issues, ...detectedIssues],
      }));
    }

    return detectedIssues;
  },

  exportData: () => {
    const state = get();
    const exportObj = {
      stage: state.stage,
      smokeMachines: state.smokeMachines,
      lights: state.lights,
      windConfigs: state.windConfigs,
      issues: state.issues,
      reports: state.reports,
      filters: state.filters,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    const data = JSON.stringify(exportObj, null, 2);
    set((prev) => ({
      exportState: {
        lastExportData: data,
        lastExportAt: new Date().toISOString(),
        exportCount: prev.exportState.exportCount + 1,
      },
    }));
    get().addAuditLog({
      action: 'export_data',
      objectId: 'system',
      objectType: 'System',
      user: 'Current User',
      details: { exportCount: get().exportState.exportCount },
    });
    return data;
  },

  importData: (data: string) => {
    try {
      const parsed = JSON.parse(data);
      const state = get();

      if (parsed.stage) set({ stage: parsed.stage });
      if (parsed.smokeMachines) set({ smokeMachines: parsed.smokeMachines });
      if (parsed.lights) set({ lights: parsed.lights });
      if (parsed.windConfigs) set({ windConfigs: parsed.windConfigs });
      if (parsed.issues) set({ issues: parsed.issues });
      if (parsed.reports) set({ reports: parsed.reports });
      if (parsed.filters) set({ filters: parsed.filters });

      if (state.exportState.lastExportData) {
        const currentExport = JSON.stringify({
          stage: state.stage,
          smokeMachines: state.smokeMachines,
          lights: state.lights,
          windConfigs: state.windConfigs,
        });
        if (currentExport !== state.exportState.lastExportData) {
          get().addIssue({
            type: 'export_mismatch' as IssueType,
            severity: 'warning' as IssueSeverity,
            status: 'pending_review' as IssueStatus,
            title: '导出前后数据口径不一致',
            description: '导入后的数据与上次导出的数据存在差异，请核对关键参数是否一致。',
            relatedObjectIds: ['system'],
            relatedObjectTypes: ['System'],
            timestamp: state.playback.currentTime,
          });
        }
      }

      get().addAuditLog({
        action: 'import_data',
        objectId: 'system',
        objectType: 'System',
        user: 'Current User',
        details: { source: parsed.exportedAt || 'unknown' },
      });

      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },

  generateReport: () => {
    const state = get();
    const visibilities = state.visibilitySamples.map((s) => s.visibility);
    const report: EffectReport = {
      id: generateId('report'),
      name: `Effect Report ${new Date().toLocaleString()}`,
      source: 'internal_generation',
      importedAt: new Date().toISOString(),
      version: '1.0.0',
      startTime: state.filters.timeRange.start,
      endTime: state.filters.timeRange.end,
      averageVisibility: visibilities.length > 0 ? visibilities.reduce((a, b) => a + b, 0) / visibilities.length : 0,
      minVisibility: visibilities.length > 0 ? Math.min(...visibilities) : 0,
      maxVisibility: visibilities.length > 0 ? Math.max(...visibilities) : 100,
      issueCount: state.issues.length,
      samples: state.visibilitySamples,
      generatedAt: new Date().toISOString(),
    };
    set((prev) => ({
      reports: [...prev.reports, report],
    }));
    get().addAuditLog({
      action: 'generate_report',
      objectId: report.id,
      objectType: 'EffectReport',
      user: 'Current User',
      details: { issueCount: report.issueCount },
    });
    return report;
  },

  addAuditLog: (entry) => {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: generateId('audit'),
      timestamp: new Date().toISOString(),
    };
    set((prev) => ({
      auditLog: [...prev.auditLog, logEntry],
    }));
  },

  toggleIssueTypeFilter: (type) => {
    set((prev) => {
      const current = prev.filters.selectedIssueTypes;
      const exists = current.includes(type);
      return {
        filters: {
          ...prev.filters,
          selectedIssueTypes: exists
            ? current.filter((t) => t !== type)
            : [...current, type],
        },
      };
    });
  },
}));

export { vec3Add, vec3Scale, vec3Normalize, vec3Distance };
