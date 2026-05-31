import type { Nozzle, PressureRecord, CalculationResult } from '../types';

export const mockNozzles: Nozzle[] = [
  {
    id: 'nozzle-001',
    model: 'TeeJet XR11002',
    orificeDiameter: 0.8,
    sprayAngle: 110,
    nominalFlowRate: 1.2,
    minPressure: 1.5,
    maxPressure: 6.0,
    manufacturer: 'TeeJet',
    createdAt: '2024-05-01T08:00:00Z',
    updatedAt: '2024-05-01T08:00:00Z'
  },
  {
    id: 'nozzle-002',
    model: 'TeeJet XR11004',
    orificeDiameter: 1.2,
    sprayAngle: 110,
    nominalFlowRate: 2.4,
    minPressure: 2.0,
    maxPressure: 7.0,
    manufacturer: 'TeeJet',
    createdAt: '2024-05-02T09:00:00Z',
    updatedAt: '2024-05-02T09:00:00Z'
  },
  {
    id: 'nozzle-003',
    model: 'Lechler ID 120-02',
    orificeDiameter: 0.9,
    sprayAngle: 120,
    nominalFlowRate: 1.5,
    minPressure: 1.0,
    maxPressure: 5.0,
    manufacturer: 'Lechler',
    createdAt: '2024-05-03T10:00:00Z',
    updatedAt: '2024-05-03T10:00:00Z'
  },
  {
    id: 'nozzle-004',
    model: 'Hypro DG11002',
    orificeDiameter: 0.85,
    sprayAngle: 110,
    nominalFlowRate: 1.3,
    minPressure: 2.0,
    maxPressure: 8.0,
    manufacturer: 'Hypro',
    createdAt: '2024-05-04T11:00:00Z',
    updatedAt: '2024-05-04T11:00:00Z'
  }
];

export const mockPressureRecords: PressureRecord[] = [
  {
    id: 'pressure-001',
    nozzleId: 'nozzle-001',
    pressure: 3.0,
    recordTime: '2024-05-15T08:30:00Z',
    operator: '张工',
    location: 'A区麦田',
    remarks: '常规作业压力',
    isOutOfRange: false,
    createdAt: '2024-05-15T08:30:00Z'
  },
  {
    id: 'pressure-002',
    nozzleId: 'nozzle-001',
    pressure: 7.5,
    recordTime: '2024-05-15T10:15:00Z',
    operator: '李工',
    location: 'B区玉米田',
    remarks: '临时调高压力，已超上限',
    isOutOfRange: true,
    createdAt: '2024-05-15T10:15:00Z'
  },
  {
    id: 'pressure-003',
    nozzleId: 'nozzle-002',
    pressure: 4.0,
    recordTime: '2024-05-16T09:00:00Z',
    operator: '张工',
    location: 'C区稻田',
    remarks: '正常工作压力',
    isOutOfRange: false,
    createdAt: '2024-05-16T09:00:00Z'
  },
  {
    id: 'pressure-004',
    nozzleId: 'nozzle-003',
    pressure: 0.8,
    recordTime: '2024-05-17T14:30:00Z',
    operator: '王工',
    location: 'D区果园',
    remarks: '低压测试，低于下限',
    isOutOfRange: true,
    createdAt: '2024-05-17T14:30:00Z'
  },
  {
    id: 'pressure-005',
    nozzleId: 'nozzle-004',
    pressure: 5.0,
    recordTime: '2024-05-18T11:20:00Z',
    operator: '李工',
    location: 'E区蔬菜田',
    remarks: '标准作业',
    isOutOfRange: false,
    createdAt: '2024-05-18T11:20:00Z'
  }
];

