import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, ArrowRight, X } from 'lucide-react';
import {
  useAppStore,
  getRecordsOfCurrentBatch,
  getAnomaliesOfCurrentBatch,
} from '@/store/useAppStore';
import type { AnomalyType, AnomalyStatus } from '@/types';
import { ANOMALY_TYPE_LABEL, ANOMALY_STATUS_LABEL } from '@/types';
import {
  AnomalyTypeBadge,
  SeverityBadge,
  StatusBadge,
} from '@/components/Badges';
import { cn } from '@/lib/utils';

export function RecordsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { records, anomalies, currentBatchId } = useAppStore();

  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<AnomalyType | 'ALL'>(
    (searchParams.get('type') as AnomalyType) || 'ALL'
  );
  const [filterStatus, setFilterStatus] = useState<AnomalyStatus | 'ALL'>(
    (searchParams.get('status') as AnomalyStatus) || 'ALL'
  );
  const [cabinFilter, setCabinFilter] = useState<string>('ALL');

  useEffect(() => {
    const t = searchParams.get('type') as AnomalyType;
    const s = searchParams.get('status') as AnomalyStatus;
    if (t) setFilterType(t);
    if (s) setFilterStatus(s);
  }, [searchParams]);

  const batchRecords = useMemo(
    () => records.filter((r) => r.batchId === currentBatchId),
    [records, currentBatchId]
  );

  const batchAnomalies = useMemo(() => {
    const ids = new Set(batchRecords.map((r) => r.id));
    return anomalies.filter((a) => ids.has(a.recordId));
  }, [anomalies, batchRecords]);

  const cabinNos = useMemo(() => {
    const set = new Set(batchRecords.map((r) => r.cabinNo));
    return ['ALL', ...Array.from(set)];
  }, [batchRecords]);

  const filtered = useMemo(() => {
    let list = batchRecords;

    if (cabinFilter !== 'ALL') {
      list = list.filter((r) => r.cabinNo === cabinFilter);
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.cargoNo.toLowerCase().includes(kw) ||
          r.cabinNo.toLowerCase().includes(kw)
      );
    }

    const anomalyRecordIds = (() => {
      if (filterType === 'ALL' && filterStatus === 'ALL') return null;
      let anoms = batchAnomalies;
      if (filterType !== 'ALL') {
        anoms = anoms.filter((a) => a.type === filterType);
      }
      if (filterStatus !== 'ALL') {
        anoms = anoms.filter((a) => a.status === filterStatus);
      }
      return new Set(anoms.map((a) => a.recordId));
    })();

    if (anomalyRecordIds) {
      list = list.filter((r) => anomalyRecordIds.has(r.id));
    }
    return list;
  }, [batchRecords, batchAnomalies, keyword, filterType, filterStatus, cabinFilter]);

  const getAnomaliesForRecord = (recordId: string) =>
    batchAnomalies.filter((a) => a.recordId === recordId);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">测量记录</h1>
          <p className="mt-1 text-sm text-marine-300">
            当前批次共 {batchRecords.length} 条记录，检出 {batchAnomalies.length} 项异常
          </p>
        </div>
      </div>

      <div className="border border-marine-700/50 bg-marine-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-marine-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索货物编号 / 船舱编号"
              className="pl-9 pr-3 py-2 w-64 bg-marine-900/80 border border-marine-700/60 rounded text-sm text-white placeholder:text-marine-500 focus:outline-none focus:border-marine-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-marine-400" />
            <span className="text-xs text-marine-400 mr-1">异常类型</span>
            {(['ALL', 'TIMESTAMP_MISMATCH', 'WEIGHT_OVERLOAD', 'POSITION_OUTLIER', 'VOLUME_MISMATCH'] as const).map(
              (t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded border transition-colors',
                    filterType === t
                      ? 'bg-marine-500 text-white border-marine-400'
                      : 'bg-marine-900/60 text-marine-300 border-marine-700/60 hover:text-white'
                  )}
                >
                  {t === 'ALL' ? '全部' : ANOMALY_TYPE_LABEL[t]}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-marine-400 mr-1">复核状态</span>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded border transition-colors',
                  filterStatus === s
                    ? 'bg-marine-500 text-white border-marine-400'
                    : 'bg-marine-900/60 text-marine-300 border-marine-700/60 hover:text-white'
                )}
              >
                {s === 'ALL' ? '全部' : ANOMALY_STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <select
            value={cabinFilter}
            onChange={(e) => setCabinFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-marine-900/60 text-marine-200 border border-marine-700/60 rounded focus:outline-none focus:border-marine-500"
          >
            {cabinNos.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? '全部船舱' : c}
              </option>
            ))}
          </select>

          {(filterType !== 'ALL' ||
            filterStatus !== 'ALL' ||
            cabinFilter !== 'ALL' ||
            keyword) && (
            <button
              onClick={() => {
                setKeyword('');
                setFilterType('ALL');
                setFilterStatus('ALL');
                setCabinFilter('ALL');
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-marine-400 hover:text-white"
            >
              <X className="w-3 h-3" />
              清除筛选
            </button>
          )}
        </div>
      </div>

      <div className="border border-marine-700/50 bg-marine-800/30 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-marine-800/80 sticky top-0 z-10">
              <tr className="text-left text-xs text-marine-300">
                <th className="px-4 py-3 font-medium">货物编号</th>
                <th className="px-4 py-3 font-medium">船舱</th>
                <th className="px-4 py-3 font-medium">坐标 (X,Y,Z)</th>
                <th className="px-4 py-3 font-medium">重量 (kg)</th>
                <th className="px-4 py-3 font-medium">体积 (m³)</th>
                <th className="px-4 py-3 font-medium">测量时间</th>
                <th className="px-4 py-3 font-medium">异常类型</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-16 text-center text-marine-400"
                  >
                    无匹配记录
                  </td>
                </tr>
              )}
              {filtered.map((r, idx) => {
                const anoms = getAnomaliesForRecord(r.id);
                const hasAnomaly = anoms.length > 0;
                const hasPending = anoms.some((a) => a.status === 'PENDING');
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      'border-t border-marine-700/30 transition-colors hover:bg-marine-700/20',
                      idx % 2 === 1 && 'bg-marine-900/20',
                      hasPending && 'bg-amber-500/5'
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-marine-100">
                      {r.cargoNo}
                    </td>
                    <td className="px-4 py-3 text-marine-200">{r.cabinNo}</td>
                    <td className="px-4 py-3 font-mono text-xs text-marine-300">
                      {r.positionX.toFixed(2)}, {r.positionY.toFixed(2)},{' '}
                      {r.positionZ.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-marine-200">
                      {r.weight.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-marine-200">
                      {r.volume.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-marine-400">
                      {new Date(r.measuredAt).toLocaleString('zh-CN', {
                        hour12: false,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {hasAnomaly ? (
                        <div className="flex flex-wrap gap-1">
                          {anoms.map((a) => (
                            <AnomalyTypeBadge key={a.id} type={a.type} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-marine-500">正常</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasAnomaly ? (
                        <div className="flex flex-wrap gap-1">
                          {anoms.map((a) => (
                            <StatusBadge key={a.id} status={a.status} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-marine-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/records/${r.id}`)}
                        className="p-1.5 text-marine-400 hover:text-white hover:bg-marine-700/60 rounded transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
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
