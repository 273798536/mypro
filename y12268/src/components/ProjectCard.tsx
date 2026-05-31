import { motion } from "framer-motion";
import { Check, AlertTriangle } from "lucide-react";
import type { ProjectCard as ProjectCardType } from "@/types/game";

const typeConfig: Record<string, { label: string; color: string }> = {
  infrastructure: { label: "基建", color: "bg-green-600" },
  welfare: { label: "民生", color: "bg-blue-600" },
  debt_optimize: { label: "偿债优化", color: "bg-purple-600" },
};

const riskConfig: Record<string, { label: string; color: string }> = {
  low: { label: "低", color: "bg-green-500" },
  medium: { label: "中", color: "bg-amber-500" },
  high: { label: "高", color: "bg-red-500" },
};

interface Props {
  project: ProjectCardType;
  selected: boolean;
  onToggle: () => void;
}

export default function ProjectCard({ project, selected, onToggle }: Props) {
  const tc = typeConfig[project.type] ?? { label: project.type, color: "bg-slate-600" };
  const rc = riskConfig[project.riskLevel] ?? { label: project.riskLevel, color: "bg-slate-500" };
  const delayHigh = project.delayProbability > 0.15;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onToggle}
      className={`cursor-pointer rounded-xl border p-4 transition-colors ${
        selected
          ? "border-[#D4A843] border-2 bg-[#D4A843]/5 shadow-[0_0_12px_rgba(212,168,67,0.25)]"
          : "border-[#3A506B]/30 bg-[#1B2838]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-white">{project.name}</h3>
        {selected && <Check className="h-5 w-5 shrink-0 text-[#D4A843]" />}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs text-white ${tc.color}`}>
          {tc.label}
        </span>
        {project.riskLevel === "high" && (
          <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <div className="text-slate-400">费用 {project.cost}万</div>
        <div className="text-green-400">预期回报 {project.expectedReturn}万</div>
        <div className={delayHigh ? "text-amber-400" : "text-slate-500"}>
          延期风险 {(project.delayProbability * 100).toFixed(0)}%
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${rc.color}`} />
          <span className="text-slate-400">风险等级 {rc.label}</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">{project.description}</p>
    </motion.div>
  );
}
