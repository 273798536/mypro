
import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { StoreSettlement } from '../types';
import { formatCurrency, formatShortDate, getStatusLabel } from '../utils/formatter';

interface SettlementTableProps {
  settlements: StoreSettlement[];
  title?: string;
}

const SettlementTable: React.FC<SettlementTableProps> = ({
  settlements,
  title = '门店分摊明细',
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-blue-100 text-blue-700';
      case 'exception':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                清算单号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                资金流向
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                本金划转
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                赠金成本
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                清算金额
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                溯源
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {settlements.map((settlement) => (
              <tr
                key={settlement.settlementId}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-900">
                    {settlement.settlementId}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-700">
                        {settlement.fromStoreName}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">
                        {settlement.toStoreName}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-mono text-gray-900">
                    {formatCurrency(settlement.principalAmount)}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="text-sm">
                    <span className="font-mono text-purple-600">
                      {formatCurrency(settlement.bonusAmount * settlement.bonusCostRate)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({(settlement.bonusCostRate * 100).toFixed(0)}%)
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-mono font-semibold text-gray-900">
                    {formatCurrency(settlement.totalSettlement)}
                  </span>
                </td>

                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                      settlement.status
                    )}`}
                  >
                    {getStatusLabel(settlement.status)}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500">
                    {formatShortDate(settlement.createdAt)}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">
                      {settlement.traceSource}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {settlements.length === 0 && (
        <div className="px-6 py-12 text-center text-gray-500">
          暂无分摊明细
        </div>
      )}
    </div>
  );
};

export default SettlementTable;
