import { create } from 'zustand';
import type { BallastVersion, ManualCheckRecord, WeatherEvidence } from '../types';
import { mockBallastVersions, mockManualChecks, mockWeatherEvidence } from '../utils/mockData';

interface VersionState {
  ballastVersions: BallastVersion[];
  currentBallastId: string;
  manualChecks: ManualCheckRecord[];
  weatherEvidence: WeatherEvidence;
  weatherLevel: number;
  setWeatherLevel: (level: number) => void;
  addBallastVersion: (version: Omit<BallastVersion, 'id' | 'createdAt' | 'isDeleted'>) => void;
  setCurrentBallast: (versionId: string) => void;
  getCurrentBallast: () => BallastVersion | undefined;
  addManualCheck: (check: Omit<ManualCheckRecord, 'id' | 'createdAt'>) => void;
  getVersionNumber: () => string;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useVersionStore = create<VersionState>((set, get) => ({
  ballastVersions: mockBallastVersions,
  currentBallastId: mockBallastVersions[mockBallastVersions.length - 1].id,
  manualChecks: mockManualChecks,
  weatherEvidence: mockWeatherEvidence,
  weatherLevel: 4,
  setWeatherLevel: (level) =>
    set((state) => ({
      weatherLevel: level,
      weatherEvidence: {
        ...state.weatherEvidence,
        weatherLevel: level as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        windForce: level * 1.5,
        waveHeight: level * 0.6,
        influenceFactor: 1 + (level - 1) * 0.1,
        recordedAt: new Date().toISOString(),
      },
    })),
  addBallastVersion: (version) => {
    const newVersion: BallastVersion = {
      ...version,
      id: generateId('BALLAST'),
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };
    set((state) => ({
      ballastVersions: [...state.ballastVersions, newVersion],
      currentBallastId: newVersion.id,
    }));
  },
  setCurrentBallast: (versionId) => set({ currentBallastId: versionId }),
  getCurrentBallast: () =>
    get().ballastVersions.find((v) => v.id === get().currentBallastId),
  addManualCheck: (check) => {
    const newCheck: ManualCheckRecord = {
      ...check,
      id: generateId('CHECK'),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      manualChecks: [...state.manualChecks, newCheck],
    }));
  },
  getVersionNumber: () => {
    const versions = get().ballastVersions;
    const latestVersion = versions[versions.length - 1];
    if (!latestVersion) return 'v1.0.0';
    const parts = latestVersion.version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  },
}));
