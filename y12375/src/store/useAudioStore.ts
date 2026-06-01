import { create } from 'zustand';
import { AudioFile, Segment, Issue, Version, Report, ManualChangeLog } from '../types';
import { mockAudioFiles, mockSegments, mockIssues, mockVersions, mockReports, mockChangeLogs } from '../data/mockData';

interface AudioState {
  audioFiles: AudioFile[];
  segments: Segment[];
  issues: Issue[];
  versions: Version[];
  reports: Report[];
  changeLogs: ManualChangeLog[];
  selectedAudioFile: AudioFile | null;
  selectedSegment: Segment | null;
  selectedIssue: Issue | null;
  currentTime: number;
  isPlaying: boolean;
  zoomLevel: number;
  viewStart: number;
  viewEnd: number;

  setSelectedAudioFile: (file: AudioFile | null) => void;
  setSelectedSegment: (segment: Segment | null) => void;
  setSelectedIssue: (issue: Issue | null) => void;
  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  setZoomLevel: (level: number) => void;
  setViewRange: (start: number, end: number) => void;
  jumpToIssue: (issue: Issue) => void;
  fixIssue: (issueId: string) => void;
  updateSegmentType: (segmentId: string, newType: Segment['type']) => void;
  createVersion: (note: string) => void;
  exportReport: (format: 'pdf' | 'html') => Report;
  getSegmentsForAudio: (audioId: string) => Segment[];
  getIssuesForAudio: (audioId: string) => Issue[];
  getVersionsForAudio: (audioId: string) => Version[];
}

export const useAudioStore = create<AudioState>((set, get) => ({
  audioFiles: mockAudioFiles,
  segments: mockSegments,
  issues: mockIssues,
  versions: mockVersions,
  reports: mockReports,
  changeLogs: mockChangeLogs,
  selectedAudioFile: mockAudioFiles[0],
  selectedSegment: null,
  selectedIssue: null,
  currentTime: 0,
  isPlaying: false,
  zoomLevel: 1,
  viewStart: 0,
  viewEnd: mockAudioFiles[0]?.duration || 0,

  setSelectedAudioFile: (file) => set({ 
    selectedAudioFile: file,
    viewStart: 0,
    viewEnd: file?.duration || 0,
    currentTime: 0,
  }),

  setSelectedSegment: (segment) => set({ selectedSegment: segment }),

  setSelectedIssue: (issue) => set({ selectedIssue: issue }),

  setCurrentTime: (time) => set({ currentTime: time }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setZoomLevel: (level) => set({ zoomLevel: level }),

  setViewRange: (start, end) => set({ viewStart: start, viewEnd: end }),

  jumpToIssue: (issue) => {
    const segment = get().segments.find(s => s.id === issue.segmentId);
    if (segment) {
      set({
        currentTime: segment.startTime,
        selectedIssue: issue,
        selectedSegment: segment,
        viewStart: Math.max(0, segment.startTime - 30),
        viewEnd: Math.min(get().selectedAudioFile?.duration || 0, segment.endTime + 30),
      });
    }
  },

  fixIssue: (issueId) => set((state) => ({
    issues: state.issues.map(i => 
      i.id === issueId 
        ? { ...i, isFixed: true, fixedAt: new Date() }
        : i
    ),
  })),

  updateSegmentType: (segmentId, newType) => set((state) => {
    const segment = state.segments.find(s => s.id === segmentId);
    if (!segment) return state;

    const oldType = segment.type;
    const newSegments = state.segments.map(s =>
      s.id === segmentId
        ? { 
            ...s, 
            type: newType, 
            status: 'modified' as const, 
            modifiedBy: 'manual' as const,
            modifiedAt: new Date(),
            originalType: s.originalType || s.type,
          }
        : s
    );

    const affectedIssues = state.issues
      .filter(i => i.segmentId === segmentId)
      .map(i => i.id);

    const newIssues = state.issues.map(i =>
      i.segmentId === segmentId
        ? { ...i, affectedByManualChange: true }
        : i
    );

    const newChangeLog: ManualChangeLog = {
      id: `log-${Date.now()}`,
      segmentId,
      changeType: 'type_change',
      oldValue: oldType,
      newValue: newType,
      timestamp: new Date(),
      affectedIssues,
    };

    return {
      segments: newSegments,
      issues: newIssues,
      changeLogs: [...state.changeLogs, newChangeLog],
    };
  }),

  createVersion: (note) => set((state) => {
    const audioFile = state.selectedAudioFile;
    if (!audioFile) return state;

    const newVersion: Version = {
      id: `ver-${Date.now()}`,
      audioFileId: audioFile.id,
      versionNumber: state.versions.length + 1,
      segments: state.getSegmentsForAudio(audioFile.id),
      issues: state.getIssuesForAudio(audioFile.id),
      createdAt: new Date(),
      note,
    };

    return {
      versions: [...state.versions, newVersion],
    };
  }),

  exportReport: (format) => {
    const state = get();
    const audioFile = state.selectedAudioFile;
    if (!audioFile) throw new Error('No audio file selected');

    const issues = state.getIssuesForAudio(audioFile.id);
    const latestVersion = state.getVersionsForAudio(audioFile.id).slice(-1)[0];

    const report: Report = {
      id: `report-${Date.now()}`,
      audioFileId: audioFile.id,
      versionId: latestVersion?.id || '',
      issues,
      exportedAt: new Date(),
      exportFormat: format,
      summary: {
        totalIssues: issues.length,
        highSeverity: issues.filter(i => i.severity === 'high').length,
        mediumSeverity: issues.filter(i => i.severity === 'medium').length,
        lowSeverity: issues.filter(i => i.severity === 'low').length,
        fixedIssues: issues.filter(i => i.isFixed).length,
      },
    };

    set((state) => ({
      reports: [...state.reports, report],
    }));

    return report;
  },

  getSegmentsForAudio: (audioId) => {
    return get().segments.filter(s => s.audioFileId === audioId);
  },

  getIssuesForAudio: (audioId) => {
    const segmentIds = get().segments
      .filter(s => s.audioFileId === audioId)
      .map(s => s.id);
    return get().issues.filter(i => segmentIds.includes(i.segmentId));
  },

  getVersionsForAudio: (audioId) => {
    return get().versions.filter(v => v.audioFileId === audioId);
  },
}));
