import { create } from 'zustand';
import type {
  AppState,
  AppActions,
  RobotConfig,
  DataSource,
  AngleDataPoint,
  LoadDataPoint,
  TorqueResult,
  ConflictRecord,
  IssueRecord,
  VerificationReport,
} from '../types';
import {
  mockRobotConfig,
  mockAngleDataA,
  mockLoadDataA,
  mockConflicts,
  mockIssues,
  generateMockTorqueResults,
  generateId,
} from '../data/mockData';

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set, get) => ({
  robotConfig: null,
  angleData: null,
  loadData: null,
  torqueResults: [],
  conflicts: [],
  issues: [],
  currentReport: null,
  selectedJointId: null,
  isCalculating: false,

  setRobotConfig: (config: RobotConfig) => {
    set({ robotConfig: config });
  },

  setAngleData: (data: DataSource<AngleDataPoint>) => {
    set({ angleData: data });
    get().detectConflicts();
  },

  setLoadData: (data: DataSource<LoadDataPoint>) => {
    set({ loadData: data });
    get().detectConflicts();
  },

  calculateTorque: async () => {
    set({ isCalculating: true });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const results = generateMockTorqueResults();
    const detectedIssues = get().detectIssues(results);

    set({
      torqueResults: results,
      issues: detectedIssues,
      isCalculating: false,
    });
  },

  resolveConflict: (conflictId: string, resolution: 'A' | 'B' | 'custom', customValue?: string | number) => {
    set((state) => ({
      conflicts: state.conflicts.map((c) =>
        c.id === conflictId
          ? { ...c, resolved: true, resolution, customValue }
          : c
      ),
    }));
  },

  selectJoint: (jointId: string | null) => {
    set({ selectedJointId: jointId });
  },

  detectConflicts: () => {
    const { angleData, loadData } = get();
    const detectedConflicts: ConflictRecord[] = [];

    if (angleData && loadData) {
      const angleTimestamps = new Set(angleData.data.map((d) => d.timestamp));
      const loadTimestamps = new Set(loadData.data.map((d) => d.timestamp));

      if (angleTimestamps.size !== loadTimestamps.size) {
        detectedConflicts.push({
          id: generateId(),
          type: 'angle',
          rowIndex: 0,
          field: 'timestamp_count',
          valueA: angleTimestamps.size,
          valueB: loadTimestamps.size,
          resolved: false,
          description: '角度数据与负载数据时间点数量不一致',
        });
      }
    }

    set({ conflicts: [...mockConflicts, ...detectedConflicts] });
  },

  detectIssues: (torqueResults: TorqueResult[]): IssueRecord[] => {
    const issues: IssueRecord[] = [...mockIssues];
    const { robotConfig, angleData, loadData } = get();

    torqueResults.forEach((result) => {
      if (result.isOverLimit) {
        const joint = robotConfig?.joints.find((j) => j.id === result.jointId);
        issues.push({
          id: generateId(),
          type: 'torque_over_limit',
          severity: result.overLimitPoints.length > 10 ? 'critical' : 'error',
          position: joint?.name || result.jointName,
          description: `${joint?.name || result.jointName} 扭矩超过阈值 ${result.overLimitPoints.length} 次，最大扭矩 ${result.maxTorque.toFixed(2)} N·m，超过阈值 ${((result.maxTorque / result.threshold - 1) * 100).toFixed(1)}%`,
          referenceId: result.jointId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    if (angleData) {
      robotConfig?.joints.forEach((joint) => {
        const jointAngles = angleData.data.filter((d) => d.jointId === joint.id);
        jointAngles.forEach((point, idx) => {
          if (point.angle < joint.minAngle || point.angle > joint.maxAngle) {
            issues.push({
              id: generateId(),
              type: 'angle_out_of_range',
              severity: 'error',
              position: `${joint.name} - 第 ${idx} 帧`,
              description: `${joint.name} 在第 ${idx} 帧角度为 ${point.angle.toFixed(1)}°，超出允许范围 [${joint.minAngle}°, ${joint.maxAngle}°]`,
              referenceId: joint.id,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });
    }

    if (loadData) {
      loadData.data.forEach((point, idx) => {
        if (point.mass === 0) {
          const link = robotConfig?.links.find((l) => l.id === point.linkId);
          issues.push({
            id: generateId(),
            type: 'missing_load',
            severity: 'critical',
            position: link?.name || point.linkId,
            description: `${link?.name || point.linkId} 在第 ${idx} 帧负载数据缺失（质量为0），扭矩计算结果可能不准确`,
            referenceId: point.linkId,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    return issues;
  },

  generateReport: (): VerificationReport => {
    const { robotConfig, torqueResults, conflicts, issues } = get();

    const report: VerificationReport = {
      id: generateId(),
      title: `机器人关节扭矩验算报告 - ${new Date().toLocaleDateString('zh-CN')}`,
      createdAt: new Date().toISOString(),
      robotConfig: robotConfig || mockRobotConfig,
      torqueResults,
      conflicts,
      issues,
      summary: {
        totalJoints: robotConfig?.joints.length || 6,
        overLimitJoints: torqueResults.filter((r) => r.isOverLimit).length,
        criticalIssues: issues.filter((i) => i.severity === 'critical').length,
        warnings: issues.filter((i) => i.severity === 'warning').length,
        recommendations: [
          '建议优先修复负载缺失问题，确保扭矩计算准确性',
          '优化J2关节轨迹规划，减少扭矩超限次数',
          '确认夹具配置记录，避免混用导致的计算偏差',
          '建议增加数据校验环节，减少人工维护数据不一致',
        ],
      },
    };

    set({ currentReport: report });
    return report;
  },

  clearAll: () => {
    set({
      angleData: null,
      loadData: null,
      torqueResults: [],
      conflicts: [],
      issues: [],
      currentReport: null,
      selectedJointId: null,
    });
  },
}));

export const initializeMockData = () => {
  useAppStore.setState({
    robotConfig: mockRobotConfig,
    angleData: mockAngleDataA,
    loadData: mockLoadDataA,
    conflicts: mockConflicts,
    issues: mockIssues,
    torqueResults: generateMockTorqueResults(),
  });
};
