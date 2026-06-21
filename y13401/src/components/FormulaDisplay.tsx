import { BookOpen } from "lucide-react";
import { useState } from "react";

interface FormulaDisplayProps {
  formula: string;
  explanation: string;
}

export function FormulaDisplay({ formula, explanation }: FormulaDisplayProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="bg-ink-50/60 rounded-lg border border-ink-100 overflow-hidden">
      <div
        className="p-4 cursor-pointer transition-soft hover:bg-ink-100/50"
        onClick={() => setShowExplanation(!showExplanation)}
      >
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-white rounded-md border border-ink-200 mt-0.5">
            <BookOpen className="w-4 h-4 text-ink-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink-500 mb-1 font-medium">公式</div>
            <div className="font-mono-code text-ink-800 text-base leading-relaxed">
              {formula}
            </div>
          </div>
          <div className="text-ink-400 text-xs flex items-center gap-1">
            {showExplanation ? "收起解释" : "查看解释"}
          </div>
        </div>
      </div>
      {showExplanation && (
        <div className="px-4 pb-4 pt-2 border-t border-ink-100 bg-white/50">
          <div className="text-xs text-ink-500 mb-1.5 font-medium">通俗解释</div>
          <p className="text-sm text-ink-700 leading-relaxed">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
