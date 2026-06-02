import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Play,
  Pause,
  CheckCircle,
  Music,
  AlertTriangle,
  X
} from 'lucide-react';
import type { RentalContract } from '../../shared/types';

const statusMap = {
  PENDING: { label: '待起租', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Pause },
  ACTIVE: { label: '租赁中', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Play },
  ENDED: { label: '已退租', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: CheckCircle }
};

const RentalLedger = () => {
  const { contracts, loading, filters, setFilters, fetchContracts, updateContractStatus, changeInstrument } = useStore();
  const [selectedContract, setSelectedContract] = useState<RentalContract | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeForm, setChangeForm] = useState({
    oldInstrumentNo: '',
    newInstrumentNo: '',
    relatedWorkOrderId: '',
    reason: '',
    operator: ''
  });

  useEffect(() => {
    fetchContracts();
  }, [filters.status, filters.contractNo]);

  const handleStatusChange = (contract: RentalContract, newStatus: string) => {
    if (confirm(`确定将合同 ${contract.contractNo} 状态变更为「${statusMap[newStatus as keyof typeof statusMap].label}」吗？`)) {
      updateContractStatus(contract.id, newStatus);
    }
  };

  const openChangeModal = (contract: RentalContract) => {
    setSelectedContract(contract);
    setChangeForm({
      oldInstrumentNo: contract.instrumentNo,
      newInstrumentNo: '',
      relatedWorkOrderId: '',
      reason: '',
      operator: ''
    });
    setShowChangeModal(true);
  };

  const handleChangeInstrument = () => {
    if (!selectedContract || !changeForm.newInstrumentNo || !changeForm.operator) {
      useStore.getState().showToast('error', '新乐器号和操作人为必填项');
      return;
    }
    changeInstrument(selectedContract.id, changeForm);
    setShowChangeModal(false);
    setSelectedContract(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索合同编号..."
              className="input-field pl-10 w-64"
              value={filters.contractNo || ''}
              onChange={(e) => setFilters({ contractNo: e.target.value })}
            />
          </div>
          <select
            className="select-field w-40"
            value={filters.status || ''}
            onChange={(e) => setFilters({ status: e.target.value || undefined })}
          >
            <option value="">全部状态</option>
            <option value="PENDING">待起租</option>
            <option value="ACTIVE">租赁中</option>
            <option value="ENDED">已退租</option>
          </select>
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => fetchContracts()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          共 {contracts.length} 条记录
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">合同编号</th>
                <th className="table-header">当前乐器</th>
                <th className="table-header">客户名称</th>
                <th className="table-header">起租日期</th>
                <th className="table-header">押金/月租金</th>
                <th className="table-header">状态</th>
                <th className="table-header">换号记录</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract, idx) => {
                const StatusIcon = statusMap[contract.status].icon;
                return (
                  <tr key={contract.id} className="table-row" style={{ animationDelay: `${idx * 50}ms` }}>
                    <td className="table-cell font-medium text-primary-900">{contract.contractNo}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-primary-500" />
                        <span className="font-mono text-sm">{contract.instrumentNo}</span>
                      </div>
                    </td>
                    <td className="table-cell">{contract.customerName}</td>
                    <td className="table-cell">{contract.startDate}</td>
                    <td className="table-cell">
                      <div className="text-sm">
                        <div>押金: ¥{contract.depositAmount.toLocaleString()}</div>
                        <div className="text-gray-500">月租: ¥{contract.monthlyRent.toLocaleString()}</div>
                        {contract.actualDepositReceived !== null && (
                          <div className={contract.actualDepositReceived !== contract.depositAmount ? 'text-accent-rose' : 'text-emerald-600'}>
                            实到: ¥{contract.actualDepositReceived.toLocaleString()}
                            {contract.actualDepositReceived !== contract.depositAmount && (
                              <AlertTriangle className="inline w-3 h-3 ml-1" />
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge border ${statusMap[contract.status].color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusMap[contract.status].label}
                      </span>
                    </td>
                    <td className="table-cell">
                      {contract.instrumentChangeHistory.length > 0 ? (
                        <div className="space-y-1 max-w-xs">
                          {contract.instrumentChangeHistory.slice(0, 2).map((change) => (
                            <div key={change.id} className="flex items-center gap-2 text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200">
                              <span className="font-mono">{change.oldInstrumentNo}</span>
                              <ArrowRight className="w-3 h-3 text-amber-500" />
                              <span className="font-mono">{change.newInstrumentNo}</span>
                            </div>
                          ))}
                          {contract.instrumentChangeHistory.length > 2 && (
                            <div className="text-xs text-gray-500">
                              还有 {contract.instrumentChangeHistory.length - 2} 条记录
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">无</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <select
                          className="select-field text-xs py-1 pr-6"
                          value={contract.status}
                          onChange={(e) => handleStatusChange(contract, e.target.value)}
                        >
                          <option value="PENDING">待起租</option>
                          <option value="ACTIVE">租赁中</option>
                          <option value="ENDED">已退租</option>
                        </select>
                        <button
                          className="btn-secondary text-xs py-1 px-2"
                          onClick={() => openChangeModal(contract)}
                        >
                          换号
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {contracts.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="table-cell text-center py-12 text-gray-400">
                    暂无合同记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showChangeModal && selectedContract && (
        <div className="modal-overlay" onClick={() => setShowChangeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">乐器换号登记</h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowChangeModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <div className="text-sm text-amber-800">
                  <div className="font-medium mb-1">合同信息</div>
                  <div>合同编号: {selectedContract.contractNo}</div>
                  <div>客户名称: {selectedContract.customerName}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">原乐器号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field bg-gray-50"
                    value={changeForm.oldInstrumentNo}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">系统自动填充，无需修改</p>
                </div>
                <div>
                  <label className="form-label">新乐器号 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="请输入新乐器编号"
                    value={changeForm.newInstrumentNo}
                    onChange={(e) => setChangeForm({ ...changeForm, newInstrumentNo: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">关联维修工单</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="如有相关维修工单，请输入工单ID"
                  value={changeForm.relatedWorkOrderId}
                  onChange={(e) => setChangeForm({ ...changeForm, relatedWorkOrderId: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">换号原因</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="请简要说明换号原因"
                  value={changeForm.reason}
                  onChange={(e) => setChangeForm({ ...changeForm, reason: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">操作人 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="请输入操作人姓名"
                  value={changeForm.operator}
                  onChange={(e) => setChangeForm({ ...changeForm, operator: e.target.value })}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                className="btn-secondary"
                onClick={() => setShowChangeModal(false)}
              >
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleChangeInstrument}
                disabled={loading}
              >
                确认换号
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalLedger;
