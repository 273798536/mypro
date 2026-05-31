import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Box, City, Shipment, ChangeRecord, Conflict, Alert, User, 
  SourceType, ReportFilters 
} from '../types';
import { 
  mockBoxes, mockCities, mockShipments, mockChangeHistory, 
  mockConflicts, mockAlerts, mockUser 
} from '../data/mockData';
import { detectConflicts } from '../utils/detectConflicts';
import { detectAnomalies } from '../utils/detectAnomalies';

function generateId(prefix: string): string {
  return `${prefix}-` + Math.random().toString(36).substring(2, 11);
}

interface AppState {
  currentUser: User;
  boxes: Box[];
  cities: City[];
  shipments: Shipment[];
  changeHistory: ChangeRecord[];
  conflicts: Conflict[];
  alerts: Alert[];
  loading: boolean;
  
  recordChange: (
    entityType: 'box' | 'city' | 'shipment',
    entityId: string,
    fieldName: string,
    oldValue: unknown,
    newValue: unknown,
    source: SourceType,
    operator: string
  ) => void;
  
  addBox: (box: Omit<Box, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBox: (id: string, updates: Partial<Box>, source?: SourceType) => void;
  
  addCity: (city: Omit<City, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCity: (id: string, updates: Partial<City>, source?: SourceType) => void;
  
  updateShipment: (id: string, updates: Partial<Shipment>, source?: SourceType) => void;
  
  resolveConflict: (
    conflictId: string, 
    resolution: 'material' | 'city' | 'custom', 
    customValue?: unknown
  ) => void;
  
  dismissAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  
  recheckAll: () => void;
  
  exportReport: (format: 'pdf' | 'excel', filters: ReportFilters) => Promise<void>;
  
  resetData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: mockUser,
      boxes: mockBoxes,
      cities: mockCities,
      shipments: mockShipments,
      changeHistory: mockChangeHistory,
      conflicts: mockConflicts,
      alerts: mockAlerts,
      loading: false,

      recordChange: (entityType, entityId, fieldName, oldValue, newValue, source, operator) => {
        if (oldValue === newValue) return;
        
        const record: ChangeRecord = {
          id: generateId('ch'),
          entityType,
          entityId,
          fieldName,
          oldValue,
          newValue,
          source,
          operator,
          timestamp: new Date(),
        };
        
        set(state => {
          const newHistory = [record, ...state.changeHistory].slice(0, 500);
          return { changeHistory: newHistory };
        });
        
        setTimeout(() => {
          get().recheckAll();
        }, 100);
      },

      addBox: (box) => {
        const newBox: Box = {
          ...box,
          id: generateId('box'),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set(state => ({ boxes: [...state.boxes, newBox] }));
        
        const { currentUser, recordChange } = get();
        Object.entries(box).forEach(([key, value]) => {
          recordChange('box', newBox.id, key, undefined, value, currentUser.source, currentUser.name);
        });
      },

      updateBox: (id, updates, source) => {
        const { boxes, currentUser, recordChange } = get();
        const box = boxes.find(b => b.id === id);
        if (!box) return;
        
        const actualSource = source || currentUser.source;
        
        Object.entries(updates).forEach(([key, value]) => {
          const oldValue = box[key as keyof Box];
          if (oldValue !== value) {
            recordChange('box', id, key, oldValue, value, actualSource, currentUser.name);
          }
        });
        
        set(state => ({
          boxes: state.boxes.map(b => 
            b.id === id 
              ? { ...b, ...updates, updatedAt: new Date() } 
              : b
          ),
        }));
      },

      addCity: (city) => {
        const newCity: City = {
          ...city,
          id: generateId('city'),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set(state => ({ cities: [...state.cities, newCity] }));
        
        const { currentUser, recordChange } = get();
        Object.entries(city).forEach(([key, value]) => {
          recordChange('city', newCity.id, key, undefined, value, currentUser.source, currentUser.name);
        });
      },

      updateCity: (id, updates, source) => {
        const { cities, currentUser, recordChange } = get();
        const city = cities.find(c => c.id === id);
        if (!city) return;
        
        const actualSource = source || currentUser.source;
        
        Object.entries(updates).forEach(([key, value]) => {
          const oldValue = city[key as keyof City];
          if (oldValue !== value) {
            recordChange('city', id, key, oldValue, value, actualSource, currentUser.name);
          }
        });
        
        set(state => ({
          cities: state.cities.map(c => 
            c.id === id 
              ? { ...c, ...updates, updatedAt: new Date() } 
              : c
          ),
        }));
      },

      updateShipment: (id, updates, source) => {
        const { shipments, currentUser, recordChange } = get();
        const shipment = shipments.find(s => s.id === id);
        if (!shipment) return;
        
        const actualSource = source || currentUser.source;
        
        Object.entries(updates).forEach(([key, value]) => {
          const oldValue = shipment[key as keyof Shipment];
          if (oldValue !== value) {
            recordChange('shipment', id, key, oldValue, value, actualSource, currentUser.name);
          }
        });
        
        set(state => ({
          shipments: state.shipments.map(s => 
            s.id === id 
              ? { ...s, ...updates } 
              : s
          ),
        }));
      },

      resolveConflict: (conflictId, resolution, customValue) => {
        const { conflicts, currentUser, updateBox, updateCity } = get();
        const conflict = conflicts.find(c => c.id === conflictId);
        if (!conflict) return;
        
        let resolvedValue: unknown;
        let status: Conflict['status'];
        
        switch (resolution) {
          case 'material':
            resolvedValue = conflict.materialVersion.value;
            status = 'resolved-material';
            break;
          case 'city':
            resolvedValue = conflict.cityVersion.value;
            status = 'resolved-city';
            break;
          case 'custom':
            resolvedValue = customValue;
            status = 'resolved-custom';
            break;
        }
        
        if (conflict.entityType === 'box') {
          updateBox(conflict.entityId, { [conflict.fieldName]: resolvedValue } as Partial<Box>);
        } else {
          updateCity(conflict.entityId, { [conflict.fieldName]: resolvedValue } as Partial<City>);
        }
        
        set(state => ({
          conflicts: state.conflicts.map(c =>
            c.id === conflictId
              ? { ...c, status, resolvedValue, resolvedBy: currentUser.name, resolvedAt: new Date() }
              : c
          ),
        }));
      },

      dismissAlert: (alertId) => {
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === alertId ? { ...a, status: 'dismissed' } : a
          ),
        }));
      },

