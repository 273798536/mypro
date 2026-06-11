import { useState, useMemo, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Check,
  Eye,
  FileCheck,
  ShieldAlert,
  Calendar,
  Layers,
  X,
} from 'lucide-react';
import Papa from 'papaparse';
import dayjs from 'dayjs';
import { useAppStore } from '../store/appStore';
import { cn } from '../lib/utils';
import Toolbar from '../components/Toolbar';
import type { AnomalyRecord, RigPoint } from '../types';

const STATUS_LABELS: Record<string, string> = {
  approved: '已通过',
  pending: '待审核',
  conflict: '坐标冲突',
  withdrawn: '已撤回',
  rejected: '已驳回',
};

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  screenshot_missing: '截图丢失',
  conflict: '坐标冲突',
  old_version: '旧版遗留',
  withdrawn: '撤回记录',
};

function getVersionLabel(versions: any[], versionId: string): string {
  return versions.find((v: any) => v.id === versionId)?.label ?? `版本${versionId}`;
}

function getAnomaliesForPoint(point: RigPoint, anomalies: AnomalyRecord[]): AnomalyRecord[] {
  return anomalies.filter(a => a.versionId === point.versionId && a.pointId === point.id);
}

function hasAnyAnomalyInVersion(point: RigPoint, anomalies: AnomalyRecord[]): boolean {
  return anomalies.some(a => a.versionId === point.versionId && (a.pointId === point.id || !a.pointId));
}

