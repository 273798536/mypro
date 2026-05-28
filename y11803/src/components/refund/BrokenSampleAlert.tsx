import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, Zap, Copy, Lock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getRefundAnomalies } from '@/utils/anomalyDetection';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { CopyButton } from '@/components/common/CopyButton';

export function BrokenSampleAlert() {
  const navigate = useNavigate();
  const refundOrders = useAppStore(state => state.refundOrders);
  const reservePools = useAppStore(state => state.reservePools);
  const batches = useAppStore(state => state.batches);

  const brokenRefund = refundOrders.find(r => r.id === 'REFUND-BROKEN-001');
  if (!brokenRefund) return null;

  const anomalies = getRefundAnomalies(brokenRefund, reservePools, batches, refundOrders);

  return (
    <div className="relative overflow-hidden border-2 border-red-500 rounded-lg shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 opacity-10 animate-pulse" />
      
      <div className="relative p-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center shadow-lg">
              <AlertTriangle size={24} className="text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-black font-mono text-red-700">
                ⚠️ 异常样例退款单（三重异常叠加）
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono bg-red-100 text-red-700 border border-red-300 rounded">
                演示专用
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">退款单号</p>
                <div className="flex items-center gap-1">
                  <code className="text-sm font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded">
                    {brokenRefund.id}
                  </code>
                  <CopyButton text={brokenRefund.id} size="sm" />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">商户原始名称</p>
                <p className="text-sm font-medium text-slate-800 truncate">
                  {brokenRefund.merchantOriginalName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">退款金额</p>
                <AmountDisplay amount={brokenRefund.amount} size="md" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">来源系统</p>
                <p className="text-sm font-mono text-slate-800">
                  {brokenRefund.sourceSystem}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {anomalies.map((anomaly, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-mono rounded border-2 ${
                    anomaly.severity === 'danger'
                      ? 'bg-red-50 border-red-400 text-red-700'
                      : 'bg-orange-50 border-orange-400 text-orange-700'
                  }`}
                >
                  {anomaly.type === 'overdraft' && <Zap size={14} />}
                  {anomaly.type === 'duplicate' && <Copy size={14} />}
                  {anomaly.type === 'cross_batch' && <Lock size={14} />}
                  <span>{anomaly.message}</span>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-600 mb-3 bg-slate-100 p-3 rounded border border-slate-200">
              <p className="font-mono font-semibold mb-1">异常检测路径（无需读代码即可理解）：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>系统检测到原始订单号 <code>{brokenRefund.originalOrderNo}</code> 存在2笔退款申请 → 标记为重复退款</li>
                <li>进一步检测发现该订单同时关联批次 BATCH-618-001 和 BATCH-618-003 → 触发跨批次冻结</li>
                <li>备付金池重新计算冻结金额后，可用余额不足以覆盖该笔退款 → 标记为透支</li>
              </ol>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/refunds/${brokenRefund.id}`)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono font-semibold text-white bg-red-600 border-2 border-red-700 rounded hover:bg-red-700 hover:shadow-lg transition-all"
              >
                <Eye size={16} />
                查看异常详情
              </button>
              <p className="text-xs text-slate-500">
                此为演示样例，用于验证异常检测、拦截逻辑和提示文案是否正常工作
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
