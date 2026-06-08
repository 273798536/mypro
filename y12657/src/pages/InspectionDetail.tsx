import { useState, useEffect, Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  Edit3,
  History,
  Download,
  Image,
  MapPin,
  Ruler,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionView from '@/components/SectionView';
import type {
  SectionParams,
  MeasurePoint,
  MeasurePointStatus,
  InspectionStatus,
} from '@shared/types';
import { useInspectionStore } from '@/store/inspectionStore';
import { exportReport } from '@/api/client';

const statusConfig: Record<InspectionStatus, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'bg-slate/10 text-slate' },
  checking: { label: '检查中', className: 'bg-brand-50 text-brand' },
  reviewing: { label: '复核中', className: 'bg-alert-50 text-alert' },
  completed: { label: '已完成', className: 'bg-success-50 text-success' },
};

const pointStatusConfig: Record<MeasurePointStatus, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-success-50 text-success' },
  abnormal: { label: '异常', className: 'bg-alert-50 text-alert' },
  revised: { label: '已修正', className: 'bg-brand-50 text-brand' },
  confirmed: { label: '已确认', className: 'bg-slate/10 text-slate' },
};

const defaultParams: SectionParams = {
  id: '',
  inspectionId: '',
  batchId: '',
  beamHeight: 0,
  pipeDiameter: 0,
  ceilingThickness: 0,
  slabThickness: 0,
  floorElevation: 0,
  updatedAt: '',
};

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentDetail, loading, fetchDetail, updateParams, updatePoint } = useInspectionStore();
  const { inspection, params, points } = currentDetail;
  const [editParams, setEditParams] = useState<SectionParams>(defaultParams);
  const [selectedPoint, setSelectedPoint] = useState<MeasurePoint | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [reviseReason, setReviseReason] = useState('');
  const [showReviseModal, setShowReviseModal] = useState(false);
  const [opinions, setOpinions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      fetchDetail(id);
    }
  }, [id, fetchDetail]);

  useEffect(() => {
    setOpinions(Object.fromEntries(points.map((p) => [p.id, p.handlingOpinion])));
  }, [points]);

  useEffect(() => {
    if (params) {
      setEditParams(params);
    }
  }, [params]);

  const status = inspection ? statusConfig[inspection.status] : null;

  const toggleRow = (pointId: string) => {
    const next = new Set(expandedRows);
    if (next.has(pointId)) next.delete(pointId);
    else next.add(pointId);
    setExpandedRows(next);
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const url = await exportReport(id, 'xlsx');
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection_${id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败');
    }
  };

  const handleApplyParams = async () => {
    if (!id) return;
    if (!reviseReason.trim()) {
      alert('请填写修正原因');
      return;
    }
    try {
      await updateParams(id, {
        beamHeight: editParams.beamHeight,
        pipeDiameter: editParams.pipeDiameter,
        ceilingThickness: editParams.ceilingThickness,
        slabThickness: editParams.slabThickness,
        floorElevation: editParams.floorElevation,
        reason: reviseReason,
        operator: '张工',
      });
      setShowReviseModal(false);
      setReviseReason('');
    } catch (err) {
      alert('更新参数失败');
    }
  };

  const handleSaveOpinion = async (pointId: string) => {
    if (!id) return;
    try {
      await updatePoint(id, pointId, {
        handlingOpinion: opinions[pointId],
        operator: '张工',
        reason: '更新处理意见',
      });
      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.delete(pointId);
        return next;
      });
    } catch (err) {
      alert('保存处理意见失败');
    }
  };

  if (!inspection || loading) {
    return (
      <div className="card p-12">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="w-8 h-8 text-brand animate-spin mb-4" />
          <p className="text-sm text-slate">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-slate">
        <Link to="/inspections" className="hover:text-brand transition-colors flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          检查记录
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-graphite font-medium">{inspection.projectName || '...'}</span>
      </div>

      <div className="card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div>
              <h1 className="font-display text-xl font-bold text-graphite flex items-center gap-3">
                {inspection.projectName}
                {status && <span className={cn('status-badge', status.className)}>{status.label}</span>}
              </h1>
              <p className="text-sm text-slate mt-1">
                车库编号: <span className="font-mono">{inspection.garageCode}</span>
                <span className="mx-2 text-slate/40">|</span>
                批次号: <span className="font-mono">{inspection.currentBatchId}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/inspections/${id}/revise`} className="btn-secondary">
              <Edit3 className="w-4 h-4" />
              修正
            </Link>
            <Link to={`/inspections/${id}/history`} className="btn-secondary">
              <History className="w-4 h-4" />
              历史
            </Link>
            <button className="btn-primary" onClick={handleExport}>
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display text-sm font-semibold text-graphite mb-3 uppercase tracking-wider">基础信息</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <div className="text-xs text-slate mb-1">项目名称</div>
            <div className="text-sm font-medium text-graphite">{inspection.projectName}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">车库编号</div>
            <div className="text-sm font-medium font-mono text-graphite">{inspection.garageCode}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">检查范围</div>
            <div className="text-sm font-medium text-graphite">{inspection.scope}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">计量单位</div>
            <div className="text-sm font-medium text-graphite">{inspection.baseUnit}</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">最小净空要求</div>
            <div className="text-sm font-medium text-alert">{inspection.minClearanceRequired} mm</div>
          </div>
          <div>
            <div className="text-xs text-slate mb-1">当前批次</div>
            <div className="text-sm font-medium font-mono text-brand">{inspection.currentBatchId}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {params && (
            <SectionView
              params={params}
              points={points}
              selectedPointId={selectedPoint?.id}
              onSelectPoint={setSelectedPoint}
            />
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-graphite">参数设置</h3>
              <button
                className="btn-ghost text-xs"
                onClick={() => {
                  if (params) setEditParams(params);
                  setShowReviseModal(true);
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                编辑参数
              </button>
            </div>
            <div className="space-y-3">
              {params && [
                { key: 'beamHeight', label: '梁高', unit: 'mm' },
                { key: 'pipeDiameter', label: '管线直径', unit: 'mm' },
                { key: 'ceilingThickness', label: '吊顶厚度', unit: 'mm' },
                { key: 'slabThickness', label: '楼板厚度', unit: 'mm' },
                { key: 'floorElevation', label: '地面标高', unit: 'mm' },
              ].map((field) => (
                <div key={field.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate">{field.label}</label>
                    <span className="text-xs text-slate/60">{field.unit}</span>
                  </div>
                  <div className="input-field bg-slate/5">
                    {(params as unknown as Record<string, number>)[field.key]}
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-slate/10">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate font-medium">最小净空要求</label>
                  <span className="text-xs text-slate/60">mm</span>
                </div>
                <div className="input-field bg-alert-50 text-alert font-medium">
                  {inspection.minClearanceRequired}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-display text-base font-semibold text-graphite mb-4">测量点详情</h3>
            {selectedPoint ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-brand font-semibold">{selectedPoint.code}</span>
                  <span className={cn('status-badge', pointStatusConfig[selectedPoint.status].className)}>
                    {pointStatusConfig[selectedPoint.status].label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate mb-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> 坐标
                    </div>
                    <div className="font-mono">
                      {selectedPoint.coordinate.x.toFixed(2)}, {selectedPoint.coordinate.y.toFixed(2)},{' '}
                      {selectedPoint.coordinate.z.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate mb-0.5 flex items-center gap-1">
                      <Ruler className="w-3 h-3" /> 测量值
                    </div>
                    <div className="font-mono">{selectedPoint.measuredValue} mm</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-slate mb-0.5">计算净空</div>
                    <div
                      className={cn(
                        'font-mono font-semibold',
                        selectedPoint.isAbnormal ? 'text-alert' : 'text-success'
                      )}
                    >
                      {selectedPoint.calculatedClearance} mm
                      {selectedPoint.isAbnormal ? (
                        <AlertTriangle className="w-3.5 h-3.5 inline ml-1" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 inline ml-1" />
                      )}
                    </div>
                  </div>
                </div>
                {selectedPoint.remark && (
                  <div>
                    <div className="text-xs text-slate mb-1">备注</div>
                    <p className="text-sm text-graphite bg-slate/5 p-2 rounded-sm-2">{selectedPoint.remark}</p>
                  </div>
                )}
                {selectedPoint.screenshotUrl && (
                  <div>
                    <div className="text-xs text-slate mb-1 flex items-center gap-1">
                      <Image className="w-3 h-3" /> 现场截图
                    </div>
                    <div className="w-full h-32 bg-brand-50 rounded-sm-2 border border-brand-100 flex items-center justify-center">
                      <span className="text-sm text-brand/60 flex items-center gap-1">
                        <Image className="w-4 h-4" /> {selectedPoint.screenshotUrl.split('/').pop()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-slate">
                <MapPin className="w-8 h-8 mx-auto text-slate/30 mb-2" />
                点击剖切图上的测点查看详情
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate/10 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-graphite">截图清单</h3>
          <span className="text-sm text-slate">
            共 {points.length} 个测点
            <span className="mx-1 text-slate/40">·</span>
            <span className="text-alert">{points.filter((p) => p.isAbnormal).length} 处异常</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className="table-th w-8"></th>
                <th className="table-th">编号</th>
                <th className="table-th">坐标 (x,y,z)</th>
                <th className="table-th">测量值</th>
                <th className="table-th">计算净空</th>
                <th className="table-th">状态</th>
                <th className="table-th">截图</th>
                <th className="table-th">备注</th>
                <th className="table-th">处理意见</th>
                <th className="table-th text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => {
                const isExpanded = expandedRows.has(p.id);
                const pointStatus = pointStatusConfig[p.status];
                return (
                  <Fragment key={p.id}>
                    <tr className="hover:bg-brand-50/30">
                      <td className="table-td">
                        <button
                          onClick={() => toggleRow(p.id)}
                          className="p-1 hover:bg-brand-100 rounded-sm-2 text-slate hover:text-brand"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="table-td font-mono font-medium">{p.code}</td>
                      <td className="table-td font-mono text-xs">
                        {p.coordinate.x.toFixed(1)}, {p.coordinate.y.toFixed(1)}, {p.coordinate.z.toFixed(1)}
                      </td>
                      <td className="table-td font-mono">{p.measuredValue} mm</td>
                      <td
                        className={cn(
                          'table-td font-mono font-medium',
                          p.isAbnormal ? 'text-alert' : 'text-success'
                        )}
                      >
                        {p.calculatedClearance} mm
                      </td>
                      <td className="table-td">
                        <span className={cn('status-badge', pointStatus.className)}>
                          {pointStatus.label}
                        </span>
                      </td>
                      <td className="table-td">
                        {p.screenshotUrl ? (
                          <span className="text-xs text-brand flex items-center gap-1">
                            <Image className="w-3.5 h-3.5" /> 已上传
                          </span>
                        ) : (
                          <span className="text-xs text-slate/50">—</span>
                        )}
                      </td>
                      <td className="table-td max-w-[150px] truncate" title={p.remark}>
                        {p.remark || <span className="text-slate/40">—</span>}
                      </td>
                      <td className="table-td max-w-[180px] truncate" title={opinions[p.id]}>
                        {opinions[p.id] || <span className="text-slate/40">—</span>}
                      </td>
                      <td className="table-td text-right">
                        <button className="btn-ghost text-xs" onClick={() => toggleRow(p.id)}>
                          <Edit3 className="w-3.5 h-3.5" />
                          编辑意见
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${p.id}-expanded`} className="bg-brand-50/30">
                        <td colSpan={10} className="table-td">
                          <div className="p-3 space-y-3">
                            <div>
                              <label className="text-xs font-medium text-slate mb-1.5 block">处理意见</label>
                              <textarea
                                className="input-field min-h-[80px]"
                                placeholder="请输入对该异常测点的处理意见..."
                                value={opinions[p.id] || ''}
                                onChange={(e) =>
                                  setOpinions((prev) => ({ ...prev, [p.id]: e.target.value }))
                                }
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                className="btn-primary text-xs"
                                onClick={() => handleSaveOpinion(p.id)}
                              >
                                <Save className="w-3.5 h-3.5" />
                                保存意见
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showReviseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="font-display text-lg font-semibold text-graphite mb-4">修正参数</h3>
            <div className="space-y-3 mb-4">
              {[
                { key: 'beamHeight', label: '梁高 (mm)' },
                { key: 'pipeDiameter', label: '管线直径 (mm)' },
                { key: 'ceilingThickness', label: '吊顶厚度 (mm)' },
                { key: 'slabThickness', label: '楼板厚度 (mm)' },
                { key: 'floorElevation', label: '地面标高 (mm)' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs text-slate mb-1 block">{field.label}</label>
                  <input
                    type="number"
                    className="input-field"
                    value={(editParams as unknown as Record<string, number>)[field.key]}
                    onChange={(e) =>
                      setEditParams((prev) => ({
                        ...prev,
                        [field.key]: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate mb-1 block">
                  修正原因 <span className="text-alert">*</span>
                </label>
                <textarea
                  className="input-field min-h-[70px]"
                  placeholder="请填写修正原因，将记录到历史追溯中..."
                  value={reviseReason}
                  onChange={(e) => setReviseReason(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowReviseModal(false);
                  setReviseReason('');
                }}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleApplyParams}>
                应用参数并重新计算
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
