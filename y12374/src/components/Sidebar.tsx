import { Music, FolderOpen, Plus } from "lucide-react";
import { useStore } from "@/store";

interface SidebarProps {
  activeProjectId?: string;
  onProjectSelect: (id: string) => void;
  onNewProject: () => void;
}

export default function Sidebar({ activeProjectId, onProjectSelect, onNewProject }: SidebarProps) {
  const projects = useStore((s) => s.projects);

  return (
    <aside className="w-64 min-h-screen bg-[#1B2A4A] text-white flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Music className="w-6 h-6 text-[#D4A843]" />
          <h1 className="text-lg font-serif tracking-wide">合唱音准复盘板</h1>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <p className="text-xs text-white/50 uppercase tracking-widest mb-3 px-2">排练项目</p>
        <ul className="space-y-1">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onProjectSelect(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2.5 ${
                  activeProjectId === p.id
                    ? "bg-white/15 text-[#D4A843] font-medium"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="truncate">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-3 border-t border-white/10">
        <button
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-[#D4A843]/20 text-[#D4A843] hover:bg-[#D4A843]/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建项目
        </button>
      </div>
    </aside>
  );
}
