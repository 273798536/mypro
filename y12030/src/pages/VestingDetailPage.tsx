import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Edit3,
  FileText,
  User,
  Building,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { useVestingStore } from '../store/useVestingStore';
import {
  formatNumber,
  formatDate,
  getStatusText,
  getVestingStatusText,
  getExerciseStatusText,
} from '../utils/format';
import { StatusBadge } from '../components/common/StatusBadge';
import { CalculationTrace } from '../components/vesting/CalculationTrace';
import { CorrectionModal } from '../components/vesting/CorrectionModal';
import { api } from '../utils/api';

export function VestingDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { currentDetail, detailLoading, fetchDetail } = useVestingStore();
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'vesting' | 'exercises' | 'corrections'>('vesting');

  useEffect(() => {
    if (employeeId) {
      fetchDetail(employeeId);
    }
  }, [employeeId, fetchDetail]);

  if (detailLoading) {
    return (
      <PageContainer title="加载中..." subtitle="正在获取归属详情...">
        <div className="card p-12">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-32 bg-slate-200 rounded mt-6"></div>
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!currentDetail) {
    return (
      <PageContainer title="未找到记录" subtitle="请返回列表重试">
        <button onClick={() => navigate('/')} className="btn btn-primary">
          返回列表
        </button>
      </PageContainer>
    );
  }

  const { employee, grant, plan, schedules, exercises, corrections } = currentDetail;

  const totalVested = schedules
    .filter((s) => s.status === 'vested' || s.status === 'accelerated')
    .reduce((sum, s) => sum + s.vestedShares, 0);
  const totalPending = schedules
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + s.vestedShares, 0);
  const totalForfeited = schedules
    .filter((s) => s.status === 'forfeited' || s.status === 'expired')
    .reduce((sum, s) => sum + s.vestedShares, 0);
  const totalExercised = exercises
    .filter((e) => e.status === 'completed' || e.status === 'approved')
    .reduce((sum, e) => sum + e.shares, 0);

  const hasAcceleration = schedules.some((s) => s.isAccelerated);
  const hasExpired = schedules.some((s) => s.status === 'expired');
  const hasCorrection = corrections.length > 0;

  return (
    <PageContainer
      title={`${employee.name} 的期权归属详情`}
      subtitle={employee.employeeNo}
      actions={
        <>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary gap-2"
          >
            <ArrowLeft size={16} />
            返回列表
          </button>
          <button
            onClick={() => setShowCorrectionModal(true)}
            className="btn btn-secondary gap-2"
          >
            <Edit3 size={16} />
            修正归属
          </button>
          <button
            onClick={() => api.downloadEmployeeCSV(employee.id)}
            className="btn btn-primary gap-2"
          >
            <Download size={16} />
            导出明细
          </button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                {employee.name}
              </h3>
              <StatusBadge
                status={employee.status}
                text={getStatusText(employee.status)}
              />
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Building size={14} className="text-slate-400" />
              {employee.department} · {employee.position}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={14} className="text-slate-400" />
              入职日期：{formatDate(employee.hireDate)}
            </div>
            {employee.terminationDate && (
              <div className="flex items-center gap-2 text-danger-600">
                <Calendar size={14} />
                离职日期：{formatDate(employee.terminationDate)}
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <FileText className="text-slate-600" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">{plan.name}</h3>
              <span className="text-xs text-slate-500 font-mono">
                {plan.version}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <div>
              归属周期：{plan.totalMonths} 个月 · 悬崖期 {plan.cliffMonths} 个月
            </div>
            <div>协议版本：{grant.agreementVersion}</div>
            <div>
              行权窗口：离职后 {plan.exerciseWindowDays} 天
            </div>
            {plan.hasAcceleration && (
              <div className="text-warning-700 bg-warning-50 px-2 py-1 rounded text-xs">
                ⚡ {plan.accelerationNote}
              </div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">授予总数</div>
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {formatNumber(grant.totalShares)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">已归属</div>
              <div className="text-2xl font-bold text-success-700 font-mono">
                {formatNumber(totalVested)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">待归属</div>
              <div className="text-xl font-bold text-slate-500 font-mono">
                {formatNumber(totalPending)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">已行权</div>
              <div className="text-xl font-bold text-primary-700 font-mono">
                {formatNumber(totalExercised)}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
            {hasAcceleration && (
              <div className="flex items-center gap-2 text-sm text-warning-700 bg-warning-50 px-3 py-2 rounded">
                <AlertTriangle size={14} />
                存在离职加速归属记录
              </div>
            )}
            {hasExpired && (
              <div className="flex items-center gap-2 text-sm text-danger-700 bg-danger-50 px-3 py-2 rounded">
                <AlertTriangle size={14} />
                存在行权窗口过期记录
              </div>
            )}
            {hasCorrection && (
              <div className="flex items-center gap-2 text-sm text-primary-700 bg-primary-50 px-3 py-2 rounded">
                <FileText size={14} />
                已修正 {corrections.length} 次
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('vesting')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'vesting'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            归属明细 ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'exercises'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            行权记录 ({exercises.length})
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'corrections'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            修正历史 ({corrections.length})
          </button>
        </div>
      </div>

      {activeTab === 'vesting' && (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <CalculationTrace
              key={schedule.id}
              schedule={schedule}
              plan={plan}
              grant={grant}
            />
          ))}
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="card overflow-hidden">
          {exercises.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              暂无行权记录
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>申请编号</th>
                  <th>申请股数</th>
                  <th>行权价格</th>
                  <th>公允价值</th>
                  <th>申请日期</th>
                  <th>状态</th>
                  <th>审批人</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((e) => (
                  <tr key={e.id}>
                    <td className="font-mono text-xs">{e.id}</td>
                    <td className="font-mono font-semibold">
                      {formatNumber(e.shares)}
                    </td>
                    <td className="font-mono">¥{e.exercisePrice.toFixed(2)}</td>
                    <td className="font-mono">¥{e.fairMarketValue.toFixed(2)}</td>
                    <td>{formatDate(e.applicationDate)}</td>
                    <td>
                      <StatusBadge
                        status={e.status}
                        text={getExerciseStatusText(e.status)}
                      />
                    </td>
                    <td>{e.approver || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'corrections' && (
        <div className="space-y-4">
          {corrections.length === 0 ? (
            <div className="card p-12 text-center text-slate-500">
              暂无修正记录
            </div>
          ) : (
            corrections.map((c) => (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-slate-900">
                      修正 {c.fieldName}
                    </span>
                    <span className="text-xs text-slate-500 ml-2">
                      {c.operator} · {formatDate(c.timestamp)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <span className="diff-old">{c.oldValue}</span>
                  <span className="text-slate-300">→</span>
                  <span className="diff-new">{c.newValue}</span>
                </div>
                <div className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded">
                  {c.reason}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <CorrectionModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        employeeId={employee.id}
        currentTotalShares={grant.totalShares}
      />
    </PageContainer>
  );
}
