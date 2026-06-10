import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkbenchStore } from '@/store/useWorkbenchStore';
import {
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
} from 'lucide-react';
import type { DiffReport, DiffRow, Band, Sample } from '../../shared/types';

const SEVERITY_BADGE: Record<string, string> = {
  warning: 'bg-lab-warn/10 text-lab-warn border-lab-warn/20',
  danger: 'bg-lab-danger/10 text-lab-danger border-lab-danger/20',
  info: 'bg-lab-700/10 text-lab-700 border-lab-700/20',
};

const SEVERITY_LABEL: Record<string, string> = {
  warning: '警告',
  danger: '严重',
  info: '提示',
};

const FIELD_LABELS: Record<string, string> = {
  label: '标注结论',
  label_category: '分类',
  quality_score: '质量分',
  molecular_weight_kda: '分子量',
  position_mm: '位置',
  gray_value: '灰度值',
  confirm_status: '确认状态',
};

function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'target':
      return 'bg-lab-700/10 text-lab-700';
    case 'nonspecific':
      return 'bg-lab-warn/10 text-lab-warn';
    case 'smear':
      return 'bg-purple-100 text-purple-700';
    case 'missing':
      return 'bg-lab-danger/10 text-lab-danger';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function getCategoryLabel(category: string): string {
  switch (category) {
    case 'target':
      return '目标';
    case 'nonspecific':
      return '杂带';
    case 'smear':
      return '拖尾';
    case 'missing':
      return '缺失';
    default:
      return category;
  }
}

