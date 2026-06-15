import { create } from 'zustand';
import {
  mockReviews,
  mockSceneMetas,
  mockMaterials,
  mockJudgments,
  mockPhotos,
  mockAnomalies,
} from '@/data/mockData';
import type {
  Review,
  SceneMeta,
  Material,
  Judgment,
  Photo,
  Anomaly,
} from '@/types';

interface ReviewState {
  reviews: Review[];
  sceneMetas: Record<string, SceneMeta>;
  materials: Record<string, Material[]>;
  judgments: Record<string, Judgment[]>;
  photos: Record<string, Photo[]>;
  anomalies: Record<string, Anomaly[]>;

  getReviewById: (id: string) => Review | undefined;
  getSceneMeta: (reviewId: string) => SceneMeta | undefined;
  getMaterials: (reviewId: string) => Material[];
  getJudgments: (reviewId: string) => Judgment[];
  getPhotos: (reviewId: string) => Photo[];
  getAnomalies: (reviewId: string) => Anomaly[];

  updateSceneLabels: (reviewId: string, labels: string[]) => void;
  updateSideNote: (reviewId: string, note: string, manual?: boolean) => void;
  updatePageSummary: (reviewId: string, summary: string, manual?: boolean) => void;
  regenerateFromLabels: (reviewId: string) => void;

  addMaterial: (reviewId: string, material: Omit<Material, 'id'>) => void;

  addJudgment: (reviewId: string, judgment: Omit<Judgment, 'id' | 'version' | 'isCurrent'>) => void;

  addPhoto: (reviewId: string, photo: Omit<Photo, 'id'>) => void;

  resolveAnomaly: (reviewId: string, anomalyId: string) => void;

  getAnomalyReviews: () => Review[];
  getSampleReview: () => Review | undefined;
}

function generateSideNote(labels: string[], location: string): string {
  const labelText = labels.length > 0 ? labels.join('、') : '待补充';
  return `该${location}${labels.length > 0 ? '属于' + labelText + '场景，' : ''}雨水口积淤情况需结合现场踏勘和设计资料综合判断。当前已标记场景标签：${labelText}。`;
}

