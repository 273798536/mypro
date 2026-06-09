import type { CalculationResult, ResultType } from '@/types';
import { BookOpen, FlaskConical, ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ExplanationCardProps {
  result: CalculationResult;
  defaultExpanded?: boolean;
}

const typeConfig: Record<ResultType, {
  label: string;
  iconBg: string;
  Icon: typeof BookOpen;
}> = {
  solubility_curve: {
    label: '溶解度曲线分析',
    iconBg: 'bg-teal-500',
    Icon: FlaskConical,
  },
  balancing: {
    label: '化学方程式配平',
    iconBg: 'bg-blue-600',
    Icon: BookOpen,
  },
  concentration_conversion: {
    label: '浓度单位换算',
    iconBg: 'bg-amber-500',
    Icon: ArrowLeftRight,
  },
};

export default function ExplanationCard({ result, defaultExpanded = false }: ExplanationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const config = typeConfig[result.type];
  const Icon = config.Icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-white', config.iconBg)}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800">{config.label}</h4>
          <p className="text-sm text-gray-500 mt-0.5">{result.explanation}</p>
        </div>
        {result.detailedExplanation && (
          <div className="text-gray-400">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        )}
      </div>
      {expanded && result.detailedExplanation && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <pre className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {result.detailedExplanation}
          </pre>
        </div>
      )}
    </div>
  );
}