export default function SideBySide() {
  const { oldLotId, newLotId } = useParams<{ oldLotId: string; newLotId: string }>();
  const { lots, samples, bands, fetchAllData } = useWorkbenchStore();

  const [diffReport, setDiffReport] = useState<DiffReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSamples, setExpandedSamples] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (lots.length === 0) {
      fetchAllData();
    }
  }, [lots.length, fetchAllData]);

  useEffect(() => {
    if (!oldLotId || !newLotId) return;
    let cancelled = false;

    async function loadDiff() {
      setLoading(true);
      try {
        const res = await fetch(`/api/lots/compare/${oldLotId}/${newLotId}`);
        if (res.ok && !cancelled) {
          const data: DiffReport = await res.json();
          setDiffReport(data);
        } else if (!cancelled) {
          setDiffReport(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load diff report:', err);
          setDiffReport(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDiff();
    return () => {
      cancelled = true;
    };
  }, [oldLotId, newLotId]);

  const oldLot = lots.find((l) => l.id === oldLotId);
  const newLot = lots.find((l) => l.id === newLotId);

  const oldSamples = samples.filter((s) => s.lot_id === oldLotId);
  const newSamples = samples.filter((s) => s.lot_id === newLotId);

  const oldSampleIds = oldSamples.map((s) => s.id);
  const newSampleIds = newSamples.map((s) => s.id);

  const oldBands = bands.filter((b) => oldSampleIds.includes(b.sample_id));
  const newBands = bands.filter((b) => newSampleIds.includes(b.sample_id));

  const diffRowsBySample = useMemo(() => {
    if (!diffReport) return new Map<string, DiffRow[]>();
    const map = new Map<string, DiffRow[]>();
    diffReport.rows.forEach((row) => {
      const existing = map.get(row.sample_code) ?? [];
      existing.push(row);
      map.set(row.sample_code, existing);
    });
    return map;
  }, [diffReport]);

  const affectedSampleCodes = useMemo(() => {
    return Array.from(diffRowsBySample.keys());
  }, [diffRowsBySample]);

  const stats = useMemo(() => {
    if (diffReport) {
      const severeCount = diffReport.rows.filter((r) => r.severity === 'danger').length;
      return {
        totalChanged: diffReport.total_changed,
        affectedSamples: affectedSampleCodes.length,
        severeDiffs: severeCount,
      };
    }
    return {
      totalChanged: 0,
      affectedSamples: affectedSampleCodes.length,
      severeDiffs: 0,
    };
  }, [diffReport, affectedSampleCodes]);

  const isRowInDiff = (sampleCode: string) => diffRowsBySample.has(sampleCode);
  const getFieldDiffRows = (sampleCode: string, fieldName: string) =>
    (diffRowsBySample.get(sampleCode) ?? []).filter((r) => r.field_name === fieldName);

  const toggleSample = (sampleCode: string) => {
    setExpandedSamples((prev) => {
      const next = new Set(prev);
      if (next.has(sampleCode)) {
        next.delete(sampleCode);
      } else {
        next.add(sampleCode);
      }
      return next;
    });
  };

  const renderBandTable = (
    bandList: Band[],
    sampleList: Sample[],
    side: 'old' | 'new'
  ) => {
    const diffHighlight = (sampleCode: string, field: string) => {
      const rows = getFieldDiffRows(sampleCode, field);
      if (rows.length === 0) return '';
      return 'diff-flash';
    };

    const rowBgClass = (sampleCode: string) => {
      if (!isRowInDiff(sampleCode)) return '';
      return side === 'old'
        ? '!bg-yellow-50/80'
        : 'border-l-4 border-l-lab-700';
    };

    return (
      <div className="overflow-auto custom-scrollbar max-h-[560px]">
        <table className="w-full text-sm table-zebra">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
            <tr className="text-slate-600 text-xs uppercase tracking-wide">
              <th className="px-3 py-3 text-left font-medium whitespace-nowrap">样本编号</th>
              <th className="px-3 py-3 text-left font-medium whitespace-nowrap">标注</th>
              <th className="px-3 py-3 text-left font-medium whitespace-nowrap">分类</th>
              <th className="px-3 py-3 text-center font-medium whitespace-nowrap">质量分</th>
            </tr>
          </thead>
          <tbody>
            {bandList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-12 text-center text-sm text-slate-400">
                  暂无条带数据
                </td>
              </tr>
            ) : (
              bandList.map((band: Band) => {
                const sample = sampleList.find((s) => s.id === band.sample_id);
                const sampleCode = sample?.sample_code ?? '-';
                const hasDiff = isRowInDiff(sampleCode);
                return (
                  <tr key={band.id} className={rowBgClass(sampleCode)}>
                    <td
                      className={`px-3 py-3 font-mono text-slate-700 whitespace-nowrap ${
                        hasDiff && side === 'old' ? 'text-lab-danger line-through' : ''
                      } ${hasDiff && side === 'new' ? 'text-lab-confirm font-semibold' : ''}`}
                    >
                      {sampleCode}
                    </td>
                    <td
                      className={`px-3 py-3 whitespace-nowrap ${diffHighlight(
                        sampleCode,
                        'label'
                      )} ${hasDiff && side === 'old' ? 'text-lab-danger line-through' : ''} ${
                        hasDiff && side === 'new' ? 'text-lab-confirm font-semibold' : ''
                      }`}
                    >
                      {band.label ?? '-'}
                    </td>
                    <td className={`px-3 py-3 whitespace-nowrap ${diffHighlight(sampleCode, 'label_category')}`}>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getCategoryBadgeClass(
                          band.label_category
                        )}`}
                      >
                        {getCategoryLabel(band.label_category)}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-3 text-center font-mono whitespace-nowrap ${diffHighlight(
                        sampleCode,
                        'quality_score'
                      )}`}
                    >
                      {band.quality_score}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (!oldLotId || !newLotId) {
    return (
      <div className="text-center py-16">
        <div className="text-slate-400 text-lg">缺少批号参数</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slideIn">
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="text-right min-w-[140px]">
              <span className="inline-block px-2 py-0.5 rounded bg-lab-danger/10 text-lab-danger text-xs font-medium mb-1">
                旧批号
              </span>
              <h2 className="font-serif font-bold text-2xl text-slate-800">
                {oldLot?.lot_number ?? oldLotId}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{oldLot?.reagent_name ?? '-'}</p>
            </div>

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lab-700 to-lab-800 flex items-center justify-center shadow-lg shadow-lab-700/20">
                <ArrowLeftRight className="w-6 h-6 text-white" />
              </div>
              <ArrowRight className="absolute -top-1 -left-4 w-4 h-4 text-slate-300" />
              <ArrowRight className="absolute -top-1 -right-4 w-4 h-4 text-slate-300" />
            </div>

            <div className="min-w-[140px]">
              <span className="inline-block px-2 py-0.5 rounded bg-lab-confirm/10 text-lab-confirm text-xs font-medium mb-1">
                新批号
              </span>
              <h2 className="font-serif font-bold text-2xl text-slate-800">
                {newLot?.lot_number ?? newLotId}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{newLot?.reagent_name ?? '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lab-700/5 border border-lab-700/20">
              <span className="text-xs text-slate-500">变化条数</span>
              <span className="font-mono font-bold text-lg text-lab-700">
                {stats.totalChanged}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lab-warn/5 border border-lab-warn/20">
              <span className="text-xs text-slate-500">受影响样本</span>
              <span className="font-mono font-bold text-lg text-lab-warn">
                {stats.affectedSamples}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lab-danger/5 border border-lab-danger/20">
              <AlertTriangle className="w-4 h-4 text-lab-danger" />
              <span className="text-xs text-slate-500">严重差异</span>
              <span className="font-mono font-bold text-lg text-lab-danger">
                {stats.severeDiffs}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">并排对比表格</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-lab-danger/15 overflow-hidden">
                <div className="px-4 py-2.5 bg-lab-danger/5 border-b border-lab-danger/15 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-lab-danger" />
                  <span className="text-xs font-semibold text-lab-danger uppercase tracking-wide">
                    旧批号结论
                  </span>
                </div>
                {renderBandTable(oldBands, oldSamples, 'old')}
              </div>

              <div className="rounded-xl border border-lab-confirm/15 overflow-hidden">
                <div className="px-4 py-2.5 bg-lab-confirm/5 border-b border-lab-confirm/15 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-lab-confirm" />
                  <span className="text-xs font-semibold text-lab-confirm uppercase tracking-wide">
                    新批号结论
                  </span>
                </div>
                {renderBandTable(newBands, newSamples, 'new')}
              </div>
            </div>

            {loading && (
              <div className="mt-4 text-center text-sm text-slate-400 py-4">
                正在加载差异报告...
              </div>
            )}

            {!loading && !diffReport && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-500 text-center">
                未获取到差异报告，可能是接口暂未实现。以上为基础数据对比。
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-lab-warn" />
              受影响样本清单
              <span className="ml-auto text-xs font-normal text-slate-400">
                {affectedSampleCodes.length} 个
              </span>
            </h3>

            {affectedSampleCodes.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                {loading ? '加载中...' : '暂无受影响的样本'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-auto custom-scrollbar pr-1">
                {affectedSampleCodes.map((sampleCode) => {
                  const rows = diffRowsBySample.get(sampleCode) ?? [];
                  const isExpanded = expandedSamples.has(sampleCode);
                  const maxSeverity = rows.reduce(
                    (acc, r) => {
                      const order = { danger: 3, warning: 2, info: 1 };
                      return order[r.severity] > (order[acc as keyof typeof order] ?? 0)
                        ? r.severity
                        : acc;
                    },
                    'info' as string
                  );
                  return (
                    <div
                      key={sampleCode}
                      className="rounded-xl border border-slate-100 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleSample(sampleCode)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-slate-700 font-medium">
                            {sampleCode}
                          </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                              SEVERITY_BADGE[maxSeverity] ?? SEVERITY_BADGE.info
                            }`}
                          >
                            {SEVERITY_LABEL[maxSeverity] ?? '提示'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{rows.length} 处变化</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 p-3 space-y-2 bg-slate-50/50">
                          {rows.map((row, idx) => (
                            <div
                              key={`${row.band_id}-${idx}`}
                              className="p-2.5 rounded-lg bg-white border border-slate-100"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-slate-600">
                                  {FIELD_LABELS[row.field_name] ?? row.field_name}
                                </span>
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                                    SEVERITY_BADGE[row.severity]
                                  }`}
                                >
                                  {SEVERITY_LABEL[row.severity]}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="flex-1 min-w-0 truncate text-slate-400 line-through font-mono text-xs">
                                  {row.old_value ?? '—'}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                <span className="flex-1 min-w-0 truncate text-lab-confirm font-semibold font-mono text-xs">
                                  {row.new_value ?? '—'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
