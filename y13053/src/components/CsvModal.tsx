import { useMemo, useState } from 'react';
import { X, Download, Copy, Check, FileSpreadsheet } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { CSV_HEADERS, toCsvRows, downloadCsv, copyToClipboard } from '@/utils/csvExport';
import type { WindProfilePoint } from '@/types';

interface Props {
  points: WindProfilePoint[];
}

const HEADERS = CSV_HEADERS;

export function CsvModal({ points }: Props) {
  const { csvModalOpen, toggleCsvModal, filters } = useAppStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const csv = useMemo(() => toCsvRows(points), [points]);

  if (!csvModalOpen) return null;

  const handleCopyRow = async (row: string, id: string) => {
    const ok = await copyToClipboard(row);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleCopyAll = async () => {
    const ok = await copyToClipboard(csv);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ocean-900/50 backdrop-blur-sm animate-fadeIn"
         onClick={toggleCsvModal}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-ocean-200 animate-scaleIn"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-ocean-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-ocean-500" />
            <h3 className="font-serif font-semibold text-ocean-700 text-sm">CSV 明细 · 当前筛选</h3>
            <span className="text-[11px] font-mono text-ocean-400">{points.length} 行</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-ocean-200 text-ocean-600 hover:bg-ocean-50 transition-colors"
            >
              {copiedAll ? <Check className="w-3 h-3 text-tealish-dark" /> : <Copy className="w-3 h-3" />}
              {copiedAll ? '已复制' : '复制全部'}
            </button>
            <button
              onClick={() => {
                const suffix =
                  filters.statusFilter === 'anomaly' ? '_anomaly'
                  : filters.statusFilter === 'normal' ? '_normal'
                  : '';
                const station = filters.station ? `_${filters.station}` : '';
                downloadCsv(points, `wind_profile${station}${suffix}_detail.csv`);
              }}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-ocean-600 text-white hover:bg-ocean-700 transition-colors"
            >
              <Download className="w-3 h-3" />
              下载 CSV
            </button>
            <button onClick={toggleCsvModal} className="p-1 rounded hover:bg-ocean-100 transition-colors">
              <X className="w-4 h-4 text-ocean-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto font-mono text-xs">
          <table className="w-full border-collapse">
            <thead className="bg-ocean-50 sticky top-0 z-10">
              <tr>
                {HEADERS.map((h) => (
                  <th key={h} className="text-left px-3 py-2 border-b border-ocean-100 text-ocean-600 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-2 py-2 border-b border-ocean-100 w-16" />
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => {
                const rowArr = [p.id, p.station, p.height, p.heightUnit, p.windSpeed.toFixed(1), p.windDirection, p.timestamp, p.isAnomaly ? '是' : '否', p.linkedRecordId ?? ''];
                const rowStr = rowArr.join(',');
                const isAlt = i % 2 === 1;
                return (
                  <tr key={p.id} className={`group ${isAlt ? 'bg-ocean-50/30' : 'bg-white'} hover:bg-tealish-light/40 transition-colors`}>
                    <td className="px-3 py-1.5 border-b border-ocean-50 text-ocean-500">{p.id}</td>
                    <td className="px-3 py-1.5 border-b border-ocean-50">{p.station}</td>
                    <td className="px-3 py-1.5 border-b border-ocean-50 text-right">{p.height}</td>
                    <td className="px-3 py-1.5 border-b border-ocean-50">{p.heightUnit}</td>
                    <td className="px-3 py-1.5 border-b border-ocean-50 text-right">{p.windSpeed.toFixed(1)}</td>
                    <td className="px-3 py-1.5 border-b border-ocean-50 text-right">{p.windDirection}</td>
                    <td className="px-3 py-1.5 border-b border-ocean-50 text-ocean-500">{p.timestamp}</td>
                    <td className="px-3 py-1.5 border-b border-ocean-50">
                      {p.isAnomaly ? <span className="text-alert font-semibold">是</span> : <span className="text-ocean-400">否</span>}
                    </td>
                    <td className="px-3 py-1.5 border-b border-ocean-50 text-ocean-400">{p.linkedRecordId ?? '-'}</td>
                    <td className="px-2 py-1.5 border-b border-ocean-50 text-center">
                      <button
                        onClick={() => handleCopyRow(rowStr, p.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-ocean-100 transition-opacity"
                        title="复制此行"
                      >
                        {copiedId === p.id ? <Check className="w-3 h-3 text-tealish-dark" /> : <Copy className="w-3 h-3 text-ocean-400" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
