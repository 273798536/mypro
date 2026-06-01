import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import ProjectCard from "@/components/ProjectCard";
import { useStore } from "@/store";
import { Music2, Plus } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const projects = useStore((s) => s.projects);
  const recordings = useStore((s) => s.recordings);
  const addProject = useStore((s) => s.addProject);
  const getCasesForProject = useStore((s) => s.getCasesForProject);

  const handleNewProject = () => {
    const name = prompt("请输入排练项目名称：");
    if (name?.trim()) {
      const proj = addProject(name.trim());
      navigate(`/project/${proj.id}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F5F0]">
      <Sidebar onProjectSelect={(id) => navigate(`/project/${id}`)} onNewProject={handleNewProject} />
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-serif text-[#1B2A4A] mb-2">排练项目</h2>
            <p className="text-sm text-zinc-500">选择项目查看音准复盘详情，或新建排练项目开始分析</p>
          </div>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
              <Music2 className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg mb-2">尚未创建排练项目</p>
              <p className="text-sm mb-6">新建项目后即可上传录音开始音准分析</p>
              <button
                onClick={handleNewProject}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1B2A4A] text-white rounded-lg text-sm hover:bg-[#2a3d5e] transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建项目
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  recordingCount={recordings.filter((r) => r.projectId === p.id).length}
                  caseCount={getCasesForProject(p.id).length}
                  onClick={() => navigate(`/project/${p.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
