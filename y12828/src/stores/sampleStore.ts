import { create } from 'zustand';
import {
  SampleVersion,
  ReviewComment,
  FinalConclusion,
  DedupResult,
  DiffResult,
  AuditLog,
  User,
  StatisticsOverview,
  TracePathResult,
  Barcode,
  SourceOrigin,
  GroupIndicators,
  SequencingResult,
  TraceNode,
  LineageGraphData,
} from '@/types';
import { versionControlEngine } from '@/engines/versionControlEngine';
import { diffEngine } from '@/engines/diffEngine';
import { lineageEngine } from '@/engines/lineageEngine';
import { deduplicationEngine } from '@/engines/deduplicationEngine';
import { auditEngine } from '@/engines/auditEngine';
import { generateMockData, generateStatistics } from '@/mock/dataGenerator';
import { v4 as uuidv4 } from 'uuid';

interface SampleState {
  users: User[];
  versions: SampleVersion[];
  comments: ReviewComment[];
  conclusions: FinalConclusion[];
  dedupResults: DedupResult[];
  auditLogs: AuditLog[];
  pendingDiffs: DiffResult[];
  statistics: StatisticsOverview;
  selectedBarcode: Barcode | null;
  selectedVersion: SampleVersion | null;
  selectedConclusion: FinalConclusion | null;
  tracePath: TracePathResult | null;
  lineageGraph: LineageGraphData | null;
  isLoading: boolean;
  searchQuery: string;
  filters: {
    status: string;
    dateRange: [number, number] | null;
    hasDuplicate: boolean | null;
  };

  initializeData: () => void;
  setSelectedBarcode: (barcode: Barcode | null) => void;
  setSelectedVersion: (version: SampleVersion | null) => void;
  setSelectedConclusion: (conclusion: FinalConclusion | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<SampleState['filters']>) => void;

  getVersionHistory: (barcode: Barcode) => SampleVersion[];
  getLatestVersion: (barcode: Barcode) => SampleVersion | null;
  getVersionById: (versionId: string) => SampleVersion | null;
  getCommentsForBarcode: (barcode: Barcode) => ReviewComment[];
  getConclusionForBarcode: (barcode: Barcode) => FinalConclusion | undefined;
  getDedupResultForBarcode: (barcode: Barcode) => DedupResult | undefined;

  createVersion: (
    barcode: Barcode,
    data: {
      sequencingResult?: Partial<SequencingResult>;
      groupIndicators?: Partial<GroupIndicators>;
      changeReason: string;
      sourceOrigin: SourceOrigin;
      parentVersionId?: string;
    },
    operatorId: string
  ) => SampleVersion;

  addManualCorrection: (
    versionId: string,
    correction: {
      fieldName: string;
      oldValue: any;
      newValue: any;
      reason: string;
    },
    operatorId: string
  ) => void;

  addReviewComment: (
    barcode: Barcode,
    versionId: string,
    content: string,
    operatorId: string,
    operatorName: string
  ) => ReviewComment;

  confirmConclusion: (
    barcode: Barcode,
    finalResult: string,
    conclusion: string,
    reviewCommentIds: string[],
    operatorId: string,
    operatorName: string
  ) => FinalConclusion;

  linkCommentToConclusion: (commentId: string, conclusionId: string) => void;

  markAsDuplicate: (barcode: Barcode, confirmed: boolean, operatorId: string, operatorName: string) => void;
  setMergeStrategy: (barcode: Barcode, strategy: 'keep_latest' | 'keep_original' | 'manual', operatorId: string, operatorName: string) => void;

  generateTracePath: (conclusionId: string) => TracePathResult | null;
  generateLineageGraph: (barcode: Barcode) => LineageGraphData | null;

  getFilteredVersions: () => SampleVersion[];
  getFilteredDiffs: () => DiffResult[];
  getFilteredDedupResults: () => DedupResult[];

  refreshStatistics: () => void;
}

