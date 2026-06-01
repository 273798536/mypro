import { create } from "zustand";
import type { Project, Recording, Track, AnalysisResult, Case, MaterialTrace, Report, Annotation } from "@/types";
import { analyzeRecording } from "@/utils/pitchDetection";
import { groupIssuesIntoCases } from "@/utils/caseGrouper";
import { generateReport, generateReportHTML } from "@/utils/reportGenerator";

const uid = () => Math.random().toString(36).slice(2, 10);

function createMockData() {
  const p1: Project = {
    id: "proj-spring-01",
    name: "春之声圆舞曲 - 第三次排练",
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000,
  };

  const recordings1: Recording[] = [
    { id: "rec-s-sop", projectId: p1.id, fileName: "春之声-女高.wav", fileHash: "hash-spring-soprano-001", uploadedAt: p1.createdAt + 1000 },
    { id: "rec-s-alt", projectId: p1.id, fileName: "春之声-女低.wav", fileHash: "hash-spring-alto-002", uploadedAt: p1.createdAt + 2000 },
    { id: "rec-s-ten", projectId: p1.id, fileName: "春之声-男高.wav", fileHash: "hash-spring-tenor-003", uploadedAt: p1.createdAt + 3000 },
    { id: "rec-s-bas", projectId: p1.id, fileName: "春之声-男低.wav", fileHash: "hash-spring-bass-004", uploadedAt: p1.createdAt + 4000 },
  ];

  const tracks1: Track[] = [
    { id: "trk-s-sop", recordingId: "rec-s-sop", partName: "女高音", fileName: "春之声-女高音分轨.wav", fileHash: "hash-spring-soprano-trk-001" },
    { id: "trk-s-alt", recordingId: "rec-s-alt", partName: "女低音", fileName: "春之声-女低音分轨.wav", fileHash: "hash-spring-alto-trk-002" },
    { id: "trk-s-ten", recordingId: "rec-s-ten", partName: "男高音", fileName: "春之声-男高音分轨.wav", fileHash: "hash-spring-tenor-trk-003" },
    { id: "trk-s-bas", recordingId: "rec-s-bas", partName: "男低音", fileName: "春之声-男低音分轨.wav", fileHash: "hash-spring-bass-trk-004" },
  ];

  const analyses1: AnalysisResult[] = recordings1.map((r, i) =>
    analyzeRecording(r.id, r.fileHash, tracks1[i].partName)
  );

  const p2: Project = {
    id: "proj-yellow-02",
    name: "黄河大合唱 - 第二次排练",
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 5,
  };

  const recordings2: Recording[] = [
    { id: "rec-y-sop", projectId: p2.id, fileName: "黄河-女高.wav", fileHash: "hash-yellow-soprano-001", uploadedAt: p2.createdAt + 1000 },
    { id: "rec-y-alt", projectId: p2.id, fileName: "黄河-女低.wav", fileHash: "hash-yellow-alto-002", uploadedAt: p2.createdAt + 2000 },
    { id: "rec-y-ten", projectId: p2.id, fileName: "黄河-男高.wav", fileHash: "hash-yellow-tenor-003", uploadedAt: p2.createdAt + 3000 },
    { id: "rec-y-bas", projectId: p2.id, fileName: "黄河-男低.wav", fileHash: "hash-yellow-bass-004", uploadedAt: p2.createdAt + 4000 },
  ];

  const tracks2: Track[] = [
    { id: "trk-y-sop", recordingId: "rec-y-sop", partName: "女高音", fileName: "黄河-女高音分轨.wav", fileHash: "hash-yellow-soprano-trk-001" },
    { id: "trk-y-alt", recordingId: "rec-y-alt", partName: "女低音", fileName: "黄河-女低音分轨.wav", fileHash: "hash-yellow-alto-trk-002" },
    { id: "trk-y-ten", recordingId: "rec-y-ten", partName: "男高音", fileName: "黄河-男高音分轨.wav", fileHash: "hash-yellow-tenor-trk-003" },
    { id: "trk-y-bas", recordingId: "rec-y-bas", partName: "男低音", fileName: "黄河-男低音分轨.wav", fileHash: "hash-yellow-bass-trk-004" },
  ];

  const analyses2: AnalysisResult[] = recordings2.map((r, i) =>
    analyzeRecording(r.id, r.fileHash, tracks2[i].partName)
  );

  return {
    projects: [p1, p2],
    recordings: [...recordings1, ...recordings2],
    tracks: [...tracks1, ...tracks2],
    analyses: [...analyses1, ...analyses2],
  };
}

