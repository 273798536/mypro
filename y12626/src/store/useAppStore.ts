import { create } from 'zustand';
import { AppStore, TrackPoint, PointStatus, QualityMetrics, ReviewReport, MapBounds, ComparisonMode } from '../types';
import { contours } from '../data/contours';
import { boundaries } from '../data/boundaries';
import { defaultScenario, getSampleById, sampleScenarios } from '../data/samples';
import { snapToGrid } from '../utils/coordinate';
import { checkAllBoundaries, getBounds } from '../utils/geoCalculation';
import { validateColor } from '../utils/colorValidator';
import { generateId } from '../utils/coordinate';

const getInitialBounds = (): MapBounds => {
  const allCoords: [number, number][] = [];
  contours.forEach(c => allCoords.push(...c.coordinates));
  boundaries.forEach(b => allCoords.push(...b.coordinates));
  defaultScenario.points.forEach(p => allCoords.push([p.originalLng, p.originalLat]));
  return getBounds(allCoords);
};

const initialBounds = getInitialBounds();

export const useAppStore = create<AppStore>((set, get) => ({
  currentBatch: defaultScenario.batch,
  trackPoints: defaultScenario.points,
  sourceMaterials: defaultScenario.materials,
  contours: contours,
  boundaries: boundaries,
  mapBounds: initialBounds,
  gridSize: 100,
  isSnappingEnabled: false,
  snappingEnabled: false,
  showGrid: true,
  showBoundaries: true,
  showContours: true,
  reviewStatus: 'pending',
  selectedPointId: null,
  hoveredPointId: null,
  filters: {
    status: 'all',
    sourceMaterial: [],
    searchText: '',
    materialId: null,
    operator: null
  },
  comparisonMode: 'none',
  dataVersion: 0,
  zoom: 1,
  pan: { x: 0, y: 0 },
  viewMode: 'dashboard',

  setCurrentBatch: (batch) => set({ currentBatch: batch, dataVersion: get().dataVersion + 1 }),

  setTrackPoints: (points) => set({ trackPoints: points, dataVersion: get().dataVersion + 1 }),

  updatePoint: (pointId, updates) => {
    const state = get();
    const updatedPoints = state.trackPoints.map(p =>
      p.id === pointId ? { ...p, ...updates } as TrackPoint : p
    );
    set({ trackPoints: updatedPoints, dataVersion: state.dataVersion + 1 });
    get().runDetection();
  },

  deletePoint: (pointId) => {
    const state = get();
    const filteredPoints = state.trackPoints.filter(p => p.id !== pointId);
    set({
      trackPoints: filteredPoints,
      selectedPointId: state.selectedPointId === pointId ? null : state.selectedPointId,
      dataVersion: state.dataVersion + 1
    });
  },

  addPoint: (point) => {
    const state = get();
    set({
      trackPoints: [...state.trackPoints, point],
      dataVersion: state.dataVersion + 1
    });
    get().runDetection();
  },

  setSourceMaterials: (materials) => set({ sourceMaterials: materials }),

  setContours: (contours) => set({ contours }),

  setBoundaries: (boundaries) => set({ boundaries }),

  setMapBounds: (bounds) => set({ mapBounds: bounds }),

  setGridSize: (size) => {
    set({ gridSize: size });
    if (get().snappingEnabled) {
      get().applySnapping();
    }
  },

  setSnappingEnabled: (enabled) => {
    set({ snappingEnabled: enabled, isSnappingEnabled: enabled });
    if (enabled) {
      get().applySnapping();
    }
  },

  setShowGrid: (show) => set({ showGrid: show }),

  setShowBoundaries: (show) => set({ showBoundaries: show }),

  setShowContours: (show) => set({ showContours: show }),

  setSelectedPointId: (id) => set({ selectedPointId: id }),

  setHoveredPointId: (id) => set({ hoveredPointId: id }),

  setFilters: (filters) => {
    set(state => ({
      filters: { ...state.filters, ...filters }
    }));
  },

  setComparisonMode: (mode) => {
    if (typeof mode === 'boolean') {
      set({ comparisonMode: mode ? 'split' : 'none' });
    } else {
      set({ comparisonMode: mode });
    }
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(3, zoom)) }),

  setPan: (pan) => set({ pan }),

  setViewMode: (mode) => set({ viewMode: mode }),

  applySnapping: () => {
    const state = get();
    if (!state.snappingEnabled) return;

    const allCoords: [number, number][] = [];
    state.contours.forEach(c => allCoords.push(...c.coordinates));
    state.boundaries.forEach(b => allCoords.push(...b.coordinates));
    state.trackPoints.forEach(p => allCoords.push([p.originalLng, p.originalLat]));
    const bounds = getBounds(allCoords);

    const updatedPoints = state.trackPoints.map(point => {
      const originalLng = point.originalLng;
      const originalLat = point.originalLat;

      const snapped = snapToGrid(originalLng, originalLat, state.gridSize, bounds);

      return {
        ...point,
        lng: snapped.lng,
        lat: snapped.lat,
        snappedLng: snapped.lng,
        snappedLat: snapped.lat
      } as TrackPoint;
    });

    set({ trackPoints: updatedPoints, dataVersion: state.dataVersion + 1 });
    get().runDetection();
  },

  runDetection: () => {
    const state = get();
    const allCoords: [number, number][] = [];
    state.contours.forEach(c => allCoords.push(...c.coordinates));
    state.boundaries.forEach(b => allCoords.push(...b.coordinates));
    state.trackPoints.forEach(p => allCoords.push([p.originalLng, p.originalLat]));

    const updatedPoints = state.trackPoints.map(point => {
      let status: PointStatus = 'normal';
      const detectionResults = [];

      const lng = state.snappingEnabled && point.snappedLng !== undefined
        ? point.snappedLng
        : point.originalLng;
      const lat = state.snappingEnabled && point.snappedLat !== undefined
        ? point.snappedLat
        : point.originalLat;

      const boundaryChecks = checkAllBoundaries(lng, lat, state.boundaries, 50);
      let boundaryCollision = undefined;

      if (boundaryChecks.length > 0) {
        const mostSevere = boundaryChecks[0];
        const threshold = 50;
        if (mostSevere.result.collisionType === 'inside' && mostSevere.boundary.type === 'core') {
          status = 'out-of-bounds';
          detectionResults.push({
            id: generateId(),
            pointId: point.id,
            type: 'out-of-bounds',
            severity: 'error',
            description: `进入核心保护区：${mostSevere.boundary.name}，深入${Math.abs(mostSevere.result.distance).toFixed(1)}米`,
            details: `边界类型：${mostSevere.boundary.type}，阈值：${threshold}米`,
            confidence: 0.95,
            sourceMaterialId: point.sourceMaterial,
            detectedAt: Date.now()
          });
        } else if (mostSevere.result.collisionType === 'crossing') {
          status = 'out-of-bounds';
          detectionResults.push({
            id: generateId(),
            pointId: point.id,
            type: 'out-of-bounds',
            severity: 'warning',
            description: `靠近${mostSevere.boundary.type === 'core' ? '核心' : '缓冲'}区边界：${mostSevere.boundary.name}，距离${mostSevere.result.distance.toFixed(1)}米`,
            details: `边界类型：${mostSevere.boundary.type}，阈值：${threshold}米`,
            confidence: 0.85,
            sourceMaterialId: point.sourceMaterial,
            detectedAt: Date.now()
          });
        }

        boundaryCollision = {
          boundaryId: mostSevere.boundary.id,
          boundaryName: mostSevere.boundary.name,
          distance: mostSevere.result.distance,
          type: mostSevere.result.collisionType,
          threshold: threshold
        };
      }

      const colorValidation = validateColor(point.color);
      if (!colorValidation.isValid) {
        if (status === 'normal') status = 'color-invalid';
        detectionResults.push({
          id: generateId(),
          pointId: point.id,
          type: 'color-invalid',
          severity: 'warning',
          description: colorValidation.error || '颜色不符合规范',
          details: `颜色值：${point.color}，${colorValidation.details || ''}`,
          confidence: 0.9,
          sourceMaterialId: point.sourceMaterial,
          detectedAt: Date.now()
        });
      }

      if (point.isSupplement && status === 'normal') {
        status = 'supplementary';
        detectionResults.push({
          id: generateId(),
          pointId: point.id,
          type: 'supplementary',
          severity: 'info',
          description: '补录数据',
          details: point.supplementNote || '无备注',
          confidence: 1.0,
          sourceMaterialId: point.sourceMaterial,
          detectedAt: Date.now()
        });
      }

      if (point.status === 'missing-unit' && status === 'normal') {
        status = 'missing-unit';
        detectionResults.push({
          id: generateId(),
          pointId: point.id,
          type: 'missing-unit',
          severity: 'info',
          description: '缺少海拔单位',
          details: '海拔数据缺少单位标注',
          confidence: 1.0,
          sourceMaterialId: point.sourceMaterial,
          detectedAt: Date.now()
        });
      }

      return {
        ...point,
        status,
        boundaryCollision,
        detectionResults: detectionResults.length > 0 ? detectionResults : point.detectionResults
      } as TrackPoint;
    });

    const materialsWithStats = state.sourceMaterials.map(mat => {
      const matPoints = updatedPoints.filter(p => p.sourceMaterial === mat.id);
      const anomalyCount = matPoints.filter(p => p.status !== 'normal').length;
      return {
        ...mat,
        pointCount: matPoints.length,
        anomalyCount
      };
    });

    set({
      trackPoints: updatedPoints,
      sourceMaterials: materialsWithStats,
      dataVersion: state.dataVersion + 1
    });
  },

  exportData: () => {
    const state = get();
    return {
      version: state.dataVersion,
      exportTime: Date.now(),
      batch: state.currentBatch,
      trackPoints: state.trackPoints,
      sourceMaterials: state.sourceMaterials,
      metrics: state.getQualityMetrics()
    };
  },

  loadSampleData: (sampleId) => {
    const sample = getSampleById(sampleId);
    if (!sample) return;

    const allCoords: [number, number][] = [];
    contours.forEach(c => allCoords.push(...c.coordinates));
    boundaries.forEach(b => allCoords.push(...b.coordinates));
    sample.points.forEach(p => allCoords.push([p.originalLng, p.originalLat]));
    const bounds = getBounds(allCoords);

    set({
      currentBatch: sample.batch,
      trackPoints: sample.points,
      sourceMaterials: sample.materials,
      dataVersion: 0,
      selectedPointId: null,
      comparisonMode: 'none',
      mapBounds: bounds,
      pan: { x: 0, y: 0 },
      zoom: 1,
      reviewStatus: 'pending',
      snappingEnabled: false,
      isSnappingEnabled: false,
      filters: {
        status: 'all',
        sourceMaterial: [],
        searchText: '',
        materialId: null,
        operator: null
      }
    });

    setTimeout(() => {
      get().runDetection();
    }, 100);
  },

  batchUpdatePoints: (pointIds, updates) => {
    const state = get();
    const updatedPoints = state.trackPoints.map(p =>
      pointIds.includes(p.id) ? { ...p, ...updates } as TrackPoint : p
    );
    set({ trackPoints: updatedPoints, dataVersion: state.dataVersion + 1 });
    get().runDetection();
  },

  submitForReview: () => {
    const state = get();
    set({ reviewStatus: 'approved' });
    return true;
  },

  updateReviewConclusion: (pointId, conclusion) => {
    const state = get();
    const updatedPoints = state.trackPoints.map(p =>
      p.id === pointId ? {
        ...p,
        reviewConclusion: {
          ...p.reviewConclusion,
          ...conclusion,
          result: conclusion.result || p.reviewConclusion?.result || 'pending',
          reviewed: true
        }
      } as TrackPoint : p
    );
    set({ trackPoints: updatedPoints, dataVersion: state.dataVersion + 1 });
  },

  getFilteredPoints: () => {
    const state = get();
    let points = [...state.trackPoints];

    if (state.filters.status !== 'all') {
      points = points.filter(p => p.status === state.filters.status);
    }

    if (state.filters.materialId) {
      points = points.filter(p => p.sourceMaterial === state.filters.materialId);
    }

    if (state.filters.operator) {
      points = points.filter(p => p.operator === state.filters.operator);
    }

    if (state.filters.searchText) {
      const search = state.filters.searchText.toLowerCase();
      points = points.filter(p =>
        p.id.toLowerCase().includes(search) ||
        p.originalLng.toString().includes(search) ||
        p.originalLat.toString().includes(search) ||
        p.operator.toLowerCase().includes(search) ||
        (p.supplementNote && p.supplementNote.toLowerCase().includes(search))
      );
    }

    if (state.filters.sourceMaterial.length > 0) {
      points = points.filter(p => state.filters.sourceMaterial.includes(p.sourceMaterial));
    }

    return points.sort((a, b) => a.timestamp - b.timestamp);
  },

  getQualityMetrics: (): QualityMetrics => {
    const state = get();
    const points = state.trackPoints;
    const total = points.length;

    if (total === 0) {
      return {
        completeness: 0,
        accuracy: 0,
        anomalyRate: 0,
        totalPoints: 0,
        normalCount: 0,
        anomalyCount: 0,
        byStatus: {},
        byMaterial: []
      };
    }

    const normalCount = points.filter(p => p.status === 'normal').length;
    const anomalyCount = total - normalCount;
    const completeCount = points.filter(p => p.status !== 'missing-unit').length;

    const byStatus: Record<string, number> = {};
    points.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    });

    const byMaterial = state.sourceMaterials.map(mat => {
      const matPoints = points.filter(p => p.sourceMaterial === mat.id);
      return {
        materialId: mat.id,
        materialName: mat.name,
        total: matPoints.length,
        anomalies: matPoints.filter(p => p.status !== 'normal').length
      };
    });

    return {
      completeness: Math.round((completeCount / total) * 100),
      accuracy: Math.round((normalCount / total) * 100),
      anomalyRate: Math.round((anomalyCount / total) * 100),
      totalPoints: total,
      normalCount,
      anomalyCount,
      byStatus,
      byMaterial
    };
  }
}));
