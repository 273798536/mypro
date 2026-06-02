import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Project,
  DefectRecord,
  Batch,
  ChiSquareResult,
  Abnormality,
  ReviewAdvice,
  TeamInfo,
  SignificanceLevel
} from '../types';
import { performChiSquareTest } from '../utils/chiSquare';
import { detectAllAbnormalities } from '../utils/anomalyDetection';
import { generateReviewAdvice, generateTeamSummary } from '../utils/reportGenerator';
import { generateRecordsHash, generateParamsHash, deduplicateRecords, autoClassifyRecords } from '../utils/classification';

interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  defectRecords: Map<string, DefectRecord[]>;
  batches: Map<string, Batch[]>;
  results: Map<string, ChiSquareResult | null>;
  abnormalities: Map<string, Abnormality[]>;
  reviewAdvices: Map<string, ReviewAdvice | null>;
  dataHashes: Map<string, { recordsHash: string; paramsHash: string }>;
  rowField: keyof DefectRecord;
  colField: keyof DefectRecord;
  isLoading: boolean;
  error: string | null;
  lastAutoClassifyResult: {
    matchedProjectId: string | null;
    matchedProjectName: string | null;
    confidence: number;
    matchedFields: string[];
    isNewProject: boolean;
    recordsCount: number;
  } | null;
  createProject: (name: string, description: string, teamInfo: TeamInfo) => Project;
  setCurrentProject: (projectId: string | null) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  addDefectRecords: (projectId: string, records: DefectRecord[]) => { added: number; duplicates: number };
  addDefectRecordsWithAutoClassify: (records: DefectRecord[], targetProjectId?: string) => {
    added: number;
    duplicates: number;
    matchedProjectId: string | null;
    matchedProjectName: string | null;
    confidence: number;
    matchedFields: string[];
    isNewProject: boolean;
  };
  addBatch: (projectId: string, batch: Batch) => void;
  setRowField: (field: keyof DefectRecord) => void;
  setColField: (field: keyof DefectRecord) => void;
  performAnalysis: (projectId: string) => ChiSquareResult | null;
  resolveAbnormality: (projectId: string, abnormalityId: string) => void;
  generateReview: (projectId: string) => ReviewAdvice | null;
  deleteProject: (projectId: string) => void;
  clearError: () => void;
  clearAutoClassifyResult: () => void;
  getCurrentProject: () => Project | null;
  getCurrentRecords: () => DefectRecord[];
  getCurrentBatches: () => Batch[];
  getCurrentResult: () => ChiSquareResult | null;
  getCurrentAbnormalities: () => Abnormality[];
  getCurrentReviewAdvice: () => ReviewAdvice | null;
}

