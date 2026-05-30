import type { Scenario, DataIssue } from "@/types";
import { Flame, Clock, AlertTriangle, FileText, Users } from "lucide-react";

interface ScenarioCardProps {
  scenario: Scenario;
  onSelect: (id: string) => void;
}

const difficultyLabel: Record<string, { text: string; color: string }> = {
  easy: { text: "入门", color: "bg-safe/20 text-safe border-safe/30" },
  medium: { text: "进阶", color: "bg-warn/20 text-warn border-warn/30" },
  hard: { text: "高压", color: "bg-danger/20 text-danger border-danger/30" },
};

const issueIcons: Record<string, React.ReactNode> = {
  missing_exit_field: <AlertTriangle size={10} className="text-warn" />,
  floor_note: <FileText size={10} className="text-info" />,
  late_crowd: <Users size={10} className="text-accent" />,
};

export default function ScenarioCard({ scenario, onSelect }: ScenarioCardProps) {
  const diff = difficultyLabel[scenario.difficulty];
  const totalPeople = scenario.crowdGroups.reduce((s, g) => s + g.count, 0);
  const totalExits = scenario.floors.reduce((s, f) => s + f.exits.length, 0);

  return (
    <div
      onClick={() => onSelect(scenario.id)}
      className="group bg-bg-light/90 backdrop-blur-sm border border-gray-700/40 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-bold text-gray-100 group-hover:text-accent transition-colors">
          {scenario.name}
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded border ${diff.color}`}>
          {diff.text}
        </span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-3">
        {scenario.description}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Flame size={10} className="text-danger" />
          {scenario.floors.length}层
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock size={10} className="text-info" />
          {scenario.timeLimit}秒
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Users size={10} className="text-accent" />
          {totalPeople}人
        </div>
      </div>

      {scenario.dataIssues.length > 0 && (
        <div className="border-t border-gray-700/40 pt-2 space-y-1">
          <div className="text-[10px] text-warn font-medium">⚠ 数据异常</div>
          {scenario.dataIssues.map((issue, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px] text-gray-400">
              {issueIcons[issue.type]}
              <span className="truncate">{issue.description}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-center">
        <span className="inline-block text-xs bg-accent/10 text-accent border border-accent/30 rounded px-4 py-1.5 group-hover:bg-accent group-hover:text-white transition-all">
          开始演练
        </span>
      </div>
    </div>
  );
}