const mock = createMockData();

const allIssues1 = mock.analyses.filter(a => mock.recordings.find(r => r.id === a.recordingId)?.projectId === mock.projects[0].id).flatMap(a => a.detectedIssues);
const allIssues2 = mock.analyses.filter(a => mock.recordings.find(r => r.id === a.recordingId)?.projectId === mock.projects[1].id).flatMap(a => a.detectedIssues);

const cases1 = groupIssuesIntoCases(allIssues1, mock.recordings.filter(r => r.projectId === mock.projects[0].id).map(r => r.id), [], mock.projects[0].id);
const cases2 = groupIssuesIntoCases(allIssues2, mock.recordings.filter(r => r.projectId === mock.projects[1].id).map(r => r.id), [], mock.projects[1].id);

if (cases1.length > 0) {
  cases1[0].annotations = [
    { id: "ann-1", caseId: cases1[0].id, content: "此处女高音偏高约15音分，需要加强气息控制练习", author: "王老师", createdAt: Date.now() - 86400000, linkedClue: "排练录音" },
  ];
}

interface StoreState {
  projects: Project[];
  recordings: Recording[];
  tracks: Track[];
  analyses: AnalysisResult[];
  cases: Case[];
  materialTraces: MaterialTrace[];
  reports: Report[];

  addProject: (name: string) => Project;
  addRecording: (projectId: string, fileName: string) => Recording;
  addTrack: (recordingId: string, partName: string, fileName: string) => Track;
  runAnalysis: (recordingId: string) => AnalysisResult;
  groupCasesForProject: (projectId: string) => Case[];
  addAnnotation: (caseId: string, content: string, author: string, linkedClue: string) => void;
  resolveCase: (caseId: string) => void;
  generateProjectReport: (projectId: string) => string;
  getProjectById: (id: string) => Project | undefined;
  getCasesForProject: (projectId: string) => Case[];
  getAnalysisForRecording: (recordingId: string) => AnalysisResult | undefined;
  getRecordingsForProject: (projectId: string) => Recording[];
  getTracksForRecording: (recordingId: string) => Track[];
  getMaterialTracesForProject: (projectId: string) => MaterialTrace[];
}

