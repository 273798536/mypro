import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ChartProject,
  ChartNote,
  BadLine,
  QualityIssue,
  TraceNode,
  QualityReport,
  AnalysisConfig,
} from '../types';
import { generateId } from '../utils';
import { parseChart } from '../core/parser/ChartParser';
import { analyzeQuality } from '../core/engine/QualityEngine';

interface ChartState {
  projects: ChartProject[];
  currentProjectId: string | null;
  selectedIssueId: string | null;
  analysisConfig: AnalysisConfig;

  getCurrentProject: () => ChartProject | null;
  createProject: (name: string, fileName: string, rawContent: string) => ChartProject;
  setCurrentProject: (id: string | null) => void;
  selectIssue: (issueId: string | null) => void;
  parseCurrentProject: () => void;
  analyzeCurrentProject: () => void;
  fixBadLine: (lineNumber: number, newContent: string, operator: string) => void;
  updateAnalysisConfig: (config: Partial<AnalysisConfig>) => void;
  generateReport: () => QualityReport | null;
  deleteProject: (id: string) => void;
  clearAll: () => void;
}

export const useChartStore = create<ChartState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      selectedIssueId: null,
      analysisConfig: {
        denseChordThreshold: 50,
        timingOffsetThreshold: 10,
        minHoldDuration: 100,
      },

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find(p => p.id === currentProjectId) || null;
      },

      createProject: (name: string, fileName: string, rawContent: string) => {
        const now = Date.now();
        const newProject: ChartProject = {
          id: generateId(),
          name,
          difficulty: 'UNKNOWN',
          fileName,
          rawContent,
          notes: [],
          badLines: [],
          issues: [],
          traceGraph: [],
          createdAt: now,
          updatedAt: now,
        };

        set(state => ({
          projects: [...state.projects, newProject],
          currentProjectId: newProject.id,
        }));

        return newProject;
      },

      setCurrentProject: (id: string | null) => {
        set({ currentProjectId: id, selectedIssueId: null });
      },

      selectIssue: (issueId: string | null) => {
        set({ selectedIssueId: issueId });
      },

      parseCurrentProject: () => {
        const project = get().getCurrentProject();
        if (!project) return;

        const parseResult = parseChart(project.rawContent);

        set(state => ({
          projects: state.projects.map(p =>
            p.id === project.id
              ? {
                  ...p,
                  difficulty: parseResult.difficulty,
                  notes: parseResult.notes,
                  badLines: parseResult.badLines,
                  traceGraph: parseResult.traceNodes,
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      analyzeCurrentProject: () => {
        const project = get().getCurrentProject();
        if (!project || project.notes.length === 0) return;

        const analysisConfig = get().analysisConfig;
        const { issues, timingOffsetIssues, traceNodes } = analyzeQuality(
          project.notes,
          project.difficulty,
          analysisConfig
        );

        set(state => ({
          projects: state.projects.map(p =>
            p.id === project.id
              ? {
                  ...p,
                  issues: [...issues, ...timingOffsetIssues],
                  traceGraph: [...p.traceGraph, ...traceNodes],
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      fixBadLine: (lineNumber: number, newContent: string, operator: string) => {
        const project = get().getCurrentProject();
        if (!project) return;

        const badLine = project.badLines.find(b => b.lineNumber === lineNumber);
        if (!badLine) return;

        const fixRecord = {
          id: generateId(),
          timestamp: Date.now(),
          operator,
          originalContent: badLine.content,
          newContent,
          reason: '人工修正',
        };

        const traceNode: TraceNode = {
          id: generateId(),
          type: 'parse',
          name: '人工修正坏行',
          status: 'warning',
          data: {
            lineNumber,
            originalType: badLine.type,
            operator,
          },
          timestamp: Date.now(),
        };

        set(state => ({
          projects: state.projects.map(p =>
            p.id === project.id
              ? {
                  ...p,
                  badLines: p.badLines.map(b =>
                    b.lineNumber === lineNumber
                      ? {
                          ...b,
                          content: newContent,
                          fixed: true,
                          fixHistory: [...(b.fixHistory || []), fixRecord],
                        }
                      : b
                  ),
                  traceGraph: [...p.traceGraph, traceNode],
                  updatedAt: Date.now(),
                }
              : p
          ),
        }));
      },

      updateAnalysisConfig: (config: Partial<AnalysisConfig>) => {
        set(state => ({
          analysisConfig: { ...state.analysisConfig, ...config },
        }));
      },

      generateReport: () => {
        const project = get().getCurrentProject();
        if (!project) return null;

        const timingOffsetIssues = project.issues.filter(i => i.type === 'timing_offset');
        const otherIssues = project.issues.filter(i => i.type !== 'timing_offset');

        const notes = project.notes;
        const totalDuration = notes.length > 1 ? notes[notes.length - 1].time - notes[0].time : 0;
        const noteDensity = totalDuration > 0 ? (notes.length / totalDuration) * 1000 : 0;

        let totalInterval = 0;
        for (let i = 1; i < notes.length; i++) {
          totalInterval += notes[i].time - notes[i - 1].time;
        }
        const averageInterval = notes.length > 1 ? totalInterval / (notes.length - 1) : 0;

        const difficultyScore = Math.min(
          100,
          Math.round(noteDensity * 10 + (timingOffsetIssues.length > 0 ? 20 : 0))
        );

        const report: QualityReport = {
          projectId: project.id,
          generatedAt: Date.now(),
          totalNotes: notes.length,
          issuesCount: {
            critical: project.issues.filter(i => i.severity === 'critical').length,
            warning: project.issues.filter(i => i.severity === 'warning').length,
            info: project.issues.filter(i => i.severity === 'info').length,
          },
          timingOffsetIssues,
          otherIssues,
          statistics: {
            noteDensity: Math.round(noteDensity * 100) / 100,
            averageInterval: Math.round(averageInterval),
            difficultyScore,
          },
        };

        return report;
      },

      deleteProject: (id: string) => {
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
      },

      clearAll: () => {
        set({
          projects: [],
          currentProjectId: null,
          selectedIssueId: null,
        });
      },
    }),
    {
      name: 'chart-quality-store',
      version: 1,
    }
  )
);
