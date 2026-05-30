import type { ScoreDeduction } from "@/types";
import { AlertTriangle, Radio, Elevator, Users, ArrowRight } from "lucide-react";

interface SuggestionCardProps {
  category: string;
  items: {
    problem: string;
    suggestion: string;
    expectedEffect: string;
  }[];
}

const categoryIcons: Record<string, React.ReactNode> = {
  "电梯误用": <Elevator size={14} className="text-warn" />,
  "广播漏发": <Radio size={14} className="text-info" />,
  "出口拥堵": <AlertTriangle size={14} className="text-danger" />,
  "人群回流": <Users size={14} className="text-accent" />,
};

const categoryColors: Record<string, string> = {
  "电梯误用": "border-warn/30 bg-warn/5",
  "广播漏发": "border-info/30 bg-info/5",
  "出口拥堵": "border-danger/30 bg-danger/5",
  "人群回流": "border-accent/30 bg-accent/5",
};

export default function SuggestionCard({ category, items }: SuggestionCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${categoryColors[category] ?? "border-gray-700/40 bg-bg-light/50"}`}>
      <div className="flex items-center gap-2 mb-3">
        {categoryIcons[category] ?? <AlertTriangle size={14} />}
        <h4 className="text-sm font-bold text-gray-200">{category}</h4>
        <span className="text-[10px] text-gray-500 font-mono">{items.length}条</span>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="pl-3 border-l-2 border-gray-600 space-y-1">
            <div className="text-xs text-gray-300">
              <span className="text-gray-500">问题：</span>
              {item.problem}
            </div>
            <div className="text-xs text-accent">
              <span className="flex items-center gap-1">
                <ArrowRight size={10} />
                <span className="text-gray-500">建议：</span>
                {item.suggestion}
              </span>
            </div>
            <div className="text-[10px] text-safe/80">
              预期效果：{item.expectedEffect}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
