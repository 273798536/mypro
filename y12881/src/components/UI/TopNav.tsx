import {
  Home,
  ClipboardCheck,
  History,
  AlertTriangle,
  Upload,
  Waves,
  Bell,
  Terminal,
} from 'lucide-react';
import { useUIStore } from '@/store/useUISTore';
import { useReviewStore } from '@/store/useReviewStore';
import { useSampleStore } from '@/store/useSampleStore';
import { calculateCounts, formatNumber } from '@/utils/counter';
import { INITIAL_WATER_QUALITIES } from '@/utils/mockData';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { key: 'home', label: '3D可视化', icon: Home },
  { key: 'review', label: '复核中心', icon: ClipboardCheck },
  { key: 'history', label: '版本历史', icon: History },
  { key: 'risks', label: '风险通报', icon: AlertTriangle },
  { key: 'import', label: '数据导入', icon: Upload },
] as const;

export default function TopNav() {
  const { activeTab, setActiveTab, showTerminalHint } = useUIStore();
  const { getPendingReviewCount, getUnresolvedRiskCount } = useReviewStore();
  const { samples } = useSampleStore();

  const [showTerminal, setShowTerminal] = useState(false);

  const summary = calculateCounts(samples, INITIAL_WATER_QUALITIES);

  useEffect(() => {
    const log = console.log.bind(console);
    console.log = (...args) => {
      log(...args);
    };
  }, []);

  const pendingCount = getPendingReviewCount();
  const riskCount = getUnresolvedRiskCount();

  const handleTerminalClick = () => {
    setShowTerminal(!showTerminal);
    showTerminalHint(
      `[复核入口就绪] 待复核 ${pendingCount} 条 | 待处理风险 ${riskCount} 条 | 总计 ${samples.length} 样本 | 估算总数 ${formatNumber(summary.totalCount)}`,
    );
  };

  return (
    <>
      <header className="h-14 glass-panel-strong flex items-center px-4 gap-4 border-b border-ocean-700/50 z-50 relative">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-glow to-ocean-500 flex items-center justify-center shadow-glow-cyan">
            <Waves size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-ocean-50 text-sm leading-tight">
              海洋浮游生物计数
            </h1>
            <p className="text-[10px] text-ocean-400 leading-tight">台风季前监测系统 v1.0</p>
          </div>
        </div>

        <div className="divider-glow w-px h-8 mx-1" />

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const hasBadge = (item.key === 'review' && pendingCount > 0) || (item.key === 'risks' && riskCount > 0);
            const badgeCount = item.key === 'review' ? pendingCount : item.key === 'risks' ? riskCount : 0;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-glow/15 text-cyan-glow border border-cyan-glow/30 shadow-glow-cyan'
                    : 'text-ocean-300 hover:text-ocean-100 hover:bg-ocean-800/50'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
                {hasBadge && (
                  <span
                    className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${
                      item.key === 'risks' ? 'bg-crimson-risk text-white' : 'bg-amber-risk text-ocean-900'
                    }`}
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-4 text-xs">
          <div className="hidden md:flex items-center gap-3 text-ocean-300">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ocean-500">总数</span>
              <span className="font-display font-bold text-cyan-glow text-sm">
                {formatNumber(summary.totalCount)}
              </span>
            </div>
            <div className="w-px h-4 bg-ocean-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ocean-500">高可信</span>
              <span className="font-semibold text-ocean-100">
                {formatNumber(summary.highConfidenceCount)}
              </span>
            </div>
            {summary.gaps.length > 0 && (
              <>
                <div className="w-px h-4 bg-ocean-700" />
                <div className="flex items-center gap-1.5 text-amber-risk">
                  <Bell size={12} />
                  <span className="text-[10px]">{summary.gaps.length} 项数据缺口</span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleTerminalClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-ocean-900/60 text-ocean-300 hover:text-cyan-glow hover:bg-ocean-800/80 border border-ocean-700/50 transition-all"
            title="打开复核入口（终端日志）"
          >
            <Terminal size={13} />
            <span className="text-[11px] font-mono hidden lg:inline">复核入口</span>
          </button>
        </div>
      </header>

      {showTerminal && (
        <div className="absolute top-14 right-4 z-50 glass-panel-strong p-3 font-mono text-[11px]" style={{ width: 420 }}>
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-ocean-700/50">
            <Terminal size={12} className="text-cyan-glow" />
            <span className="text-cyan-glow font-semibold">海洋浮游生物计数 · 复核控制台</span>
            <button onClick={() => setShowTerminal(false)} className="ml-auto text-ocean-500 hover:text-ocean-200">
              ✕
            </button>
          </div>
          <div className="space-y-1 text-ocean-300 max-h-60 overflow-y-auto">
            <p><span className="text-ocean-500">$</span> status --overview</p>
            <p className="text-cyan-glow pl-4">总样本数: {samples.length}</p>
            <p className="text-cyan-glow pl-4">待复核: <span className="text-amber-risk">{pendingCount}</span></p>
            <p className="text-cyan-glow pl-4">待处理风险: <span className="text-crimson-risk">{riskCount}</span></p>
            <p className="text-cyan-glow pl-4">估算总计数: {formatNumber(summary.totalCount)}</p>
            <p className="text-cyan-glow pl-4">数据缺口: {summary.gaps.length} 项</p>
            <p className="mt-2"><span className="text-ocean-500">$</span> list --pending</p>
            {samples.filter(s => s.status === 'pending').slice(0, 5).map(s => (
              <p key={s.id} className="pl-4">
                <span className="text-ocean-500">→</span> {s.id} <span className="text-ocean-400">{s.species}</span> count:<span className="text-amber-risk">{s.count}</span>
                {s.riskLevel !== 'none' && <span className={`ml-1 text-${getRiskColorClass(s.riskLevel)}`}>[{s.riskLevel}]</span>}
              </p>
            ))}
            <p className="text-ocean-500 mt-2">提示: 点击「复核中心」修正数据，或在 3D 场景中选中样本后点击「复核修正」</p>
          </div>
        </div>
      )}
    </>
  );
}

function getRiskColorClass(level: string) {
  if (level === 'high') return 'crimson-risk';
  if (level === 'medium') return 'amber-risk';
  return 'cyan-glow';
}
