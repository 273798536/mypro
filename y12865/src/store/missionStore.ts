import { create } from 'zustand';
import type { Mission, SamplePoint, DataStatus, RiskSummary } from '@/types';
import { mockMissions, getMissionById } from '@/data/mockMissions';

interface MissionState {
  missions: Mission[];
  currentMission: Mission | null;
  selectedPoint: SamplePoint | null;
  riskSummary: RiskSummary;
  selectMission: (id: string) => void;
  selectPoint: (point: SamplePoint | null) => void;
  updatePointStatus: (pointId: string, newStatus: DataStatus, remark: string) => void;
  updateWaterQuality: (
    pointId: string,
    updates: Partial<SamplePoint['waterQuality']>,
    remark: string,
  ) => void;
}

function calcRiskSummary(points: SamplePoint[]): RiskSummary {
  return points.reduce(
    (acc, p) => ({
      safe: acc.safe + (p.riskLevel === 'safe' ? 1 : 0),
      warning: acc.warning + (p.riskLevel === 'warning' ? 1 : 0),
      danger: acc.danger + (p.riskLevel === 'danger' ? 1 : 0),
      approved: acc.approved + (p.status === 'approved' ? 1 : 0),
      delayed: acc.delayed + (p.status === 'delayed' ? 1 : 0),
      recollect: acc.recollect + (p.status === 'recollect' ? 1 : 0),
      pending: acc.pending + (p.status === 'pending' ? 1 : 0),
    }),
    { safe: 0, warning: 0, danger: 0, approved: 0, delayed: 0, recollect: 0, pending: 0 },
  );
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: mockMissions,
  currentMission: mockMissions[0],
  selectedPoint: null,
  riskSummary: calcRiskSummary(mockMissions[0]?.samplePoints ?? []),
  selectMission: (id: string) => {
    const mission = getMissionById(id);
    if (mission) {
      set({
        currentMission: mission,
        selectedPoint: null,
        riskSummary: calcRiskSummary(mission.samplePoints),
      });
    }
  },
  selectPoint: (point: SamplePoint | null) => {
    set({ selectedPoint: point });
  },
  updatePointStatus: (pointId: string, newStatus: DataStatus, remark: string) => {
    const { currentMission } = get();
    if (!currentMission) return;
    const updatedPoints = currentMission.samplePoints.map((p) => {
      if (p.id !== pointId) return p;
      const oldStatus = p.status;
      return {
        ...p,
        status: newStatus,
        available: newStatus === 'approved',
        delayed: newStatus === 'delayed',
        recollect: newStatus === 'recollect',
        reviewLogs: [
          ...p.reviewLogs,
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            operator: '当前教练',
            beforeStatus: oldStatus,
            afterStatus: newStatus,
            remark,
          },
        ],
      };
    });
    const updatedMission = { ...currentMission, samplePoints: updatedPoints };
    set({
      currentMission: updatedMission,
      selectedPoint: updatedPoints.find((p) => p.id === pointId) ?? null,
      riskSummary: calcRiskSummary(updatedPoints),
    });
  },
  updateWaterQuality: (
    pointId: string,
    updates: Partial<SamplePoint['waterQuality']>,
    remark: string,
  ) => {
    const { currentMission } = get();
    if (!currentMission) return;
    const updatedPoints = currentMission.samplePoints.map((p) => {
      if (p.id !== pointId) return p;
      const diff = { ...updates };
      return {
        ...p,
        waterQuality: { ...p.waterQuality, ...updates },
        reviewLogs: [
          ...p.reviewLogs,
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            operator: '当前教练',
            beforeStatus: p.status,
            afterStatus: p.status,
            remark,
            diff,
          },
        ],
      };
    });
    const updatedMission = { ...currentMission, samplePoints: updatedPoints };
    set({
      currentMission: updatedMission,
      selectedPoint: updatedPoints.find((p) => p.id === pointId) ?? null,
    });
  },
}));
