import { create } from 'zustand';
import type { ScoreVersion, Annotation, Part, ReconciliationIssue, TraceNode } from '../../shared/types';
import { mockScoreVersions, mockAnnotations, mockParts, mockIssues } from '../data/mockData';

interface StoreState {
  scoreVersions: ScoreVersion[];
  annotations: Annotation[];
  parts: Part[];
  issues: ReconciliationIssue[];
  selectedTraceId: string | null;
  traceNodes: TraceNode[];
  latestVersion: string;
  setSelectedTraceId: (id: string | null) => void;
  buildTrace: (partId: string) => void;
  resolveIssue: (issueId: string) => void;
  getPartById: (id: string) => Part | undefined;
  getAnnotationById: (id: string) => Annotation | undefined;
}

export const useStore = create<StoreState>((set, get) => {
  const latestVersion = mockScoreVersions.reduce((latest, v) => 
    v.version.localeCompare(latest, undefined, { numeric: true, sensitivity: 'base' }) > 0 ? v.version : latest
  , '0.0.0');

  return {
    scoreVersions: mockScoreVersions,
    annotations: mockAnnotations,
    parts: mockParts,
    issues: mockIssues,
    selectedTraceId: null,
    traceNodes: [],
    latestVersion,
    
    setSelectedTraceId: (id) => set({ selectedTraceId: id }),
    
    buildTrace: (partId) => {
      const { parts, annotations, scoreVersions } = get();
      const part = parts.find(p => p.id === partId);
      if (!part) return;

      const nodes: TraceNode[] = [];
      
      const relevantAnnotations = annotations.filter(a => 
        scoreVersions.find(v => v.id === a.scoreVersionId)?.version === part.currentVersion
      );
      
      relevantAnnotations.forEach((a, idx) => {
        nodes.push({
          id: `trace-a-${idx}`,
          type: 'annotation',
          title: `批注录入: ${a.type === 'bowing' ? '弓法' : a.type === 'dynamics' ? '力度' : '页码'}`,
          description: a.content,
          operator: a.createdBy,
          timestamp: a.createdAt,
        });
      });

      const version = scoreVersions.find(v => v.version === part.currentVersion);
      if (version) {
        nodes.push({
          id: `trace-v-${version.id}`,
          type: 'version',
          title: `版本生成: ${version.version}`,
          description: version.name,
          operator: version.createdBy,
          timestamp: version.createdAt,
        });
      }

      if (part.distributedAt) {
        nodes.push({
          id: `trace-d-${partId}`,
          type: 'distribution',
          title: '曲谱发放',
          description: `向${part.name}发放版本 ${part.currentVersion}`,
          operator: '谱务管理员',
          timestamp: part.distributedAt,
        });
      }

      if (part.confirmedAt && part.confirmedBy) {
        nodes.push({
          id: `trace-c-${partId}`,
          type: 'confirmation',
          title: '接收确认',
          description: `${part.name}已确认接收`,
          operator: part.confirmedBy,
          timestamp: part.confirmedAt,
        });
      }

      nodes.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      set({ traceNodes: nodes, selectedTraceId: partId });
    },

    resolveIssue: (issueId) => set((state) => ({
      issues: state.issues.map(i => 
        i.id === issueId ? { ...i, resolved: true } : i
      ),
    })),

    getPartById: (id) => get().parts.find(p => p.id === id),
    getAnnotationById: (id) => get().annotations.find(a => a.id === id),
  };
});