function generatePageSummary(labels: string[], location: string, status: string, hasAnomaly: boolean): string {
  const labelText = labels.length > 0 ? labels.join('，') : '待补充';
  const anomalyText = hasAnomaly ? '存在异常待处理' : '暂无异常';
  const statusText =
    status === 'completed'
      ? '复核完成'
      : status === 'processing'
      ? '复核进行中'
      : status === 'anomaly'
      ? '存在异常'
      : '待开始';
  return `${location}雨水口积淤容量复核：场景标签为${labelText}。${statusText}，${anomalyText}。`;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: mockReviews,
  sceneMetas: mockSceneMetas,
  materials: mockMaterials,
  judgments: mockJudgments,
  photos: mockPhotos,
  anomalies: mockAnomalies,

  getReviewById: (id) => get().reviews.find((r) => r.id === id),

  getSceneMeta: (reviewId) => get().sceneMetas[reviewId],

  getMaterials: (reviewId) => get().materials[reviewId] || [],

  getJudgments: (reviewId) => get().judgments[reviewId] || [],

  getPhotos: (reviewId) => get().photos[reviewId] || [],

  getAnomalies: (reviewId) => get().anomalies[reviewId] || [],

  updateSceneLabels: (reviewId, labels) => {
    set((state) => {
      const meta = state.sceneMetas[reviewId];
      if (!meta) return {};

      const review = state.reviews.find((r) => r.id === reviewId);
      const newSideNote = meta.sideNoteManual
        ? meta.sideNote
        : generateSideNote(labels, review?.location || '该路口');
      const newSummary = meta.pageSummaryManual
        ? meta.pageSummary
        : generatePageSummary(labels, review?.location || '该路口', review?.status || 'pending', review?.hasAnomaly || false);

      return {
        sceneMetas: {
          ...state.sceneMetas,
          [reviewId]: {
            ...meta,
            sceneLabels: labels,
            sideNote: newSideNote,
            pageSummary: newSummary,
            updatedAt: new Date().toLocaleString('zh-CN'),
            updatedBy: '老何',
          },
        },
      };
    });
  },

  updateSideNote: (reviewId, note, manual = true) => {
    set((state) => {
      const meta = state.sceneMetas[reviewId];
      if (!meta) return {};
      return {
        sceneMetas: {
          ...state.sceneMetas,
          [reviewId]: {
            ...meta,
            sideNote: note,
            sideNoteManual: manual,
            updatedAt: new Date().toLocaleString('zh-CN'),
            updatedBy: '老何',
          },
        },
      };
    });
  },

  updatePageSummary: (reviewId, summary, manual = true) => {
    set((state) => {
      const meta = state.sceneMetas[reviewId];
      if (!meta) return {};
      return {
        sceneMetas: {
          ...state.sceneMetas,
          [reviewId]: {
            ...meta,
            pageSummary: summary,
            pageSummaryManual: manual,
            updatedAt: new Date().toLocaleString('zh-CN'),
            updatedBy: '老何',
          },
        },
      };
    });
  },

  regenerateFromLabels: (reviewId) => {
    set((state) => {
      const meta = state.sceneMetas[reviewId];
      const review = state.reviews.find((r) => r.id === reviewId);
      if (!meta || !review) return {};

      const newSideNote = generateSideNote(meta.sceneLabels, review.location);
      const newSummary = generatePageSummary(meta.sceneLabels, review.location, review.status, review.hasAnomaly);

      return {
        sceneMetas: {
          ...state.sceneMetas,
          [reviewId]: {
            ...meta,
            sideNote: newSideNote,
            pageSummary: newSummary,
            sideNoteManual: false,
            pageSummaryManual: false,
            updatedAt: new Date().toLocaleString('zh-CN'),
            updatedBy: '系统',
          },
        },
      };
    });
  },

  addMaterial: (reviewId, material) => {
    set((state) => {
      const currentMaterials = state.materials[reviewId] || [];
      const newMaterial: Material = {
        ...material,
        id: `mat-${Date.now()}`,
      };
      return {
        materials: {
          ...state.materials,
          [reviewId]: [...currentMaterials, newMaterial],
        },
        reviews: state.reviews.map((r) =>
          r.id === reviewId
            ? { ...r, updatedAt: new Date().toLocaleString('zh-CN') }
            : r
        ),
      };
    });
  },

  addJudgment: (reviewId, judgment) => {
    set((state) => {
      const currentJudgments = state.judgments[reviewId] || [];
      const newVersion = currentJudgments.length + 1;
      const newJudgment: Judgment = {
        ...judgment,
        id: `jud-${Date.now()}`,
        version: newVersion,
        isCurrent: true,
      };

      const updatedJudgments = currentJudgments.map((j) => ({
        ...j,
        isCurrent: false,
      }));

      return {
        judgments: {
          ...state.judgments,
          [reviewId]: [...updatedJudgments, newJudgment],
        },
        reviews: state.reviews.map((r) =>
          r.id === reviewId
            ? { ...r, updatedAt: new Date().toLocaleString('zh-CN') }
            : r
        ),
      };
    });
  },

  addPhoto: (reviewId, photo) => {
    set((state) => {
      const currentPhotos = state.photos[reviewId] || [];
      const newPhoto: Photo = {
        ...photo,
        id: `photo-${Date.now()}`,
      };

      const meta = state.sceneMetas[reviewId];
      const review = state.reviews.find((r) => r.id === reviewId);
      let updatedMeta = meta;

      if (meta && !meta.pageSummaryManual && review) {
        const photoCount = currentPhotos.length + 1;
        const newSummary = `${review.location}雨水口积淤容量复核：已补录${photoCount}张现场照片。${photo.changeNote}`;
        updatedMeta = {
          ...meta,
          pageSummary: newSummary,
          updatedAt: new Date().toLocaleString('zh-CN'),
          updatedBy: '老何',
        };
      }

      return {
        photos: {
          ...state.photos,
          [reviewId]: [...currentPhotos, newPhoto],
        },
        sceneMetas: updatedMeta
          ? {
              ...state.sceneMetas,
              [reviewId]: updatedMeta,
            }
          : state.sceneMetas,
        reviews: state.reviews.map((r) =>
          r.id === reviewId
            ? { ...r, updatedAt: new Date().toLocaleString('zh-CN') }
            : r
        ),
      };
    });
  },

  resolveAnomaly: (reviewId, anomalyId) => {
    set((state) => {
      const currentAnomalies = state.anomalies[reviewId] || [];
      const updatedAnomalies = currentAnomalies.map((a) =>
        a.id === anomalyId
          ? { ...a, resolved: true, resolvedAt: new Date().toLocaleString('zh-CN') }
          : a
      );

      const hasUnresolved = updatedAnomalies.some((a) => !a.resolved);

      return {
        anomalies: {
          ...state.anomalies,
          [reviewId]: updatedAnomalies,
        },
        reviews: state.reviews.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                hasAnomaly: hasUnresolved,
                status: hasUnresolved ? 'anomaly' : r.status === 'anomaly' ? 'processing' : r.status,
                updatedAt: new Date().toLocaleString('zh-CN'),
              }
            : r
        ),
      };
    });
  },

  getAnomalyReviews: () => {
    return get().reviews.filter((r) => r.hasAnomaly);
  },

  getSampleReview: () => {
    return get().reviews.find((r) => r.status === 'completed');
  },
}));
