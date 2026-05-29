import { useState } from 'react';
import { useLedgerStore } from '../store/useLedgerStore';
import TransactionFilters from '../components/TransactionFilters';
import StatusBadge from '../components/StatusBadge';
import RevisionModal from '../components/RevisionModal';
import { Edit3, Eye, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { exportData } from '../utils/export';
import { Transaction } from '../types';

export default function Ledger() {
  const { getFilteredTransactions, selectTransaction, selectedTx, stats } = useLedgerStore();
  const filteredTxs = getFilteredTransactions();
  const [sortField, setSortField] = useState<keyof Transaction>('txTime');
  const [sortDesc, setSortDesc] = useState(true);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');

  const sortedTxs = [...filteredTxs].sort((a, b) => {
    let av: string | number = a[sortField] as string | number;
    let bv: string | number = b[sortField] as string | number;
    if (sortField === 'txTime') {
      av = new Date(av as string).getTime();
      bv = new Date(bv as string).getTime();
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDesc ? bv - av : av - bv;
    }
    return sortDesc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const SortIcon = ({ field }: { field: keyof Transaction }) => (
    sortField === field
      ? sortDesc
        ? <ChevronDown className="w-3 h-3 inline ml-1" />
        : <ChevronUp className="w-3 h-3 inline ml-1" />
      : null
  );

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

  const handleExport = () => {
    exportData(filteredTxs, stats, {
      format: exportFormat,
      includeUnhandled: true,
      includeRevised: true,
      includePendingReview: true,
      includeAnomalies: true,
    });
    setShowExportOptions(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">积分账本</h1>
          <p className="text-navy-400 text-sm mt-1">
            共 {filteredTxs.length} 条记录 · 筛选结果
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="cli-btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
          {showExportOptions && (
            <div className="absolute right-0 mt-2 w-56 bg-navy-900 border border-navy-700 rounded-lg p-3 z-10 shadow-xl animate-fade-in">
              <p className="text-xs text-navy-400 mb-2">选择导出格式</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-navy-200 cursor-pointer hover:text-white">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                    className="accent-navy-500"
                  />
                  CSV 表格
                </label>
                <label className="flex items-center gap-2 text-sm text-navy-200 cursor-pointer hover:text-white">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={() => setExportFormat('json')}
                    className="accent-navy-500"
                  />
                  JSON 数据
                </label>
                <label className="flex items-center gap-2 text-sm text-navy-200 cursor-pointer hover:text-white">
                  <input
                    type="radio"
                    name="exportFormat"
                    value="excel"
                    checked={exportFormat === 'excel'}
                    onChange={() => setExportFormat('excel')}
                    className="accent-navy-500"
                  />
                  Markdown 报告
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowExportOptions(false)}
                  className="flex-1 cli-btn bg-navy-800 border-navy-600 text-navy-300 hover:bg-navy-700 text-xs"
                >
                  取消
                </button>
                <button
                  onClick={handleExport}
                  className="flex-1 cli-btn-primary text-xs"
                >
                  确认导出
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <TransactionFilters />

      <div className="cli-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="cli-table">
            <thead className="sticky top-0">
              <tr>
                <th className="w-[130px] cursor-pointer hover:bg-navy-700" onClick={() => handleSort('txTime')}>
                  交易时间 <SortIcon field="txTime" />
                </th>
                <th className="w-[120px] cursor-pointer hover:bg-navy-700" onClick={() => handleSort('id')}>
                  交易ID <SortIcon field="id" />
                </th>
                <th className="cursor-pointer hover:bg-navy-700" onClick={() => handleSort('merchantName')}>
                  商户 <SortIcon field="merchantName" />
                </th>
                <th className="cursor-pointer hover:bg-navy-700" onClick={() => handleSort('amount')}>
                  金额 <SortIcon field="amount" />
                </th>
                <th className="cursor-pointer hover:bg-navy-700" onClick={() => handleSort('pointsEarned')}>
                  积分 <SortIcon field="pointsEarned" />
                </th>
                <th>活动</th>
                <th className="cursor-pointer hover:bg-navy-700" onClick={() => handleSort('totalCost')}>
                  总成本 <SortIcon field="totalCost" />
                </th>
                <th>来源</th>
                <th className="w-[140px]">状态</th>
                <th className="w-[100px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedTxs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-navy-500">
                    暂无符合条件的交易记录
                  </td>
                </tr>
              ) : (
                sortedTxs.map(tx => (
                  <tr
                    key={tx.id}
                    className={`${
                      tx.status === 'anomaly'
                        ? 'bg-red-950/20 hover:bg-red-950/30!'
                        : tx.status === 'pending_review'
                        ? 'bg-amber-950/20 hover:bg-amber-950/30!'
                        : tx.status === 'revised'
                        ? 'bg-blue-950/10'
                        : ''
                    }`}
                  >
                    <td className="font-mono text-xs text-navy-300">
                      {format(new Date(tx.txTime), 'MM-dd HH:mm', { locale: zhCN })}
                    </td>
                    <td className="font-mono text-xs text-navy-300">{tx.id}</td>
                    <td className="text-navy-100">{tx.merchantName}</td>
                    <td className="font-mono text-white">¥{tx.amount.toFixed(2)}</td>
                    <td className="font-mono text-amber-400">{tx.pointsEarned.toLocaleString()}</td>
                    <td className="text-navy-300 text-xs">
                      {tx.campaignName || <span className="text-navy-600">-</span>}
                    </td>
                    <td className="font-mono text-white">¥{(tx.totalCost || 0).toFixed(2)}</td>
                    <td>
                      <span className="inline-block px-1.5 py-0.5 bg-navy-800 text-navy-300 rounded text-[10px]">
                        {getSourceLabel(tx.source)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={tx.status} anomalies={tx.anomalies} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => selectTransaction(tx)}
                          className="p-1.5 text-navy-400 hover:text-white hover:bg-navy-800 rounded transition-colors"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => selectTransaction(tx)}
                          className="p-1.5 text-navy-400 hover:text-amber-400 hover:bg-navy-800 rounded transition-colors"
                          title="修正"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTx && (
        <RevisionModal
          transaction={selectedTx}
          onClose={() => selectTransaction(null)}
        />
      )}
    </div>
  );
}
