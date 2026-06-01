import { useNavigate, useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { useStore } from "@/store";
import { ArrowLeft, Download, FileText } from "lucide-react";

export default function ReportExport() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const getProjectById = useStore((s) => s.getProjectById);
  const generateProjectReport = useStore((s) => s.generateProjectReport);
  const getCasesForProject = useStore((s) => s.getCasesForProject);
  const getMaterialTracesForProject = useStore((s) => s.getMaterialTracesForProject);

  const [generated, setGenerated] = useState(false);

  const project = projectId ? getProjectById(projectId) : undefined;
  const cases = projectId ? getCasesForProject(projectId) : [];

  const reportHTML = useMemo(() => {
    if (!projectId || !project) return "";
    return generateProjectReport(projectId);
  }, [projectId, project, generated]);

  const materialTraces = projectId ? getMaterialTracesForProject(projectId) : [];

  const handleExport = () => {
    if (!reportHTML) return;
    const blob = new Blob([reportHTML], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "report"}_复盘报告.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        onNewProject={() => {}}
      />
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="text-zinc-400 hover:text-[#1B2A4A] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-serif text-[#1B2A4A]">复盘报告</h2>
          </div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-zinc-500">{project.name} · {cases.length} 个案例</p>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-[#1B2A4A] text-white rounded-lg text-sm hover:bg-[#2a3d5e] transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 HTML
            </button>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#D4A843]" />
              <span className="text-sm font-medium text-[#1B2A4A]">报告预览</span>
            </div>
            <div className="p-4">
              <iframe
                srcDoc={reportHTML}
                className="w-full border border-zinc-100 rounded-lg"
                style={{ height: "600px" }}
                title="报告预览"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <h3 className="text-sm font-medium text-[#1B2A4A] mb-3">材料对应关系</h3>
            {materialTraces.length === 0 ? (
              <p className="text-xs text-zinc-400">生成报告后此处将显示录音→分轨→报告的对应关系</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-500">
                    <th className="text-left py-2 font-medium">排练录音</th>
                    <th className="text-left py-2 font-medium">声部分轨</th>
                    <th className="text-left py-2 font-medium">声部</th>
                    <th className="text-left py-2 font-medium">报告生成时间</th>
                  </tr>
                </thead>
                <tbody>
                  {materialTraces.map((t, i) => (
                    <tr key={i} className="border-t border-zinc-50">
                      <td className="py-2 text-zinc-700">{t.recordingFileName}</td>
                      <td className="py-2 text-zinc-700">{t.trackFileName}</td>
                      <td className="py-2 text-zinc-500">{t.trackPartName}</td>
                      <td className="py-2 text-zinc-400">
                        {new Date(t.reportGeneratedAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
