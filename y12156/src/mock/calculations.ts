import { ThermalBridgeCalculation, EnvironmentParams } from '../types';
import { mockWallConstruction } from './constructions';
import { mockMaterialLibrary } from './materials';
import { detectConflicts } from '../utils/conflictDetector';
import { validateAll } from '../utils/dataValidator';

export const mockEnvironmentParams: EnvironmentParams = {
  indoorTemperature: 20,
  outdoorTemperature: -5,
  calculationPeriod: 30,
  relativeHumidity: 50,
};

const conflicts = detectConflicts(mockWallConstruction, mockMaterialLibrary);
const validationIssues = validateAll(mockWallConstruction, mockMaterialLibrary, mockEnvironmentParams);

export const mockCalculation: ThermalBridgeCalculation = {
  id: 'calc-001',
  name: 'A栋住宅楼-西向外墙热桥分析',
  wallConstruction: mockWallConstruction,
  materialLibrary: mockMaterialLibrary,
  environmentParams: mockEnvironmentParams,
  conflicts: conflicts,
  validationIssues: validationIssues,
  status: 'conflict_pending',
  createdAt: new Date('2026-05-28'),
  updatedAt: new Date('2026-05-30'),
};

export const mockCalculations: ThermalBridgeCalculation[] = [
  mockCalculation,
  {
    ...mockCalculation,
    id: 'calc-002',
    name: 'B栋办公楼-南向外墙热桥分析',
    status: 'completed',
    environmentParams: {
      ...mockEnvironmentParams,
      indoorTemperature: 22,
      outdoorTemperature: -2,
    },
    createdAt: new Date('2026-05-20'),
    updatedAt: new Date('2026-05-21'),
  },
  {
    ...mockCalculation,
    id: 'calc-003',
    name: 'C栋公寓-北向外墙热桥分析',
    status: 'validation_failed',
    createdAt: new Date('2026-05-25'),
    updatedAt: new Date('2026-05-26'),
  },
];