export const useStore = create<StoreState>((set, get) => ({
  projects: mock.projects,
  recordings: mock.recordings,
  tracks: mock.tracks,
  analyses: mock.analyses,
  cases: [...cases1, ...cases2],
  materialTraces: [],
  reports: [],

  addProject: (name) => {
    const project: Project = { id: `proj-${uid()}`, name, createdAt: Date.now(), updatedAt: Date.now() };
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  addRecording: (projectId, fileName) => {
    const recording: Recording = {
      id: `rec-${uid()}`,
      projectId,
      fileName,
      fileHash: `hash-${uid()}`,
      uploadedAt: Date.now(),
    };
    set((s) => ({ recordings: [...s.recordings, recording] }));
    return recording;
  },

  addTrack: (recordingId, partName, fileName) => {
    const track: Track = { id: `trk-${uid()}`, recordingId, partName, fileName, fileHash: `hash-${uid()}-trk` };
    set((s) => ({ tracks: [...s.tracks, track] }));
    return track;
  },

  runAnalysis: (recordingId) => {
    const state = get();
    const existing = state.analyses.find((a) => a.recordingId === recordingId);
    if (existing) return existing;

    const recording = state.recordings.find((r) => r.id === recordingId);
    if (!recording) throw new Error("Recording not found");

    const track = state.tracks.find((t) => t.recordingId === recordingId);
    const partName = track?.partName || "未知声部";

    const result = analyzeRecording(recordingId, recording.fileHash, partName);
    set((s) => ({ analyses: [...s.analyses, result] }));
    return result;
  },

  groupCasesForProject: (projectId) => {
    const state = get();
    const projectRecordings = state.recordings.filter((r) => r.projectId === projectId);
    const projectAnalyses = state.analyses.filter((a) =>
      projectRecordings.some((r) => r.id === a.recordingId)
    );
    const allIssues = projectAnalyses.flatMap((a) => a.detectedIssues);
    const recordingIds = projectRecordings.map((r) => r.id);

    const newCases = groupIssuesIntoCases(allIssues, recordingIds, [], projectId);

    set((s) => {
      const otherCases = s.cases.filter((c) => c.projectId !== projectId);
      return { cases: [...otherCases, ...newCases] };
    });

    return newCases;
  },

  addAnnotation: (caseId, content, author, linkedClue) => {
    const annotation: Annotation = {
      id: `ann-${uid()}`,
      caseId,
      content,
      author,
      createdAt: Date.now(),
      linkedClue,
    };
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, annotations: [...c.annotations, annotation], updatedAt: Date.now() } : c
      ),
    }));
  },

  resolveCase: (caseId) => {
    set((s) => ({
      cases: s.cases.map((c) =>
        c.id === caseId ? { ...c, status: "resolved" as const, updatedAt: Date.now() } : c
      ),
    }));
  },

  generateProjectReport: (projectId) => {
    const state = get();
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return "";

    const projectCases = state.cases.filter((c) => c.projectId === projectId);
    const projectRecordings = state.recordings.filter((r) => r.projectId === projectId);
    const projectTracks = state.tracks.filter((t) =>
      projectRecordings.some((r) => r.id === t.recordingId)
    );
    const projectAnalyses = state.analyses.filter((a) =>
      projectRecordings.some((r) => r.id === a.recordingId)
    );

    const report = generateReport(project, projectCases, []);

    const traces: MaterialTrace[] = projectRecordings.flatMap((r) =>
      projectTracks
        .filter((t) => t.recordingId === r.id)
        .map((t) => ({
          recordingId: r.id,
          recordingFileName: r.fileName,
          trackId: t.id,
          trackFileName: t.fileName,
          trackPartName: t.partName,
          reportId: report.id,
          reportGeneratedAt: report.generatedAt,
        }))
    );

    set((s) => ({
      reports: [...s.reports, report],
      materialTraces: [...s.materialTraces, ...traces],
    }));

    const analysesInfo = projectAnalyses.map((a) => {
      const track = projectTracks.find((t) => t.recordingId === a.recordingId);
      return { partName: track?.partName || "未知", issues: a.detectedIssues };
    });

    return generateReportHTML(project, projectCases, traces, analysesInfo);
  },

  getProjectById: (id) => get().projects.find((p) => p.id === id),
  getCasesForProject: (projectId) => get().cases.filter((c) => c.projectId === projectId),
  getAnalysisForRecording: (recordingId) => get().analyses.find((a) => a.recordingId === recordingId),
  getRecordingsForProject: (projectId) => get().recordings.filter((r) => r.projectId === projectId),
  getTracksForRecording: (recordingId) => get().tracks.filter((t) => t.recordingId === recordingId),
  getMaterialTracesForProject: (projectId) => {
    const state = get();
    const projectRecordings = state.recordings.filter((r) => r.projectId === projectId);
    return state.materialTraces.filter((t) =>
      projectRecordings.some((r) => r.id === t.recordingId)
    );
  },
}));
