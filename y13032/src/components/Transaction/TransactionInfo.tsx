import type { BankTransaction } from '@/types';
import {
  formatAmountWithYuan,
  getStatusLabel,
  getStatusColorClass,
} from '@/utils/reconciliation';
import {
  Banknote,
  CalendarDays,
  Building2,
  FileText,
  StickyNote,
  UserRound,
  AlertTriangle,
} from 'lucide-react';

interface TransactionInfoProps {
  transaction: BankTransaction;
}

export default function TransactionInfo({ transaction }: TransactionInfoProps) {
  return (
    <div id="transaction-info-card" className="card p-6 animate-fade-up opacity-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-navy-500 tracking-wider">银行流水号</div>
          <div className="mt-1 font-mono text-xl font-semibold text-navy-700 tracking-wide">
            {transaction.bankSerialNo}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`chip ${getStatusColorClass(transaction.status)}`}>
            {getStatusLabel(transaction.status)}
          </span>
          {transaction.status === 'double_caliber' && (
            <span className="chip bg-amber/15 text-amber-dark">
              <AlertTriangle className="w-3 h-3 mr-1" strokeWidth={2} />
              需复核
            </span>
          )}
        </div>
      </div>

      <div className="divider-pattern my-5" />

      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-sm bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
            <Banknote className="w-4.5 h-4.5 text-navy-600" strokeWidth={1.8} />
          </div>
          <div>
            <div className="label-text">交易金额</div>
            <div className="font-serif text-2xl font-semibold text-navy-700">
              {formatAmountWithYuan(transaction.amount)}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-sm bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4.5 h-4.5 text-navy-600" strokeWidth={1.8} />
          </div>
          <div>
            <div className="label-text">交易日期</div>
            <div className="font-mono text-base text-navy-700">
              {transaction.transactionDate}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-sm bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5 text-navy-600" strokeWidth={1.8} />
          </div>
          <div>
            <div className="label-text">对手方</div>
            <div className="font-mono text-base text-navy-700">
              {transaction.counterparty}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-sm bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
            <UserRound className="w-4.5 h-4.5 text-navy-600" strokeWidth={1.8} />
          </div>
          <div>
            <div className="label-text">审批人</div>
            <div className="font-mono text-base text-navy-700 flex items-center gap-2">
              {transaction.approverName}
              {transaction.approverNameChanged && (
                <span className="chip bg-navy-100 text-navy-600 text-[10px]">
                  已改名（原：张建均）
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2 flex items-start gap-3">
          <div className="w-9 h-9 rounded-sm bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5 text-navy-600" strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <div className="label-text">银行流水原始备注</div>
            <div className="font-mono text-sm text-navy-700 bg-cream/60 px-3 py-2 border border-navy-100 rounded-sm">
              {transaction.originalRemark}
            </div>
          </div>
        </div>

        {transaction.supplementRemark && (
          <div className="col-span-2 flex items-start gap-3">
            <div className="w-9 h-9 rounded-sm bg-amber/15 border border-amber/30 flex items-center justify-center shrink-0">
              <StickyNote className="w-4.5 h-4.5 text-amber-dark" strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <div className="label-text text-amber-dark">
                补充备注（{transaction.transactionDate} 早会临时补录）
              </div>
              <div className="font-mono text-sm text-navy-700 bg-amber/8 px-3 py-2 border border-amber/30 rounded-sm">
                {transaction.supplementRemark}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
