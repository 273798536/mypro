import { create } from 'zustand';
import {
  TheaterState,
  Seat,
  FilterOptions,
  ViewMode,
  PendingIssue,
  HistoryVersion,
  Obstacle,
} from '@/types';
import { generateMockSeats, getInitialObstacles } from '@/data/mockData';
import { checkAllSeatsVisibility, compareVersions } from '@/utils/visibility';
import { generateHash, generateId } from '@/utils/hash';
import { loadHistory, loadIssues, saveHistory, saveIssues, findDuplicateHash } from '@/utils/storage';

interface TheaterActions {
  setSelectedSeat: (seat: Seat | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  toggleShowRays: () => void;
  runDetection: () => Promise<void>;
  saveVersion: (name: string, description?: string) => void;
  loadVersion: (versionId: string) => void;
  setCompareVersion: (versionId: string | null) => void;
  toggleShowComparison: () => void;
  toggleObstacle: (obstacleId: string) => void;
  addObstacle: (obstacle: Omit<Obstacle, 'id'>) => void;
  removeObstacle: (obstacleId: string) => void;
  addPendingIssue: (issue: Omit<PendingIssue, 'id' | 'createdAt'>) => void;
  updateIssueStatus: (issueId: string, status: PendingIssue['status']) => void;
  getFilteredSeats: () => Seat[];
  getBlockedSeats: () => Seat[];
}

const initialSeats = generateMockSeats();
const initialObstacles = getInitialObstacles();
const savedHistory = loadHistory();
const savedIssues = loadIssues();

export const useTheaterStore = create<TheaterState & TheaterActions>((set, get) => ({
  seats: initialSeats,
  obstacles: initialObstacles,
  selectedSeat: null,
  viewMode: 'perspective',
  filters: {
    section: 'all',
    visibility: 'all',
    priceRange: [100, 500],
    status: 'all',
    searchText: '',
  },
  showRays: false,
  detectionRunning: false,
  history: savedHistory,
  currentVersionId: null,
  compareVersionId: null,
  pendingIssues: savedIssues,
  showComparison: false,

  setSelectedSeat: (seat) => set({ selectedSeat: seat }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  toggleShowRays: () => set((state) => ({ showRays: !state.showRays })),

  runDetection: async () => {
    set({ detectionRunning: true });
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    const { seats, obstacles } = get();
    const detectedSeats = checkAllSeatsVisibility(seats, obstacles);
    
    const railingIssues: PendingIssue[] = [];
    detectedSeats.forEach((seat) => {
      if (!seat.visibility) return;
      
      const blockedByRailing = 
        seat.visibility.stage.blockedBy?.includes('railing') ||
        seat.visibility.leftScreen.blockedBy?.includes('railing') ||
        seat.visibility.rightScreen.blockedBy?.includes('railing');
      
      if (blockedByRailing && seat.visibility.stage.confidence === 'medium') {
        railingIssues.push({
          id: generateId(),
          seatId: seat.id,
          type: 'railing_block',
          description: `座位 ${seat.row}${seat.number} 可能被栏杆遮挡，需人工确认`,
          status: 'pending',
          suggestedAction: '建议现场人工复核座位视线，或调整此区域票价',
          createdAt: Date.now(),
        });
      }
    });
    
    if (railingIssues.length > 0) {
      set((state) => {
        const newIssues = [...state.pendingIssues, ...railingIssues];
        saveIssues(newIssues);
        return { pendingIssues: newIssues };
      });
    }
    
    set({ seats: detectedSeats, detectionRunning: false });
  },

  saveVersion: (name, description) => {
    const { seats, obstacles, history } = get();
    const configHash = generateHash({ seats: seats.map(s => ({ id: s.id, position: s.position })), obstacles });
    
    const duplicate = findDuplicateHash(configHash, history);
    if (duplicate) {
      return;
    }
    
    const version: HistoryVersion = {
      id: generateId(),
      name,
      timestamp: Date.now(),
      configHash,
      seats: JSON.parse(JSON.stringify(seats)),
      obstacles: JSON.parse(JSON.stringify(obstacles)),
      results: {
        totalSeats: seats.length,
        blockedSeats: seats.filter(s => 
          s.visibility && (!s.visibility.stage.visible || !s.visibility.leftScreen.visible || !s.visibility.rightScreen.visible)
        ).length,
      },
      description,
    };
    
    const newHistory = [...history, version];
    saveHistory(newHistory);
    set({ history: newHistory, currentVersionId: version.id });
  },

  loadVersion: (versionId) => {
    const { history } = get();
    const version = history.find((v) => v.id === versionId);
    if (version) {
      set({
        seats: JSON.parse(JSON.stringify(version.seats)),
        obstacles: JSON.parse(JSON.stringify(version.obstacles)),
        currentVersionId: versionId,
      });
    }
  },

  setCompareVersion: (versionId) => {
    if (versionId) {
      const { seats, history } = get();
      const compareVersion = history.find((v) => v.id === versionId);
      if (compareVersion) {
        const comparedSeats = compareVersions(seats, compareVersion.seats);
        set({ seats: comparedSeats, compareVersionId: versionId, showComparison: true });
      }
    } else {
      const { seats } = get();
      const resetSeats = seats.map((s) => ({ ...s, comparisonStatus: undefined }));
      set({ seats: resetSeats, compareVersionId: null, showComparison: false });
    }
  },

  toggleShowComparison: () => set((state) => ({ showComparison: !state.showComparison })),

  toggleObstacle: (obstacleId) =>
    set((state) => ({
      obstacles: state.obstacles.map((o) =>
        o.id === obstacleId ? { ...o, visible: !o.visible } : o
      ),
    })),

  addObstacle: (obstacle) =>
    set((state) => ({
      obstacles: [...state.obstacles, { ...obstacle, id: generateId() }],
    })),

  removeObstacle: (obstacleId) =>
    set((state) => ({
      obstacles: state.obstacles.filter((o) => o.id !== obstacleId),
    })),

  addPendingIssue: (issue) =>
    set((state) => {
      const newIssues = [
        ...state.pendingIssues,
        { ...issue, id: generateId(), createdAt: Date.now() },
      ];
      saveIssues(newIssues);
      return { pendingIssues: newIssues };
    }),

  updateIssueStatus: (issueId, status) =>
    set((state) => {
      const newIssues = state.pendingIssues.map((i) =>
        i.id === issueId ? { ...i, status } : i
      );
      saveIssues(newIssues);
      return { pendingIssues: newIssues };
    }),

  getFilteredSeats: () => {
    const { seats, filters } = get();
    return seats.filter((seat) => {
      if (filters.section !== 'all' && seat.section !== filters.section) return false;
      if (filters.status !== 'all' && seat.status !== filters.status) return false;
      if (seat.price < filters.priceRange[0] || seat.price > filters.priceRange[1]) return false;
      if (filters.searchText) {
        const search = filters.searchText.toLowerCase();
        if (!`${seat.row}${seat.number}`.toLowerCase().includes(search)) return false;
      }
      if (filters.visibility !== 'all' && seat.visibility) {
        const isBlocked = 
          !seat.visibility.stage.visible ||
          !seat.visibility.leftScreen.visible ||
          !seat.visibility.rightScreen.visible;
        const isPartial = 
          seat.visibility.stage.confidence === 'medium' ||
          seat.visibility.leftScreen.confidence === 'medium' ||
          seat.visibility.rightScreen.confidence === 'medium';
        
        if (filters.visibility === 'blocked' && !isBlocked) return false;
        if (filters.visibility === 'visible' && isBlocked) return false;
        if (filters.visibility === 'partial' && !isPartial) return false;
      }
      return true;
    });
  },

  getBlockedSeats: () => {
    const { seats } = get();
    return seats.filter(
      (s) =>
        s.visibility &&
        (!s.visibility.stage.visible ||
          !s.visibility.leftScreen.visible ||
          !s.visibility.rightScreen.visible)
    );
  },
}));
