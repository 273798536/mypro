import { create } from 'zustand';
import type { Point, TimelineEvent, Scenario, FieldMapping } from '@/types';
import { points as mockPoints } from '@/data/points';
import { timelineEvents as mockEvents } from '@/data/events';
import { scenarios as mockScenarios } from '@/data/scenarios';
import { fieldMappings as mockFieldMappings } from '@/data/fieldMappings';

interface AppState {
  points: Point[];
  events: TimelineEvent[];
  scenarios: Scenario[];
  fieldMappings: FieldMapping[];
  selectedPointId: string | null;
  filterStatus: string;
  searchQuery: string;
  setSelectedPointId: (id: string | null) => void;
  setFilterStatus: (status: string) => void;
  setSearchQuery: (query: string) => void;
  getPointById: (id: string) => Point | undefined;
  getEventsByPointId: (pointId: string) => TimelineEvent[];
  getFilteredPoints: () => Point[];
}

export const useAppStore = create<AppState>((set, get) => ({
  points: mockPoints,
  events: mockEvents,
  scenarios: mockScenarios,
  fieldMappings: mockFieldMappings,
  selectedPointId: null,
  filterStatus: 'all',
  searchQuery: '',

  setSelectedPointId: (id) => set({ selectedPointId: id }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getPointById: (id) => get().points.find((p) => p.id === id),

  getEventsByPointId: (pointId) =>
    get()
      .events.filter((e) => e.pointId === pointId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),

  getFilteredPoints: () => {
    const { points, filterStatus, searchQuery } = get();
    return points.filter((p) => {
      const statusMatch = filterStatus === 'all' || p.status === filterStatus;
      const searchMatch =
        searchQuery === '' ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.reporter.includes(searchQuery) ||
        p.note.includes(searchQuery);
      return statusMatch && searchMatch;
    });
  },
}));
