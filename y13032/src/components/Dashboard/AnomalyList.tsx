import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Circle,
  Banknote,
} from 'lucide-react';
import type { BankTransaction } from '@/types';
import {
  formatAmountWithYuan,
  getStatusLabel,
  getStatusColorClass,
} from '@/utils/reconciliation';

interface AnomalyListProps {
  transactions: BankTransaction[];
}

export default function AnomalyList({ transactions }: AnomalyListProps) {
  const navigate = useNavigate();
  const [pulsingId, setPulsingId] = useState<string | null>(null);

  const anomalies = transactions.filter((t) => t.status !== 'normal');

  const handleClick = (id: string) => {
    setPulsingId(id);
    setTimeout(() => {
      navigate(`/transaction/${id}`);
    }, 600);
  };

  return (
    <div className="card p-0 overflow-hidden animate-fade-up opacity-0" style={{ animationDelay: '300ms' }}>
      <div className="px-5 py-4 border-b border-navy-100 flex items-center justify-between bg-gradient-to-r from-navy-50/60 to-transparent">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-dark" strokeWidth={2} />
          <h3 className="section-title">异常流水列表</h3>
        </div>
        <span className="text-xs text-navy-500">
          点击记录 → 查看银行流水和计算口径
        </span>
      </div>
      <div className="max-h-[420px] overflow-auto divide-y divide-navy-100">
        {anomalies.map((tx, idx) => (
          <button
            key={tx.id}
            onClick={() => handleClick(tx.id)}
            className={`w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-navy-50/60 transition-colors group ${
              pulsingId === tx.id ? 'animate-pulse-border ring-2 ring-amber/50 bg-amber/5' : ''
            }`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="shrink-0">
              {tx.reviewed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald" strokeWidth={2} />
              ) : (
                <Circle
                  className={`w-5 h-5 ${
                    tx.status === 'double_caliber' ? 'text-amber' : 'text-navy-300'
                  }`}
                  strokeWidth={2}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-navy-700">
                  {tx.bankSerialNo}
                </span>
                <span className={`chip ${getStatusColorClass(tx.status)}`}>
                  {getStatusLabel(tx.status)}
                </span>
                {tx.supplementRemark && (
                  <span className="chip bg-amber/15 text-amber-dark">
                    有补充备注
                  </span>
                )}
                {tx.approverNameChanged && (
                  <span className="chip bg-navy-100 text-navy-600">
                    审批人改名
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-navy-500">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3 h-3" strokeWidth={1.8} />
                  {formatAmountWithYuan(tx.amount)}
                </span>
                <span>{tx.transactionDate}</span>
                <span className="truncate">对手方：{tx.counterparty}</span>
              </div>
            </div>
            <ChevronRight
              className="w-4 h-4 text-navy-300 group-hover:text-navy-600 group-hover:translate-x-0.5 transition-all"
              strokeWidth={2}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
