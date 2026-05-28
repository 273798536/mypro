import { useState } from 'react';
import { ArrowLeft, Zap, Copy, Lock, Edit3, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { getRefundAnomalies } from '@/utils/anomalyDetection';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { CopyButton } from '@/components/common/CopyButton';
import { WarningPromptBox } from '@/components/reserve/WarningPromptBox';
import { formatDateTime, maskPhone } from '@/utils/formatters';
import type { RefundOrder } from '@/types';

interface RefundDetailCardProps {
  refund: RefundOrder;
  onCorrect: () => void;
  onAddNote: () => void;
}

export function RefundDetailCard({ refund, onCorrect, onAddNote }: RefundDetailCardProps) {
  const navigate = useNavigate();
  const reservePools = useAppStore(state => state.reservePools);
  const batches = useAppStore(state => state.batches);
  const refundOrders = useAppStore(state => state.refundOrders);

  const [showOriginalFields, setShowOriginalFields] = useState(false);

  const pool = reservePools.find(p => p.id === refund.reservePoolId);
  const batch = batches.find(b => b.id === refund.batchId);
  const anomalies = getRefundAnomalies(refund, reservePools, batches, refundOrders);
  const duplicateOrder = refund.duplicateRefundId 
    ? refundOrders.find(r => r.id === refund.duplicateRefundId)
    : undefined;

  const fieldGroups = [
    {
      title: '基础信息',
      fields: [
        { label: '退款单号', value: refund.id, copyable: true, isOriginalName: true },
        { label: '商户原始名称', value: refund.merchantOriginalName, isOriginalName: true },
        { label: '来源系统', value: refund.sourceSystem, isOriginalName: true },
        { label: '原始订单号', value: refund.originalOrderNo, copyable: true, isOriginalName: true },
      ],
    },
    {
      title: '客户信息',
      fields: [
        { label: '客户原始名称', value: refund.customerName, isOriginalName: true },
        { label: '客户电话', value: maskPhone(refund.customerPhone) },
      ],
    },
    {
      title: '退款信息',
      fields: [
        { label: '退款金额', value: <AmountDisplay amount={refund.amount} size="lg" /> },
        { label: '退款原因', value: refund.refundReason },
        { label: '状态', value: <StatusBadge status={refund.status} size="lg" /> },
      ],
    },
    {
      title: '关联信息',
      fields: [
        { label: '批次原始名称', value: batch?.originalName || refund.batchId, isOriginalName: true },
        { label: '备付金池原始名称', value: pool?.originalName || refund.reservePoolId, isOriginalName: true },
        { label: '申请时间', value: formatDateTime(refund.applyTime) },
        { label: '审核时间', value: refund.reviewTime ? formatDateTime(refund.reviewTime) : '-' },
        { label: '审核人', value: refund.reviewer || '-' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/refunds')}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-mono text-slate-600 border-2 border-slate-200 rounded hover:bg-slate-50 hover:border-amber-300 hover:text-amber-600 transition-all"
        >
          <ArrowLeft size={16} />
          返回列表
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onAddNote}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono font-medium text-slate-700 bg-white border-2 border-slate-300 rounded hover:bg-slate-50 hover:border-slate-400 transition-all"
          >
            <MessageSquare size={16} />
            添加备注
          </button>
          <button
            onClick={onCorrect}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono font-semibold text-white bg-amber-600 border-2 border-amber-700 rounded hover:bg-amber-700 hover:shadow-lg transition-all"
          >
            <Edit3 size={16} />
            修正退款单
          </button>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="space-y-3">
          {anomalies.map((anomaly, index) => (
            <WarningPromptBox
              key={index}
              type={anomaly.severity}
              title={anomaly.message}
              prompt={anomaly.prompt}
              icon={
                anomaly.type === 'overdraft' ? <Zap size={20} /> :
                anomaly.type === 'duplicate' ? <Copy size={20} /> :
                <Lock size={20} />
              }
            />
          ))}
        </div>
      )}

      {refund.isDuplicate && duplicateOrder && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <h4 className="font-mono font-semibold text-red-700 mb-2">重复退款关联信息</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">关联退款单：</span>
              <code className="font-mono text-red-700 ml-1">{duplicateOrder.id}</code>
              <CopyButton text={duplicateOrder.id} size="sm" />
            </div>
            <div>
              <span className="text-slate-500">关联单状态：</span>
              <StatusBadge status={duplicateOrder.status} size="sm" />
            </div>
            <div>
              <span className="text-slate-500">关联单金额：</span>
              <AmountDisplay amount={duplicateOrder.amount} size="sm" />
            </div>
            <div>
              <span className="text-slate-500">关联单申请时间：</span>
              <span className="font-mono">{formatDateTime(duplicateOrder.applyTime)}</span>
            </div>
          </div>
          {refund.duplicateExplanation ? (
            <div className="mt-3 p-3 bg-white rounded border border-red-200">
              <p className="text-xs text-slate-500 mb-1">重复退款解释：</p>
              <p className="text-sm text-slate-700">{refund.duplicateExplanation}</p>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-300">
              <p className="text-sm text-yellow-800 font-medium">⚠️ 尚未填写重复退款解释，必须填写后方可继续处理</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fieldGroups.map(group => (
          <div key={group.title} className="bg-white border-2 border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="font-mono font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              {group.title}
            </h3>
            <div className="space-y-3">
              {group.fields.map(field => (
                <div key={field.label} className="flex items-start gap-3">
                  <span className="text-sm text-slate-500 w-28 shrink-0 pt-0.5">
                    {field.label}
                    {field.isOriginalName && (
                      <span className="ml-1 text-xs text-amber-600 font-mono">*</span>
                    )}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-slate-800 break-all">
                      {typeof field.value === 'string' ? field.value : field.value}
                    </span>
                    {field.copyable && typeof field.value === 'string' && (
                      <CopyButton text={field.value} size="sm" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-2 border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono font-bold text-slate-800">
            原始字段完整快照（保留来源系统原始名称）
            <span className="ml-2 text-xs text-amber-600">*用于对账</span>
          </h3>
          <button
            onClick={() => setShowOriginalFields(!showOriginalFields)}
            className="text-sm font-mono text-amber-600 hover:text-amber-700 transition-colors"
          >
            {showOriginalFields ? '收起' : '展开查看'}
          </button>
        </div>
        {showOriginalFields && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(refund.originalFields).map(([key, value]) => (
              <div key={key} className="p-2 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs font-mono text-slate-500 mb-1">{key}</p>
                <p className="text-sm font-mono text-slate-800 truncate" title={String(value)}>
                  {String(value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-400 font-mono text-center">
        <span className="text-amber-600">*</span> 标记的字段保留了来源系统的原始名称，对账时可直接使用
      </div>
    </div>
  );
}
