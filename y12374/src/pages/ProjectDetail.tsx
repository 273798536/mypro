import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import IssueStats from "@/components/IssueStats";
import CaseCard from "@/components/CaseCard";
import { useStore } from "@/store";
import { FileDown, ArrowLeft } from "lucide-react";

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const getProjectById = useStore((s) => s.getProjectById);
  const getCasesForProject = useStore((s) => s.getCasesForProject);
  const getRecordingsForProject = useStore((s) => s.getRecordingsForProject);

  const project = projectId ? getProjectById(projectId) : undefined;
  const cases = projectId ? getCasesForProject(projectId) : [];
  const recordingCount = projectId ? getRecordingsForProject(projectId).length : 0;

  if (!project) {
    return (
      <div className="flex min-h-screen bg-[#F5F5F0]">
        <Sidebar onProjectSelect={(id) => navigate(`/project/${id}`)} onNewProject={() => {}} />
        <main className="flex-1 flex items-center justify-center text-zinc-400">
          <p>项目不存在</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F5F0]">
      <Sidebar
        activeProjectId={projectId}
        onProjectSelect={(id) => navigate(`/project/${id}`)}
        onNewProject={() => {
          const name = prompt("请输入排练项目名称：");
          if (name?.trim()) navigate(`/project/new`);
        }}
      />
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate("/")} className="text-zinc-400 hover:text-[#1B2A4A] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-serif text-[#1B2A4A]">{project.name}</h2>
          </div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-zinc-500">
              {recordingCount} 份录音 · {cases.length} 个案例
            </p>
            <button
              onClick={() => navigate(`/report/${projectId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a38] transition-colors"
            >
              <FileDown className="w-4 h-4" />
              导出报告
            </button>
          </div>
          <div className="mb-6">
            <IssueStats cases={cases} />
          </div>
          <h3 className="text-sm font-medium text-[#1B2A4A] mb-3">案例列表</h3>
          <div className="space-y-3">
            {cases.length === 0 ? (
              <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-zinc-400 text-sm">
                暂无案例，请先运行音高检测
              </div>
            ) : (
              cases.map((c) => (
                <CaseCard key={c.id} caseItem={c} onClick={() => navigate(`/case/${c.id}`)} />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
