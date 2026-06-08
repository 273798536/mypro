import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeftRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInspectionStore } from '@/store/inspectionStore';
import type { SectionParams, MeasurePoint } from '@shared/types';

const paramFields = [
  { key: 'beamHeight', label: '梁高 (mm)' },
  { key: 'pipeDiameter', label: '管线直径 (mm)' },
  { key: 'ceilingThickness', label: '吊顶厚度 (mm)' },
  { key: 'slabThickness', label: '楼板厚度 (mm)' },
  { key: 'floorElevation', label: '地面标高 (mm)' },
];

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isPointDiff(before: MeasurePoint, after: MeasurePoint) {
  return (
    before.calculatedClearance !== after.calculatedClearance ||
    before.remark !== after.remark ||
    before.handlingOpinion !== after.handlingOpinion ||
    before.isAbnormal !== after.isAbnormal
  );
}

interface ColumnProps {
  title: string;
  batchId: string;
  time: string;
  params: SectionParams;
  points: MeasurePoint[];
  isBefore?: boolean;
  compareParams?: SectionParams;
  comparePoints?: MeasurePoint[];
}

function CompareColumn({
  title,
  batchId,
  time,
  params,
  points,
  isBefore,
  compareParams,
  comparePoints,
}: ColumnProps) {
  const abnormalCount = points.filter((p) => p.isAbnormal).length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate/10 bg-slate/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={cn('font-display font-semibold text-lg', isBefore ? 'text-slate' : 'text-brand')}>
              {title}
            </h3>
            <p className="text-xs text-slate mt-0.5">
              批次号: <span className="font-mono">{batchId}</span>
            </p>
          </div>
          <span className="text-xs text-slate">{time}</span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-5 overflow-y-auto scrollbar-thin">
        <div>
          <h4 className="text-sm font-semibold text-graphite mb-3 flex items-center gap-2">
            参数设置
          </h4>
          <table className="w-full">
            <tbody>
              {paramFields.map((field) => {
                const value = (params as unknown as Record<string, number>)[field.key];
                const compareValue = compareParams
                  ? (compareParams as unknown as Record<string, number>)[field.key]
                  : value;
                const isDiff = value !== compareValue;
                return (
                  <tr key={field.key}>
                    <td className="py-1.5 pr-3 text-xs text-slate w-28">{field.label}</td>
                    <td
                      className={cn(
                        'py-1.5 font-mono text-sm',
                        isDiff ? 'bg-yellow-100 text-alert font-semibold rounded px-2' : 'text-graphite'
                      )}
                    >
                      {value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex-1 rounded-sm-2 p-3 text-center',
              abnormalCount > 0 ? 'bg-alert-50' : 'bg-success-50'
            )}
          >
            <div className="flex items-center justify-center gap-1.5">
              {abnormalCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-alert" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-success" />
              )}
              <span className="text-sm font-semibold">
                异常数: <span className={abnormalCount > 0 ? 'text-alert' : 'text-success'}>{abnormalCount}</span>
              </span>
            </div>
          </div>
          <div className="flex-1 rounded-sm-2 p-3 text-center bg-brand-50">
            <div className="text-sm font-semibold text-brand">
              测点总数: <span>{points.length}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-graphite mb-3">测量点对比</h4>
          <div className="space-y-2">
            {points.map((p, idx) => {
              const comparePoint = comparePoints?.[idx];
              const hasDiff = comparePoint ? isPointDiff(p, comparePoint) : false;
              return (
                <div
                  key={p.id}
                  className={cn(
                    'border rounded-sm-2 p-3',
                    hasDiff ? 'bg-yellow-50 border-yellow-200' : 'border-slate/15 bg-white'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold text-brand">{p.code}</span>
                    <span
                      className={cn(
                        'status-badge',
                        p.isAbnormal ? 'bg-alert-50 text-alert' : 'bg-success-50 text-success'
                      )}
                    >
                      {p.isAbnormal ? '异常' : '正常'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate">测量值: </span>
                      <span className="font-mono">{p.measuredValue}mm</span>
                    </div>
                    <div
                      className={cn(
                        'font-mono',
                        hasDiff && comparePoint && p.calculatedClearance !== comparePoint.calculatedClearance
                          ? 'bg-yellow-100 text-alert rounded px-1'
                          : p.isAbnormal
                          ? 'text-alert'
                          : 'text-success'
                      )}
                    >
                      <span className="text-slate">净空: </span>
                      {p.calculatedClearance}mm
                    </div>
                  </div>
                  {p.remark && (
                    <div
                      className={cn(
                        'mt-1.5 text-xs',
                        hasDiff && comparePoint && p.remark !== comparePoint.remark
                          ? 'bg-yellow-100 rounded px-1.5 py-0.5'
                          : ''
                      )}
                    >
                      <span className="text-slate">备注: </span>
                      <span className="text-graphite">{p.remark}</span>
                    </div>
                  )}
                  {p.handlingOpinion && (
                    <div
                      className={cn(
                        'mt-1 text-xs',
                        hasDiff && comparePoint && p.handlingOpinion !== comparePoint.handlingOpinion
                          ? 'bg-yellow-100 rounded px-1.5 py-0.5'
                          : ''
                      )}
                    >
                      <span className="text-slate">处理意见: </span>
                      <span className="text-graphite">{p.handlingOpinion}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InspectionRevise() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reviewReason, setReviewReason] = useState('');
  const [operator] = useState('张工');
  const { compareData, currentDetail, fetchCompare, review, loading } = useInspectionStore();

  useEffect(() => {
    if (id) {
      fetchCompare(id);
    }
  }, [id, fetchCompare]);

  const projectName = currentDetail.inspection?.projectName || '检查记录';

  const handleReject = async () => {
    if (!id) return;
    try {
      await review(id, { pass: false, reason: reviewReason, operator });
      navigate(`/inspections/${id}`);
    } catch (err) {
      console.error('驳回失败:', err);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      await review(id, { pass: true, reason: reviewReason, operator });
      navigate(`/inspections/${id}`);
    } catch (err) {
      console.error('复核通过失败:', err);
    }
  };

  if (loading || !compareData) {
    return (
      <div className="space-y-5 h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center gap-2 text-sm text-slate">
          <Link to="/inspections" className="hover:text-brand transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            检查记录
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`/inspections/${id}`} className="hover:text-brand transition-colors">
            {projectName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-graphite font-medium">修正复核</span>
        </div>
        <div className="card flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
            <span className="text-sm">加载对比数据中...</span>
          </div>
        </div>
      </div>
    );
  }

  const { before, after } = compareData;

  return (
    <div className="space-y-5 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-2 text-sm text-slate">
        <Link to="/inspections" className="hover:text-brand transition-colors flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          检查记录
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/inspections/${id}`} className="hover:text-brand transition-colors">
          {projectName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-graphite font-medium">修正复核</span>
      </div>

      <div className="card p-4 bg-brand-50/50 border-brand-200">
        <div className="flex items-center gap-2 text-brand">
          <ArrowLeftRight className="w-5 h-5" />
          <span className="font-medium text-sm">左右并排对比，复核通过后生效</span>
        </div>
      </div>

      <div className="card flex-1 overflow-hidden flex min-h-0">
        <div className="flex-1 min-w-0 border-r border-slate/15">
          <CompareColumn
            title="修改前"
            batchId={before.params.batchId}
            time={formatDateTime(before.params.updatedAt)}
            params={before.params}
            points={before.points}
            isBefore
            compareParams={after.params}
            comparePoints={after.points}
          />
        </div>

        <div className="w-10 flex-shrink-0 relative bg-slate/5 border-x border-slate/15 flex items-center justify-center">
          <div className="absolute top-1/2 -translate-y-1/2 bg-brand text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md">
            <span className="text-xs font-semibold" style={{ writingMode: 'vertical-rl' }}>对比</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <CompareColumn
            title="修改后"
            batchId={after.params.batchId}
            time={formatDateTime(after.params.updatedAt)}
            params={after.params}
            points={after.points}
            compareParams={before.params}
            comparePoints={before.points}
          />
        </div>
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate mb-1.5 block">
              修正原因 / 复核意见
            </label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="请填写修正原因说明或复核意见..."
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate mb-1.5 block">操作人</label>
            <div className="input-field bg-slate/5">{operator}</div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-alert" onClick={handleReject}>
            <XCircle className="w-4 h-4" />
            驳回修改
          </button>
          <button className="btn-success" onClick={handleApprove}>
            <CheckCircle2 className="w-4 h-4" />
            复核通过
          </button>
        </div>
      </div>
    </div>
  );
}
