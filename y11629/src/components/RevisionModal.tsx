import { useState } from 'react';
import { X, Edit3, Clock, User, AlertTriangle } from 'lucide-react';
import { Transaction, AnomalyType } from '../types';
import { useLedgerStore } from '../store/useLedgerStore';
import { format } from 'date-fns';
import { getAnomalyLabel } from '../utils/export';
import { zhCN } from 'date-fns/locale';

interface RevisionModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export default function RevisionModal({ transaction, onClose }: RevisionModalProps) {
  const { reviseTransaction, resolveAnomaly } = useLedgerStore();
  const [field, setField] = useState('pointsEarned');
  const [newValue, setNewValue] = useState(transaction.pointsEarned.toString());
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('分析师');
  const [confirming, setConfirming] = useState(false);

  const handleSubmit = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    const oldValue = field === 'pointsEarned' ? transaction.pointsEarned :
                    field === 'subsidyCost' ? (transaction.subsidyCost || 0) :
                    field === 'campaignId' ? (transaction.campaignId || '') : '';

    const parsedNewValue = field === 'pointsEarned' ? parseInt(newValue) || 0 :
                          field === 'subsidyCost' ? parseFloat(newValue) || 0 :
                          newValue;

    reviseTransaction(
      transaction.id,
      field,
      oldValue,
      parsedNewValue,
      reason,
      operator
    );
    onClose();
  };

  const handleResolveAnomaly = (anomalyType: AnomalyType) => {
    if (confirm(`确认标记"${getAnomalyLabel(anomalyType)}"异常为已处理？`)) {
      resolveAnomaly(transaction.id, anomalyType);
    }
  };

  const getSourceLabel = (source: string) => {
    const map: Record<string, string> = {
      card_transaction: '刷卡流水',
      point_rule: '积分规则',
      merchant_subsidy: '商户补贴',
      refund_record: '退款记录',
      redemption_record: '兑换记录',
      cost_report: '成本报告',
    };
    return map[source] || source;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-900 border border-navy-700 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="sticky top-0 bg-navy-900 border-b border-navy-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 className="w-5 h-5 text-navy-300" />
            <div>
              <h2 className="text-white font-semibold">交易详情与修正</h2>
              <p className="text-navy-400 text-xs font-mono">{transaction.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-navy-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {transaction.anomalies.length > 0 && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
                <AlertTriangle className="w-4 h-4" />
                异常标记
              </div>
              <div className="space-y-2">
                {transaction.anomalies.map(a => (
                  <div key={a} className="flex items-center justify-between bg-red-950/50 rounded p-2">
                    <div>
                      <span className="text-red-300 text-sm">{getAnomalyLabel(a)}</span>
                      {transaction.anomalyNotes && (
                        <p className="text-red-400/70 text-xs mt-1">{transaction.anomalyNotes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleResolveAnomaly(a)}
                      className="cli-btn-success text-xs"
                    >
                      标记已处理
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-navy-800/50 rounded p-3">
              <div className="text-navy-400 text-xs">交易金额</div>
              <div className="text-white font-mono font-semibold">¥{transaction.amount.toFixed(2)}</div>
            </div>
            <div className="bg-navy-800/50 rounded p-3">
              <div className="text-navy-400 text-xs">获得积分</div>
              <div className="text-white font-mono font-semibold">{transaction.pointsEarned.toLocaleString()}</div>
            </div>
            <div className="bg-navy-800/50 rounded p-3">
              <div className="text-navy-400 text-xs">积分成本</div>
              <div className="text-white font-mono font-semibold">¥{(transaction.pointsCost || 0).toFixed(2)}</div>
            </div>
            <div className="bg-navy-800/50 rounded p-3">
              <div className="text-navy-400 text-xs">补贴成本</div>
              <div className="text-white font-mono font-semibold">¥{(transaction.subsidyCost || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-navy-300 text-sm font-medium mb-2">基础信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-navy-400">卡号</span>
                  <span className="text-white font-mono">{transaction.cardNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">商户</span>
                  <span className="text-white">{transaction.merchantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">活动</span>
                  <span className="text-white">{transaction.campaignName || '无'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">交易时间</span>
                  <span className="text-white font-mono">
                    {format(new Date(transaction.txTime), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-navy-300 text-sm font-medium mb-2">数据来源</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-navy-400">来源系统</span>
                  <span className="text-white">{getSourceLabel(transaction.source)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">来源参考</span>
                  <span className="text-white font-mono">{transaction.sourceRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">总成本</span>
                  <span className="text-white font-mono font-semibold">¥{(transaction.totalCost || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {transaction.revisionHistory.length > 0 && (
            <div>
              <h3 className="text-navy-300 text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                修正历史 ({transaction.revisionHistory.length})
              </h3>
              <div className="space-y-2">
                {transaction.revisionHistory.map((rev, idx) => (
                  <div key={rev.id} className="bg-navy-800/50 rounded p-3 text-sm border-l-2 border-blue-500">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-navy-300 font-medium">修正 #{idx + 1}</span>
                      <span className="text-navy-500 text-xs font-mono">
                        {format(new Date(rev.timestamp), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-navy-400">字段：</span>
                        <span className="text-white">{rev.field}</span>
                      </div>
                      <div>
                        <span className="text-navy-400">旧值：</span>
                        <span className="text-red-400">{rev.oldValue}</span>
                      </div>
                      <div>
                        <span className="text-navy-400">新值：</span>
                        <span className="text-emerald-400">{rev.newValue}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs">
                      <span className="text-navy-400">原因：</span>
                      <span className="text-white">{rev.reason}</span>
                    </div>
                    <div className="mt-1 text-xs flex items-center gap-1">
                      <User className="w-3 h-3 text-navy-500" />
                      <span className="text-navy-400">{rev.operator}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-navy-700 pt-4">
            <h3 className="text-navy-300 text-sm font-medium mb-3">添加修正</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-navy-400 mb-1">修正字段</label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="cli-input w-full text-sm"
                >
                  <option value="pointsEarned">获得积分 (pointsEarned)</option>
                  <option value="subsidyCost">补贴成本 (subsidyCost)</option>
                  <option value="campaignId">活动归属 (campaignId)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">新值</label>
                <input
                  type={field === 'pointsEarned' || field === 'subsidyCost' ? 'number' : 'text'}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="cli-input w-full text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-navy-400 mb-1">修正原因</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="请详细说明修正原因..."
                  rows={2}
                  className="cli-input w-full text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">操作人</label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="cli-input w-full text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={onClose} className="cli-btn bg-navy-800 border-navy-600 text-navy-300 hover:bg-navy-700">
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!newValue || !reason}
                className={confirming ? 'cli-btn-danger' : 'cli-btn-primary'}
              >
                {confirming ? '再次确认提交' : '提交修正'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