      resolveAlert: (alertId) => {
        set(state => ({
          alerts: state.alerts.map(a =>
            a.id === alertId ? { ...a, status: 'resolved' } : a
          ),
        }));
      },

      recheckAll: () => {
        const { boxes, cities, changeHistory, shipments } = get();
        
        const citySimple = cities.map(c => ({ 
          id: c.id, 
          name: c.name, 
          performanceDate: c.performanceDate 
        }));
        
        const newConflicts = detectConflicts(boxes, cities, changeHistory);
        const existingPendingIds = get().conflicts.filter(c => c.status === 'pending').map(c => c.id);
        const mergedConflicts = [
          ...newConflicts.filter(nc => !existingPendingIds.includes(nc.id)),
          ...get().conflicts,
        ];
        
        const newAlerts = detectAnomalies({ boxes, shipments, cities: citySimple });
        const existingActiveIds = get().alerts.filter(a => a.status === 'active').map(a => a.id);
        const mergedAlerts = [
          ...newAlerts.filter(na => !existingActiveIds.some(eid => na.message.includes(eid))),
          ...get().alerts,
        ];
        
        set({ conflicts: mergedConflicts, alerts: mergedAlerts });
      },

      exportReport: async () => {
        set({ loading: true });
        await new Promise(resolve => setTimeout(resolve, 500));
        set({ loading: false });
      },

      resetData: () => {
        set({
          boxes: mockBoxes,
          cities: mockCities,
          shipments: mockShipments,
          changeHistory: mockChangeHistory,
          conflicts: mockConflicts,
          alerts: mockAlerts,
        });
      },
    }),
    {
      name: 'tour-logistics-storage',
      partialize: (state) => ({
        boxes: state.boxes,
        cities: state.cities,
        shipments: state.shipments,
        changeHistory: state.changeHistory,
        conflicts: state.conflicts,
        alerts: state.alerts,
      }),
    }
  )
);
