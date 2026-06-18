import { useMemo } from 'react';
import { X, Lightbulb, BookOpen, ChevronRight, Info } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { generateExplanation } from '@/utils/format';
import { cn } from '@/lib/utils';

interface DetailExplanationPanelProps {
  className?: string;
}

export default function DetailExplanationPanel({ className }: DetailExplanationPanelProps) {
  const { explanationContext, setExplanationContext } = useAppStore();

  const explanation = useMemo(() => {
    if (!explanationContext.type || !explanationContext.data) return null;
    return generateExplanation(explanationContext.type, explanationContext.data);
  }, [explanationContext]);

  if (!explanationContext.type || !explanation) {
    return (
      <aside
        className={cn(
          'explanation-block flex h-full flex-col',
          className
        )}
      >
        <div className="mb-3 flex items-center justify-between border-b border-audit-100 pb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-audit-500" />
            <h3 className="section-title">明细解释面板</h3>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center text-audit-400">
          <Info className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">将鼠标悬停在图表数据点、表结构字段或迁移轨迹节点上</p>
          <p className="mt-1 text-xs text-audit-400/70">此处将显示对应的文字解释，不靠颜色传递关键信息</p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'explanation-block flex h-full flex-col animate-fade-in-right',
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between border-b border-audit-100 pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-audit-600" />
          <h3 className="section-title">{explanation.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => setExplanationContext(null, null)}
          className="rounded-md p-1 text-audit-400 transition-colors hover:bg-audit-100 hover:text-audit-700"
          title="关闭解释"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-auto pr-1 scrollbar-thin">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-audit-500 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-audit-400" />
            快速摘要
          </div>
          <p className="text-sm leading-relaxed text-audit-800 font-medium">
            {explanation.summary}
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-audit-500 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-audit-400" />
            详细说明
          </div>
          <p className="text-sm leading-relaxed text-audit-700">
            {explanation.detail}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-audit-500 uppercase tracking-wider">
            <Lightbulb className="h-3 w-3" />
            建议与后续动作
          </div>
          <ul className="space-y-2">
            {explanation.suggestions.map((s, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 rounded-md bg-white/60 px-3 py-2 text-sm text-audit-700 border border-audit-100"
              >
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-audit-400" />
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
