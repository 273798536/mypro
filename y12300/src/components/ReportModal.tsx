import { useState } from 'react';
import { X } from 'lucide-react';
import { halls, floors, visitorRecords, dataSources } from '@/data/museum-data';
import { useMuseumStore } from '@/store/museum-store';

function getCongestion(ratio: number) {
  if (ratio < 0.5) return { label: '畅通', cls: 'text-green-400', bg: 'bg-green-500/20' };
  if (ratio < 0.8) return { label: '适中', cls: 'text-amber-400', bg: 'bg-amber-500/20' };
  return { label: '拥堵', cls: 'text-red-400', bg: 'bg-red-500/20' };
}

export default function ReportModal() {
  const showReportModal = useMuseumStore((s) => s.showReportModal);
  const setShowReportModal = useMuseumStore((s) => s.setShowReportModal);
  const selectedFloor = useMuseumStore((s) => s.selectedFloor);
  const selectedTimeRange = useMuseumStore((s) => s.selectedTimeRange);
  const validationIssues = useMuseumStore((s) => s.validationIssues);
  const [copied, setCopied] = useState(false);

  if (!showReportModal) return null;

  const displayHalls = selectedFloor
    ? halls.filter((h) => h.floorId === selectedFloor)
    : halls;

  const hallData = displayHalls.map((hall) => {
    const floor = floors.find((f) => f.id === hall.floorId);
    const records = visitorRecords.filter(
      (r) =>
        r.hallId === hall.id &&
        r.timestamp >= selectedTimeRange[0] &&
        r.timestamp <= selectedTimeRange[1]
    );
    const count = records.reduce((sum, r) => sum + r.count, 0);
    const ratio = count / hall.capacity;
    return { hall, floor, count, ratio, congestion: getCongestion(ratio) };
  });

  const handleCopy = async () => {
    const lines: string[] = [];
    lines.push('热区分析报告');
    lines.push('');
    lines.push('热区摘要');
    lines.push('展厅\t楼层\t客流\t容量\t密度比\t状态');
    for (const d of hallData) {
      lines.push(`${d.hall.name}\t${d.floor?.name}\t${d.count}\t${d.hall.capacity}\t${(d.ratio * 100).toFixed(1)}%\t${d.congestion.label}`);
    }
    lines.push('');
    lines.push('数据校验结果');
    if (validationIssues.length === 0) {
      lines.push('无异常');
    } else {
      for (const v of validationIssues) {
        lines.push(`[${v.severity}] ${v.description}`);
      }
    }
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0F1923]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">热区分析报告</h2>
          <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-white/80">
          <div>
            <h3 className="text-white font-medium mb-2">热区摘要</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-white/40 border-b border-white/10">
                    <th className="py-1 text-left">展厅</th>
                    <th className="py-1 text-left">楼层</th>
                    <th className="py-1 text-right">客流</th>
                    <th className="py-1 text-right">容量</th>
                    <th className="py-1 text-right">密度比</th>
                    <th className="py-1 text-center">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {hallData.map((d) => (
                    <tr key={d.hall.id} className="border-b border-white/5">
                      <td className="py-1.5">{d.hall.name}</td>
                      <td className="py-1.5">{d.floor?.name}</td>
                      <td className="py-1.5 text-right">{d.count}</td>
                      <td className="py-1.5 text-right">{d.hall.capacity}</td>
                      <td className="py-1.5 text-right">{(d.ratio * 100).toFixed(1)}%</td>
                      <td className="py-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${d.congestion.bg} ${d.congestion.cls}`}>
                          {d.congestion.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-white font-medium mb-2">热力映射口径</h3>
            <div className="space-y-1 text-[11px]">
              {dataSources.map((ds) => (
                <div key={ds.id} className="text-white/50">
                  {ds.systemName} ({ds.version}) — 采样间隔: {ds.calibrationNote.split('，')[1] ?? ds.calibrationNote}
                </div>
              ))}
              <div className="text-white/40 pt-1">归一化方法：客流量/容量上限 = 密度比</div>
            </div>
          </div>

          <div>
            <h3 className="text-white font-medium mb-2">数据校验结果</h3>
            {validationIssues.length === 0 ? (
              <span className="text-green-400">无异常</span>
            ) : (
              <div className="space-y-1">
                {validationIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-2 p-1.5 bg-white/5 rounded">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      issue.severity === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {issue.severity === 'error' ? '错误' : '警告'}
                    </span>
                    <span className="text-[11px] text-white/50">{issue.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-white font-medium mb-2">数据来源清单</h3>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="py-1 text-left">系统</th>
                  <th className="py-1 text-left">版本</th>
                  <th className="py-1 text-left">采集时间</th>
                  <th className="py-1 text-left">校准说明</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((ds) => (
                  <tr key={ds.id} className="border-b border-white/5">
                    <td className="py-1.5">{ds.systemName}</td>
                    <td className="py-1.5">{ds.version}</td>
                    <td className="py-1.5">{ds.collectionTime}</td>
                    <td className="py-1.5 text-white/40">{ds.calibrationNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-xs text-white/80 transition-colors"
          >
            {copied ? '已复制' : '复制文本'}
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-[#00E676]/20 hover:bg-[#00E676]/30 rounded text-xs text-[#00E676] transition-colors"
          >
            下载PDF
          </button>
        </div>
      </div>
    </div>
  );
}
