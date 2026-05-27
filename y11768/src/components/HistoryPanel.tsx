import { useHistoryStore } from '@/store/historyStore';
import { useCorrectionStore } from '@/store/correctionStore';
import { useFunnelStore } from '@/store/funnelStore';
import { History, ChevronRight, Clock, User, Edit3, X } from 'lucide-react';
import { useState } from 'react';
import type { FunnelReport } from '@/data/types';

export default function HistoryPanel() {
  const { reports, selectedReportId, compareReportId, showComparison, selectReport, selectCompareReport, toggleComparison } = useHistoryStore();
  const { logs } = useCorrectionStore();
  const [expanded, setExpanded] = useState(false);
  const { funnelData } = useFunnelStore();

  const selectedReport = reports.find(r => r.id === selectedReportId);
  const compareReport = reports.find(r => r.id === compareReportId);

  return (
    <div className="absolute bottom-4 right-4 z-20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-[#0A1628]/90 backdrop-blur-xl hover:bg-white/5 transition-colors"
      >
        <History size={16} className="text-[#F0B429]" />
        <span className="text-sm font-medium text-white/80">历史对比</span>
        <ChevronRight size={14} className={`text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-2 w-96 rounded-xl border border-white/10 bg-[#0A1628]/95 backdrop-blur-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white/90">历史对比与修正痕迹</span>
              <button onClick={() => setExpanded(false)} className="text-white/40 hover:text-white/80">
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleComparison}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  showComparison
                    ? 'bg-[#F0B429]/20 border-[#F0B429]/50 text-[#F0B429]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {showComparison ? '对比模式：开启' : '开启对比'}
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
            <div>
              <div className="text-xs text-white/50 mb-2">选择报告期次</div>
              <div className="grid grid-cols-2 gap-2">
                {reports.map(report => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    isSelected={selectedReportId === report.id}
                    isCompare={compareReportId === report.id}
                    showComparison={showComparison}
                    onClick={() => {
                      if (showComparison && compareReportId !== report.id) {
                        selectCompareReport(report.id);
                      } else {
                        selectReport(report.id);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {showComparison && selectedReport && compareReport && (
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-xs text-[#F0B429] font-medium mb-2">期次差异对比</div>
                <ComparisonTable current={selectedReport} compare={compareReport} />
              </div>
            )}

            <div>
              <div className="text-xs text-white/50 mb-2">修正痕迹追踪</div>
              <div className="space-y-2">
                {logs.map(log => (
                  <CorrectionLogItem key={log.id} log={log} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({
  report,
  isSelected,
  isCompare,
  showComparison,
  onClick,
}: {
  report: FunnelReport;
  isSelected: boolean;
  isCompare: boolean;
  showComparison: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-lg border text-left transition-all ${
        isSelected
          ? 'bg-[#F0B429]/20 border-[#F0B429]/50'
          : isCompare && showComparison
          ? 'bg-blue-500/20 border-blue-500/50'
          : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
    >
      <div className={`text-xs font-medium ${isSelected ? 'text-[#F0B429]' : isCompare && showComparison ? 'text-blue-400' : 'text-white/80'}`}>
        {report.period}
      </div>
      <div className="text-[10px] text-white/40 mt-0.5">{report.generatedAt}</div>
      {isSelected && <div className="text-[10px] text-[#F0B429] mt-1">当前选中</div>}
      {isCompare && showComparison && <div className="text-[10px] text-blue-400 mt-1">对比基准</div>}
    </button>
  );
}

function ComparisonTable({ current, compare }: { current: FunnelReport; compare: FunnelReport }) {
  return (
    <div className="space-y-1.5">
      {current.snapshot.map((layer, i) => {
        const compareLayer = compare.snapshot[i];
        if (!compareLayer) return null;
        const diff = layer.enterCount - compareLayer.enterCount;
        const diffPct = compareLayer.enterCount > 0 ? (diff / compareLayer.enterCount) * 100 : 0;

        return (
          <div key={layer.nodeName} className="flex items-center justify-between text-[10px]">
            <span className="text-white/50 w-16">{layer.nodeName}</span>
            <span className="text-white/70 w-14 text-right">{layer.enterCount}</span>
            <span className={`w-20 text-right font-medium ${
              diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-white/30'
            }`}>
              {diff > 0 ? '+' : ''}{diff} ({diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CorrectionLogItem({ log }: { log: import('@/data/types').CorrectionLog }) {
  return (
    <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
      <div className="flex items-start gap-2">
        <Edit3 size={12} className="text-[#F0B429] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-white/70">
            <span className="text-[#F0B429]">{log.operator}</span> 修正了
            <span className="text-white/90 font-medium"> {log.targetId}</span> 的
            <span className="text-white/90 font-medium"> {log.field}</span>
          </div>
          <div className="text-[10px] text-white/40 mt-0.5 flex flex-wrap gap-1">
            <span className="line-through text-red-400/60">{log.oldValue}</span>
            <span>→</span>
            <span className="text-green-400">{log.newValue}</span>
          </div>
          <div className="text-[10px] text-white/30 mt-1">原因：{log.reason}</div>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/30">
            <Clock size={9} />
            {log.correctedAt}
          </div>
        </div>
      </div>
    </div>
  );
}
