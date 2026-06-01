import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  CalculationSession,
  PipeSegment,
  Branch,
  ValveConfig,
  FluidType,
  FlowUnit,
  PressureUnit,
  UnitSystem,
  DiameterUnit,
  LengthUnit,
  ValveType,
  ElbowAngle,
  EvidenceSnapshot,
  PressureDropResult,
} from '@/types';
import { getFluidProperties } from '@/data/fluidProperties';
import { calculateFullSession } from '@/utils/pressureDropCalculator';
import { validateUnits } from '@/utils/unitConverter';

interface CalculationState {
  session: CalculationSession;
  selectedPressureUnit: PressureUnit;
  currentStep: number;
  isCalculating: boolean;
  evidenceChain: EvidenceSnapshot[];
  
  setFluidType: (type: FluidType) => void;
  setTemperature: (temp: number) => void;
  setTotalFlowRate: (rate: number) => void;
  setFlowRateUnit: (unit: FlowUnit) => void;
  setUnitSystem: (system: UnitSystem) => void;
  setSessionTitle: (title: string) => void;
  
  addMainSegment: () => void;
  updateMainSegment: (id: string, updates: Partial<PipeSegment>) => void;
  removeMainSegment: (id: string) => void;
  
  addBranch: () => void;
  updateBranch: (id: string, updates: Partial<Branch>) => void;
  removeBranch: (id: string) => void;
  addBranchSegment: (branchId: string) => void;
  updateBranchSegment: (branchId: string, segmentId: string, updates: Partial<PipeSegment>) => void;
  removeBranchSegment: (branchId: string, segmentId: string) => void;
  
  setMainValve: (updates: Partial<ValveConfig>) => void;
  setBranchValve: (branchId: string, updates: Partial<ValveConfig>) => void;
  
  setPressureUnit: (unit: PressureUnit) => void;
  setCurrentStep: (step: number) => void;
  
  addEvidenceSnapshot: (snapshot: Omit<EvidenceSnapshot, 'id'>) => void;
  
  performCalculation: () => void;
  resetCalculation: () => void;
  loadDemoData: () => void;
}

function createDefaultValve(): ValveConfig {
  return {
    id: uuidv4(),
    valveType: 'gate',
    openingPercentage: 100,
    isHalfOpen: false,
    snapshotTimestamp: Date.now(),
  };
}

function createDefaultSegment(index: number): PipeSegment {
  return {
    id: uuidv4(),
    name: `管路段 ${index}`,
    diameter: 100,
    diameterUnit: 'mm',
    length: 50,
    lengthUnit: 'm',
    roughness: 0.05,
    elbowCount: 2,
    elbowAngle: 90,
  };
}

function createDefaultBranch(index: number): Branch {
  return {
    id: uuidv4(),
    name: `支路 ${index}`,
    flowRateRatio: 0.5,
    segments: [createDefaultSegment(1)],
    valveConfig: createDefaultValve(),
    isMissingData: false,
    missingFields: [],
  };
}

function createDefaultSession(): CalculationSession {
  const now = Date.now();
  const fluid = getFluidProperties('water', 20);

  return {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    title: '新建压降计算',
    unitSystem: 'metric',
    fluid,
    totalFlowRate: 50,
    flowRateUnit: 'm³/h',
    mainSegments: [createDefaultSegment(1)],
    branches: [],
    mainValve: createDefaultValve(),
    results: null,
    status: 'draft',
  };
}

