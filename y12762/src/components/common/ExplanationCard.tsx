import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExplanationCardProps {
  title: string;
  explanation: string;
  detailedExplanation?: string;
  icon?: ReactNode;
}

export default function ExplanationCard({
  title,
  explanation,
  detailedExplanation,
  icon,
}: ExplanationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = !!detailedExplanation;

  return (
    <div className={cn('bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm')}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-[#0d9488] mt-0.5">
          {icon || <Info className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-[#1e3a5f] text-base">{title}</h4>
            {hasDetail && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                  'flex items-center gap-1 text-sm text-[#0d9488]',
                  'hover:text-[#0a7a70] transition-colors flex-shrink-0'
                )}
              >
                {expanded ? (
                  <>
                    <span>收起</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>展开</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">{explanation}</p>
          {hasDetail && expanded && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {detailedExplanation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
