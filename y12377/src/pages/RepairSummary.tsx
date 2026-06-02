import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Filter,
  MessageSquare,
  Check,
  X
} from 'lucide-react';
import type { RepairWorkOrder } from '../../shared/types';

const RepairSummary = () => {
  const {
    workOrders,
    repairSummary,
    loading,
    filters,
    setFilters,
    fetchWorkOrders,
    fetchRepairSummary,
    updateDispute,
    confirmWorkOrder,
    showToast
  } = useStore();

  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('detail');
  const [disputeModal, setDisputeModal] = useState<{
    open: boolean;
    workOrder: RepairWorkOrder | null;
    repairItemId: string | null;
  }>({ open: false, workOrder: null, repairItemId: null });
  const [disputeForm, setDisputeForm] = useState({
    isDisputed: false,
    disputeNote: ''
  });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    workOrder: RepairWorkOrder | null;
    confirmedBy: string;
  }>({ open: false, workOrder: null, confirmedBy: '' });

  useEffect(() => {
    fetchWorkOrders();
    fetchRepairSummary();
  }, [filters.period, filters.contractNo, filters.hasDispute]);

  const openDisputeModal = (workOrder: RepairWorkOrder, repairItemId: string | null = null) => {
    setDisputeModal({ open: true, workOrder, repairItemId });
    if (repairItemId) {
      const item = workOrder.repairItems.find(i => i.id === repairItemId);
      setDisputeForm({
        isDisputed: !item?.isDisputed,
        disputeNote: workOrder.disputeNote || ''
      });
    } else {
      setDisputeForm({
        isDisputed: !workOrder.hasDispute,
        disputeNote: workOrder.disputeNote || ''
      });
    }
  };

  const handleUpdateDispute = () => {
    if (!disputeModal.workOrder) return;
    updateDispute(disputeModal.workOrder.id, {
      repairItemId: disputeModal.repairItemId || undefined,
      isDisputed: disputeForm.isDisputed,
      disputeNote: disputeForm.disputeNote
    });
    setDisputeModal({ open: false, workOrder: null, repairItemId: null });
  };

  const handleConfirmWorkOrder = () => {
    if (!confirmModal.workOrder || !confirmModal.confirmedBy) {
      showToast('error', '请输入确认人姓名');
      return;
    }
    confirmWorkOrder(confirmModal.workOrder.id, confirmModal.confirmedBy);
    setConfirmModal({ open: false, workOrder: null, confirmedBy: '' });
  };

  const totalRepairCost = repairSummary.reduce((sum, item) => sum + item.totalRepairCost, 0);
  const disputedCount = workOrders.filter(wo => wo.hasDispute).length;
  const confirmedCount = workOrders.filter(wo => wo.confirmedAt).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-md flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">累计维修费</div>
              <div className="text-xl font-bold text-primary-800">¥{totalRepairCost.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">工单总数</div>
              <div className="text-xl font-bold text-gray-800">{workOrders.length}</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-md flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">争议工单</div>
              <div className="text-xl font-bold text-amber-600">{disputedCount}</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-md flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">已确认</div>
              <div className="text-xl font-bold text-emerald-600">{confirmedCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex bg-white rounded-md border border-gray-200 p-1">
            <button
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                viewMode === 'detail'
                  ? 'bg-primary-800 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setViewMode('detail')}
            >
              工单明细
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                viewMode === 'summary'
                  ? 'bg-primary-800 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setViewMode('summary')}
            >
              按合同归集
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索合同编号..."
              className="input-field pl-10 w-48"
              value={filters.contractNo || ''}
              onChange={(e) => setFilters({ contractNo: e.target.value })}
            />
          </div>
          <select
            className="select-field w-40"
            value={filters.hasDispute === true ? 'true' : filters.hasDispute === false ? 'false' : ''}
            onChange={(e) => setFilters({
              hasDispute: e.target.value === 'true' ? true : e.target.value === 'false' ? false : undefined
            })}
          >
            <option value="">全部工单</option>
            <option value="true">仅显示争议</option>
            <option value="false">无争议工单</option>
          </select>
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => {
              fetchWorkOrders();
              fetchRepairSummary();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          共 {workOrders.length} 条工单
        </div>
      </div>

      {viewMode === 'detail' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">工单编号</th>
                  <th className="table-header">关联合同</th>
                  <th className="table-header">乐器</th>
                  <th className="table-header">维修项目</th>
                  <th className="table-header">总费用</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((workOrder, idx) => (
                  <tr
                    key={workOrder.id}
                    className={`table-row ${workOrder.hasDispute ? 'bg-amber-50/50' : ''}`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <td className="table-cell">
                      <div className="font-medium text-primary-900">{workOrder.workOrderNo}</div>
                      <div className="text-xs text-gray-500">{workOrder.createdAt.slice(0, 10)}</div>
                    </td>
                    <td className="table-cell">
                      <div>{workOrder.contractNo}</div>
                    </td>
                    <td className="table-cell font-mono text-sm">{workOrder.instrumentNo}</td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        {workOrder.repairItems.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between text-sm px-2 py-1 rounded ${
                              item.isDisputed ? 'bg-amber-100 text-amber-800' : 'bg-gray-50'
                            }`}
                          >
                            <span>{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span>¥{item.cost}</span>
                              {item.isDisputed && (
                                <button
                                  className="text-amber-600 hover:text-amber-800"
                                  onClick={() => openDisputeModal(workOrder, item.id)}
                                  title="编辑争议标记"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                              )}
                              {!item.isDisputed && (
                                <button
                                  className="text-gray-400 hover:text-amber-600"
                                  onClick={() => openDisputeModal(workOrder, item.id)}
                                  title="标记为争议"
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {workOrder.disputeNote && (
                        <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
                          <div className="font-medium">争议备注：</div>
                          {workOrder.disputeNote}
                        </div>
                      )}
                    </td>
                    <td className="table-cell font-medium">¥{workOrder.totalCost.toLocaleString()}</td>
                    <td className="table-cell">
                      <div className="space-y-1">
                        {workOrder.hasDispute ? (
                          <span className="badge bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            有争议
                          </span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 mr-1" />
                            无争议
                          </span>
                        )}
                        <div className="text-xs text-gray-500">
                          {workOrder.confirmedAt ? (
                            <span className="text-emerald-600">
                              已确认 · {workOrder.confirmedBy}
                            </span>
                          ) : (
                            <span className="text-gray-400">待确认</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-secondary text-xs py-1 px-2"
                          onClick={() => openDisputeModal(workOrder)}
                        >
                          <MessageSquare className="inline w-3 h-3 mr-1" />
                          备注
                        </button>
                        <button
                          className="btn-success text-xs py-1 px-2"
                          disabled={workOrder.hasDispute || workOrder.confirmedAt !== null}
                          onClick={() => setConfirmModal({ open: true, workOrder, confirmedBy: '' })}
                        >
                          <Check className="inline w-3 h-3 mr-1" />
                          确认
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {workOrders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-12 text-gray-400">
                      暂无维修工单
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {repairSummary.map((summary, idx) => (
            <div
              key={summary.contractNo}
              className="card p-6"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-primary-900">
                    {summary.contractNo}
                  </h3>
                  <p className="text-sm text-gray-500">{summary.customerName}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">累计维修费</div>
                  <div className="text-xl font-bold text-primary-800">
                    ¥{summary.totalRepairCost.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {summary.workOrders.map((wo) => (
                  <div
                    key={wo.workOrderNo}
                    className={`flex items-center justify-between p-3 rounded-md border ${
                      wo.hasDispute ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{wo.workOrderNo}</span>
                      <span className="font-mono text-sm text-gray-600">{wo.instrumentNo}</span>
                      <span className="text-sm text-gray-500">{wo.createdAt.slice(0, 10)}</span>
                      {wo.hasDispute && (
                        <span className="badge bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          有争议
                        </span>
                      )}
                    </div>
                    <div className="font-medium">¥{wo.totalCost.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {repairSummary.length === 0 && !loading && (
            <div className="card p-12 text-center text-gray-400">
              暂无维修归集数据
            </div>
          )}
        </div>
      )}

      {disputeModal.open && disputeModal.workOrder && (
        <div className="modal-overlay" onClick={() => setDisputeModal({ open: false, workOrder: null, repairItemId: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">
                {disputeModal.repairItemId ? '项目争议标记' : '争议备注管理'}
              </h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setDisputeModal({ open: false, workOrder: null, repairItemId: null })}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <div className="text-sm">
                  <div><span className="text-gray-500">工单：</span>{disputeModal.workOrder.workOrderNo}</div>
                  <div><span className="text-gray-500">合同：</span>{disputeModal.workOrder.contractNo}</div>
                  {disputeModal.repairItemId && (
                    <div>
                      <span className="text-gray-500">项目：</span>
                      {disputeModal.workOrder.repairItems.find(i => i.id === disputeModal.repairItemId)?.name}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="form-label">
                  {disputeModal.repairItemId ? '该项目是否存在争议' : '工单是否存在争议'}
                </label>
                <select
                  className="select-field"
                  value={disputeForm.isDisputed ? 'true' : 'false'}
                  onChange={(e) => setDisputeForm({ ...disputeForm, isDisputed: e.target.value === 'true' })}
                >
                  <option value="false">无争议</option>
                  <option value="true">有争议</option>
                </select>
              </div>
              <div>
                <label className="form-label">争议备注 <span className="text-amber-600">*</span></label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="请具体说明争议点，涉及哪个项目、哪方有异议、争议金额等"
                  value={disputeForm.disputeNote}
                  onChange={(e) => setDisputeForm({ ...disputeForm, disputeNote: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  提示：备注要具体到工单和项目，不要只写"处理失败"
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                className="btn-secondary"
                onClick={() => setDisputeModal({ open: false, workOrder: null, repairItemId: null })}
              >
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdateDispute}
                disabled={loading}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal.open && confirmModal.workOrder && (
        <div className="modal-overlay" onClick={() => setConfirmModal({ open: false, workOrder: null, confirmedBy: '' })}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">确认工单</h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setConfirmModal({ open: false, workOrder: null, confirmedBy: '' })}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4">
                <div className="text-sm text-emerald-800">
                  <div className="font-medium mb-1">确认信息</div>
                  <div>工单：{confirmModal.workOrder.workOrderNo}</div>
                  <div>合同：{confirmModal.workOrder.contractNo}</div>
                  <div>金额：¥{confirmModal.workOrder.totalCost.toLocaleString()}</div>
                </div>
              </div>
              <div>
                <label className="form-label">确认人姓名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="请输入确认人姓名"
                  value={confirmModal.confirmedBy}
                  onChange={(e) => setConfirmModal({ ...confirmModal, confirmedBy: e.target.value })}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                className="btn-secondary"
                onClick={() => setConfirmModal({ open: false, workOrder: null, confirmedBy: '' })}
              >
                取消
              </button>
              <button
                className="btn-success"
                onClick={handleConfirmWorkOrder}
                disabled={loading}
              >
                <CheckCircle className="inline w-4 h-4 mr-2" />
                确认归集
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairSummary;
