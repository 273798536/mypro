import { Play, RefreshCw, Eye, BookOpen } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';

export function QuickActions() {
  const { loadSample, rerunReview, filteredResult } = useReviewStore();
  const hasData = filteredResult.stats.total > 0;

  const actions = [
    {
      key: 'sample',
      label: '放样例',
      desc: '加载标准教学用例数据',
      icon: Play,
      color: 'industrial',
      onClick: loadSample,
      highlight: !hasData,
    },
    {
      key: 'rerun',
      label: '重跑',
      desc: '基于当前筛选重新执行复核算法',
      icon: RefreshCw,
      color: 'warning',
      onClick: rerunReview,
      highlight: false,
    },
    {
      key: 'screenshot',
      label: '查看截图说明',
      desc: '展开当前截图对应的视角参数与异常标注',
      icon: Eye,
      color: 'steel',
      onClick: () => {
        const el = document.querySelector('[data-screenshot-panel] button');
        if (el) (el as HTMLElement).click();
      },
      highlight: false,
    },
  ];

  return (
    <div className="bg-steel-800/60 backdrop-blur border border-steel-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-industrial-400" />
        <h3 className="text-sm font-semibold text-steel-200 tracking-wide">操作说明</h3>
        <span className="ml-auto text-[10px] text-steel-500">就这三件事，别写长</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {actions.map((a, i) => (
          <button
            key={a.key}
            onClick={a.onClick}
            className={`group relative text-left p-4 rounded-lg border-2 transition-all duration-200 hover:-translate-y-0.5 ${
              a.highlight
                ? a.color === 'industrial'
                  ? 'bg-industrial-600/15 border-industrial-500/50 hover:bg-industrial-600/25 hover:border-industrial-400 animate-pulse'
                  : 'bg-steel-700/30 border-steel-600 hover:bg-steel-700/50'
                : 'bg-steel-900/40 border-steel-700 hover:border-industrial-600/50 hover:bg-steel-800/60'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                ${a.color === 'industrial' ? 'bg-industrial-600/30 text-industrial-300 group-hover:bg-industrial-500/40 group-hover:text-industrial-200' : ''}
                ${a.color === 'warning' ? 'bg-warning-500/20 text-warning-400 group-hover:bg-warning-500/30 group-hover:text-warning-300' : ''}
                ${a.color === 'steel' ? 'bg-steel-700/60 text-steel-300 group-hover:bg-steel-600 group-hover:text-steel-100' : ''}
                transition-colors
              `}>
                <a.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-steel-500">0{i + 1}</span>
                  <span className="font-semibold text-steel-100">{a.label}</span>
                </div>
                <p className="text-xs text-steel-400 mt-1 leading-relaxed">{a.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