export const useCalculationStore = create<CalculationState>((set, get) => ({
  session: createDefaultSession(),
  selectedPressureUnit: 'kPa',
  currentStep: 1,
  isCalculating: false,
  evidenceChain: [],

  setFluidType: (type: FluidType) => {
    const { session } = get();
    const fluid = getFluidProperties(type, session.fluid.temperature);
    set({
      session: { ...session, fluid, updatedAt: Date.now() }
    });
  },

  setTemperature: (temp: number) => {
    const { session } = get();
    const fluid = getFluidProperties(session.fluid.type, temp);
    set({
      session: { ...session, fluid, updatedAt: Date.now() }
    });
  },

  setTotalFlowRate: (rate: number) => {
    const { session } = get();
    set({
      session: { ...session, totalFlowRate: rate, updatedAt: Date.now() }
    });
  },

  setFlowRateUnit: (unit: FlowUnit) => {
    const { session } = get();
    set({
      session: { ...session, flowRateUnit: unit, updatedAt: Date.now() }
    });
  },

  setUnitSystem: (system: UnitSystem) => {
    const { session } = get();
    set({
      session: { ...session, unitSystem: system, updatedAt: Date.now() }
    });
  },

  setSessionTitle: (title: string) => {
    const { session } = get();
    set({
      session: { ...session, title, updatedAt: Date.now() }
    });
  },

  addMainSegment: () => {
    const { session } = get();
    const newSegment = createDefaultSegment(session.mainSegments.length + 1);
    set({
      session: {
        ...session,
        mainSegments: [...session.mainSegments, newSegment],
        updatedAt: Date.now(),
      }
    });
  },

  updateMainSegment: (id: string, updates: Partial<PipeSegment>) => {
    const { session } = get();
    set({
      session: {
        ...session,
        mainSegments: session.mainSegments.map(s =>
          s.id === id ? { ...s, ...updates } : s
        ),
        updatedAt: Date.now(),
      }
    });
  },

  removeMainSegment: (id: string) => {
    const { session } = get();
    if (session.mainSegments.length <= 1) return;
    set({
      session: {
        ...session,
        mainSegments: session.mainSegments.filter(s => s.id !== id),
        updatedAt: Date.now(),
      }
    });
  },

  addBranch: () => {
    const { session } = get();
    const newBranch = createDefaultBranch(session.branches.length + 1);
    
    const totalRatio = session.branches.reduce((sum, b) => sum + b.flowRateRatio, 0);
    const remaining = Math.max(0, 1 - totalRatio);
    newBranch.flowRateRatio = remaining > 0 ? remaining / 2 : 0.5;
    
    set({
      session: {
        ...session,
        branches: [...session.branches, newBranch],
        updatedAt: Date.now(),
      }
    });
  },

  updateBranch: (id: string, updates: Partial<Branch>) => {
    const { session } = get();
    set({
      session: {
        ...session,
        branches: session.branches.map(b =>
          b.id === id ? { ...b, ...updates } : b
        ),
        updatedAt: Date.now(),
      }
    });
  },

  removeBranch: (id: string) => {
    const { session } = get();
    set({
      session: {
        ...session,
        branches: session.branches.filter(b => b.id !== id),
        updatedAt: Date.now(),
      }
    });
  },

  addBranchSegment: (branchId: string) => {
    const { session } = get();
    const branch = session.branches.find(b => b.id === branchId);
    if (!branch) return;
    
    const newSegment = createDefaultSegment(branch.segments.length + 1);
    set({
      session: {
        ...session,
        branches: session.branches.map(b =>
          b.id === branchId
            ? { ...b, segments: [...b.segments, newSegment] }
            : b
        ),
        updatedAt: Date.now(),
      }
    });
  },

  updateBranchSegment: (branchId: string, segmentId: string, updates: Partial<PipeSegment>) => {
    const { session } = get();
    set({
      session: {
        ...session,
        branches: session.branches.map(b =>
          b.id === branchId
            ? {
                ...b,
                segments: b.segments.map(s =>
                  s.id === segmentId ? { ...s, ...updates } : s
                ),
              }
            : b
        ),
        updatedAt: Date.now(),
      }
    });
  },

  removeBranchSegment: (branchId: string, segmentId: string) => {
    const { session } = get();
    const branch = session.branches.find(b => b.id === branchId);
    if (!branch || branch.segments.length <= 1) return;
    
    set({
      session: {
        ...session,
        branches: session.branches.map(b =>
          b.id === branchId
            ? { ...b, segments: b.segments.filter(s => s.id !== segmentId) }
            : b
        ),
        updatedAt: Date.now(),
      }
    });
  },

  setMainValve: (updates: Partial<ValveConfig>) => {
    const { session } = get();
    const beforeState = { ...session.mainValve };
    const newValve = { ...session.mainValve, ...updates, snapshotTimestamp: Date.now() };
    
    if (updates.openingPercentage !== undefined) {
      newValve.isHalfOpen = updates.openingPercentage > 10 && updates.openingPercentage < 90;
    }
    
    set({
      session: {
        ...session,
        mainValve: newValve,
        updatedAt: Date.now(),
      }
    });

    if (updates.openingPercentage !== undefined || updates.valveType !== undefined) {
      get().addEvidenceSnapshot({
        type: 'valve_state',
        description: '主阀门状态变更',
        beforeState: beforeState as unknown as Record<string, unknown>,
        afterState: newValve as unknown as Record<string, unknown>,
        timestamp: Date.now(),
      });
    }
  },

  setBranchValve: (branchId: string, updates: Partial<ValveConfig>) => {
    const { session } = get();
    const branch = session.branches.find(b => b.id === branchId);
    if (!branch) return;

    const beforeState = { ...branch.valveConfig };
    const newValve = { ...branch.valveConfig, ...updates, snapshotTimestamp: Date.now() };
    
    if (updates.openingPercentage !== undefined) {
      newValve.isHalfOpen = updates.openingPercentage > 10 && updates.openingPercentage < 90;
    }

    set({
      session: {
        ...session,
        branches: session.branches.map(b =>
          b.id === branchId
            ? { ...b, valveConfig: newValve }
            : b
        ),
        updatedAt: Date.now(),
      }
    });

    if (updates.openingPercentage !== undefined || updates.valveType !== undefined) {
      get().addEvidenceSnapshot({
        type: 'valve_state',
        description: `支路[${branch.name}]阀门状态变更`,
        beforeState: beforeState as unknown as Record<string, unknown>,
        afterState: newValve as unknown as Record<string, unknown>,
        timestamp: Date.now(),
      });
    }
  },

  setPressureUnit: (unit: PressureUnit) => {
    set({ selectedPressureUnit: unit });
  },

  setCurrentStep: (step: number) => {
    set({ currentStep: step });
  },

  addEvidenceSnapshot: (snapshot: Omit<EvidenceSnapshot, 'id'>) => {
    const newSnapshot: EvidenceSnapshot = {
      ...snapshot,
      id: uuidv4(),
    };
    set(state => ({
      evidenceChain: [...state.evidenceChain, newSnapshot]
    }));
  },

  performCalculation: () => {
    const { session, selectedPressureUnit, evidenceChain } = get();
    set({ isCalculating: true });

    setTimeout(() => {
      try {
        const unitValidations = validateUnits(
          session.mainSegments,
          session.totalFlowRate,
          session.flowRateUnit,
          session.fluid,
          session.mainValve,
          session.branches
        );

        const results = calculateFullSession(session, selectedPressureUnit);
        results.unitValidations = unitValidations;
        results.evidenceChain = evidenceChain;

        set({
          session: {
            ...session,
            results,
            status: 'completed',
            updatedAt: Date.now(),
          },
          isCalculating: false,
        });
      } catch (error) {
        console.error('Calculation error:', error);
        set({
          session: { ...session, status: 'error', updatedAt: Date.now() },
          isCalculating: false,
        });
      }
    }, 500);
  },

  resetCalculation: () => {
    set({
      session: createDefaultSession(),
      evidenceChain: [],
      currentStep: 1,
      isCalculating: false,
    });
  },

  loadDemoData: () => {
    const now = Date.now();
    const demoSession: CalculationSession = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      title: '示例：暖通主管路+支路计算',
      unitSystem: 'metric',
      fluid: getFluidProperties('water', 60),
      totalFlowRate: 120,
      flowRateUnit: 'm³/h',
      mainSegments: [
        {
          id: uuidv4(),
          name: '供水干管',
          diameter: 200,
          diameterUnit: 'mm',
          length: 150,
          lengthUnit: 'm',
          roughness: 0.05,
          elbowCount: 4,
          elbowAngle: 90,
        },
        {
          id: uuidv4(),
          name: '供水立管',
          diameter: 150,
          diameterUnit: 'mm',
          length: 80,
          lengthUnit: 'm',
          roughness: 0.05,
          elbowCount: 2,
          elbowAngle: 90,
        },
      ],
      branches: [
        {
          id: uuidv4(),
          name: '1# 办公区支路',
          flowRateRatio: 0.6,
          segments: [
            {
              id: uuidv4(),
              name: '1# 支路干管',
              diameter: 100,
              diameterUnit: 'mm',
              length: 50,
              lengthUnit: 'm',
              roughness: 0.05,
              elbowCount: 3,
              elbowAngle: 90,
            },
          ],
          valveConfig: {
            id: uuidv4(),
            valveType: 'gate',
            openingPercentage: 50,
            isHalfOpen: true,
            snapshotTimestamp: now,
          },
          isMissingData: false,
          missingFields: [],
        },
        {
          id: uuidv4(),
          name: '2# 生产区支路',
          flowRateRatio: 0.4,
          segments: [
            {
              id: uuidv4(),
              name: '2# 支路干管',
              diameter: 80,
              diameterUnit: 'mm',
              length: 40,
              lengthUnit: 'm',
              roughness: 0.05,
              elbowCount: 2,
              elbowAngle: 90,
            },
          ],
          valveConfig: {
            id: uuidv4(),
            valveType: 'butterfly',
            openingPercentage: 75,
            isHalfOpen: true,
            snapshotTimestamp: now,
          },
          isMissingData: true,
          missingFields: ['弯头角度'],
        },
      ],
      mainValve: {
        id: uuidv4(),
        valveType: 'globe',
        openingPercentage: 100,
        isHalfOpen: false,
        snapshotTimestamp: now,
      },
      results: null,
      status: 'draft',
    };

    set({ session: demoSession, evidenceChain: [] });
  },
}));
