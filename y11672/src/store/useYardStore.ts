import { create } from 'zustand';
import { Container, Alert, Filters, SimulationState, ViewMode } from '../types';
import { generateDemoData } from '../utils/dataGenerator';
import { runAllDetections } from '../utils/detection';

interface YardState {
  containers: Container[];
  selectedContainer: string | null;
  hoveredContainer: string | null;
  alerts: Alert[];
  filters: Filters;
  simulation: SimulationState;
  viewMode: ViewMode;
  isLoading: boolean;
  
  initDemoData: () => void;
  selectContainer: (id: string | null) => void;
  hoverContainer: (id: string | null) => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  runDetection: () => void;
  setViewMode: (mode: ViewMode) => void;
  getFilteredContainers: () => Container[];
  
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  setSimulationStep: (step: number) => void;
  setSimulationSpeed: (speed: number) => void;
}

const initialFilters: Filters = {
  containerId: '',
  bay: null,
  row: null,
  dangerousLevel: [],
  trainId: '',
  pickupOrder: null,
  status: []
};

const initialSimulation: SimulationState = {
  isPlaying: false,
  currentStep: 0,
  totalSteps: 0,
  speed: 1,
  pickupSequence: [],
  conflicts: []
};

export const useYardStore = create<YardState>((set, get) => ({
  containers: [],
  selectedContainer: null,
  hoveredContainer: null,
  alerts: [],
  filters: initialFilters,
  simulation: initialSimulation,
  viewMode: 'normal',
  isLoading: false,

  initDemoData: () => {
    set({ isLoading: true });
    const containers = generateDemoData();
    const alerts = runAllDetections(containers);
    
    const pickupSequence = containers
      .filter(c => c.booking.pickupOrder > 0 && c.booking.status !== 'completed')
      .sort((a, b) => a.booking.pickupOrder - b.booking.pickupOrder)
      .map(c => c.id);
    
    set({
      containers,
      alerts,
      simulation: {
        ...initialSimulation,
        pickupSequence,
        totalSteps: pickupSequence.length
      },
      isLoading: false
    });
  },

  selectContainer: (id) => set({ selectedContainer: id }),

  hoverContainer: (id) => set({ hoveredContainer: id }),

  setFilters: (newFilters) => set(state => ({
    filters: { ...state.filters, ...newFilters }
  })),

  resetFilters: () => set({ filters: initialFilters }),

  runDetection: () => {
    const { containers } = get();
    const alerts = runAllDetections(containers);
    set({ alerts });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  getFilteredContainers: () => {
    const { containers, filters } = get();
    return containers.filter(container => {
      if (filters.containerId && !container.id.toLowerCase().includes(filters.containerId.toLowerCase())) {
        return false;
      }
      if (filters.bay !== null && container.bay !== filters.bay) {
        return false;
      }
      if (filters.row !== null && container.row !== filters.row) {
        return false;
      }
      if (filters.dangerousLevel.length > 0 && !filters.dangerousLevel.includes(container.dangerousGoods.level)) {
        return false;
      }
      if (filters.trainId && !container.booking.trainId.includes(filters.trainId)) {
        return false;
      }
      if (filters.pickupOrder) {
        const [min, max] = filters.pickupOrder;
        if (container.booking.pickupOrder < min || container.booking.pickupOrder > max) {
          return false;
        }
      }
      if (filters.status.length > 0 && !filters.status.includes(container.booking.status)) {
        return false;
      }
      return true;
    });
  },

  startSimulation: () => set(state => ({
    simulation: { ...state.simulation, isPlaying: true }
  })),

  stopSimulation: () => set(state => ({
    simulation: { ...state.simulation, isPlaying: false }
  })),

  resetSimulation: () => set(state => ({
    simulation: { ...state.simulation, isPlaying: false, currentStep: 0 }
  })),

  setSimulationStep: (step) => set(state => ({
    simulation: { ...state.simulation, currentStep: step }
  })),

  setSimulationSpeed: (speed) => set(state => ({
    simulation: { ...state.simulation, speed }
  }))
}));