export const useSampleStore = create<SampleState>((set, get) => ({
  users: [],
  versions: [],
  comments: [],
  conclusions: [],
  dedupResults: [],
  auditLogs: [],
  pendingDiffs: [],
  statistics: {
    todayImports: 0,
    pendingDiffs: 0,
    duplicateWarnings: 0,
    aiAnalysisProgress: 0,
    totalSamples: 0,
    confirmedConclusions: 0,
    pendingReviews: 0,
    thisMonthAudits: 0,
  },
  selectedBarcode: null,
  selectedVersion: null,
  selectedConclusion: null,
  tracePath: null,
  lineageGraph: null,
  isLoading: false,
  searchQuery: '',
  filters: {
    status: 'all',
    dateRange: null,
    hasDuplicate: null,
  },

  initializeData: () => {
    set({ isLoading: true });
    try {
      const data = generateMockData();
      const statistics = generateStatistics(
        data.versions,
        data.dedupResults,
        data.pendingDiffs,
        data.comments,
        data.conclusions
      );

      set({
        users: data.users,
        versions: data.versions,
        comments: data.comments,
        conclusions: data.conclusions,
        dedupResults: data.dedupResults,
        auditLogs: data.auditLogs,
        pendingDiffs: data.pendingDiffs,
        statistics,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to initialize data:', error);
      set({ isLoading: false });
    }
  },

  setSelectedBarcode: (barcode) => set({ selectedBarcode: barcode }),
  setSelectedVersion: (version) => set({ selectedVersion: version }),
  setSelectedConclusion: (conclusion) => set({ selectedConclusion: conclusion }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),

  getVersionHistory: (barcode) => {
    return get().versions.filter((v) => v.barcode === barcode).sort((a, b) => a.versionNumber - b.versionNumber);
  },

  getLatestVersion: (barcode) => {
    const versions = get().getVersionHistory(barcode);
    return versions[versions.length - 1] || null;
  },

  getVersionById: (versionId) => {
    return get().versions.find((v) => v.versionId === versionId) || null;
  },

  getCommentsForBarcode: (barcode) => {
    return get().comments.filter((c) => c.barcode === barcode).sort((a, b) => b.reviewedAt - a.reviewedAt);
  },

  getConclusionForBarcode: (barcode) => {
    return get().conclusions.find((c) => c.barcode === barcode);
  },

  getDedupResultForBarcode: (barcode) => {
    return get().dedupResults.find((d) => d.barcode === barcode);
  },

  createVersion: (barcode, data, operatorId) => {
    const sourceOrigin = data.sourceOrigin || {
      id: uuidv4(),
      originalRowNumber: 0,
      originalFileName: '手动创建',
      sourceRemark: '手动创建版本',
      importBatchId: uuidv4(),
      importTimestamp: Date.now(),
      importOperatorId: operatorId,
    };

    const existing = get().getVersionHistory(barcode);
    const parent = existing[existing.length - 1];

    const newVersion: SampleVersion = {
      versionId: uuidv4(),
      versionNumber: existing.length + 1,
      parentVersionId: data.parentVersionId || parent?.versionId || null,
      barcode,
      sequencingResult: {
        geneName: '',
        variant: '',
        alleleFrequency: 0,
        qualityScore: 0,
        coverage: 0,
        interpretation: '',
        ...data.sequencingResult,
      },
      manualCorrections: [],
      groupIndicators: {
        groupId: uuidv4(),
        batchId: '',
        testDate: new Date().toISOString().split('T')[0],
        testType: '',
        operator: '',
        biosafetyCabinetId: '',
        ...data.groupIndicators,
      },
      createdAt: Date.now(),
      createdBy: operatorId,
      changeReason: data.changeReason,
      isDuplicate: false,
      sourceOrigin,
      status: 'pending',
    };

    const versions = versionControlEngine.createVersion(
      barcode,
      newVersion,
      sourceOrigin,
      data.parentVersionId
    );

    set((state) => ({
      versions: [...state.versions, newVersion],
    }));

    auditEngine.logActionForCurrentUser(
      'create_version',
      'version',
      newVersion.versionId,
      {
        barcode,
        versionNumber: newVersion.versionNumber,
        changeReason: data.changeReason,
      }
    );

    get().refreshStatistics();

    return newVersion;
  },

  addManualCorrection: (versionId, correction, operatorId) => {
    set((state) => {
      const versions = state.versions.map((v) => {
        if (v.versionId === versionId) {
          const newCorrection = {
            ...correction,
            correctionId: uuidv4(),
            correctedBy: operatorId,
            correctedAt: Date.now(),
            reviewCommentId: null,
          };
          return {
            ...v,
            manualCorrections: [...v.manualCorrections, newCorrection],
            status: 'reviewing' as const,
          };
        }
        return v;
      });

      const updatedVersion = versions.find((v) => v.versionId === versionId);
      if (updatedVersion) {
        versionControlEngine.getVersionHistory(updatedVersion.barcode).forEach((v, i, arr) => {
          if (v.versionId === versionId) {
            arr[i] = updatedVersion;
          }
        });
      }

      return { versions };
    });

    auditEngine.logActionForCurrentUser(
      'manual_correction',
      'version',
      versionId,
      {
        field: correction.fieldName,
        reason: correction.reason,
      }
    );

    get().refreshStatistics();
  },

  addReviewComment: (barcode, versionId, content, operatorId, operatorName) => {
    const comment: ReviewComment = {
      commentId: uuidv4(),
      barcode,
      versionId,
      content,
      reviewedBy: operatorId,
      reviewedAt: Date.now(),
      finalConclusionId: null,
    };

    set((state) => ({
      comments: [...state.comments, comment],
    }));

    auditEngine.logAction(
      operatorId,
      operatorName,
      'add_review_comment',
      'review_comment',
      comment.commentId,
      {
        barcode,
        versionId,
      }
    );

    get().refreshStatistics();

    return comment;
  },

  confirmConclusion: (barcode, finalResult, conclusion, reviewCommentIds, operatorId, operatorName) => {
    const finalConclusion: FinalConclusion = {
      conclusionId: uuidv4(),
      barcode,
      finalResult,
      conclusion,
      confirmedBy: operatorId,
      confirmedAt: Date.now(),
      reviewCommentIds,
      traceLinkIds: [uuidv4()],
      isFinal: true,
    };

    set((state) => {
      const versions = state.versions.map((v) =>
        v.barcode === barcode ? { ...v, status: 'confirmed' as const } : v
      );

      const comments = state.comments.map((c) =>
        reviewCommentIds.includes(c.commentId)
          ? { ...c, finalConclusionId: finalConclusion.conclusionId }
          : c
      );

      return {
        conclusions: [...state.conclusions, finalConclusion],
        versions,
        comments,
      };
    });

    const version = get().getLatestVersion(barcode);
    if (version) {
      versionControlEngine.updateVersionStatus(version.versionId, 'confirmed');
    }

    auditEngine.logAction(
      operatorId,
      operatorName,
      'confirm_conclusion',
      'conclusion',
      finalConclusion.conclusionId,
      {
        barcode,
        finalResult,
      }
    );

    get().refreshStatistics();

    return finalConclusion;
  },

  linkCommentToConclusion: (commentId, conclusionId) => {
    set((state) => ({
      comments: state.comments.map((c) =>
        c.commentId === commentId ? { ...c, finalConclusionId: conclusionId } : c
      ),
      conclusions: state.conclusions.map((c) =>
        c.conclusionId === conclusionId
          ? { ...c, reviewCommentIds: [...c.reviewCommentIds, commentId] }
          : c
      ),
    }));
  },

  markAsDuplicate: (barcode, confirmed, operatorId, operatorName) => {
    set((state) => ({
      versions: state.versions.map((v) =>
        v.barcode === barcode ? { ...v, isDuplicate: confirmed } : v
      ),
      dedupResults: state.dedupResults.map((d) =>
        d.barcode === barcode
          ? { ...d, isConfirmedDuplicate: confirmed, resolvedAt: Date.now(), resolvedBy: operatorName }
          : d
      ),
    }));

    deduplicationEngine.markAsDuplicate(barcode, confirmed, operatorId);

    auditEngine.logAction(
      operatorId,
      operatorName,
      confirmed ? 'mark_duplicate' : 'resolve_duplicate',
      'dedup_result',
      barcode,
      { barcode, confirmed }
    );

    get().refreshStatistics();
  },

  setMergeStrategy: (barcode, strategy, operatorId, operatorName) => {
    set((state) => ({
      dedupResults: state.dedupResults.map((d) =>
        d.barcode === barcode
          ? { ...d, mergeStrategy: strategy, resolvedAt: Date.now(), resolvedBy: operatorName }
          : d
      ),
    }));

    deduplicationEngine.setMergeStrategy(barcode, strategy, operatorId);

    auditEngine.logAction(
      operatorId,
      operatorName,
      'merge_duplicate',
      'dedup_result',
      barcode,
      { barcode, strategy }
    );

    get().refreshStatistics();
  },

  generateTracePath: (conclusionId) => {
    const conclusion = get().conclusions.find((c) => c.conclusionId === conclusionId);
    if (!conclusion) return null;

    const tracePath = lineageEngine.getFullTracePath(conclusionId, conclusion, get().versions);
    set({ tracePath });
    return tracePath;
  },

  generateLineageGraph: (barcode) => {
    const graph = lineageEngine.buildFullGraphData(barcode);
    set({ lineageGraph: graph });
    return graph;
  },

  getFilteredVersions: () => {
    const { versions, searchQuery, filters } = get();
    let filtered = versions;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.barcode.toLowerCase().includes(query) ||
          v.sequencingResult.geneName.toLowerCase().includes(query) ||
          v.groupIndicators.batchId.toLowerCase().includes(query)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter((v) => v.status === filters.status);
    }

    if (filters.hasDuplicate !== null) {
      filtered = filtered.filter((v) => v.isDuplicate === filters.hasDuplicate);
    }

    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      filtered = filtered.filter((v) => v.createdAt >= start && v.createdAt <= end);
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },

  getFilteredDiffs: () => {
    const { pendingDiffs, searchQuery } = get();
    let filtered = pendingDiffs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.barcode.toLowerCase().includes(query) ||
          d.newVersion.sequencingResult.geneName.toLowerCase().includes(query)
      );
    }

    return filtered;
  },

  getFilteredDedupResults: () => {
    const { dedupResults, searchQuery, filters } = get();
    let filtered = dedupResults;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((d) => d.barcode.toLowerCase().includes(query));
    }

    if (filters.hasDuplicate !== null) {
      filtered = filtered.filter((d) => d.isConfirmedDuplicate === filters.hasDuplicate);
    }

    return filtered;
  },

  refreshStatistics: () => {
    const { versions, dedupResults, pendingDiffs, comments, conclusions } = get();
    const statistics = generateStatistics(versions, dedupResults, pendingDiffs, comments, conclusions);
    set({ statistics });
  },
}));
