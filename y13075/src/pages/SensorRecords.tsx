import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/StatusBadge';
import DetectionBadge from '@/components/DetectionBadge';
import { Database, AlertCircle, FileWarning, Search, Filter, SearchX, Loader2 } from 'lucide-react';
import type { Anomaly } from 'shared/types';

export default function SensorRecords() {
  const { initIfNeeded, records, anomalies, loading, error } = useAppStore();
  const nav = useNavigate();
  const [kw, setKw] = useState('');
  const [dirtyOnly, setDirtyOnly] = useState(false);
  const [anomalyOnly, setAnomalyOnly] = useState(false);

  useEffect(() => {
    initIfNeeded();
  }, [initIfNeeded]);

  const anomalyByPoint = useMemo(() => {
    const m = new Map<string, Anomaly[]>();
    for (const a of anomalies) {
      if (!m.has(a.point_id)) m.set(a.point_id, []);
      m.get(a.point_id)!.push(a);
    }
    return m;
  }, [anomalies]);

  const rows = useMemo(() => {
    const kwl = kw.trim().toLowerCase();
    return records.filter(r => {
      if (dirtyOnly && !r.is_dirty) return false;
      if (anomalyOnly && !anomalyByPoint.has(r.point_id)) return false;
      if (kwl) {
        const hay = (r.point_id + ' ' + r.raw_source.file_name + ' ' + (r.dirty_reason ?? '')).toLowerCase();
        if (!hay.includes(kwl)) return false;
      }
      return true;
    });
  }, [records, kw, dirtyOnly, anomalyOnly, anomalyByPoint]);

  return (
    <div className="space-y-4">
      <div className="card-padded">
        <div className="flex flex-wrap gap-2 items-start">
          <div className="flex items-center gap-2 text-brand-700">
            <Database className="w-5 h-5 text-brand-500" />
            <h1 className="text-base font-semibold">传感器记录（保留原始值，不做清洗）</h1>
          </div>
          <div className="ml-auto flex flex-wrap gap-2 items-center">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-brand-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                className="input pl-8"
                placeholder="搜索点位 / 文件名 / 原因"
                value={kw}
                onChange={e => setKw(e.target.value)}
              />
            </div>
            <button
              onClick={() => setDirtyOnly(v => !v)}
              className={'btn border ' + (dirtyOnly ? 'bg-rose-50 border-rose-300 text-rose-700' : 'btn-secondary')}
            >
              <FileWarning className="w-4 h-4" /> 仅脏数据
            </button>
            <button
              onClick={() => setAnomalyOnly(v => !v)}
              className={'btn border ' + (anomalyOnly ? 'bg-amber-50 border-amber-300 text-amber-700' : 'btn-secondary')}
            >
              <Filter className="w-4 h-4" /> 仅异常点位
            </button>
          </div>
        </div>
        <div className="mt-3 text-[12px] text-brand-500 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>共 <b className="font-mono text-brand-700">{rows.length}</b> / {records.length} 条记录</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> 脏数据 {records.filter(r => r.is_dirty).length} 条（底色标红，内容未修改）
          </span>
          <span>异常点位 {anomalyByPoint.size} 个</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-brand-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> 正在加载传感器记录…
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 mb-3 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-400">
              <Loader2 className="w-6 h-6" />
            </div>
            <div className="text-sm text-brand-700 mb-1">暂无数据</div>
            <div className="text-xs text-brand-400 max-w-xs">
              {error ? '后端数据加载失败，详见顶部红色错误条。' : '请先回到「复核总览」点击「初始化并加载数据」。'}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 mb-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
              <SearchX className="w-6 h-6" />
            </div>
            <div className="text-sm text-brand-700 mb-1">当前筛选无结果</div>
            <div className="text-xs text-brand-400 max-w-xs mb-3">
              可尝试：清空关键词、关闭「仅脏数据」或「仅异常点位」。
            </div>
            <div className="flex gap-2">
              <button
                className="btn-secondary text-xs"
                onClick={() => { setKw(''); setDirtyOnly(false); setAnomalyOnly(false); }}
              >
                清空全部筛选
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-260px)]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="th-sticky left-0 z-20 bg-brand-50 w-28">点位编号</th>
                  <th className="th-sticky">空间</th>
                  <th className="th-sticky">温度</th>
                  <th className="th-sticky">湿度</th>
                  <th className="th-sticky">异常类型</th>
                  <th className="th-sticky">状态</th>
                  <th className="th-sticky text-rose-700"><AlertCircle className="w-3.5 h-3.5 inline mr-1" />脏数据原因</th>
                  <th className="th-sticky text-brand-400 font-normal">原始来源 · 文件名</th>
                  <th className="th-sticky text-brand-400 font-normal">原始来源 · 行号/时间</th>
                  <th className="th-sticky text-brand-400 font-normal">raw_values（节选）</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const list = anomalyByPoint.get(r.point_id) ?? [];
                  const worst = list[0];
                  return (
                    <tr
                      key={r.id}
                      className={
                        (r.is_dirty
                          ? 'bg-rose-50/60 border-l-4 border-l-rose-400 '
                          : list.length > 0
                            ? 'bg-amber-50/30 '
                            : '') +
                        'hover:bg-brand-50/80 transition cursor-pointer'
                      }
                      onClick={() => {
                        if (worst) nav(`/anomaly/${worst.id}`);
                      }}
                    >
                      <td className="td-cell font-mono text-brand-800 font-medium">{r.point_id}</td>
                      <td className="td-cell font-mono text-xs text-brand-500 whitespace-nowrap">R{r.row} C{r.col}</td>
                      <td className={`td-cell font-mono ${r.temperature === null ? 'text-rose-500 font-medium' : 'text-brand-700'}`}>
                        {r.temperature === null ? '⚠ 缺失' : `${r.temperature}℃`}
                      </td>
                      <td className={`td-cell font-mono ${r.humidity === null ? 'text-rose-500 font-medium' : 'text-brand-600'}`}>
                        {r.humidity === null ? '⚠ 缺失' : `${r.humidity}%`}
                      </td>
                      <td className="td-cell">
                        <div className="flex flex-wrap gap-1">
                          {list.map(a => (
                            <DetectionBadge key={a.id} type={a.detection_reason.type} />
                          ))}
                        </div>
                      </td>
                      <td className="td-cell">
                        {worst ? <StatusBadge status={worst.status} /> : r.is_dirty ? (
                          <span className="chip bg-rose-50 text-rose-600 border border-rose-200">脏</span>
                        ) : <StatusBadge status="normal" />}
                      </td>
                      <td className="td-cell text-rose-700 text-xs max-w-[240px]">{r.dirty_reason || <span className="text-brand-300">—</span>}</td>
                      <td className="td-cell font-mono text-[11px] text-brand-500 whitespace-nowrap">
                        {r.raw_source.file_name}
                      </td>
                      <td className="td-cell font-mono text-[11px] text-brand-400 whitespace-nowrap">
                        L{r.raw_source.line_number} · {new Date(r.raw_source.import_time).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="td-cell text-[11px] text-brand-500 font-mono max-w-[300px]">
                        <div className="truncate" title={JSON.stringify(r.raw_source.raw_values)}>
                          {Object.entries(r.raw_source.raw_values).slice(0, 3).map(([k, v]) => (
                            <span key={k} className="mr-2">
                              <span className="text-brand-400">{k}=</span>
                              <span className="text-brand-600">{String(v)}</span>
                            </span>
                          ))}
                          {Object.keys(r.raw_source.raw_values).length > 3 ? (
                            <span className="text-brand-300">+{Object.keys(r.raw_source.raw_values).length - 3}</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
