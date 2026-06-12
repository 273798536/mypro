import { useTideWatcher } from '@/hooks/useTideWatcher';
import { Waves, Clock, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function TideStatusBanner() {
  const { currentVersion, impacts, bannerVisible, toggleTideBanner, countdown, groupedImpacts } = useTideWatcher();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  if (!currentVersion || !bannerVisible) return null;

  const statusCfg = {
    synchronized: {
      bg: 'bg-gradient-to-r from-emerald-900/60 to-emerald-800/40',
      border: 'border-emerald-700/60',
      icon: CheckCircle2,
      iconClass: 'text-emerald-400',
      label: '潮汐表已同步',
      chip: 'chip-green',
    },
    delayed: {
      bg: 'bg-gradient-to-r from-amber-900/60 to-amber-800/40',
      border: 'border-amber-600/60',
      icon: AlertTriangle,
      iconClass: 'text-amber-400',
      label: `潮汐表延迟 ${currentVersion.delayHours}h`,
      chip: 'chip-orange',
    },
    missing: {
      bg: 'bg-gradient-to-r from-red-900/60 to-red-800/40',
      border: 'border-red-700/60',
      icon: XCircle,
      iconClass: 'text-red-400',
      label: '潮汐表缺失',
      chip: 'chip-red',
    },
  }[currentVersion.status];

  const Icon = statusCfg.icon;

  return (
    <div className={`${statusCfg.bg} border-b ${statusCfg.border} transition-all duration-300`}>
      <div
        className="h-14 px-5 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon className={`w-5 h-5 ${statusCfg.iconClass} animate-pulse-slow`} />
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold text-sm whitespace-nowrap">{statusCfg.label}</span>
          <span className="text-xs text-white/60 hidden md:inline">
            版本 {currentVersion.tideVersionId} · 发布于 {currentVersion.publishTime}
          </span>
        </div>

        {currentVersion.status === 'delayed' && countdown && (
          <div className="flex items-center gap-2 ml-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-sm text-amber-200 tabular-nums">
              预计恢复 {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {impacts.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/tide'); }}
              className={`${statusCfg.chip} hover:scale-105 transition-transform`}
            >
              {impacts.length} 项结论受影响
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); toggleTideBanner(); }}
            className="text-white/50 hover:text-white/90 p-1 rounded hover:bg-white/10 transition"
            title="折叠横幅"
          >
            <XCircle className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
        </div>
      </div>

      {expanded && impacts.length > 0 && (
        <div className="border-t border-white/10 px-5 py-3 space-y-2 max-h-60 overflow-auto scrollbar-thin">
          <div className="text-xs text-white/50 mb-2">结论影响预览（点击查看详情）</div>
          {groupedImpacts.critical.slice(0, 1).map(i => (
            <div key={i.impactId} className="card severity-red px-3 py-2 text-sm flex items-center gap-3 cursor-pointer" onClick={() => navigate('/tide')}>
              <span className="chip-red shrink-0">严重</span>
              <span className="flex-1 truncate">{i.conclusionDesc}</span>
              <span className="text-red-400 text-xs shrink-0">临时结论已启用</span>
            </div>
          ))}
          {groupedImpacts.major.slice(0, 2).map(i => (
            <div key={i.impactId} className="card severity-orange px-3 py-2 text-sm flex items-center gap-3 cursor-pointer" onClick={() => navigate('/tide')}>
              <span className="chip-orange shrink-0">较重</span>
              <span className="flex-1 truncate">{i.conclusionDesc}</span>
              <span className="text-amber-400 text-xs shrink-0">区间值替代</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
