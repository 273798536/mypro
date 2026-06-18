import { useState, useMemo } from 'react';
import {
  FileDown, FileText, BarChart3, Zap, AlertTriangle, Database,
  ChevronRight, Check,
} from 'lucide-react';
import { useLedgerStore } from '@/store/ledgerStore';
import { AnomalyBadge, SeverityBadge } from '@/components/StatusBadges';
import type { AnomalyType, RecordStatus } from '@/types/ledger';
import { ANOMALY_TYPE_LABELS, STATUS_LABELS } from '@/types/ledger';

export default function Export() {
  const { records, exportToCSV, loadSampleData, clearAllData } = useLedgerStore();
  const [exportAnomalyOnly, setExportAnomalyOnly] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<AnomalyType[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<RecordStatus[]>([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  const stats = useMemo(() => {
    const anomalies = records.filter((r) => r.anomaly_type !== 'normal').length;
    const backupGaps = records.filter((r) => r.anomaly_type === 'backup_gap').length;
    const slowQueries = records.filter((r) => r.anomaly_type === 'slow_query').length;
    const resolved = records.filter((r) => r.status === 'resolved').length;
    const pending = records.filter((r) => r.status === 'pending').length;
    return { total: records.length, anomalies, backupGaps, slowQueries, resolved, pending };
  }, [records]);

  const exportRecords = useMemo(() => {
    return records.filter((r) => {
      if (exportAnomalyOnly && r.anomaly_type === 'normal') return false;
      if (selectedTypes.length > 0 && !selectedTypes.includes(r.anomaly_type)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(r.status)) return false;
      if (dateStart && r.refresh_time < dateStart) return false;
      if (dateEnd && r.refresh_time > dateEnd + ' 23:59:59') return false;
      return true;
    });
  }, [records, exportAnomalyOnly, selectedTypes, selectedStatuses, dateStart, dateEnd]);

  const toggleInArray = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const handleExport = () => {
    if (exportRecords.length === 0) {
      alert('没有符合条件的记录可导出');
      return;
    }
    const csv = exportToCSV(exportRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `物化视图刷新台账_导出_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const anomalyTypeOptions: AnomalyType[] = ['backup_gap', 'slow_query', 'refresh_fail', 'normal'];
  const statusOptions: RecordStatus[] = ['pending', 'processing', 'resolved', 'archived'];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-brand flex items-center gap-2">
            <FileDown className="w-6 h-6" />
            报告导出与慢查询归因
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            日常入口：从这里导出业务可读的台账报告；月底或课前补充慢查询归因分析
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: '总记录', value: stats.total, icon: Database, color: 'text-slate-700 bg-slate-50 border-slate-200' },
          { label: '异常记录', value: stats.anomalies, icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: '备份缺口', value: stats.backupGaps, icon: AlertTriangle, color: 'text-amber-800 bg-amber-100 border-amber-300' },
          { label: '慢查询', value: stats.slowQueries, icon: Zap, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: '已解决', value: stats.resolved, icon: Check, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
        ].map((item) => (
          <div key={item.label} className={`card p-4 border ${item.color}`}>
            <div className="flex items-center justify-between mb-2">
              <item.icon className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-3xl font-serif font-semibold">{item.value}</p>
            <p className="text-xs mt-1 opacity-70">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2">
            <FileText className="w-4 h-4" />
            报告导出配置
          </h3>

          <div className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportAnomalyOnly}
                  onChange={(e) => setExportAnomalyOnly(e.target.checked)}
                  className="w-3.5 h-3.5 accent-brand"
                />
                <span className="text-slate-700">仅导出异常记录（排除正常刷新）</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">按异常类型筛选</label>
              <div className="flex flex-wrap gap-2">
                {anomalyTypeOptions.map((t) => (
                  <label
                    key={t}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs border cursor-pointer ${
                      selectedTypes.includes(t)
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(t)}
                      onChange={() => setSelectedTypes(toggleInArray(selectedTypes, t))}
                      className="w-3 h-3 hidden"
                    />
                    {ANOMALY_TYPE_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">按处理状态筛选</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((s) => (
                  <label
                    key={s}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs border cursor-pointer ${
                      selectedStatuses.includes(s)
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(s)}
                      onChange={() => setSelectedStatuses(toggleInArray(selectedStatuses, s))}
                      className="w-3 h-3 hidden"
                    />
                    {STATUS_LABELS[s]}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">开始日期</label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">结束日期</label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600">
                  预计导出 <strong className="text-brand">{exportRecords.length}</strong> 条记录
                </span>
              </div>
              <button
                onClick={handleExport}
                disabled={exportRecords.length === 0}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed py-2.5"
              >
                {downloaded ? <Check className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                {downloaded ? '已导出' : '导出 CSV 报告'}
              </button>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2">
            <Zap className="w-4 h-4" />
            慢查询归因入口（月底 / 课前）
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            月末复盘或课程汇报前，在此集中检查慢查询类记录的归因分析是否完整
          </p>

          {(() => {
            const slowRecords = records.filter((r) => r.anomaly_type === 'slow_query');
            const filled = slowRecords.filter((r) => r.slow_query_analysis && r.slow_query_analysis.trim().length > 0);
            const unfilled = slowRecords.filter((r) => !r.slow_query_analysis || r.slow_query_analysis.trim().length === 0);
            return (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 text-center">
                    <p className="text-2xl font-serif font-semibold text-blue-800">{slowRecords.length}</p>
                    <p className="text-xs text-blue-600">慢查询总数</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-center">
                    <p className="text-2xl font-serif font-semibold text-emerald-800">{filled.length}</p>
                    <p className="text-xs text-emerald-600">已归因</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 text-center">
                    <p className="text-2xl font-serif font-semibold text-amber-800">{unfilled.length}</p>
                    <p className="text-xs text-amber-600">待归因</p>
                  </div>
                </div>

                {unfilled.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-xs font-medium text-slate-600">以下慢查询尚未填写归因分析：</p>
                    {unfilled.slice(0, 5).map((r) => (
                      <a
                        key={r.id}
                        href={`#/record/${r.id}`}
                        className="block p-2 border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-sm flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={r.severity} />
                          <span className="font-mono text-xs text-slate-800">{r.view_name}</span>
                          <span className="text-xs text-slate-500">{r.refresh_time}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand" />
                      </a>
                    ))}
                    {unfilled.length > 5 && (
                      <p className="text-xs text-slate-400 pl-2">...还有 {unfilled.length - 5} 条</p>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              数据管理
            </h4>
            <div className="space-y-2">
              <button
                onClick={loadSampleData}
                className="btn w-full text-left flex items-center justify-between"
              >
                <span>重新加载示例数据（会追加到现有数据）</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => {
                  if (confirm('确认清空所有数据？此操作不可恢复。')) {
                    clearAllData();
                  }
                }}
                className="btn-danger w-full text-left flex items-center justify-between"
              >
                <span>清空所有台账数据</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
