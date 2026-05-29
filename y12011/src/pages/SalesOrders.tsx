import { useState } from 'react';
import { Search, Edit3, History, Download, Filter, Plus, X } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useRebateStore } from '../store/rebateStore';
import { SalesOrder } from '../types';

export default function SalesOrders() {
  const { salesOrders, dealers, updateSalesOrder, recalculateTrial, trials } = useRebateStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SalesOrder>>({});
  const [editReason, setEditReason] = useState('');

  const filteredOrders = salesOrders.filter((order) => {
    const matchesSearch = order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.dealerName && order.dealerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleEdit = (order: SalesOrder) => {
    setSelectedOrder(order);
    setEditForm({
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      amount: order.amount,
      batchNo: order.batchNo,
      productCode: order.productCode
    });
    setEditReason('');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!selectedOrder || !editReason) return;

    updateSalesOrder(
      selectedOrder.id,
      editForm,
      editReason,
      '财务BP-张三'
    );

    const relatedTrial = trials.find(t => t.dealerId === selectedOrder.dealerId);
    if (relatedTrial) {
      recalculateTrial(relatedTrial.id, '财务BP-张三');
    }

    setShowEditModal(false);
    setSelectedOrder(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal':
        return <Badge variant="success">正常</Badge>;
      case 'returned':
        return <Badge variant="error">已退货</Badge>;
      case 'corrected':
        return <Badge variant="warning">已修正</Badge>;
      default:
        return <Badge variant="default">未知</Badge>;
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">销售发货</h1>
          <p className="text-gray-500 mt-1">管理销售发货记录，支持修改和历史追溯</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={16} className="mr-2" />
            导出
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <Plus size={16} className="mr-2" />
            批量导入
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索订单号、产品名称、经销商..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="normal">正常</option>
              <option value="returned">已退货</option>
              <option value="corrected">已修正</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">订单号</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">经销商</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">产品名称</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数量</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">批次号</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数据完整性</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-blue-600">{order.orderNo}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{order.dealerName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="text-sm text-gray-900">{order.productName}</span>
                      {!order.productCode && (
                        <span className="ml-2 text-xs text-orange-600">(缺产品编码)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{order.quantity}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(order.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {order.batchNo ? (
                      <span className="text-sm text-gray-900">{order.batchNo}</span>
                    ) : (
                      <span className="text-sm text-orange-600">缺字段</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4">
                    {order.missingFields.length > 0 ? (
                      <Badge variant="warning" size="sm">
                        缺{order.missingFields.length}项
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">完整</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(order)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit3 size={16} />
                      </button>
                      {order.modificationHistory.length > 0 && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowHistoryModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="查看历史"
                        >
                          <History size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              共 {filteredOrders.length} 条记录
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm">
                {filteredOrders.filter(o => o.missingFields.length > 0).length} 条需补全
              </Badge>
              <Badge variant="info" size="sm">
                {filteredOrders.filter(o => o.modificationHistory.length > 0).length} 条已修改
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">编辑销售发货</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  订单号: <span className="font-medium">{selectedOrder.orderNo}</span>
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  产品: {selectedOrder.productName}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                  <input
                    type="number"
                    value={editForm.quantity ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单价</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.unitPrice ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">批次号</label>
                <input
                  type="text"
                  value={editForm.batchNo ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, batchNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入批次号"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">产品编码</label>
                <input
                  type="text"
                  value={editForm.productCode ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, productCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入产品编码"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  修改原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="请输入修改原因（必填）..."
                  required
                />
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">
                  ⚠️ 保存后将自动触发相关返利试算的重新计算，并保留完整修改历史
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editReason}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">修改历史</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 bg-gray-50">
              <p className="text-sm text-gray-600">
                订单号: <span className="font-medium">{selectedOrder.orderNo}</span>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedOrder.modificationHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">暂无修改记录</p>
              ) : (
                selectedOrder.modificationHistory.map((record) => (
                  <div key={record.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="purple">{record.fieldName}</Badge>
                      <span className="text-xs text-gray-400">{record.operateTime}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                      <div>
                        <span className="text-gray-500">修改前:</span>
                        <span className="ml-2 text-gray-900 font-medium">{record.oldValue || '(空)'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">修改后:</span>
                        <span className="ml-2 text-blue-600 font-medium">{record.newValue || '(空)'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">原因: {record.reason}</span>
                      <span className="text-gray-400">{record.operator}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
