import { Calendar, FileAudio, AlertTriangle } from "lucide-react";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  recordingCount: number;
  caseCount: number;
  onClick: () => void;
}

export default function ProjectCard({ project, recordingCount, caseCount, onClick }: ProjectCardProps) {
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-zinc-200 p-5 hover:shadow-lg hover:border-[#D4A843]/40 transition-all group"
    >
      <h3 className="text-base font-serif text-[#1B2A4A] group-hover:text-[#D4A843] transition-colors mb-3">
        {project.name}
      </h3>
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(project.updatedAt)}
        </span>
        <span className="flex items-center gap-1">
          <FileAudio className="w-3.5 h-3.5" />
          {recordingCount} 份录音
        </span>
        {caseCount > 0 && (
          <span className="flex items-center gap-1 text-[#C44E52]">
            <AlertTriangle className="w-3.5 h-3.5" />
            {caseCount} 个案例
          </span>
        )}
      </div>
    </button>
  );
}
