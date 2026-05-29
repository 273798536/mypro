import { useLedgerStore } from '../store/useLedgerStore';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle, ArrowRightLeft, DollarSign, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function Refunds() {
  const { refunds, transactions, resolveAnomaly, reviseTransaction } = useLedgerStore();
  const navigate = useNavigate();

  const discrepancyRefunds = refunds.filter(r => r.status === 'discrepancy');
  const pendingRefunds = refunds.filter(r => r.status === 'pending');
  const processedRefunds = refunds.filter(r => r.status === 'processed');

  const anomlayTxs = transactions.filter(tx => tx.anomalies.includes('refund_not_rolledback'));

  const handleProcessRefund = (refund: typeof refunds[0]) => {
    const tx = transactions.find(t => t.id === refund.originalTxId) || transactions.find(t => t.anomalies.includes('refund_not_rolledback'));
    if (tx) {
      if (confirm(`确认处理退款 ${refund.id} 的积分回滚？\n应回滚积分: ${refund.pointsToRollback}`)) {
        const newPoints = tx.pointsEarned - refund.pointsToRollback;
        reviseTransaction(
          tx.id,
          'pointsEarned',
          tx.pointsEarned,
          Math.max(0, newPoints),
          `退款回滚积分：退款 ${refund.id}，金额 ¥${refund.refundAmount}`,
          '系统处理'
        );
        resolveAnomaly(tx.id, 'refund_not_rolledback');
        alert('积分回滚处理完成');
      }
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'processed': return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-900/30', label: '已处理' };
      case 'discrepancy': return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30', label: '异常' };
      case 'pending': return { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-900/30', label: '待处理' };
      default: return { icon: Clock, color: 'text-navy-400', bg: 'bg-navy-800', label: status };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">退款补偿</h1>
        <p className="text-navy-400 text-sm mt-1">
          管理退款记录、检查积分回滚状态、计算补偿金额
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="cli-card">
          <div className="flex items-center gap-3">
          <div className="p-2 bg-navy-800 rounded-lg">
            <RefreshCw className="w-5 h-5 text-navy-300" />
          </div>
          <div>
            <p className="text-navy-400 text-xs">退款总笔数</p>
            <p className="text-2xl font-bold text-white font-mono">{refunds.length}</p>
          </div>
        </div>
        </div>

        <div className="cli-card border-red-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">未回滚异常</p>
              <p className="text-2xl font-bold text-red-400 font-mono">{discrepancyRefunds.length + anomlayTxs.length}</p>
            </div>
          </div>
        </div>

        <div className="cli-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">待处理</p>
              <p className="text-2xl font-bold text-amber-400 font-mono">{pendingRefunds.length}</p>
            </div>
          </div>
        </div>

        <div className="cli-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-navy-400 text-xs">已处理</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{processedRefunds.length}</p>
            </div>
          </div>
        </div>
      </div>

      {(discrepancyRefunds.length > 0 || anomlayTxs.length > 0) && (
        <div className="cli-card border-red-800/50">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            需要处理的退款回滚异常
          </h3>
          <div className="space-y-3">
            {discrepancyRefunds.map(refund => {
              const config = getStatusConfig(refund.status);
              const StatusIcon = config.icon;
              const tx = transactions.find(t => t.id === refund.originalTxId) || anomlayTxs[0];
              const diff = refund.pointsToRollback - refund.actualPointsRolledBack;
              return (
                <div key={refund.id} className="bg-red-950/20 border border-red-900/50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-900/30">
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono">{refund.id}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.bg} ${config.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>
                        <div className="text-navy-400 text-xs mt-0.5">
                          退款时间: {format(new Date(refund.refundTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleProcessRefund(refund)}
                      className="cli-btn-danger text-xs"
                    >
                      处理回滚
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="bg-navy-900/50 rounded p-2">
                      <div className="text-navy-400 text-xs">退款金额</div>
                      <div className="text-white font-mono">¥{refund.refundAmount.toFixed(2)}</div>
                    </div>
                    <div className="bg-navy-900/50 rounded p-2">
                      <div className="text-navy-400 text-xs">应回滚积分</div>
                      <div className="text-amber-400 font-mono">{refund.pointsToRollback}</div>
                    </div>
                    <div className="bg-navy-900/50 rounded p-2">
                      <div className="text-navy-400 text-xs">已回滚积分</div>
                      <div className="text-red-400 font-mono">{refund.actualPointsRolledBack}</div>
                    </div>
                    <div className="bg-red-900/30 rounded p-2">
                      <div className="text-navy-400 text-xs">差异积分</div>
                      <div className="text-red-400 font-mono font-semibold">+{diff}</div>
                    </div>
                  </div>
                  {refund.notes && (
                    <div className="mt-2 text-xs text-red-400">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      {refund.notes}
                    </div>
                  )}
                  {tx && (
                    <div className="mt-2 pt-2 border-t border-navy-800 flex items-center justify-between text-xs">
                      <div className="text-navy-400">关联交易: <span className="text-navy-200 font-mono">{tx.id}</span>
                      </div>
                      <button
                        onClick={() => { navigate('/ledger'); useLedgerStore.getState().setFilters({ searchTerm: tx.id }); }}
                        className="text-navy-400 hover:text-white transition-colors"
                      >查看交易 →</button>
                    </div>
                  )}
                </div>
              );
            })}
            {anomlayTxs.filter(tx => !discrepancyRefunds.some(r => r.originalTxId === tx.id)).map(tx => (
              <div key={tx.id} className="bg-red-950/20 border border-red-900/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-900/30">
                      <ArrowRightLeft className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{tx.id}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        异常交易
                      </span>
                    </div>
                    <div className="text-navy-400 text-xs mt-0.5">
                      交易时间: {format(new Date(tx.txTime), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </div>
                  </div>
                  </div>
                  <button
                    onClick={() => { navigate('/ledger'); useLedgerStore.getState().selectTransaction(tx); }}
                    className="cli-btn-danger text-xs"
                  >
                    查看详情
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="bg-navy-900/50 rounded p-2">
                    <div className="text-navy-400 text-xs">商户</div>
                    <div className="text-white">{tx.merchantName}</div>
                  </div>
                  <div className="bg-navy-900/50 rounded p-2">
                    <div className="text-navy-400 text-xs">交易金额</div>
                    <div className="text-white font-mono">¥{tx.amount.toFixed(2)}</div>
                  </div>
                  <div className="bg-navy-900/50 rounded p-2">
                    <div className="text-navy-400 text-xs">获得积分</div>
                    <div className="text-amber-400 font-mono">{tx.pointsEarned}</div>
                  </div>
                  <div className="bg-navy-900/50 rounded p-2">
                    <div className="text-navy-400 text-xs">应回滚积分</div>
                    <div className="text-red-400 font-mono">{Math.floor(tx.amount * 3)}</div>
                  </div>
                </div>
                {tx.anomalyNotes && (
                  <div className="mt-2 text-xs text-red-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {tx.anomalyNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cli-card">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-navy-400" />
          全部退款记录
        </h3>
        <div className="overflow-x-auto">
          <table className="cli-table">
            <thead>
              <tr>
                <th>退款ID</th>
                <th>原交易ID</th>
                <th>退款金额</th>
                <th>退款时间</th>
                <th>应回滚积分</th>
                <th>已回滚积分</th>
                <th>状态</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map(refund => {
                const config = getStatusConfig(refund.status);
                const StatusIcon = config.icon;
                return (
                  <tr key={refund.id}>
                    <td className="font-mono text-sm text-navy-300">{refund.id}</td>
                    <td className="font-mono text-xs text-navy-400">{refund.originalTxId}</td>
                    <td className="font-mono text-white">¥{refund.refundAmount.toFixed(2)}</td>
                    <td className="font-mono text-xs text-navy-300">
                      {format(new Date(refund.refundTime), 'MM-dd HH:mm', { locale: zhCN })}
                    </td>
                    <td className="font-mono text-amber-400">{refund.pointsToRollback}</td>
                    <td className={`font-mono ${refund.actualPointsRolledBack > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {refund.actualPointsRolledBack}
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${config.bg} ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="text-navy-400 text-xs">{refund.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cli-card">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          补偿计算说明
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-navy-800/30 rounded-lg p-4">
            <div className="text-navy-400 text-sm mb-2">积分成本单价</div>
            <div className="text-2xl font-bold text-white font-mono">¥0.005 / 积分</div>
            <div className="text-navy-500 text-xs mt-1">
              基于历史兑换成本计算
            </div>
          </div>
          <div className="bg-navy-800/30 rounded-lg p-4">
            <div className="text-navy-400 text-sm mb-2">应退积分成本</div>
            <div className="text-2xl font-bold text-amber-400 font-mono">
              ¥{(discrepancyRefunds.reduce((sum, r) => sum + (r.pointsToRollback - r.actualPointsRolledBack) * 0.005, 0)).toFixed(2)}
            </div>
            <div className="text-navy-500 text-xs mt-1">
              需追回异常金额
            </div>
          </div>
          <div className="bg-navy-800/30 rounded-lg p-4">
            <div className="text-navy-400 text-sm mb-2">应退补贴成本</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              ¥{discrepancyRefunds.reduce((sum, r) => sum + r.refundAmount * 0.02, 0).toFixed(2)}
            </div>
            <div className="text-navy-500 text-xs mt-1">
              按平均2%补贴率估算
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
