import { create } from 'zustand';
import type { SimulationState, SolarSailParams, OrbitPoint, Vector3, ValidationRecord } from '@/types';
import { performFullCalculation } from '@/physics/radiationPressure';
import { validateAllParams, hasCriticalErrors } from '@/physics/validation';

interface SolarSailStore extends SimulationState {
  setParams: (params: Partial<SolarSailParams>) => void;
  setPlaying: (isPlaying: boolean) => void;
  resetSimulation: () => void;
  stepSimulation: () => void;
  clearRecords: () => void;
  loadSampleData: (sample: 'normal' | 'zeroMass') => void;
}

const initialParams: SolarSailParams = {
  sailArea: 100,
  spacecraftMass: 100,
  attitudeAngle: 45,
  timeStep: 60
};

const initialPosition: Vector3 = { x: 0, y: 10, z: 0 };
const initialVelocity: Vector3 = { x: 0.01, y: 0, z: 0 };

export const useSolarSailStore = create<SolarSailStore>((set, get) => ({
  params: initialParams,
  currentTime: 0,
  isPlaying: false,
  orbitData: [],
  position: initialPosition,
  velocity: initialVelocity,
  validationRecords: [],

  setParams: (newParams) => {
    const currentParams = get().params;
    const updatedParams = { ...currentParams, ...newParams };
    
    const validationRecords = validateAllParams(updatedParams);
    
    set({
      params: updatedParams,
      validationRecords
    });
  },

  setPlaying: (isPlaying) => {
    set({ isPlaying });
  },

  resetSimulation: () => {
    const params = get().params;
    const validationRecords = validateAllParams(params);
    
    set({
      currentTime: 0,
      position: initialPosition,
      velocity: initialVelocity,
      orbitData: [],
      isPlaying: false,
      validationRecords
    });
  },

  stepSimulation: () => {
    const state = get();
    
    if (hasCriticalErrors(state.validationRecords)) {
      return;
    }

    const result = performFullCalculation(
      state.params,
      state.position,
      state.velocity
    );

    const orbitPoint: OrbitPoint = {
      time: state.currentTime,
      x: result.position.x,
      y: result.position.y,
      z: result.position.z,
      velocity: Math.sqrt(result.velocity.x ** 2 + result.velocity.y ** 2 + result.velocity.z ** 2),
      radiationPressure: result.radiationPressure,
      acceleration: result.acceleration
    };

    const newOrbitData = [...state.orbitData, orbitPoint].slice(-1000);

    set({
      position: result.position,
      velocity: result.velocity,
      currentTime: state.currentTime + state.params.timeStep,
      orbitData: newOrbitData
    });
  },

  clearRecords: () => {
    set({ validationRecords: [] });
  },

  loadSampleData: (sample) => {
    if (sample === 'normal') {
      const normalParams: SolarSailParams = {
        sailArea: 100,
        spacecraftMass: 50,
        attitudeAngle: 30,
        timeStep: 60
      };
      const validationRecords = validateAllParams(normalParams);
      set({
        params: normalParams,
        validationRecords,
        currentTime: 0,
        position: initialPosition,
        velocity: initialVelocity,
        orbitData: [],
        isPlaying: false
      });
    } else if (sample === 'zeroMass') {
      const zeroMassParams: SolarSailParams = {
        sailArea: 100,
        spacecraftMass: 0,
        attitudeAngle: 45,
        timeStep: 60
      };
      const validationRecords = validateAllParams(zeroMassParams);
      set({
        params: zeroMassParams,
        validationRecords,
        currentTime: 0,
        position: initialPosition,
        velocity: initialVelocity,
        orbitData: [],
        isPlaying: false
      });
    }
  }
}));
