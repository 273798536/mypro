import { useState, useEffect } from 'react';
import {
  Upload,
  ChevronDown,
  ChevronRight,
  FileWarning,
  FileCheck,
  History,
  AlertOctagon,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import { api, formatBytes, STATUS_LABEL } from '@/utils/api';
import type { BackupRecord, TypeDriftDetail } from '../../shared/types';

function TypeDriftPanel({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<TypeDriftDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTypeDrift(recordId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [recordId]);

  return (
    <div className="mt-4 ml-4 border-l-2 border-amber/40 pl-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <div className="section-title text-base">字段类型漂移详情</div>
          <div className="text-xs muted mt-0.5">
            {detail?.tableName}.{detail?.fieldName}
          </div>
        </div>
        <button onClick={onClose} className="btn-ghost text-xs">
          收起
        </button>
      </div>

      {loading ? (
        <div className="py-8 muted text-sm text-center">加载中...</div>
      ) : detail ? (
        <div className="mt-3 space-y-4">
          <div>
            <div className="label mb-2">类型变更历史</div>
            <div className="relative pl-5 space-y-3">
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slatex-200" />
              {detail.history.map((h, i) => (
                <div key={i} className="relative">
                  <div
                    className={`absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2 ${
                      i === 0 ? 'border-rose bg-rose' : 'border-slatex-300 bg-white'
                    }`}
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-navy-700">{h.type}</span>
                    <span className="badge-pending">{h.version}</span>
                    <span className="text-xs muted mono">
                      {new Date(h.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-rose-soft/30 border border-rose/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-rose-700 font-medium text-sm mb-1.5">
                <AlertOctagon className="w-4 h-4" />
                拦截规则
              </div>
              <p className="text-xs text-slatex-700 leading-relaxed">{detail.interceptionRule}</p>
            </div>
            <div className="bg-navy-50 border border-navy-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-navy-700 font-medium text-sm mb-1.5">
                <History className="w-4 h-4" />
                影响范围
              </div>
              <ul className="text-xs text-slatex-700 space-y-1 list-disc pl-4">
                {detail.impactScope.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function BackupRecords() {
  const { records, currentRoundId, loadAllForRound } = useAuditStore();
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(false);

  const sampleRecords = [
    { tableName: 'customer_feedback', fieldName: 'content', backupType: 'TEXT', reportType: 'VARCHAR(1024)', backupSize: 2097152, reportSize: 524288 },
    { tableName: 'customer_feedback', fieldName: 'rating', backupType: 'TINYINT', reportType: 'TINYINT', backupSize: 32768, reportSize: 32768 },
  ];

  const handleImportSample = async () => {
    if (!currentRoundId) return;
    setImporting(true);
    try {
      await api.importRecords(currentRoundId, sampleRecords);
      await loadAllForRound(currentRoundId);
    } catch (e) {
      alert(String(e));
    } finally {
      setImporting(false);
      setImportPreview(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">备份记录管理</h1>
          <p className="muted text-sm mt-1">导入备份记录，系统自动对比指标报表并标记差异</p>
        </div>
        <button onClick={() => setImportPreview((v) => !v)} className="btn-primary">
          <Upload className="w-4 h-4" /> 导入备份记录
        </button>
      </div>

      {importPreview && (
        <div className="card bg-navy-50/60 border border-navy-200 animate-slide-up">
          <div className="section-title mb-3">导入预览（示例数据）</div>
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slatex-500">
                  <th className="pb-2 font-medium">表名</th>
                  <th className="pb-2 font-medium">字段</th>
                  <th className="pb-2 font-medium">备份类型</th>
                  <th className="pb-2 font-medium">报表类型</th>
                  <th className="pb-2 font-medium">备份容量</th>
                  <th className="pb-2 font-medium">报表容量</th>
                  <th className="pb-2 font-medium">预警</th>
                </tr>
              </thead>
              <tbody>
                {sampleRecords.map((r, i) => {
                  const drift = r.backupType !== r.reportType;
                  const mismatch = Math.abs(r.backupSize - r.reportSize) > 0.05 * r.backupSize;
                  return (
                    <tr key={i} className="border-t border-slatex-100">
                      <td className="py-2 mono">{r.tableName}</td>
                      <td className="py-2 mono">{r.fieldName}</td>
                      <td className={`py-2 mono ${drift ? 'text-rose font-semibold' : ''}`}>{r.backupType}</td>
                      <td className={`py-2 mono ${drift ? 'text-rose font-semibold' : ''}`}>{r.reportType}</td>
                      <td className={`py-2 mono ${mismatch ? 'text-amber font-semibold' : ''}`}>{formatBytes(r.backupSize)}</td>
                      <td className={`py-2 mono ${mismatch ? 'text-amber font-semibold' : ''}`}>{formatBytes(r.reportSize)}</td>
                      <td className="py-2">
                        {drift && <span className="badge-pending mr-1">类型漂移</span>}
                        {mismatch && <span className="badge-pending">容量差异</span>}
                        {!drift && !mismatch && <span className="badge-resolved">正常</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setImportPreview(false)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleImportSample} className="btn-primary" disabled={importing}>
              {importing ? '导入中...' : '确认导入'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title mb-4">记录对比列表</div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slatex-500 border-b border-slatex-200">
                <th className="pb-3 font-medium w-8"></th>
                <th className="pb-3 font-medium">表名</th>
                <th className="pb-3 font-medium">字段名</th>
                <th className="pb-3 font-medium">备份字段类型</th>
                <th className="pb-3 font-medium">报表字段类型</th>
                <th className="pb-3 font-medium">备份容量</th>
                <th className="pb-3 font-medium">报表容量</th>
                <th className="pb-3 font-medium">异常</th>
                <th className="pb-3 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r: BackupRecord) => {
                const expanded = openRow === r.id;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slatex-100 hover:bg-slatex-50 transition ${
                      r.hasTypeDrift || r.hasSizeMismatch ? 'bg-amber-soft/10' : ''
                    }`}
                  >
                    <td className="py-3">
                      {r.hasTypeDrift && (
                        <button onClick={() => setOpenRow(expanded ? null : r.id)} className="text-slatex-500 hover:text-navy-700">
                          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                    <td className="py-3 mono font-medium text-navy-800">{r.tableName}</td>
                    <td className="py-3 mono text-slatex-700">{r.fieldName}</td>
                    <td className={`py-3 mono ${r.hasTypeDrift ? 'text-rose font-semibold animate-pulse-soft' : 'text-slatex-700'}`}>
                      {r.backupType}
                    </td>
                    <td className={`py-3 mono ${r.hasTypeDrift ? 'text-rose font-semibold animate-pulse-soft' : 'text-slatex-700'}`}>
                      {r.reportType}
                    </td>
                    <td className={`py-3 mono ${r.hasSizeMismatch ? 'text-amber font-semibold' : 'text-slatex-700'}`}>
                      {formatBytes(r.backupSize)}
                    </td>
                    <td className={`py-3 mono ${r.hasSizeMismatch ? 'text-amber font-semibold' : 'text-slatex-700'}`}>
                      {formatBytes(r.reportSize)}
                    </td>
                    <td className="py-3">
                      {r.hasTypeDrift && (
                        <span className="flex items-center gap-1 text-rose-700 text-xs font-medium mr-2">
                          <FileWarning className="w-3.5 h-3.5" /> 类型漂移
                        </span>
                      )}
                      {r.hasSizeMismatch && (
                        <span className="flex items-center gap-1 text-amber-700 text-xs font-medium">
                          <FileWarning className="w-3.5 h-3.5" /> 容量不一致
                        </span>
                      )}
                      {!r.hasTypeDrift && !r.hasSizeMismatch && (
                        <span className="flex items-center gap-1 text-jade-700 text-xs font-medium">
                          <FileCheck className="w-3.5 h-3.5" /> 正常
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`badge-${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center muted">
                    暂无记录，请导入备份数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {openRow && (
          <TypeDriftPanel recordId={openRow} onClose={() => setOpenRow(null)} />
        )}
      </div>
    </div>
  );
}