export const mockCalculationResults: CalculationResult[] = [
  {
    id: 'result-001',
    nozzleId: 'nozzle-001',
    pressureRecordId: 'pressure-001',
    flowRate: 1.15,
    viscosity: 1.2,
    viscosityAddedLater: false,
    dropletSize: 186.4,
    coverageWidth: 1.72,
    sprayQuality: 'GOOD',
    validationResult: {
      pressureOutOfRange: false,
      pressureWarning: null,
      viscosityMissing: false,
      nozzleBlocked: false,
      nextStepContact: null,
      requiresConfirmation: false
    },
    conclusionChanges: [],
    status: 'normal',
    createdAt: '2024-05-15T08:35:00Z',
    updatedAt: '2024-05-15T08:35:00Z'
  },
  {
    id: 'result-002',
    nozzleId: 'nozzle-001',
    pressureRecordId: 'pressure-002',
    flowRate: 1.18,
    viscosity: null,
    viscosityAddedLater: false,
    dropletSize: 134.2,
    coverageWidth: 1.85,
    sprayQuality: 'EXCELLENT',
    validationResult: {
      pressureOutOfRange: true,
      pressureWarning: '压力 7.5 bar 超过喷嘴最大工作压力 6.0 bar，存在设备损坏风险',
      viscosityMissing: true,
      nozzleBlocked: false,
      nextStepContact: '请联系技术主管核审压力越界情况，确认是否可继续作业',
      requiresConfirmation: true
    },
    conclusionChanges: [],
    status: 'pending',
    createdAt: '2024-05-15T10:20:00Z',
    updatedAt: '2024-05-15T10:20:00Z'
  },
  {
    id: 'result-003',
    nozzleId: 'nozzle-002',
    pressureRecordId: 'pressure-003',
    flowRate: 1.5,
    viscosity: 1.5,
    viscosityAddedLater: true,
    dropletSize: 225.8,
    coverageWidth: 1.68,
    sprayQuality: 'GOOD',
    validationResult: {
      pressureOutOfRange: false,
      pressureWarning: null,
      viscosityMissing: false,
      nozzleBlocked: true,
      nextStepContact: '请联系设备维护人员检查喷嘴是否堵塞',
      requiresConfirmation: false
    },
    conclusionChanges: [
      {
        field: 'viscosity',
        oldValue: null,
        newValue: 1.5,
        changedAt: '2024-05-16T10:30:00Z',
        changedBy: '张工',
        reason: '补录药液黏度数据'
      }
    ],
    status: 'blocked',
    createdAt: '2024-05-16T09:05:00Z',
    updatedAt: '2024-05-16T10:30:00Z'
  },
  {
    id: 'result-004',
    nozzleId: 'nozzle-003',
    pressureRecordId: 'pressure-004',
    flowRate: 1.45,
    viscosity: 1.0,
    viscosityAddedLater: false,
    dropletSize: 342.1,
    coverageWidth: 1.55,
    sprayQuality: 'FAIR',
    validationResult: {
      pressureOutOfRange: true,
      pressureWarning: '压力 0.8 bar 低于喷嘴最小工作压力 1.0 bar，可能导致雾滴过大影响施药效果',
      viscosityMissing: false,
      nozzleBlocked: false,
      nextStepContact: '请联系技术主管核审压力越界情况，确认是否可继续作业',
      requiresConfirmation: true
    },
    conclusionChanges: [],
    status: 'pending',
    createdAt: '2024-05-17T14:35:00Z',
    updatedAt: '2024-05-17T14:35:00Z'
  }
];

export function initializeMockData() {
  const storageKey = 'nozzle-calculation-storage';
  const existing = localStorage.getItem(storageKey);
  
  if (!existing) {
    const initialState = {
      state: {
        nozzles: mockNozzles,
        pressureRecords: mockPressureRecords,
        calculationResults: mockCalculationResults,
        selectedNozzleId: null,
        selectedPressureRecordId: null
      },
      version: 1
    };
    localStorage.setItem(storageKey, JSON.stringify(initialState));
    return true;
  }
  
  const data = JSON.parse(existing);
  if (data.state.nozzles.length === 0) {
    data.state.nozzles = mockNozzles;
    data.state.pressureRecords = mockPressureRecords;
    data.state.calculationResults = mockCalculationResults;
    localStorage.setItem(storageKey, JSON.stringify(data));
    return true;
  }
  
  return false;
}