const initialTeamInfo: TeamInfo = {
  teamName: '质检一组',
  shift: '早班',
  supervisor: '张主管',
  members: ['李工', '王工', '赵工']
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      defectRecords: new Map(),
      batches: new Map(),
      results: new Map(),
      abnormalities: new Map(),
      reviewAdvices: new Map(),
      dataHashes: new Map(),
      rowField: 'defectType',
      colField: 'category',
      isLoading: false,
      error: null,
      lastAutoClassifyResult: null,

      createProject: (name, description, teamInfo = initialTeamInfo) => {
        const newProject: Project = {
          id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          description,
          significanceLevel: 0.05,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          teamInfo
        };

        set((state) => ({
          projects: [...state.projects, newProject],
          currentProjectId: newProject.id,
          defectRecords: new Map(state.defectRecords).set(newProject.id, []),
          batches: new Map(state.batches).set(newProject.id, []),
          results: new Map(state.results).set(newProject.id, null),
          abnormalities: new Map(state.abnormalities).set(newProject.id, []),
          reviewAdvices: new Map(state.reviewAdvices).set(newProject.id, null)
        }));

        return newProject;
      },

      setCurrentProject: (projectId) => {
        set({ currentProjectId: projectId });
      },

      updateProject: (projectId, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, ...updates, updatedAt: new Date() } : p
          )
        }));
      },

      addDefectRecords: (projectId, records) => {
        const state = get();
        const existingRecords = state.defectRecords.get(projectId) || [];
        const { uniqueRecords, duplicateCount } = deduplicateRecords(records, existingRecords);
        
        const recordsWithProjectId = uniqueRecords.map((r) => ({
          ...r,
          projectId
        }));

        const newRecords = [...existingRecords, ...recordsWithProjectId];
        const newDefectRecords = new Map(state.defectRecords).set(projectId, newRecords);

        set({
          defectRecords: newDefectRecords,
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, updatedAt: new Date(), status: 'draft' } : p
          )
        });

        return { added: uniqueRecords.length, duplicates: duplicateCount };
      },

      addDefectRecordsWithAutoClassify: (records, targetProjectId) => {
        const state = get();
        const projectRecordsMap = new Map<string, DefectRecord[]>();
        state.projects.forEach(p => {
          projectRecordsMap.set(p.id, state.defectRecords.get(p.id) || []);
        });

        const classifyResult = autoClassifyRecords(records, state.projects, projectRecordsMap);
        const matchedProject = classifyResult.projectId
          ? state.projects.find(p => p.id === classifyResult.projectId)
          : null;

        const actualProjectId = targetProjectId || classifyResult.projectId || state.currentProjectId;

        if (!actualProjectId) {
          set({
            error: '请先选择或创建一个项目',
            lastAutoClassifyResult: {
              matchedProjectId: null,
              matchedProjectName: null,
              confidence: classifyResult.match?.confidence || 0,
              matchedFields: classifyResult.match?.matchedFields || [],
              isNewProject: true,
              recordsCount: records.length
            }
          });
          return {
            added: 0,
            duplicates: 0,
            matchedProjectId: null,
            matchedProjectName: null,
            confidence: 0,
            matchedFields: [],
            isNewProject: true
          };
        }

        const existingRecords = state.defectRecords.get(actualProjectId) || [];
        const { uniqueRecords, duplicateCount } = deduplicateRecords(records, existingRecords);

        const recordsWithProjectId = uniqueRecords.map((r) => ({
          ...r,
          projectId: actualProjectId
        }));

        const newRecords = [...existingRecords, ...recordsWithProjectId];
        const newDefectRecords = new Map(state.defectRecords).set(actualProjectId, newRecords);

        const autoClassifyResult = {
          matchedProjectId: classifyResult.projectId,
          matchedProjectName: matchedProject?.name || null,
          confidence: classifyResult.match?.confidence || 0,
          matchedFields: classifyResult.match?.matchedFields || [],
          isNewProject: classifyResult.isNewProject,
          recordsCount: records.length
        };

        set({
          defectRecords: newDefectRecords,
          lastAutoClassifyResult: autoClassifyResult,
          projects: state.projects.map((p) =>
            p.id === actualProjectId ? { ...p, updatedAt: new Date(), status: 'draft' } : p
          )
        });

        return {
          added: uniqueRecords.length,
          duplicates: duplicateCount,
          matchedProjectId: classifyResult.projectId,
          matchedProjectName: matchedProject?.name || null,
          confidence: classifyResult.match?.confidence || 0,
          matchedFields: classifyResult.match?.matchedFields || [],
          isNewProject: classifyResult.isNewProject
        };
      },

      addBatch: (projectId, batch) => {
        set((state) => {
          const projectBatches = state.batches.get(projectId) || [];
          return {
            batches: new Map(state.batches).set(projectId, [...projectBatches, { ...batch, projectId }])
          };
        });
      },

      setRowField: (field) => {
        set({ rowField: field });
      },

      setColField: (field) => {
        set({ colField: field });
      },

      performAnalysis: (projectId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === projectId);
        const records = state.defectRecords.get(projectId) || [];
        const batches = state.batches.get(projectId) || [];

        if (!project || records.length === 0) {
          set({ error: '项目不存在或没有缺陷记录' });
          return null;
        }

        const recordsHash = generateRecordsHash(records);
        const paramsHash = generateParamsHash({
          significanceLevel: project.significanceLevel,
          rowField: state.rowField,
          colField: state.colField
        });

        const existingHashes = state.dataHashes.get(projectId);
        if (existingHashes && existingHashes.recordsHash === recordsHash && existingHashes.paramsHash === paramsHash) {
          const existingResult = state.results.get(projectId);
          if (existingResult) {
            return existingResult;
          }
        }

        const teamSummary = generateTeamSummary(project.teamInfo, records);
        const result = performChiSquareTest(
          records,
          projectId,
          teamSummary,
          project.significanceLevel as SignificanceLevel,
          state.rowField,
          state.colField
        );

        const detectedAbnormalities = detectAllAbnormalities(records, batches);

        const newDataHashes = new Map(state.dataHashes).set(projectId, { recordsHash, paramsHash });

        set({
          results: new Map(state.results).set(projectId, result),
          abnormalities: new Map(state.abnormalities).set(projectId, detectedAbnormalities),
          dataHashes: newDataHashes,
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, updatedAt: new Date(), status: 'completed' } : p
          )
        });

        return result;
      },

      resolveAbnormality: (projectId, abnormalityId) => {
        set((state) => {
          const projectAbnormalities = state.abnormalities.get(projectId) || [];
          const updated = projectAbnormalities.map((a) =>
            a.id === abnormalityId ? { ...a, status: 'resolved' as const, resolvedAt: new Date() } : a
          );
          return {
            abnormalities: new Map(state.abnormalities).set(projectId, updated)
          };
        });
      },

      generateReview: (projectId) => {
        const state = get();
        const project = state.projects.find((p) => p.id === projectId);
        const records = state.defectRecords.get(projectId) || [];
        const result = state.results.get(projectId) || null;
        const abnormalities = state.abnormalities.get(projectId) || [];

        if (!project) {
          set({ error: '项目不存在' });
          return null;
        }

        const review = generateReviewAdvice(project, result, abnormalities, records);
        set({
          reviewAdvices: new Map(state.reviewAdvices).set(projectId, review)
        });

        return review;
      },

      deleteProject: (projectId) => {
        set((state) => {
          const newDefectRecords = new Map(state.defectRecords);
          const newBatches = new Map(state.batches);
          const newResults = new Map(state.results);
          const newAbnormalities = new Map(state.abnormalities);
          const newReviewAdvices = new Map(state.reviewAdvices);
          const newDataHashes = new Map(state.dataHashes);

          newDefectRecords.delete(projectId);
          newBatches.delete(projectId);
          newResults.delete(projectId);
          newAbnormalities.delete(projectId);
          newReviewAdvices.delete(projectId);
          newDataHashes.delete(projectId);

          return {
            projects: state.projects.filter((p) => p.id !== projectId),
            currentProjectId: state.currentProjectId === projectId ? null : state.currentProjectId,
            defectRecords: newDefectRecords,
            batches: newBatches,
            results: newResults,
            abnormalities: newAbnormalities,
            reviewAdvices: newReviewAdvices,
            dataHashes: newDataHashes
          };
        });
      },

      clearError: () => {
        set({ error: null });
      },

      clearAutoClassifyResult: () => {
        set({ lastAutoClassifyResult: null });
      },

      getCurrentProject: () => {
        const state = get();
        return state.projects.find((p) => p.id === state.currentProjectId) || null;
      },

      getCurrentRecords: () => {
        const state = get();
        return state.currentProjectId ? state.defectRecords.get(state.currentProjectId) || [] : [];
      },

      getCurrentBatches: () => {
        const state = get();
        return state.currentProjectId ? state.batches.get(state.currentProjectId) || [] : [];
      },

      getCurrentResult: () => {
        const state = get();
        return state.currentProjectId ? state.results.get(state.currentProjectId) || null : null;
      },

      getCurrentAbnormalities: () => {
        const state = get();
        return state.currentProjectId ? state.abnormalities.get(state.currentProjectId) || [] : [];
      },

      getCurrentReviewAdvice: () => {
        const state = get();
        return state.currentProjectId ? state.reviewAdvices.get(state.currentProjectId) || null : null;
      }
    }),
    {
      name: 'chi-square-app-storage',
      partialize: (state) => ({
        projects: state.projects,
        currentProjectId: state.currentProjectId,
        defectRecords: Array.from(state.defectRecords.entries()),
        batches: Array.from(state.batches.entries()),
        results: Array.from(state.results.entries()),
        abnormalities: Array.from(state.abnormalities.entries()),
        reviewAdvices: Array.from(state.reviewAdvices.entries()),
        dataHashes: Array.from(state.dataHashes.entries())
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.defectRecords = new Map(state.defectRecords as unknown as [string, DefectRecord[]][]);
          state.batches = new Map(state.batches as unknown as [string, Batch[]][]);
          state.results = new Map(state.results as unknown as [string, ChiSquareResult | null][]);
          state.abnormalities = new Map(state.abnormalities as unknown as [string, Abnormality[]][]);
          state.reviewAdvices = new Map(state.reviewAdvices as unknown as [string, ReviewAdvice | null][]);
          state.dataHashes = new Map(state.dataHashes as unknown as [string, { recordsHash: string; paramsHash: string }][]);
        }
      }
    }
  )
);