export default function ExportPage() {
  const store = useAppStore();
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeSources, setIncludeSources] = useState(true);
  const [includeAnomalyMark, setIncludeAnomalyMark] = useState(true);
  const [exportSuccess, setExportSuccess] = useState<null | string>(null);
  const [exportError, setExportError] = useState<null | string>(null);

  const filters = useAppStore((s) => s.filters);
  const versions = useAppStore((s) => s.versions);
  const allAnomalies = useAppStore((s) => s.anomalies);
  const activeVer = store.getActiveVersion();

  const points = store.getFilteredPoints();

  const involvedVersionIds = useMemo(() =>
    Array.from(new Set(points.map((p) => p.versionId))),
    [points]
  );

  const anomalies = useMemo(() =>
    allAnomalies.filter((a) => involvedVersionIds.includes(a.versionId)),
    [allAnomalies, involvedVersionIds]
  );

  const csvData = useMemo(() => {
    return points.map((p) => {
      const pointNotes = (store.notesByPointId[p.id] ?? []).concat(
        p.notes.filter((n) => !(store.notesByPointId[p.id] ?? []).some((x) => x.id === n.id))
      );
      const pointAnomalies = getAnomaliesForPoint(p, anomalies);
      const hasAnomaly = pointAnomalies.length > 0;

      let statusDisplay = STATUS_LABELS[p.status] ?? p.status;
      if (includeAnomalyMark && hasAnomaly) {
        const anomalyTypes = Array.from(new Set(pointAnomalies.map((a) => ANOMALY_TYPE_LABELS[a.anomalyType] ?? a.anomalyType)));
        statusDisplay = `[异常-${anomalyTypes.join('/')}] ${statusDisplay}`;
      }
      if (p.status === 'withdrawn') {
        statusDisplay = `${statusDisplay}（已撤回）`;
      }
      if (p.isOldVersion) {
        statusDisplay = `[旧版坐标] ${statusDisplay}`;
      }

      const sources = includeSources
        ? p.dataSources.map((s) => {
            const label =
              s.sourceType === 'official' ? '正式' :
              s.sourceType === 'verbal' ? '口头' : '旧版/撤回';
            return `${label}:${Math.round(s.impactWeight * 100)}%`;
          }).join(' | ')
        : '';

      const notesStr = includeNotes
        ? pointNotes.map((n) => `${n.isVerbal ? '[口头]' : '[书面]'}${n.author}:${n.content}`).join(' || ')
        : '';

      const pointVersionLabel = getVersionLabel(versions, p.versionId);

      return {
        编号: p.rigNo,
        区域: p.zone,
        X坐标: p.x_coord,
        Y坐标: p.y_coord,
        Z坐标: p.z_coord,
        状态: statusDisplay,
        是否旧版坐标: p.isOldVersion ? '是' : '否',
        markedAsNormal: includeAnomalyMark && hasAnomaly ? 'false（异常记录不可标记为正常通过）' : 'true',
        ...(includeSources ? { 数据来源构成: sources } : {}),
        ...(includeNotes && pointNotes.length > 0 ? { 人工备注: notesStr } : {}),
        所属版本: pointVersionLabel,
        版本ID: p.versionId,
        导出时间: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };
    });
  }, [points, store.notesByPointId, anomalies, includeNotes, includeSources, includeAnomalyMark, versions]);

  const anomalySummary = useMemo(() => {
    if (!includeAnomalyMark) return null;
    return anomalies.map((a, idx) => {
      const rigNo = a.pointId ? (store.getPointById(a.pointId)?.rigNo ?? null) : null;
      let finalDesc = a.description;
      if (rigNo) {
        const descHasRig = /RIG-\d{4}/.test(finalDesc);
        if (!descHasRig) {
          finalDesc = `【关联吊杆${rigNo}】` + finalDesc;
        } else {
          finalDesc = finalDesc.replace(/RIG-\d{4}/, rigNo);
        }
      }
      return {
        编号: `异常${String(idx + 1).padStart(2, '0')}`,
        所属版本: getVersionLabel(versions, a.versionId),
        版本ID: a.versionId,
        异常类型: ANOMALY_TYPE_LABELS[a.anomalyType] ?? a.anomalyType,
        关联吊杆: rigNo ?? '批量/整版',
        状态: a.status === 'open' ? '待处理' : a.status === 'processing' ? '处理中' : '已关闭',
        描述: finalDesc,
        markedAsNormal: 'false',
      };
    });
  }, [anomalies, includeAnomalyMark, store, versions]);

  const handleExport = () => {
    setExportSuccess(null);
    setExportError(null);

    try {
      if (csvData.length === 0) {
        setExportError('当前筛选条件下没有可导出的点位，请调整筛选条件后重试');
        return;
      }

      const now = dayjs();
      const nowStr = now.format('YYYY-MM-DD HH:mm:ss');
      const projectLabel = '国家大剧院主舞台吊杆阵列方案比选';
      const scopeLabel =
        filters.versionScope === 'current' ? '仅当前版本' :
        filters.versionScope === 'includeOld' ? '含旧版数据' : '仅撤回版本';
      const verLabel = activeVer?.label ?? '导出';

      const columns = Object.keys(csvData[0] ?? {});
      const makeWideRow = (firstColText: string) => {
        const row: Record<string, string> = {};
        columns.forEach((col, i) => {
          row[col] = i === 0 ? firstColText : '';
        });
        return row;
      };
      const makeEmptyRow = () => {
        const row: Record<string, string> = {};
        columns.forEach((col) => { row[col] = ''; });
        return row;
      };

      const headerMeta = [
        makeWideRow(`【文件头】${projectLabel}`),
        makeWideRow(`导出时间：${nowStr}；活动版本：${verLabel}；数据范围：${scopeLabel}`),
        makeWideRow(`点位共 ${csvData.length} 条；异常共 ${anomalySummary?.length ?? 0} 条`),
        makeEmptyRow(),
      ];

      const sectionDivider = [
        makeEmptyRow(),
        makeWideRow('===== 以上为点位明细 / 以下为异常记录汇总 ====='),
        makeEmptyRow(),
      ];

      const anomalySummaryWide = anomalySummary?.map((a) => {
        const row: Record<string, string> = {};
        columns.forEach((col) => {
          row[col] = (a as any)[col] ?? '';
        });
        return row;
      }) ?? [];

      const allData = [
        ...headerMeta,
        ...csvData,
        ...(anomalySummary && anomalySummary.length > 0 ? sectionDivider : []),
        ...anomalySummaryWide,
      ];

      const csv = Papa.unparse(allData, {
        columns,
        quotes: true,
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ',',
        newline: '\r\n',
      });

      const BOM = '\uFEFF';
      const finalContent = BOM + csv;
      const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8;header=present' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const safeScope = scopeLabel.replace(/[（）\s\/\\:?*"<>\|]/g, '_');
      const safeVer = verLabel.replace(/[（）\s\/\\:?*"<>\|]/g, '_');
      link.download = `吊杆方案明细_${safeVer}_${safeScope}_${now.format('YYYYMMDD_HHmmss')}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setExportSuccess(`成功导出 ${csvData.length} 条点位明细 + ${anomalySummary?.length ?? 0} 条异常汇总（文件名：${link.download}）`);

      setTimeout(() => setExportSuccess(null), 8000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      setExportError(`导出失败：${msg}`);
      setTimeout(() => setExportError(null), 10000);
    }
  };

  useEffect(() => {
    setExportSuccess(null);
    setExportError(null);
  }, [filters.versionScope]);

  const totalPoints = points.length;
  const withAnomalies = points.filter((p) => getAnomaliesForPoint(p, anomalies).length > 0).length;
  const versionWideAnomalies = anomalies.filter((a) => !a.pointId).length;
  const oldVersionPoints = points.filter((p) => p.isOldVersion).length;
  const withdrawnPoints = points.filter((p) => p.status === 'withdrawn').length;
  const involvedVersionsCount = involvedVersionIds.length;

  return (
    <div className="min-h-screen bg-[#07111F] flex flex-col">
      <Toolbar />

      {exportSuccess && (
        <div className="mx-6 mt-5 px-4 py-3 rounded-xl bg-emerald-900/40 border border-emerald-700/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-emerald-200 text-[12.5px]">
            <CheckCircle2 size={16} className="text-emerald-400" />
            {exportSuccess}
          </div>
          <button onClick={() => setExportSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X size={14} />
          </button>
        </div>
      )}
      {exportError && (
        <div className="mx-6 mt-5 px-4 py-3 rounded-xl bg-red-900/40 border border-red-700/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-red-200 text-[12.5px]">
            <AlertTriangle size={16} className="text-red-400" />
            {exportError}
          </div>
          <button onClick={() => setExportError(null)} className="text-red-400 hover:text-red-200">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 px-6 py-5">
        <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[18px] text-brass-100 font-semibold flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <FileSpreadsheet className="text-emerald-400" size={20} />
              CSV 明细导出中心
            </h2>
            <p className="text-[11.5px] text-slate-400 mt-1 max-w-2xl">
              导出内容与当前页面筛选、版本、状态、备注完全一致。异常记录会带特殊前缀，
              <span className="text-red-300"> markedAsNormal 强制为 false 且不可变更</span>，
              撤回记录带（已撤回）标记。
            </p>
          </div>

          <button
            onClick={handleExport}
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-[12.5px] font-medium flex items-center gap-2 shadow-lg shadow-emerald-900/30 border border-emerald-500/40 transition-all"
          >
            <Download size={16} />
            立即导出 CSV
          </button>
        </div>

        <div className="grid grid-cols-12 gap-4 mb-5">
          <div className="col-span-8 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4">
            <h3 className="text-[12.5px] text-slate-200 font-medium mb-3 flex items-center gap-1.5">
              <Eye size={14} className="text-brass-400" />
              导出内容配置（当前页面状态镜像）
            </h3>

            <div className="grid grid-cols-5 gap-3 mb-4">
              {[
                { label: '涉及版本', value: `${involvedVersionsCount} 版`, icon: Layers, cls: 'text-brass-300' },
                { label: '版本范围', value: filters.versionScope === 'current' ? '仅当前' : filters.versionScope === 'includeOld' ? '含旧版' : '仅撤回', icon: Layers, cls: 'text-brass-300' },
                { label: '点位总数', value: totalPoints, icon: FileCheck, cls: 'text-emerald-300' },
                { label: '点位异常', value: `${withAnomalies} 点`, icon: AlertTriangle, cls: 'text-red-300' },
                { label: '整版/批量异常', value: `${versionWideAnomalies} 起`, icon: ShieldAlert, cls: 'text-amber-300' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-3">
                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 mb-1.5">
                      <Icon size={11} />
                      {s.label}
                    </div>
                    <div className={cn('text-[17px] font-semibold tabular-nums', s.cls)}>{s.value}</div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {[
                {
                  label: '包含人工备注（书面 + 口头）',
                  desc: '导出列会附加【人工备注】，按书面/口头前缀区分',
                  checked: includeNotes,
                  set: setIncludeNotes,
                },
                {
                  label: '包含数据来源构成与影响权重',
                  desc: '显示 正式/口头/旧版 各来源的影响权重占比',
                  checked: includeSources,
                  set: setIncludeSources,
                },
                {
                  label: '异常记录强制标识 + 不可标记为正常',
                  desc: '状态列加 [异常-xxx] 前缀，markedAsNormal 恒为 false',
                  checked: includeAnomalyMark,
                  force: true,
                  set: () => {},
                },
              ].map((opt, i) => (
                <label
                  key={i}
                  className={cn(
                    'flex items-start justify-between gap-3 p-3 rounded-xl border transition-colors',
                    opt.force
                      ? 'bg-red-950/30 border-red-900/60 cursor-not-allowed'
                      : 'bg-slate-800/30 border-slate-800/70 hover:bg-slate-800/50 cursor-pointer',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-slate-200 font-medium flex items-center gap-1.5">
                      {opt.label}
                      {opt.force && <span className="text-[10px] text-red-300 px-1.5 py-0.5 rounded bg-red-900/50 border border-red-800/60">强制开启</span>}
                    </div>
                    <div className="text-[10.5px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={opt.checked}
                    disabled={opt.force}
                    onChange={(e) => opt.set(e.target.checked)}
                    className={cn(
                      'mt-0.5 w-4 h-4 rounded',
                      opt.force ? 'accent-red-600 opacity-90' : 'accent-brass-500',
                    )}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-4 rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 flex flex-col">
            <h3 className="text-[12.5px] text-slate-200 font-medium mb-3 flex items-center gap-1.5">
              <Calendar size={14} className="text-brass-400" />
              导出一致性自检
            </h3>

            <div className="space-y-2.5 flex-1">
              {[
                { title: '筛选条件镜像', desc: `状态/区域/版本范围 与主工作台完全一致（当前：${filters.versionScope === 'current' ? '仅当前版本' : filters.versionScope === 'includeOld' ? '含旧版数据' : '仅撤回版本'}）`, ok: true },
                { title: '异常记录特殊标记', desc: `${anomalies.length} 条异常（${involvedVersionsCount} 个版本），导出带 [异常-xxx] 前缀`, ok: anomalies.length > 0 },
                { title: 'markedAsNormal 锁定', desc: '异常行强制 false，不可误标记为通过', ok: true },
                { title: '所属版本按点位归属', desc: '每行取自身 versionId 对应版本，不统一写活动版本', ok: true },
                { title: '撤回记录标识', desc: '状态后缀加（已撤回）', ok: withdrawnPoints > 0 },
                { title: '文件名可追溯', desc: '版本号 + 范围 + 时间戳，归档零混乱', ok: true },
                { title: 'UTF-8 BOM + 中文编码', desc: 'Excel 打开不乱码', ok: true },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-800/60">
                  {c.ok ? (
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Check size={15} className="text-slate-600 shrink-0 mt-0.5 opacity-60" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-[11.5px] font-medium', c.ok ? 'text-slate-200' : 'text-slate-500')}>{c.title}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/70 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/70 flex items-center justify-between">
            <h3 className="text-[12.5px] text-slate-200 font-medium flex items-center gap-1.5">
              <FileSpreadsheet size={14} className="text-brass-400" />
              CSV 实时预览（前 12 条，颜色与页面保持一致）
            </h3>
            <span className="text-[10.5px] text-slate-500">
              共 {csvData.length} 条记录，{anomalySummary?.length ?? 0} 条异常汇总附加
            </span>
          </div>

          <div className="max-h-[460px] overflow-auto">
            <table className="w-full text-[11px] font-mono tabular-nums">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#0A1729] text-slate-400">
                  {csvData.length > 0 && Object.keys(csvData[0]).map((k, i) => (
                    <th key={i} className="px-3 py-2.5 text-left font-medium whitespace-nowrap border-b border-slate-800/70">
                      {k}
                    </th>
                  ))}
                  {csvData.length === 0 && (
                    <th className="px-3 py-2.5 text-left font-medium border-b border-slate-800/70">列</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 12).map((row, ri) => {
                  const hasAnom = String(row['状态'] ?? '').includes('[异常') || String(row['状态'] ?? '').includes('旧版');
                  const isWithdrawn = String(row['状态'] ?? '').includes('已撤回');
                  return (
                    <tr
                      key={ri}
                      className={cn(
                        'border-b border-slate-800/50 last:border-0 transition-colors',
                        ri % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/30',
                        hasAnom && 'bg-red-950/20',
                      )}
                    >
                      {Object.entries(row).map(([k, v], vi) => {
                        const isStatus = k === '状态';
                        const isMark = k === 'markedAsNormal';
                        return (
                          <td
                            key={vi}
                            className={cn(
                              'px-3 py-2 whitespace-nowrap align-top',
                              isStatus && hasAnom && 'text-red-300',
                              isStatus && isWithdrawn && 'line-through text-gray-400',
                              isMark && String(v).includes('false') && 'text-red-300 font-semibold',
                              !isStatus && !isMark && 'text-slate-300',
                              isStatus && !hasAnom && !isWithdrawn && 'text-slate-200',
                            )}
                          >
                            {String(v)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {csvData.length === 0 && (
                  <tr>
                    <td colSpan={Object.keys(csvData[0] ?? {}).length || 10} className="px-6 py-10 text-center text-slate-500 text-[12px]">
                      当前筛选条件下没有可导出的点位
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
