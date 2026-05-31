
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FlightRecord, Waypoint, WindZone, GameState, Violation, DataCorrection } from '@/types';
import { mockFlightRecords, mockWindZones, mockWaypoints } from '@/data/mockData';
import { Drones } from '@/constants';
import { generateId } from '@/utils/gameEngine';

interface GameStore {
  windZones: WindZone[];
  waypoints: Waypoint[];
  gameState: GameState;
  flightRecords: FlightRecord[];
  currentFlightId: string | null;
  selectedDroneId: string;
  pilotName: string;
  
  setWindZones: (zones: WindZone[]) => void;
  setWaypoints: (waypoints: Waypoint[]) => void;
  addWaypoint: (waypoint: Waypoint) => void;
  removeWaypoint: (id: string) => void;
  updateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  
  setGameState: (state: Partial<GameState>) => void;
  startFlight: () => void;
  endFlight: () => void;
  
  setSelectedDroneId: (id: string) => void;
  setPilotName: (name: string) => void;
  
  addFlightRecord: (record: FlightRecord) => void;
  updateFlightRecord: (id: string, updates: Partial<FlightRecord>) => void;
  addViolation: (flightId: string, violation: Violation) => void;
  correctFlightData: (flightId: string, correction: Omit<DataCorrection, 'id' | 'flightId'>) => void;
  updateRemark: (flightId: string, newRemark: string) => void;
  
  resetGame: () => void;
  initializeMockData: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      windZones: mockWindZones,
      waypoints: [...mockWaypoints],
      gameState: {
        currentPosition: { x: 80, y: 520 },
        currentBattery: 5870,
        currentWaypointIndex: 0,
        isFlying: false,
        speed: 10,
        currentWind: 'calm',
        windSpeed: 0
      },
      flightRecords: [],
      currentFlightId: null,
      selectedDroneId: 'drone-001',
      pilotName: '',
      
      setWindZones: (zones) => set({ windZones: zones }),
      
      setWaypoints: (waypoints) => set({ waypoints }),
      
      addWaypoint: (waypoint) => set((state) => ({
        waypoints: [...state.waypoints, waypoint].sort((a, b) => a.order - b.order)
      })),
      
      removeWaypoint: (id) => set((state) => ({
        waypoints: state.waypoints.filter(w => w.id !== id)
      })),
      
      updateWaypoint: (id, updates) => set((state) => ({
        waypoints: state.waypoints.map(w => 
          w.id === id ? { ...w, ...updates } : w
        )
      })),
      
      setGameState: (newState) => set((state) => ({
        gameState: { ...state.gameState, ...newState }
      })),
      
      startFlight: () => {
        const state = get();
        const drone = Drones.find(d => d.id === state.selectedDroneId)!;
        const newFlightId = generateId();
        
        const newFlight: FlightRecord = {
          id: newFlightId,
          droneId: state.selectedDroneId,
          pilotName: state.pilotName,
          startTime: new Date().toISOString(),
          endTime: null,
          startBattery: drone.maxBattery,
          endBattery: null,
          waypoints: [...state.waypoints],
          energyLogs: [],
          violations: [],
          score: 100,
          status: 'flying',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          remark: '',
          hasMissingFields: !state.pilotName,
          missingFields: state.pilotName ? [] : ['pilotName'],
          isLateEntry: false,
          remarkModified: false,
          remarkHistory: [],
          corrections: []
        };
        
        set({
          currentFlightId: newFlightId,
          flightRecords: [newFlight, ...state.flightRecords],
          gameState: {
            ...state.gameState,
            isFlying: true,
            currentBattery: drone.maxBattery,
            currentPosition: { ...state.waypoints[0] },
            currentWaypointIndex: 0
          }
        });
      },
      
      endFlight: () => {
        const state = get();
        if (!state.currentFlightId) return;
        
        const flight = state.flightRecords.find(f => f.id === state.currentFlightId);
        if (!flight) return;
        
        set((state) => ({
          flightRecords: state.flightRecords.map(f => 
            f.id === state.currentFlightId
              ? {
                  ...f,
                  endTime: new Date().toISOString(),
                  endBattery: state.gameState.currentBattery,
                  status: 'completed',
                  updatedAt: new Date().toISOString()
                }
              : f
          ),
          gameState: {
            ...state.gameState,
            isFlying: false
          },
          currentFlightId: null
        }));
      },
      
      setSelectedDroneId: (id) => set({ selectedDroneId: id }),
      
      setPilotName: (name) => set({ pilotName: name }),
      
      addFlightRecord: (record) => set((state) => ({
        flightRecords: [record, ...state.flightRecords]
      })),
      
      updateFlightRecord: (id, updates) => set((state) => ({
        flightRecords: state.flightRecords.map(f =>
          f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
        )
      })),
      
      addViolation: (flightId, violation) => set((state) => ({
        flightRecords: state.flightRecords.map(f =>
          f.id === flightId
            ? {
                ...f,
                violations: [...f.violations, violation],
                score: Math.max(0, f.score - violation.penalty),
                updatedAt: new Date().toISOString()
              }
            : f
        )
      })),
      
      correctFlightData: (flightId, correction) => {
        const state = get();
        const flight = state.flightRecords.find(f => f.id === flightId);
        if (!flight) return;
        
        const now = new Date();
        const flightEndTime = new Date(flight.endTime || flight.startTime);
        const hoursDiff = (now.getTime() - flightEndTime.getTime()) / (1000 * 60 * 60);
        const isLateEntry = hoursDiff > 24;
        
        const fullCorrection: DataCorrection = {
          ...correction,
          id: generateId(),
          flightId
        };
        
        set((state) => ({
          flightRecords: state.flightRecords.map(f =>
            f.id === flightId
              ? {
                  ...f,
                  [correction.fieldName]: correction.newValue,
                  corrections: [...f.corrections, fullCorrection],
                  isLateEntry: f.isLateEntry || isLateEntry,
                  lateEntryHours: isLateEntry ? Math.round(hoursDiff) : f.lateEntryHours,
                  updatedAt: new Date().toISOString()
                }
              : f
          )
        }));
      },
      
      updateRemark: (flightId, newRemark) => {
        const state = get();
        const flight = state.flightRecords.find(f => f.id === flightId);
        if (!flight) return;
        
        set((state) => ({
          flightRecords: state.flightRecords.map(f =>
            f.id === flightId
              ? {
                  ...f,
                  remark: newRemark,
                  remarkModified: true,
                  remarkHistory: [
                    ...f.remarkHistory,
                    {
                      oldRemark: f.remark,
                      newRemark,
                      modifiedAt: new Date().toISOString()
                    }
                  ],
                  updatedAt: new Date().toISOString()
                }
              : f
          )
        }));
      },
      
      resetGame: () => set({
        gameState: {
          currentPosition: { x: 80, y: 520 },
          currentBattery: 5870,
          currentWaypointIndex: 0,
          isFlying: false,
          speed: 10,
          currentWind: 'calm',
          windSpeed: 0
        },
        currentFlightId: null
      }),
      
      initializeMockData: () => set({
        flightRecords: [...mockFlightRecords]
      })
    }),
    {
      name: 'drone-game-storage'
    }
  )
);
