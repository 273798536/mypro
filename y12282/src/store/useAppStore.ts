import { create } from 'zustand';
import {
  DamModel,
  CrackPoint,
  Sensor,
  SeepageData,
  InspectionNote,
  AnomalyRecord,
  FileInfo,
  HeatMapPoint,
  RiskLevel,
} from '../types';
import {
  mockDamModel,
  mockCrackPoints,
  mockSensors,
  mockSeepageData,
  mockInspectionNotes,
  mockAnomalies,
  mockRawFiles,
  mockHeatMapPoints,
} from '../utils/mockData';

interface AppState {
  damModel: DamModel;
  crackPoints: CrackPoint[];
  sensors: Sensor[];
  seepageData: SeepageData[];
  inspectionNotes: InspectionNote[];
  anomalies: AnomalyRecord[];
  rawFiles: FileInfo[];
  heatMapPoints: HeatMapPoint[];
  selectedCrackId: string | null;
  selectedAnomalyId: string | null;
  showHeatMap: boolean;
  showCracks: boolean;
  showSensors: boolean;
  sectionPlaneEnabled: boolean;
  sectionPlanePosition: number;
  riskAssessment: RiskLevel;
  selectedTab: 'data' | 'anomaly' | 'report';
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  setSelectedCrackId: (id: string | null) => void;
  setSelectedAnomalyId: (id: string | null) => void;
  setShowHeatMap: (show: boolean) => void;
  setShowCracks: (show: boolean) => void;
  setShowSensors: (show: boolean) => void;
  setSectionPlaneEnabled: (enabled: boolean) => void;
  setSectionPlanePosition: (position: number) => void;
  setSelectedTab: (tab: 'data' | 'anomaly' | 'report') => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  addCrackPoint: (crack: CrackPoint) => void;
  addRawFile: (file: FileInfo) => void;
  loadMockData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  damModel: mockDamModel,
  crackPoints: [],
  sensors: [],
  seepageData: [],
  inspectionNotes: [],
  anomalies: [],
  rawFiles: [],
  heatMapPoints: [],
  selectedCrackId: null,
  selectedAnomalyId: null,
  showHeatMap: true,
  showCracks: true,
  showSensors: true,
  sectionPlaneEnabled: false,
  sectionPlanePosition: 0,
  riskAssessment: 'warning',
  selectedTab: 'data',
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,

  setSelectedCrackId: (id) => set({ selectedCrackId: id }),
  setSelectedAnomalyId: (id) => set({ selectedAnomalyId: id }),
  setShowHeatMap: (show) => set({ showHeatMap: show }),
  setShowCracks: (show) => set({ showCracks: show }),
  setShowSensors: (show) => set({ showSensors: show }),
  setSectionPlaneEnabled: (enabled) => set({ sectionPlaneEnabled: enabled }),
  setSectionPlanePosition: (position) => set({ sectionPlanePosition: position }),
  setSelectedTab: (tab) => set({ selectedTab: tab }),
  setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),
  setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),

  addCrackPoint: (crack) =>
    set((state) => ({
      crackPoints: [...state.crackPoints, crack],
    })),

  addRawFile: (file) =>
    set((state) => ({
      rawFiles: [...state.rawFiles, file],
    })),

  loadMockData: () =>
    set({
      damModel: mockDamModel,
      crackPoints: mockCrackPoints,
      sensors: mockSensors,
      seepageData: mockSeepageData,
      inspectionNotes: mockInspectionNotes,
      anomalies: mockAnomalies,
      rawFiles: mockRawFiles,
      heatMapPoints: mockHeatMapPoints,
    }),
}));
