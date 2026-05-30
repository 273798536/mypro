import { create } from 'zustand/react';
import type { AppState, FilterState, SpacePoint3D, ResearchConclusion, ChangeRecord } from '../types';
import { mockSegments } from '../data/mock/segments';
import { mockAnnotations } from '../data/mock/annotations';
import { mockSpectrums } from '../data/mock/spectrums';
import { mockIssues } from '../data/mock/issues';
import { mapTo3DSpace } from '../utils/dataMapper';
import { createSavedView, saveViewsToStorage, loadViewsFromStorage, loadConclusionsFromStorage, saveConclusionsToStorage, generateId } from '../utils/cameraUtils';

const defaultFilters: FilterState = {
  timeRange: [0, 100],
  fingerTypes: [],
  frequencyRange: [0, 20000],
  quality: [],
  searchKeyword: ''
};

function filterPoints(
  spacePoints: SpacePoint3D[],
  filters: FilterState,
  segments: AppState['segments'],
  totalDuration: number
): SpacePoint3D[] {
  return spacePoints.filter(point => {
    if (filters.fingerTypes.length > 0 && !filters.fingerTypes.includes(point.fingerType)) {
      return false;
    }

    const segment = segments.find(s => s.id === point.segmentId);
    if (!segment) return false;

    if (filters.quality.length > 0 && !filters.quality.includes(segment.quality)) {
      return false;
    }

    const pointTime = point.y / 100 * totalDuration;
    if (pointTime < filters.timeRange[0] || pointTime > filters.timeRange[1]) {
      return false;
    }

    const pointFreq = Math.pow(10, point.z / 10 * (Math.log10(20000) - Math.log10(20)) + Math.log10(20));
    if (pointFreq < filters.frequencyRange[0] || pointFreq > filters.frequencyRange[1]) {
      return false;
    }

    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      return point.label.toLowerCase().includes(keyword) ||
             segment.name.toLowerCase().includes(keyword);
    }

    return true;
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  segments: [],
  annotations: [],
  spectrums: [],
  spacePoints: [],
  filteredPoints: [],
  issues: [],
  conclusions: [],
  selectedSegmentId: null,
  selectedPointIds: [],
  currentTime: 0,
  isPlaying: false,
  sidebarCollapsed: false,
  filters: defaultFilters,
  savedViews: [],
  totalDuration: 96,

  loadData: () => {
    const segments = mockSegments;
    const annotations = mockAnnotations;
    const spectrums = mockSpectrums;
    const issues = mockIssues;
    const spacePoints = mapTo3DSpace(segments, annotations, spectrums);
    const savedViews = loadViewsFromStorage();
    const conclusions = loadConclusionsFromStorage();
    const totalDuration = Math.max(...segments.map(s => s.endTime));
    const filters: FilterState = { ...defaultFilters, timeRange: [0, totalDuration] as [number, number] };
    const filteredPoints = filterPoints(spacePoints, filters, segments, totalDuration);

    set({
      segments,
      annotations,
      spectrums,
      spacePoints,
      filteredPoints,
      issues,
      conclusions,
      savedViews,
      totalDuration,
      filters
    });
  },

  selectSegment: (id: string | null) => {
    const { spacePoints } = get();
    const selectedPoints = id 
      ? spacePoints.filter(p => p.segmentId === id).map(p => p.id)
      : [];
    set({ selectedSegmentId: id, selectedPointIds: selectedPoints });
  },

  selectPoints: (ids: string[]) => {
    const { spacePoints } = get();
    const selectedPoint = ids.length > 0 ? spacePoints.find(p => p.id === ids[0]) : null;
    const segmentId = selectedPoint?.segmentId || null;
    set({ selectedPointIds: ids, selectedSegmentId: segmentId });
  },

  setTime: (time: number) => {
    set({ currentTime: time });
  },

  togglePlay: () => {
    set(state => ({ isPlaying: !state.isPlaying }));
  },

  setFilters: (newFilters: Partial<FilterState>) => {
    set(state => {
      const filters = { ...state.filters, ...newFilters };
      const filteredPoints = filterPoints(state.spacePoints, filters, state.segments, state.totalDuration);
      return { filters, filteredPoints };
    });
  },

  saveView: (name: string) => {
    const { savedViews, filters } = get();
    const newView = createSavedView(
      name,
      [15, 12, 15],
      [5, 50, 5],
      filters
    );
    const updatedViews = [...savedViews, newView];
    saveViewsToStorage(updatedViews);
    set({ savedViews: updatedViews });
  },

  loadView: (id: string) => {
    const { savedViews } = get();
    const view = savedViews.find(v => v.id === id);
    if (view) {
      set({ filters: view.filters });
    }
  },

  deleteView: (id: string) => {
    const { savedViews } = get();
    const updatedViews = savedViews.filter(v => v.id !== id);
    saveViewsToStorage(updatedViews);
    set({ savedViews: updatedViews });
  },

  markIssue: (issue) => {
    const { issues } = get();
    const newIssue = {
      ...issue,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    set({ issues: [...issues, newIssue] });
  },

  resolveIssue: (issueId: string) => {
    const { issues } = get();
    const updatedIssues = issues.map(i => 
      i.id === issueId ? { ...i, status: 'resolved' as const } : i
    );
    set({ issues: updatedIssues });
  },

  addConclusion: (conclusion) => {
    const { conclusions } = get();
    const now = new Date().toISOString();
    const newConclusion: ResearchConclusion = {
      ...conclusion,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      changeHistory: [{
        id: generateId(),
        timestamp: now,
        author: '当前用户',
        changeType: 'create',
        description: '创建结论'
      }]
    };
    const updated = [...conclusions, newConclusion];
    saveConclusionsToStorage(updated);
    set({ conclusions: updated });
  },

  updateConclusion: (id: string, changes: Partial<ResearchConclusion>) => {
    const { conclusions } = get();
    const now = new Date().toISOString();
    const changeRecord: ChangeRecord = {
      id: generateId(),
      timestamp: now,
      author: '当前用户',
      changeType: 'update',
      description: '更新结论内容'
    };
    const updated = conclusions.map(c => 
      c.id === id 
        ? { ...c, ...changes, updatedAt: now, changeHistory: [...c.changeHistory, changeRecord] }
        : c
    );
    saveConclusionsToStorage(updated);
    set({ conclusions: updated });
  },

  toggleSidebar: () => {
    set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  }
}));

export function useFilteredPoints(): SpacePoint3D[] {
  return useAppStore(state => state.filteredPoints);
}
