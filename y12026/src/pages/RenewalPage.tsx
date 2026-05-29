import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, Calculator, FileDown, Trash2, Check, X } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useRenewalStore } from '@/store/useRenewalStore';
import { useAuthStore } from '@/store/useAuthStore';
import { calculateRenewalFee, checkReviewStatus } from '@/services/calculator';
import { formatCurrency, formatDate, generateId, generateTraceCode } from '@/utils/format';
import { CARD_TYPE_LABELS, BUILDING_OPTIONS } from '@/utils/constants';
import type { RenewalRecord } from '@/types';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';

export function RenewalPage() {
  const { licensePlates, monthlyCards, tempParkingRecords, discounts, addRenewalRecord, updateRenewalRecord, deleteRenewalRecord, renewalRecords } = useDataStore();
  const { filterConditions, setFilterConditions, pagination, setPagination, selectedIds, toggleSelected, clearSelection, openTraceModal } = useRenewalStore();
  const { user } = useAuthStore();

  const [searchText, setSearchText] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [renewalMonths, setRenewalMonths] = useState(1);
  const [calculationResult, setCalculationResult] = useState<ReturnType<typeof calculateRenewalFee> | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const filteredRecords = renewalRecords.filter((r) => {
    if (searchText) {
      const search = searchText.toLowerCase();
      return (
        r.plateNumber.toLowerCase().includes(search) ||
        r.ownerName.toLowerCase().includes(search)
      );
    }
    if (filterConditions.building) {
      return r.building === filterConditions.building;
    }
    if (filterConditions.hasTempParkingDeduction !== undefined) {
      return filterConditions.hasTempParkingDeduction
        ? r.tempParkingDeduction > 0
        : r.tempParkingDeduction === 0;
    }
    if (filterConditions.hasDiscount !== undefined) {
      return filterConditions.hasDiscount
        ? r.discountAmount > 0
        : r.discountAmount === 0;
    }
    return true;
  });

  const paginatedRecords = filteredRecords.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  );

  const handleCalculate = () => {
    if (!selectedCard) return;

    setIsCalculating(true);
    setTimeout(() => {
      const card = monthlyCards.find((c) => c.id === selectedCard);
      if (!card) {
        setIsCalculating(false);
        return;
      }

      const plateTempRecords = tempParkingRecords.filter(
        (r) => r.plateNumber === card.plateNumber && !r.isDeducted
      );
      const plate = licensePlates.find((p) => p.plateNumber === card.plateNumber);
      const plateDiscounts = plate
        ? discounts.filter((d) => d.ownerId === plate.ownerId && d.isActive)
        : [];

      const result = calculateRenewalFee(card, plateTempRecords, plateDiscounts, renewalMonths);
      setCalculationResult(result);
      setIsCalculating(false);
    }, 300);
  };

  const handleCreateRenewal = () => {
    if (!selectedCard || !calculationResult) return;

    const card = monthlyCards.find((c) => c.id === selectedCard);
    const plate = licensePlates.find((p) => p.plateNumber === card?.plateNumber);

    if (!card || !plate) return;

    const reviewStatus = checkReviewStatus(
      card,
      tempParkingRecords.filter((r) => r.plateNumber === card.plateNumber),
      discounts.filter((d) => d.ownerId === plate.ownerId)
    );

    addRenewalRecord({
      plateId: plate.id,
      plateNumber: card.plateNumber,
      cardId: card.id,
      renewalMonths,
      baseFee: calculationResult.baseFee,
      tempParkingDeduction: calculationResult.tempParkingDeduction,
      discountAmount: calculationResult.discountAmount,
      totalAmount: calculationResult.totalAmount,
      appliedDiscountIds: calculationResult.appliedDiscounts.map((d) => d.id),
      status: 'pending',
      reviewStatus,
      ownerName: plate.ownerName,
      building: plate.building,
      roomNumber: plate.roomNumber,
      reviewer: user?.name,
      reviewedAt: new Date().toISOString(),
    });

    setShowCalculator(false);
    setSelectedCard('');
    setCalculationResult(null);
  };

  const handleMarkAsReviewed = (id: string) => {
    updateRenewalRecord(id, {
      status: 'reviewed',
      reviewer: user?.name,
      reviewedAt: new Date().toISOString(),
    });
  };

  const handleMarkAsConfirmed = (id: string) => {
    updateRenewalRecord(id, { status: 'confirmed' });
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条续费记录吗？')) {
      deleteRenewalRecord(id);
    }
  };

  const totalPages = Math.ceil(filteredRecords.length / pagination.pageSize);

  const hasDeduction = filteredRecords.some((r) => r.tempParkingDeduction > 0);
  const hasDiscount = filteredRecords.some((r) => r.discountAmount > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">续费管理</h1>
          <p className="text-slate-500 mt-1">管理月卡续费、临停抵扣和优惠应用</p>
        </div>
        <button
          onClick={() => setShowCalculator(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建续费
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索车牌号或业主姓名..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterConditions.building || ''}
            onChange={(e) => setFilterConditions({ building: e.target.value || undefined })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部楼栋</option>
            {BUILDING_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select
            value={filterConditions.hasTempParkingDeduction === undefined ? '' : String(filterConditions.hasTempParkingDeduction)}
            onChange={(e) => setFilterConditions({ 
              hasTempParkingDeduction: e.target.value === '' ? undefined : e.target.value === 'true' 
            })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">临停抵扣</option>
            <option value="true">有抵扣</option>
            <option value="false">无抵扣</option>
          </select>
          <select
            value={filterConditions.hasDiscount === undefined ? '' : String(filterConditions.hasDiscount)}
            onChange={(e) => setFilterConditions({ 
              hasDiscount: e.target.value === '' ? undefined : e.target.value === 'true' 
            })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">优惠应用</option>
            <option value="true">有优惠</option>
            <option value="false">无优惠</option>
          </select>
        </div>
      </div>

      {hasDeduction || hasDiscount ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Filter className="w-5 h-5" />
            <span className="font-medium">注意：</span>
            <span className="text-sm">
              当前列表包含
              {hasDeduction && <span className="font-semibold"> 临停抵扣 </span>}
              {hasDeduction && hasDiscount && '和'}
              {hasDiscount && <span className="font-semibold"> 优惠叠加 </span>}
              记录，请仔细复核
            </span>
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {paginatedRecords.length === 0 ? (
          <EmptyState
            icon="search"
            title="暂无续费记录"
            description="点击右上角按钮创建新的续费记录"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">车牌号</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">业主信息</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">续费月数</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">基础费用</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">临停抵扣</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">优惠减免</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">实付金额</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">状态</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">复核状态</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{record.plateNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-slate-800">{record.ownerName}</p>
                          <p className="text-xs text-slate-500">{record.building} {record.roomNumber}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{record.renewalMonths}个月</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(record.baseFee)}</td>
                      <td className="px-4 py-3">
                        <span className={record.tempParkingDeduction > 0 ? 'text-blue-600 font-medium' : 'text-slate-500'}>
                          {record.tempParkingDeduction > 0 ? formatCurrency(record.tempParkingDeduction) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={record.discountAmount > 0 ? 'text-purple-600 font-medium' : 'text-slate-500'}>
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
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {record.status === 'pending' && (
                            <button
                              onClick={() => handleMarkAsReviewed(record.id)}
                              className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="标记已复核"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {record.status === 'reviewed' && (
                            <button
                              onClick={() => handleMarkAsConfirmed(record.id)}
                              className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="确认续费"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  共 {filteredRecords.length} 条记录
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination({ page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-slate-600">
                    {pagination.page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPagination({ page: pagination.page + 1 })}
                    disabled={pagination.page === totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={showCalculator}
        onClose={() => {
          setShowCalculator(false);
          setSelectedCard('');
          setCalculationResult(null);
        }}
        title="费用试算"
        size="lg"
      >
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                选择月卡
              </label>
              <select
                value={selectedCard}
                onChange={(e) => {
                  setSelectedCard(e.target.value);
                  setCalculationResult(null);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择月卡</option>
                {monthlyCards.filter((c) => c.status === 'active').map((card) => {
                  const plate = licensePlates.find((p) => p.plateNumber === card.plateNumber);
                  return (
                    <option key={card.id} value={card.id}>
                      {card.plateNumber} - {plate?.ownerName} ({CARD_TYPE_LABELS[card.cardType]})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                续费月数
              </label>
              <select
                value={renewalMonths}
                onChange={(e) => {
                  setRenewalMonths(Number(e.target.value));
                  setCalculationResult(null);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 6, 12].map((m) => (
                  <option key={m} value={m}>{m} 个月</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={!selectedCard || isCalculating}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            {isCalculating ? '计算中...' : '开始试算'}
          </button>

          {calculationResult && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-slate-800 mb-3">费用明细</h4>
                {calculationResult.breakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className={`text-sm ${
                      item.type === 'deduction' ? 'text-blue-600' :
                      item.type === 'discount' ? 'text-purple-600' : 'text-slate-600'
                    }`}>
                      {item.description}
                    </span>
                    <span className={`font-medium ${
                      item.type === 'base' ? 'text-slate-800' :
                      item.type === 'deduction' ? 'text-blue-600' : 'text-purple-600'
                    }`}>
                      {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">实付金额</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(calculationResult.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {calculationResult.tempParkingRecords.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-medium text-blue-800 mb-2">
                    临停抵扣明细 ({calculationResult.tempParkingRecords.length}条)
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {calculationResult.tempParkingRecords.map((record, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-blue-700">
                          {formatDate(record.entryTime)} 入场
                        </span>
                        <span className="text-blue-600 font-medium">
                          {formatCurrency(record.feeAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calculationResult.appliedDiscounts.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="font-medium text-purple-800 mb-2">
                    已应用优惠 ({calculationResult.appliedDiscounts.length}项)
                  </h4>
                  <div className="space-y-2">
                    {calculationResult.appliedDiscounts.map((discount, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-purple-700">{discount.name}</span>
                        <span className="text-purple-600 font-medium">
                          {discount.type === 'percentage' ? `${discount.value}%折扣` :
                           discount.type === 'fixed' ? `减${discount.value}元` :
                           `赠${discount.value}个月`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateRenewal}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                确认创建续费记录
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
