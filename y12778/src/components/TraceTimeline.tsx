import { ChevronDown, ChevronUp, GitBranch, User, Clock, FileText, AlertCircle, Database, Edit, Calculator } from 'lucide-react';
import type { TraceLink } from '../../shared/types';
import { useState } from 'react';
import { cn } from '../lib/utils';

const typeConfig: Record<TraceLink['type'], { icon: typeof GitBranch; color: string; bg: string; label: string }> = {
  result: { icon: FileText, color: 'text-navy-600', bg: 'bg-navy-600/10', label: '结果' },
  calculation: { icon: Calculator, color: 'text-navy-500', bg: 'bg-navy-500/10', label: '试算' },
  'raw-data': { icon: Database, color: 'text-slate-600', bg: 'bg-slate-100', label: '原始数据' },
  'reagent-entry': { icon: FileText, color: 'text-slate-700', bg: 'bg-slate-50', label: '录入' },
  supplement: { icon: Edit, color: 'text-accent-500', bg: 'bg-accent-500/10', label: '补录' },
  audit: { icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-100', label: '审计' },
};

interface Props {
  links: TraceLink[];
  title?: string;
}

export function TraceTimeline({ links, title = '追溯链路（从结果一路回到来源）' }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const displayLinks = showAll ? links : links.slice(0, 6);
  const hasMore = links.length > 6;

  return (
    <div className="bg-white border border-slate-200 rounded p-6 shadow-card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-serif text-lg font-semibold text-slate-800 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-navy-600" strokeWidth={1.8} />
          {title}
        </h3>
        <span className="text-xs text-slate-400 font-mono">共 {links.length} 个节点</span>
      </div>

      <ol className="relative">
        <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />

        {displayLinks.map((link, idx) => {
          const cfg = typeConfig[link.type];
          const Icon = cfg.icon;
          const isExpanded = expanded.has(link.id);
          const hasMeta = link.metadata && Object.keys(link.metadata).length > 0;

          return (
            <li
              key={link.id}
              className="relative pl-12 pb-5 last:pb-0 animate-slide-up stagger-1"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className={cn(
                'absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-sm',
                cfg.bg,
                link.type === 'supplement' && 'ring-2 ring-accent-500/30'
              )}>
                <Icon className={cn('w-4 h-4', cfg.color)} strokeWidth={1.8} />
              </div>

              <div
                className={cn(
                  'bg-slate-50 border border-slate-200 rounded p-3 cursor-pointer hover:border-navy-200 hover:bg-white transition-colors',
                  isExpanded && 'bg-white border-navy-300'
                )}
                onClick={() => {
                  const next = new Set(expanded);
                  if (next.has(link.id)) next.delete(link.id);
                  else next.add(link.id);
                  setExpanded(next);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-800 truncate">
                        {link.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{link.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      {link.operator && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" strokeWidth={1.8} />
                          {link.operator}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" strokeWidth={1.8} />
                        {formatDateTime(link.timestamp)}
                      </span>
                    </div>
                  </div>
                  {hasMeta && (
                    <span className="shrink-0 text-slate-400 pt-0.5">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" strokeWidth={2} />
                      ) : (
                        <ChevronDown className="w-4 h-4" strokeWidth={2} />
                      )}
                    </span>
                  )}
                </div>

                {isExpanded && hasMeta && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(link.metadata!).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-slate-500 shrink-0 w-24 truncate">{k}</span>
                          <span className="text-slate-700 font-mono break-all">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="mt-2 w-full py-2 text-sm text-navy-600 hover:text-navy-700 bg-navy-50 hover:bg-navy-100 rounded transition-colors"
        >
          {showAll ? '收起' : `展开剩余 ${links.length - 6} 个节点`}
        </button>
      )}
    </div>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hour = 60 * 60 * 1000;
  if (diff < hour) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  if (diff < 24 * hour) return `${Math.floor(diff / hour)} 小时前`;
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
