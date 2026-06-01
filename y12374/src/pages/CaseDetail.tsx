import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import PitchChart from "@/components/PitchChart";
import PartAlignment from "@/components/PartAlignment";
import IssueTrace from "@/components/IssueTrace";
import AnnotationPanel from "@/components/AnnotationPanel";
import { useStore } from "@/store";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Link2 } from "lucide-react";

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const cases = useStore((s) => s.cases);
  const recordings = useStore((s) => s.recordings);
  const resolveCase = useStore((s) => s.resolveCase);
  const getTracksForRecording = useStore((s) => s.getTracksForRecording);
  const getAnalysisForRecording = useStore((s) => s.getAnalysisForRecording);
  const getMaterialTracesForProject = useStore((s) => s.getMaterialTracesForProject);

  const [traceExpanded, setTraceExpanded] = useState(false);

  const caseItem = cases.find((c) => c.id === caseId);
  if (!caseItem) {
    return (
      <div className="flex min-h-screen bg-[#F5F5F0]">
        <Sidebar onProjectSelect={(id) => navigate(`/project/${id}`)} onNewProject={() => {}} />
        <main className="flex-1 flex items-center justify-center text-zinc-400">
          <p>案例不存在</p>
        </main>
      </div>
    );
  }

  const projectRecordings = recordings.filter((r) => r.projectId === caseItem.projectId);
  const projectTracks = projectRecordings.flatMap((r) => getTracksForRecording(r.id));
  const projectAnalyses = projectRecordings.map((r) => getAnalysisForRecording(r.id)).filter(Boolean);
  const materialTraces = getMaterialTracesForProject(caseItem.projectId);

  const allIssues = caseItem.issues;

  return (
    <div className="flex min-h-screen bg-[#F5F5F0]">
      <Sidebar
        activeProjectId={caseItem.projectId}
        onProjectSelect={(id) => navigate(`/project/${id}`)}
        onNewProject={() => {}}
      />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(`/project/${caseItem.projectId}`)}
              className="text-zinc-400 hover:text-[#1B2A4A] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-serif text-[#1B2A4A]">{caseItem.title}</h2>
            {caseItem.status === "resolved" ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> 已解决
              </span>
            ) : (
              <button
                onClick={() => resolveCase(caseItem.id)}
                className="flex items-center gap-1 text-xs text-[#D4A843] bg-[#D4A843]/10 px-2.5 py-1 rounded-full hover:bg-[#D4A843]/20 transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" /> 标记解决
              </button>
            )}
          </div>
          <p className="text-sm text-zinc-500 mb-6">
            关联录音 {caseItem.linkedRecordings.length} 份 · 问题 {allIssues.length} 项
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-[#1B2A4A] mb-3">音高检测</h3>
              <div className="space-y-4">
                {projectAnalyses.map((analysis) => {
                  if (!analysis) return null;
                  const track = projectTracks.find((t) => t.recordingId === analysis.recordingId);
                  const partName = track?.partName || "未知声部";
                  const caseIssues = analysis.detectedIssues.filter((i) =>
                    allIssues.some((ai) => ai.id === i.id)
                  );
                  return (
                    <PitchChart
                      key={analysis.id}
                      pitchData={analysis.pitchData}
                      issues={caseIssues}
                      partName={partName}
                    />
                  );
                })}
              </div>
            </div>

            <PartAlignment tracks={projectTracks} analyses={projectAnalyses as any} />

            <IssueTrace issues={allIssues} />

            <div className="bg-white rounded-xl border border-zinc-200">
              <button
                onClick={() => setTraceExpanded(!traceExpanded)}
                className="w-full flex items-center justify-between p-4 text-sm font-medium text-[#1B2A4A] hover:bg-zinc-50 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-[#D4A843]" />
                  材料溯源
                </span>
                {traceExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {traceExpanded && (
                <div className="px-4 pb-4 border-t border-zinc-100">
                  <table className="w-full mt-3 text-xs">
                    <thead>
                      <tr className="text-zinc-500">
                        <th className="text-left py-2 font-medium">排练录音</th>
                        <th className="text-left py-2 font-medium">声部分轨</th>
                        <th className="text-left py-2 font-medium">声部</th>
                        <th className="text-left py-2 font-medium">报告</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectRecordings.flatMap((r) =>
                        getTracksForRecording(r.id).map((t) => {
                          const trace = materialTraces.find(
                            (mt) => mt.recordingId === r.id && mt.trackId === t.id
                          );
                          return (
                            <tr key={t.id} className="border-t border-zinc-50">
                              <td className="py-2 text-zinc-700">{r.fileName}</td>
                              <td className="py-2 text-zinc-700">{t.fileName}</td>
                              <td className="py-2 text-zinc-500">{t.partName}</td>
                              <td className="py-2 text-zinc-400">
                                {trace ? new Date(trace.reportGeneratedAt).toLocaleString("zh-CN") : "未生成"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <AnnotationPanel caseId={caseItem.id} annotations={caseItem.annotations} />
          </div>
        </div>
      </main>
    </div>
  );
}
