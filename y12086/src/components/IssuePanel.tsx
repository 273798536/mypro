import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import { useGalleryStore } from '@/store/useGalleryStore';
import { valves } from '@/data/mockData';
import type { DuplicateValveIssue, RouteCrossZoneIssue, OverdueWorkOrderIssue } from '@/data/types';

const ZONE_LABELS: Record<string, string> = { green: '绿区', yellow: '黄区', red: '红区' };

function DuplicateSection() {
  const [open, setOpen] = useState(true);
  const issues = useGalleryStore((s) => s.duplicateIssues);
  const selectValve = useGalleryStore((s) => s.selectValve);
  const selectIssue = useGalleryStore((s) => s.selectIssue);
  const setFocusPosition = useGalleryStore((s) => s.setFocusPosition);

  const handleClick = useCallback((issue: DuplicateValveIssue, valveGallery: string) => {
    const valve = issue.valves.find((v) => `${v.valveId}@${v.galleryId}` === valveGallery);
    if (valve) {
      selectValve(valveGallery);
      selectIssue(issue);
      setFocusPosition(valve.position);
    }
  }, [selectValve, selectIssue, setFocusPosition]);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded bg-[#FF6B35]/10 hover:bg-[#FF6B35]/20 transition-colors"
      >
        {open ? <ChevronDown size={14} className="text-[#FF6B35]" /> : <ChevronRight size={14} className="text-[#FF6B35]" />}
        <AlertTriangle size={14} className="text-[#FF6B35]" />
        <span className="text-[#FF6B35] font-semibold text-xs tracking-wide">阀门重号</span>
        <span className="ml-auto bg-[#FF6B35] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{issues.length}组</span>
      </button>
      {open && (
        <div className="mt-1 space-y-1 pl-2">
          {issues.map((issue) => (
            <div key={issue.valveId} className="bg-[#1a2640] rounded p-2 border border-[#FF6B35]/20">
              <div className="text-[#FF6B35] font-bold text-xs font-mono mb-1">编号 {issue.valveId} 出现 {issue.valves.length} 次</div>
              {issue.valves.map((v, vi) => (
                <button
                  key={`${v.valveId}@${v.galleryId}#${vi}`}
                  onClick={() => handleClick(issue, `${v.valveId}@${v.galleryId}`)}
                  className="block w-full text-left text-[11px] text-zinc-300 hover:text-white hover:bg-[#FF6B35]/10 px-2 py-1 rounded transition-colors"
                >
                  → 位置: {v.galleryId} ({v.position.map((c) => c.toFixed(0)).join(', ')})
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CrossZoneSection() {
  const [open, setOpen] = useState(true);
  const issues = useGalleryStore((s) => s.crossZoneIssues);
  const selectIssue = useGalleryStore((s) => s.selectIssue);
  const setFocusPosition = useGalleryStore((s) => s.setFocusPosition);

  const handleClick = useCallback((issue: RouteCrossZoneIssue) => {
    const valve = valves.find((v) => `${v.valveId}@${v.galleryId}` === issue.toValve);
    if (valve) {
      selectIssue(issue);
      setFocusPosition(valve.position);
    }
  }, [selectIssue, setFocusPosition]);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded bg-[#FFD700]/10 hover:bg-[#FFD700]/20 transition-colors"
      >
        {open ? <ChevronDown size={14} className="text-[#FFD700]" /> : <ChevronRight size={14} className="text-[#FFD700]" />}
        <ShieldAlert size={14} className="text-[#FFD700]" />
        <span className="text-[#FFD700] font-semibold text-xs tracking-wide">路线穿禁区</span>
        <span className="ml-auto bg-[#FFD700] text-black text-[10px] px-1.5 py-0.5 rounded-full font-bold">{issues.length}处</span>
      </button>
      {open && (
        <div className="mt-1 space-y-1 pl-2">
          {issues.map((issue, i) => (
            <button
              key={`${issue.routeId}-${i}`}
              onClick={() => handleClick(issue)}
              className="block w-full text-left bg-[#1a2640] rounded p-2 border border-[#FFD700]/20 hover:bg-[#FFD700]/10 transition-colors"
            >
              <div className="text-[#FFD700] font-bold text-xs font-mono">{issue.routeId}</div>
              <div className="text-[11px] text-zinc-300 mt-0.5">
                {issue.fromValve} ({ZONE_LABELS[issue.fromZone]}) → {issue.toValve} ({ZONE_LABELS[issue.toZone]})
              </div>
              {issue.severity === 'critical' && (
                <span className="inline-block mt-1 text-[9px] bg-red-600/80 text-white px-1.5 py-0.5 rounded">进入红区-严重</span>
              )}
              {issue.severity === 'warning' && (
                <span className="inline-block mt-1 text-[9px] bg-yellow-600/80 text-white px-1.5 py-0.5 rounded">跨区穿越-警告</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OverdueSection() {
  const [open, setOpen] = useState(true);
  const issues = useGalleryStore((s) => s.overdueIssues);
  const selectIssue = useGalleryStore((s) => s.selectIssue);
  const setFocusPosition = useGalleryStore((s) => s.setFocusPosition);
  const selectValve = useGalleryStore((s) => s.selectValve);

  const handleClick = useCallback((issue: OverdueWorkOrderIssue) => {
    const valve = valves.find((v) => v.valveId === issue.valveRef);
    if (valve) {
      selectValve(`${valve.valveId}@${valve.galleryId}`);
      selectIssue(issue);
      setFocusPosition(valve.position);
    }
  }, [selectValve, selectIssue, setFocusPosition]);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded bg-[#E74C3C]/10 hover:bg-[#E74C3C]/20 transition-colors"
      >
        {open ? <ChevronDown size={14} className="text-[#E74C3C]" /> : <ChevronRight size={14} className="text-[#E74C3C]" />}
        <Clock size={14} className="text-[#E74C3C]" />
        <span className="text-[#E74C3C] font-semibold text-xs tracking-wide">工单过期</span>
        <span className="ml-auto bg-[#E74C3C] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{issues.length}单</span>
      </button>
      {open && (
        <div className="mt-1 space-y-1 pl-2">
          {issues.map((issue) => (
            <button
              key={issue.workOrderId}
              onClick={() => handleClick(issue)}
              className="block w-full text-left bg-[#1a2640] rounded p-2 border border-[#E74C3C]/20 hover:bg-[#E74C3C]/10 transition-colors"
            >
              <div className="text-[#E74C3C] font-bold text-xs font-mono">{issue.workOrderId}</div>
              <div className="text-[11px] text-zinc-300 mt-0.5">
                阀门: {issue.valveRef} | 截止: {issue.dueDate}
              </div>
              <div className="text-[11px] text-[#E74C3C] font-semibold">
                已超期 {issue.overdueDays} 天
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IssuePanel() {
  const duplicateIssues = useGalleryStore((s) => s.duplicateIssues);
  const crossZoneIssues = useGalleryStore((s) => s.crossZoneIssues);
  const overdueIssues = useGalleryStore((s) => s.overdueIssues);
  const totalIssues = duplicateIssues.length + crossZoneIssues.length + overdueIssues.length;

  return (
    <div className="w-80 min-w-[320px] h-full bg-[#0f1a2e] border-r border-[#1e3050] flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1e3050]">
        <h2 className="text-white font-bold text-sm tracking-wide">问题摘要</h2>
        <div className="text-[11px] text-zinc-400 mt-0.5">
          共检测到 <span className="text-white font-bold">{totalIssues}</span> 项问题
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <DuplicateSection />
        <CrossZoneSection />
        <OverdueSection />
      </div>
      <div className="px-4 py-2 border-t border-[#1e3050] text-[10px] text-zinc-500">
        点击条目可定位到3D场景对应位置
      </div>
    </div>
  );
}
