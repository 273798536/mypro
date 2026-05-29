import { useState, useEffect } from 'react';
import { Download, Filter, Search, FileSpreadsheet, FileText, CheckSquare, Square, X } from 'lucide-react';
import type { CalculationFlag } from '../../shared/types';

const FLAG_OPTIONS: { value: CalculationFlag; label: string }[] = [
  { value: 'rate_missing', label: '费率缺失' },
  { value: 'weather_cross_period', label: '跨时段豁免' },
  { value: 'handling_pause', label: '装卸暂停' },
  { value: 'rate_step_review', label: '阶梯复核' },
];

interface CalcListItem {
  id: string;
  vessel_name: string;
  port: string;
  berth_start: string;
  total_demurrage: number;
  flags: string;
}

export default function ExportPage() {
  const [vesselName, setVesselName] = useState('');
  const [port, setPort] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [flagFilter, setFlagFilter] = useState('');
  const [results, setResults] = useState<CalcListItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [includeAuditTrail, setIncludeAuditTrail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (vesselName) params.set('vesselName', vesselName);
      if (port) params.set('port', port);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (flagFilter) params.set('flag', flagFilter);

      const res = await fetch(`/api/calculation/list?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.calculations || []);
        setSelected(new Set());
      }
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.id)));
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    if (selected.size === 0) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculationIds: Array.from(selected),
          format,
          includeAuditTrail,
        }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'excel' ? `demurrage_export.xlsx` : `demurrage_export.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const parseFlags = (flagsStr: string): CalculationFlag[] => {
    try { return JSON.parse(flagsStr || '[]'); } catch { return []; }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">筛选与导出</h2>
          <p className="text-steel-500 mt-1">按条件筛选试算结果，导出滞期费明细</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={selected.size === 0 || exporting}
            className="btn-outline flex items-center gap-2 disabled:opacity-40"
          >
            <FileText className="w-4 h-4" />
            导出 CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={selected.size === 0 || exporting}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4" />
            导出 Excel
          </button>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-xs text-steel-500 mb-1 block">船名</label>
            <div className="relative">
              <Search className="w-4 h-4 text-steel-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="input-field pl-9"
                placeholder="搜索船名"
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-steel-500 mb-1 block">港口</label>
            <input
              className="input-field"
              placeholder="搜索港口"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-steel-500 mb-1 block">靠泊开始</label>
            <input type="date" className="input-field" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-steel-500 mb-1 block">靠泊结束</label>
            <input type="date" className="input-field" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="text-xs text-steel-500 mb-1 block">异常状态</label>
            <select className="input-field" value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)}>
              <option value="">全部</option>
              {FLAG_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <button onClick={fetchList} className="btn-primary flex items-center gap-2" disabled={loading}>
            <Filter className="w-4 h-4" />
            筛选
          </button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="card p-3 mb-4 flex items-center justify-between bg-port-50 border-port-200 animate-slide-down">
          <span className="text-sm text-port-700">
            已选择 <strong className="font-mono">{selected.size}</strong> 条记录
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-navy-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAuditTrail}
                onChange={(e) => setIncludeAuditTrail(e.target.checked)}
                className="rounded border-steel-300 text-port-500 focus:ring-port-300"
              />
              包含计算流水
            </label>
            <button onClick={() => setSelected(new Set())} className="text-xs text-steel-500 hover:text-navy-700">
              取消选择
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="table-container border-0 rounded-none">
          <table>
            <thead>
              <tr>
                <th className="w-10">
                  <button onClick={selectAll} className="text-steel-400 hover:text-navy-800">
                    {selected.size === results.length && results.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-port-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th>船名</th>
                <th>港口</th>
                <th>靠泊时间</th>
                <th>滞期费</th>
                <th>异常标记</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const flags = parseFlags(r.flags);
                const isSelected = selected.has(r.id);
                return (
                  <tr key={r.id} className={isSelected ? 'bg-port-50/50' : ''}>
                    <td>
                      <button onClick={() => toggleSelect(r.id)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-port-500" />
                        ) : (
                          <Square className="w-4 h-4 text-steel-300" />
                        )}
                      </button>
                    </td>
                    <td className="font-medium text-navy-900">{r.vessel_name}</td>
                    <td className="text-steel-600">{r.port}</td>
                    <td className="font-mono text-xs text-steel-600">{r.berth_start || '—'}</td>
                    <td className="font-mono font-semibold text-navy-900">
                      {r.total_demurrage?.toLocaleString() ?? '—'}
                    </td>
                    <td>
                      {flags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {flags.map((f) => {
                            const opt = FLAG_OPTIONS.find(o => o.value === f);
                            return (
                              <span key={f} className={f === 'rate_missing' ? 'badge-error' : 'badge-warning'}>
                                {opt?.label || f}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="badge-success text-[10px]">通过</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {results.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-steel-400">
                    <Download className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无试算结果，请先运行试算</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
