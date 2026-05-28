import { useAppStore } from '@/store';
import { Search, Store, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';
import { useState } from 'react';

function formatMoney(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

function getConclusionColor(conclusion: string): string {
  if (conclusion.includes('盈利') || conclusion.includes('正常')) return 'text-green-600 bg-green-50';
  if (conclusion.includes('亏损') || conclusion.includes('警告')) return 'text-red-600 bg-red-50';
  return 'text-blue-600 bg-blue-50';
}

export function OrderList() {
  const { orders, selectedPeriodId } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrders = orders.filter(
    (order) =>
      order.periodId === selectedPeriodId &&
      (order.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!selectedPeriodId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <Store size={48} className="mx-auto mb-2 opacity-50" />
          <p>请从左侧选择一个账期</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">店铺订单</h2>
          <div className="flex items-center gap-2">
            {filteredOrders.some((o) => o.conclusionChanged) && (
              <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-xs font-medium flex items-center gap-1 animate-pulse-border">
                <AlertTriangle size={12} />
                结论已更新
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索店铺或订单号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center text-gray-400 py-8">暂无订单数据</div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`p-4 bg-white rounded-lg border transition-all ${
                order.conclusionChanged
                  ? 'border-orange-300 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{order.shopName}</span>
                    {order.conclusionChanged && (
                      <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        <RefreshCw size={10} />
                        结论改动
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{order.orderNo}</span>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getConclusionColor(
                    order.conclusion
                  )}`}
                >
                  {order.conclusion}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">订单金额</span>
                  <span className="font-medium text-gray-700">{formatMoney(order.orderAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">平台扣点</span>
                  <span className="text-gray-600">{formatMoney(order.platformFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">广告扣费</span>
                  <span className="text-gray-600">{formatMoney(order.adFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">退款</span>
                  <span className="text-red-500 flex items-center gap-1">
                    <TrendingDown size={12} />
                    {formatMoney(order.refundAmount)}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                最后更新: {new Date(order.lastModified).toLocaleString('zh-CN')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
