import { useState, useMemo } from 'react';
import { Search, Filter, Check, X, Eye, FileText, AlertTriangle, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useRenewalStore } from '@/store/useRenewalStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { BUILDING_OPTIONS, RENEWAL_STATUS_LABELS, REVIEW_STATUS_LABELS } from '@/utils/constants';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

export function ReviewPage() {
  const { renewalRecords, batchUpdateRenewalStatus, batchUpdateReviewStatus, updateRenewalRecord, deleteRenewalRecord, tempParkingRecords, discounts } = useDataStore();
  const { selectedIds, toggleSelected, selectAll, clearSelection, openTraceModal } = useRenewalStore();
  const { user } = useAuthStore();

  const [searchText, setSearchText] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterReviewStatus, setFilterReviewStatus] = useState<string[]>([]);
  const [filterHasDeduction, setFilterHasDeduction] = useState<boolean | undefined>(undefined);
  const [filterHasDiscount, setFilterHasDiscount] = useState<boolean | undefined>(undefined);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [remarkText, setRemarkText] = useState('');

  const filteredRecords = useMemo(() => {
    return renewalRecords.filter((r) => {
      if (searchText) {
        const search = searchText.toLowerCase();
        return (
          r.plateNumber.toLowerCase().includes(search) ||
          r.ownerName.toLowerCase().includes(search)
        );
      }
      if (filterBuilding && r.building !== filterBuilding) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(r.status)) return false;
      if (filterReviewStatus.length > 0 && !filterReviewStatus.includes(r.reviewStatus)) return false;
      if (filterHasDeduction !== undefined) {
        if (filterHasDeduction && r.tempParkingDeduction === 0) return false;
        if (!filterHasDeduction && r.tempParkingDeduction > 0) return false;
      }
      if (filterHasDiscount !== undefined) {
        if (filterHasDiscount && r.discountAmount === 0) return false;
        if (!filterHasDiscount && r.discountAmount > 0) return false;
      }
      return true;
    });
  }, [renewalRecords, searchText, filterBuilding, filterStatus, filterReviewStatus, filterHasDeduction, filterHasDiscount]);

  const handleBatchReview = () => {
    if (selectedIds.length === 0) return;
    batchUpdateRenewalStatus(selectedIds, 'reviewed');
    batchUpdateReviewStatus(selectedIds, 'normal');
    clearSelection();
  };

  const handleBatchConfirm = () => {
    if (selectedIds.length === 0) return;
    batchUpdateRenewalStatus(selectedIds, 'confirmed');
    clearSelection();
  };

  const handleOpenRemark = (id: string) => {
    const record = renewalRecords.find((r) => r.id === id);
    setSelectedRecordId(id);
    setRemarkText(record?.remarks || '');
    setShowRemarkModal(true);
  };

  const handleSaveRemark = () => {
    if (selectedRecordId) {
      updateRenewalRecord(selectedRecordId, { remarks: remarkText });
    }
    setShowRemarkModal(false);
    setSelectedRecordId(null);
    setRemarkText('');
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`确定要删除选中的 ${selectedIds.length} 条记录吗？`)) {
      selectedIds.forEach((id) => deleteRenewalRecord(id));
      clearSelection();
    }
  };

  const toggleFilterStatus = (status: string) => {
    setFilterStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleFilterReviewStatus = (status: string) => {
    setFilterReviewStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const resetFilters = () => {
    setSearchText('');
    setFilterBuilding('');
    setFilterStatus([]);
    setFilterReviewStatus([]);
    setFilterHasDeduction(undefined);
    setFilterHasDiscount(undefined);
  };

  const warningCount = filteredRecords.filter((r) => r.reviewStatus === 'warning').length;
  const errorCount = filteredRecords.filter((r) => r.reviewStatus === 'error').length;
  const pendingCount = filteredRecords.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">筛选复核</h1>
          <p className="text-slate-500 mt-1">多条件筛选、批量复核、异常处理</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-slate-600">已选择 {selectedIds.length} 条</span>
              <button
                onClick={handleBatchReview}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                批量复核
              </button>
              <button
                onClick={handleBatchConfirm}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                批量确认
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                批量删除
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{filteredRecords.length}</p>
              <p className="text-sm text-slate-500">总记录数</p>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-5 shadow-sm border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
              <p className="text-sm text-amber-600">待处理</p>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 rounded-xl p-5 shadow-sm border border-orange-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700">{warningCount}</p>
              <p className="text-sm text-orange-600">待关注</p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-5 shadow-sm border border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{errorCount}</p>
              <p className="text-sm text-red-600">异常记录</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            筛选条件
          </h3>
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            重置筛选
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              搜索
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="车牌号或业主姓名"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              楼栋
            </label>
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部楼栋</option>
              {BUILDING_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              临停抵扣
            </label>
            <select
              value={filterHasDeduction === undefined ? '' : String(filterHasDeduction)}
              onChange={(e) => setFilterHasDeduction(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="true">有抵扣</option>
              <option value="false">无抵扣</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              优惠应用
            </label>
            <select
              value={filterHasDiscount === undefined ? '' : String(filterHasDiscount)}
              onChange={(e) => setFilterHasDiscount(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部</option>
              <option value="true">有优惠</option>
              <option value="false">无优惠</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                处理状态
              </label>
              <div className="flex flex-wrap gap-2">
                {['pending', 'reviewed', 'confirmed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filterStatus.includes(status)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {RENEWAL_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              复核状态
            </label>
            <div className="flex flex-wrap gap-2">
              {['normal', 'warning', 'error'].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleFilterReviewStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filterReviewStatus.includes(status)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {REVIEW_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredRecords.length === 0 ? (
          <EmptyState
            icon="search"
            title="暂无符合条件的记录"
            description="请调整筛选条件或检查数据导入"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAll(filteredRecords.map((r) => r.id));
                        } else {
                          clearSelection();
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">车牌号</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">业主信息</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">基础费用</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">临停抵扣</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">优惠减免</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">实付金额</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">处理状态</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">复核状态</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedIds.includes(record.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(record.id)}
                        onChange={() => toggleSelected(record.id)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{record.plateNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-slate-800">{record.ownerName}</p>
                        <p className="text-xs text-slate-500">{record.building} {record.roomNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(record.baseFee)}</td>
                    <td className="px-4 py-3">
                      <span className={record.tempParkingDeduction > 0 ? 'text-blue-600 font-medium' : 'text-slate-400'}>
                        {record.tempParkingDeduction > 0 ? formatCurrency(record.tempParkingDeduction) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={record.discountAmount > 0 ? 'text-purple-600 font-medium' : 'text-slate-400'}>
                        {record.discountAmount > 0 ? formatCurrency(record.discountAmount) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{formatCurrency(record.totalAmount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.reviewStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openTraceModal(record.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="追溯详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenRemark(record.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title={record.remarks ? '查看备注' : '添加备注'}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showRemarkModal}
        onClose={() => setShowRemarkModal(false)}
        title="备注信息"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              备注内容
            </label>
            <textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="请输入备注信息..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowRemarkModal(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSaveRemark}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
