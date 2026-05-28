import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, AlertTriangle, Calendar, User, Building2, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { useRedemptionStore } from '@/store/useRedemptionStore';
import { getStatusColor, getStatusText, formatAmount, formatDate, formatDateTime } from '@/utils/formatters';
import TraceChain from '@/components/TraceChain';
import SettlementSteps from '@/components/SettlementSteps';
import EditModal from '@/components/EditModal';

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { redemptions, statusLogs } = useRedemptionStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const redemption = redemptions.find(r => r.id === id);
  const logs = statusLogs.filter(l => l.requestId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (!redemption) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">未找到该赎回申请</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            返回看板
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex-shrink-0 px-6 py-4 border-b border-slate-700 bg-slate-850">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">赎回详情</h2>
              <span className={`status-pill ${getStatusColor(redemption.status)}`}>
                {redemption.isDelayed && <AlertTriangle className="w-3 h-3 mr-1" />}
                {getStatusText(redemption.status)}
              </span>
              {redemption.needsReview && (
                <span className="status-pill bg-orange-500 text-white">
                  待复核
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              赎回编号 <span className="font-mono">{redemption.id}</span>
            </p>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            修正数据
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="grid grid-cols-3 gap-6 p-6">
          <div className="col-span-2 space-y-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                基本信息
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="label">客户名称</label>
                  <div className="flex items-center gap-2 text-white">
                    <User className="w-4 h-4 text-slate-400" />
                    {redemption.customerName}
                    <span className="text-xs text-slate-500 font-mono">({redemption.customerId})</span>
                  </div>
                </div>
                <div>
                  <label className="label">基金名称</label>
                  <div className="flex items-center gap-2 text-white">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {redemption.fundName}
                    <span className="text-xs text-slate-500 font-mono">({redemption.fundId})</span>
                  </div>
                </div>
                <div>
                  <label className="label">申请份额</label>
                  <p className="font-mono text-lg text-white font-semibold">
                    {formatAmount(redemption.requestAmount)} 份
                  </p>
                </div>
                <div>
                  <label className="label">确认份额</label>
                  <p className={`font-mono text-lg font-semibold ${redemption.confirmedAmount < redemption.requestAmount ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {redemption.confirmedAmount > 0 ? `${formatAmount(redemption.confirmedAmount)} 份` : '待确认'}
                  </p>
                </div>
                <div>
                  <label className="label">申请日期</label>
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(redemption.applyDate)}
                  </div>
                </div>
                <div>
                  <label className="label">预计到账日</label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className={redemption.isDelayed ? 'text-amber-400' : 'text-white'}>
                      {formatDate(redemption.expectedSettlementDate)}
                      {redemption.isDelayed && ' (顺延)'}
                    </span>
                  </div>
                </div>
                {redemption.actualSettlementDate && (
                  <div>
                    <label className="label">实际到账日</label>
                    <div className="flex items-center gap-2 text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {formatDate(redemption.actualSettlementDate)}
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">申请来源</label>
                  <p className="text-white">{redemption.source}</p>
                </div>
                <div>
                  <label className="label">排队位置</label>
                  <p className="text-white">
                    第 <span className="font-bold text-primary-400">{redemption.queuePosition}</span> 位
                  </p>
                </div>
              </div>

              {redemption.isDelayed && redemption.delayReason && (
                <div className="mt-5 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-300">清算日顺延提醒</p>
                      <p className="text-sm text-amber-200/80 mt-1">{redemption.delayReason}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                溯源链 - 每条结论的来处
              </h3>
              <TraceChain requestId={redemption.id} />
            </div>

            {logs.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  状态变更历史
                </h3>
                <div className="space-y-3">
                  {logs.map(log => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5" />
                        <div className="w-0.5 flex-1 bg-slate-700" />
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className={`status-pill ${getStatusColor(log.toStatus)}`}>
                            {getStatusText(log.toStatus)}
                          </span>
                          <span className="text-slate-500">←</span>
                          <span className={`status-pill ${getStatusColor(log.fromStatus)} opacity-60`}>
                            {getStatusText(log.fromStatus)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{log.reason}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>{log.operator}</span>
                          <span>·</span>
                          <span>{formatDateTime(log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">清算步骤 - 卡点追踪</h3>
              <SettlementSteps requestId={redemption.id} />
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">同客户其他申请</h3>
              <CustomerOtherRequests currentId={redemption.id} customerId={redemption.customerId} />
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <EditModal
          redemption={redemption}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}

function CustomerOtherRequests({ currentId, customerId }: { currentId: string; customerId: string }) {
  const { redemptions } = useRedemptionStore();
  const navigate = useNavigate();
  const otherRequests = redemptions.filter(r => r.customerId === customerId && r.id !== currentId);

  if (otherRequests.length === 0) {
    return <p className="text-sm text-slate-500 italic">该客户暂无其他申请</p>;
  }

  return (
    <div className="space-y-2">
      {otherRequests.map(req => (
        <div
          key={req.id}
          onClick={() => navigate(`/detail/${req.id}`)}
          className="p-3 bg-slate-700/50 rounded-md cursor-pointer hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-slate-300">{req.id}</span>
            <span className={`status-pill text-xs ${getStatusColor(req.status)}`}>
              {getStatusText(req.status)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-slate-400">{req.fundName}</span>
            <span className="font-mono text-sm text-white">{formatAmount(req.requestAmount)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
