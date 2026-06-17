import { useState, useRef, useEffect } from 'react';
import { Copy, Check, ChevronDown, ShieldCheck } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { SafetyRule } from '@/types';

function statusToDot(r: SafetyRule): string {
  if (r.pageStatus === undefined) return 'bg-slate-400';
  return r.pageStatus ? 'bg-emerald-500' : 'bg-rose-500';
}

function statusText(r: SafetyRule): string {
  if (r.pageStatus === undefined) return 'pending';
  return r.pageStatus ? 'pass' : 'fail';
}

export default function VersionBar() {
  const { versions, currentVersionId, safetyRules, setCurrentVersion } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = versions.find((v) => v.id === currentVersionId) ?? versions[0];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const passCount = safetyRules.filter((r) => r.pageStatus === true).length;
  const totalCount = safetyRules.length;

  async function copyCommit() {
    if (!current?.commitHash) return;
    try {
      await navigator.clipboard.writeText(current.commitHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center px-6 gap-6">
      <div ref={dropdownRef} className="relative">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-sky-500/50 transition-colors">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2"
          >
            <span className="font-semibold text-white">{current?.version}</span>
            <span className="text-xs text-slate-400">{current?.trainDate}</span>
            <ChevronDown
              size={16}
              className={cn('text-slate-400 transition-transform', dropdownOpen && 'rotate-180')}
            />
          </button>
          <span
            onClick={copyCommit}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && copyCommit()}
            className="flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs bg-slate-900 border border-slate-700 text-slate-300 hover:border-sky-500 hover:text-sky-400 transition-colors cursor-pointer"
            title="复制 commit hash"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{current?.commitHash?.slice(0, 7)}</span>
          </span>
        </div>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setCurrentVersion(v.id);
                  setDropdownOpen(false);
                }}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-slate-700/50 last:border-0 hover:bg-sky-500/10 transition-colors',
                  v.id === currentVersionId && 'bg-sky-500/10 border-l-4 border-l-sky-500'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{v.version}</span>
                  <span className="text-xs text-slate-400 font-mono">{v.commitHash}</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{v.description}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {v.trainDate} · {v.sampleCount} 样本 · {v.batchCount} 批次
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck size={16} />
          <span>安全规则</span>
        </div>
        <div className="flex items-center gap-1.5">
          {safetyRules.map((r) => {
            const color = statusToDot(r);
            const ring = !r.isConsistent ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-900 animate-pulse-red' : '';
            return (
              <div
                key={r.id}
                title={`${r.name} - ${statusText(r)}${r.isConsistent ? '' : ' (页面/导出不一致)'}`}
                className={cn('w-3 h-3 rounded-full transition-all', color, ring)}
              />
            );
          })}
        </div>
        <div className="text-sm font-mono">
          <span className="text-emerald-400">{passCount}</span>
          <span className="text-slate-600"> / </span>
          <span className="text-slate-300">{totalCount}</span>
        </div>
      </div>
    </header>
  );
}
