import { useGameStore } from '../store/useGameStore';

export interface ExportData {
  gameId: string;
  levelId: string;
  levelName: string;
  timestamp: number;
  duration: number;
  result: 'success' | 'failed';
  finalScore: number;
  maxWindLevel: number;
  targetWindLevel: number;
  finalWindLevel: number;
  budget: {
    total: number;
    used: number;
    remaining: number;
    records: Array<{
      timestamp: number;
      action: string;
      amount: number;
      balance: number;
      remark?: string;
      version: number;
    }>;
  };
  bridge: {
    nodes: Array<{
      id: string;
      x: number;
      y: number;
      fixed: boolean;
      mass: number;
      remark?: string;
      version: number;
      modifiedAt: number;
      modifier: 'user' | 'system';
    }>;
    members: Array<{
      id: string;
      startNodeId: string;
      endNodeId: string;
      type: 'beam' | 'damper' | 'spring';
      stiffness: number;
      damping: number;
      maxStress: number;
      currentStress: number;
      cost: number;
    }>;
  };
  evidenceChain: Array<{
    timestamp: number;
    type: string;
    data: Record<string, any>;
    version: number;
    remark?: string;
  }>;
  vibrationAnalysis: {
    peakAmplitude: number;
    avgAmplitude: number;
    peakStress: number;
    resonanceDetected: boolean;
  };
  failReason?: string;
  failDetail?: string;
}

export function exportGameData(): ExportData {
  const state = useGameStore.getState();
  
  const peakAmplitude = Math.max(...state.vibrationHistory.map(f => f.amplitude), 0);
  const avgAmplitude = state.vibrationHistory.length > 0
    ? state.vibrationHistory.reduce((sum, f) => sum + f.amplitude, 0) / state.vibrationHistory.length
    : 0;
  const peakStress = Math.max(...state.vibrationHistory.map(f => f.maxStress), 0);
  
  const finalScore = state.phase === 'success'
    ? Math.floor(
        state.windLevel * 100 +
        (state.budget.total - state.budget.used) / 100
      )
    : Math.floor(state.windLevel * 50);

  return {
    gameId: state.gameId,
    levelId: state.currentLevel?.id || '',
    levelName: state.currentLevel?.name || '',
    timestamp: state.endTime || Date.now(),
    duration: state.endTime && state.startTime ? state.endTime - state.startTime : 0,
    result: state.phase === 'success' ? 'success' : 'failed',
    finalScore,
    maxWindLevel: state.currentLevel?.targetWindLevel || 0,
    targetWindLevel: state.currentLevel?.targetWindLevel || 0,
    finalWindLevel: state.windLevel,
    budget: {
      total: state.budget.total,
      used: state.budget.used,
      remaining: state.budget.total - state.budget.used,
      records: state.budget.history
    },
    bridge: {
      nodes: state.nodes.map(n => ({
        id: n.id,
        x: n.x,
        y: n.y,
        fixed: n.fixed,
        mass: n.mass,
        remark: n.remark,
        version: n.version,
        modifiedAt: n.modifiedAt,
        modifier: n.modifier
      })),
      members: state.members
    },
    evidenceChain: state.evidenceChain,
    vibrationAnalysis: {
      peakAmplitude,
      avgAmplitude,
      peakStress,
      resonanceDetected: state.failReason === 'resonance'
    },
    failReason: state.failReason || undefined,
    failDetail: state.failDetail || undefined
  };
}

export function downloadExportData() {
  const data = exportGameData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bridge_${data.gameId}_${data.result}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
