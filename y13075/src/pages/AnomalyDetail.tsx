import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import type { Anomaly, SensorRecord, PointStatus } from 'shared/types';
import { POINT_STATUS_LABEL, ACTION_LABEL } from 'shared/types';
import StatusBadge from '@/components/StatusBadge';
import DetectionBadge from '@/components/DetectionBadge';
import RemarkEditor from '@/components/RemarkEditor';
import FloorMap from '@/components/FloorMap';
import {
  ArrowLeft,
  Download,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  FileJson,
  Clock,
  MapPin,
  Info,
} from 'lucide-react';

export default function AnomalyDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { initIfNeeded, records, anomalies, updateAnomalyRemark, updateAnomalyStatus } = useAppStore();

  const [detail, setDetail] = useState<{ anomaly: Anomaly; sensor_record: SensorRecord | null } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initIfNeeded();
  }, [initIfNeeded]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await api.getAnomalyDetail(id);
        setDetail(d);
      } catch (e: any) {
        alert('加载失败：' + (e?.message ?? ''));
      }
    })();
  }, [id, anomalies]);

  const anomaly = useMemo<Anomaly | null>(() => {
    if (!id) return null;
    return anomalies.find(a => a.id === id) ?? detail?.anomaly ?? null;
  }, [id, anomalies, detail]);
  const record = useMemo<SensorRecord | null>(
    () => (anomaly ? records.find(r => r.id === anomaly.sensor_record_id) ?? detail?.sensor_record ?? null : null),
    [anomaly, records, detail]
  );

  if (!anomaly) {
    return (
      <div className="card-padded max-w-xl mx-auto mt-10 text-center">
        <div className="text-brand-500 text-sm mb-4">
          {id ? `未找到异常对象 ${id}` : '缺少异常 ID'}
        </div>
        <button className="btn-primary" onClick={() => nav('/overview')}>返回复核总览</button>
      </div>
    );
  }

  async function changeStatus(next: PointStatus) {
    setSaving(true);
    try {
      await updateAnomalyStatus(anomaly.id, next);
    } catch (e: any) {
      alert(e?.message ?? '操作失败');
    } finally {
      setSaving(false);
    }
  }

  async function saveRemark(remark: string) {
    return updateAnomalyRemark(anomaly.id, remark);
  }

  return (
    <div className="space-y-5">
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={() => nav(-1)}>
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="font-mono text-lg font-semibold text-brand-800 ml-1">
          {anomaly.point_id} <span className="text-brand-300 mx-1.5">·</span>
          <span className="text-base font-sans text-brand-600">异常详情</span>
        </h1>
        <div className="ml-auto flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => api.downloadSingleReport(anomaly.id)}
          >
            <Download className="w-4 h-4" /> 导出当前 Markdown 报告
          </button>
        </div>
      </div>

      {/* 上半：平面图 + 状态卡 */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
        <div className="space-y-4">
          {record ? (
            <div className="card-padded">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-brand-500" />
                <h2 className="text-sm font-semibold text-brand-800">空间位置与影响范围</h2>
                <span className="chip bg-brand-50 text-brand-600 border border-brand-200">
                  行 {record.row} · 列 {record.col}
                </span>
                <span className="chip bg-amber-50 text-status-pending border border-amber-200 ml-1">
                  影响 {anomaly.affected_points.length} 个点位
                </span>
              </div>
              <FloorMap
                records={records}
                anomalies={anomalies}
                highlightPointIds={anomaly.affected_points}
                activeAnomalyId={anomaly.id}
              />
            </div>
          ) : (
            <div className="card-padded text-brand-500 text-sm">
              <AlertTriangle className="w-5 h-5 inline mr-2 align-middle text-status-anomaly" />
              关联的传感器记录已缺失或尚未初始化。
            </div>
          )}

          {/* 原因与影响范围详情 */}
          <div className="card-padded">
            <h2 className="text-sm font-semibold text-brand-800 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-status-pending" />
              待确认原因 · 影响范围
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                <div className="text-[11px] uppercase tracking-wider text-amber-700 mb-1">检测原因</div>
                <div className="flex items-center gap-2 mb-2">
                  <DetectionBadge type={anomaly.detection_reason.type} />
                  <StatusBadge status={anomaly.status} />
                </div>
                <div className="text-sm text-brand-800 leading-relaxed">
                  {anomaly.detection_reason.description}
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-[12px] text-brand-500 select-none">查看机器可读细节</summary>
                  <pre className="mt-2 p-2 rounded bg-white border border-amber-200 text-[11px] font-mono text-brand-700 overflow-auto">
{JSON.stringify(anomaly.detection_reason.detail, null, 2)}
                  </pre>
                </details>
              </div>
              <div className="p-3 rounded-lg bg-brand-50/70 border border-brand-200">
                <div className="text-[11px] uppercase tracking-wider text-brand-600 mb-1.5">影响范围</div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto pr-1">
                  {anomaly.affected_points.map(p => (
                    <span
                      key={p}
                      className={
                        'px-2 py-1 rounded border font-mono text-[11px] ' +
                        (p === anomaly.point_id
                          ? 'bg-status-anomaly text-white border-status-anomaly'
                          : 'bg-white text-brand-700 border-brand-200')
                      }
                    >
                      {p}{p === anomaly.point_id ? ' ★' : ''}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-[12px] text-brand-500 leading-snug">
                  <Info className="w-3 h-3 inline mr-1 align-middle" />
                  ★ 为当前异常点位，<Link to="/sensors" className="underline hover:text-brand-700">去传感器记录</Link>看原始值。
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：状态卡 + 操作 */}
        <aside className="space-y-4">
          <div className="card-padded">
            <h2 className="text-sm font-semibold text-brand-800 mb-3">状态流转</h2>
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={anomaly.status} />
              <span className="font-mono text-xs text-brand-400 ml-auto">{anomaly.id}</span>
            </div>
            <div className="text-xs text-brand-500 mb-3">
              <Clock className="w-3 h-3 inline mr-1" />
              创建于 {new Date(anomaly.created_at).toLocaleString('zh-CN', { hour12: false })}
            </div>
            <div className="space-y-2">
              <button
                disabled={anomaly.status === 'confirmed_anomaly' || saving}
                onClick={() => changeStatus('confirmed_anomaly')}
                className="btn-danger w-full justify-center"
              >
                <ThumbsUp className="w-4 h-4" /> 确认异常
              </button>
              <button
                disabled={anomaly.status === 'dismissed' || saving}
                onClick={() => changeStatus('dismissed')}
                className="btn-secondary w-full justify-center"
              >
                <ThumbsDown className="w-4 h-4" /> 驳回（误报）
              </button>
              <button
                disabled={anomaly.status === 'pending' || saving}
                onClick={() => changeStatus('pending')}
                className="btn-warning w-full justify-center"
              >
                <AlertTriangle className="w-4 h-4" /> 退回待确认
              </button>
            </div>
            <div className="mt-4 pt-3 border-t border-brand-100 text-[11px] text-brand-400 leading-relaxed">
              ⚠️ 相邻点位异常不自动修正，<b className="text-brand-600">状态流转后立即落盘</b>，重启 / 重跑后依然可见。
            </div>
          </div>

          {/* 原始数据快览 */}
          {record ? (
            <div className="card-padded">
              <h2 className="text-sm font-semibold text-brand-800 mb-3 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-brand-500" />
                原始数据（保留痕迹）
              </h2>
              {record.is_dirty ? (
                <div className="mb-2 chip bg-rose-50 text-rose-700 border border-rose-200 w-max">
                  {record.dirty_reason}
                </div>
              ) : null}
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-brand-400">来源文件</dt>
                <dd className="font-mono text-brand-700 truncate" title={record.raw_source.file_name}>
                  {record.raw_source.file_name}
                </dd>
                <dt className="text-brand-400">原始行号</dt>
                <dd className="font-mono text-brand-700">L{record.raw_source.line_number}</dd>
                <dt className="text-brand-400">导入时间</dt>
                <dd className="font-mono text-brand-700">
                  {new Date(record.raw_source.import_time).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </dd>
                <dt className="text-brand-400">温度（原始）</dt>
                <dd className="font-mono">
                  <span className={record.temperature === null ? 'text-status-anomaly' : 'text-brand-800'}>
                    {record.temperature === null
                      ? record.raw_source.raw_values['温度(℃)'] ?? 'N/A'
                      : `${record.temperature}℃`}
                  </span>
                </dd>
                <dt className="text-brand-400">湿度（原始）</dt>
                <dd className="font-mono">
                  <span className={record.humidity === null ? 'text-status-anomaly' : 'text-brand-800'}>
                    {record.humidity === null
                      ? record.raw_source.raw_values['湿度(%)'] ?? 'N/A'
                      : `${record.humidity}%`}
                  </span>
                </dd>
              </dl>
              <details className="mt-3">
                <summary className="cursor-pointer text-[12px] text-brand-500 select-none">
                  raw_values（{Object.keys(record.raw_source.raw_values).length} 个原始字段）
                </summary>
                <pre className="mt-2 p-2 rounded bg-brand-50 border border-brand-100 text-[11px] font-mono text-brand-700 max-h-48 overflow-auto">
{JSON.stringify(record.raw_source.raw_values, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}
        </aside>
      </div>

      {/* 下半：备注 + 操作时间线 */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
        <div className="card-padded">
          <RemarkEditor value={anomaly.remark} onChange={saveRemark} />
          <div className="mt-3 text-[11px] text-brand-500 leading-relaxed">
            💡 运营主管修改备注后立即写入后端 JSON；{POINT_STATUS_LABEL[anomaly.status]}状态下导出的 Markdown 报告会同步显示此备注，可在「<Link className="underline hover:text-brand-700" to="/export">报告导出</Link>」中验证。
          </div>
        </div>
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-brand-800 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-500" />
            操作留痕
          </h3>
          <ol className="relative border-l border-brand-200 ml-2 space-y-3.5 pb-1">
            {[...anomaly.operation_logs].reverse().map((log, i) => (
              <li key={i} className="pl-4 relative">
                <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
                <div className="text-[11px] text-brand-400 font-mono">
                  {new Date(log.time).toLocaleString('zh-CN', { hour12: false })}
                </div>
                <div className="text-sm text-brand-800 font-medium mt-0.5">
                  {ACTION_LABEL[log.action] ?? log.action}
                  <span className="ml-2 text-[11px] text-brand-500 font-normal">@{log.operator}</span>
                </div>
                {log.detail ? (
                  <div className="text-xs text-brand-600 mt-0.5">{log.detail}</div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
