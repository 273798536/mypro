import { useParams, Link } from 'react-router-dom';
import { ChevronRight, Home, Download, CheckCircle2 } from 'lucide-react';
import { useReconciliationStore } from '@/store/useReconciliationStore';
import { getRulesByTransaction, getStatusLabel } from '@/utils/reconciliation';
import TransactionInfo from '@/components/Transaction/TransactionInfo';
import CaliberComparison from '@/components/Transaction/CaliberComparison';
import RemarkEditor from '@/components/Transaction/RemarkEditor';
import HistoryTimeline from '@/components/Transaction/HistoryTimeline';
import ApproverRenameGuide from '@/components/Transaction/ApproverRenameGuide';
import ExportModal from '@/components/Transaction/ExportModal';
import { useState } from 'react';

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    transactions,
    rules,
    histories,
    markReviewed,
  } = useReconciliationStore();
  const [exportOpen, setExportOpen] = useState(false);

  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) {
    return (
      <div className="card p-10 text-center text-navy-500">
        找不到该流水记录
        <div className="mt-4">
          <Link to="/" className="btn-secondary">
            返回仪表盘
          </Link>
        </div>
      </div>
    );
  }

  const txRules = getRulesByTransaction(rules, transaction.id);
  const txHistories = histories.filter((h) => h.transactionId === transaction.id);
  const latestConclusion = txHistories[0]?.changeReason;

  return (
    <div id="export-capture-region" className="space-y-6 max-w-[1280px] mx-auto pb-10">
      <div className="flex items-center justify-between animate-fade-up opacity-0">
        <div className="flex items-center gap-2 text-xs text-navy-500">
          <Link to="/" className="hover:text-navy-700 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" strokeWidth={1.8} />
            对账仪表盘
          </Link>
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span className="text-navy-700 font-medium">
            流水详情 · {transaction.bankSerialNo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!transaction.reviewed && (
            <button
              onClick={() => markReviewed(transaction.id)}
              className="btn-secondary text-sm"
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />
              标记已复核
            </button>
          )}
          <button
            onClick={() => setExportOpen(true)}
            className="btn-primary text-sm"
          >
            <Download className="w-4 h-4" strokeWidth={1.8} />
            导出复核说明
          </button>
        </div>
      </div>

      <TransactionInfo transaction={transaction} />

      <CaliberComparison rules={txRules} />

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-3">
          <RemarkEditor
            transactionId={transaction.id}
            rules={txRules}
            existingRemark={transaction.supplementRemark}
          />
        </div>
        <div className="col-span-2">
          <ApproverRenameGuide
            approverName={transaction.approverName}
            isRenamed={!!transaction.approverNameChanged}
          />
        </div>
      </div>

      <HistoryTimeline
        histories={txHistories}
        transactionId={transaction.id}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        transaction={transaction}
        latestConclusion={
          latestConclusion
            ? `${latestConclusion}（当前状态：${getStatusLabel(transaction.status)}）`
            : undefined
        }
      />
    </div>
  );
}
