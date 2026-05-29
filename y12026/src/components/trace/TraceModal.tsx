import { useState } from 'react';
import { X, CreditCard, Calculator, Ticket, Car, User, Building2, Phone, Calendar, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate } from '@/utils/format';
import type { RenewalRecord, MonthlyCard, LicensePlate, TempParkingRecord, Discount, TraceData, TabType } from '@/types';

interface TraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  traceData: TraceData | null;
}

const tabConfig = [
  { id: 'cardStatus' as TabType, label: '月卡状态', icon: CreditCard },
  { id: 'feeBreakdown' as TabType, label: '费用明细', icon: Calculator },
  { id: 'discountAudit' as TabType, label: '优惠校验', icon: Ticket },
];

export function TraceModal({ isOpen, onClose, traceData }: TraceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('cardStatus');

  if (!traceData) return null;

  const { renewalRecord, monthlyCard, licensePlate, tempParkingRecords, appliedDiscounts, bindingHistory } = traceData;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="数据追溯查询" size="xl">
      <div className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Car className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-900">{renewalRecord.plateNumber}</span>
                  <StatusBadge status={renewalRecord.status} />
                  <StatusBadge status={renewalRecord.reviewStatus} />
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <User size={14} />
                  <span>{renewalRecord.ownerName}</span>
                  <span className="mx-1">·</span>
                  <Building2 size={14} />
                  <span>{renewalRecord.building}栋 {renewalRecord.roomNumber}室</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">追溯码</div>
              <div className="font-mono text-sm text-blue-600 font-medium">{renewalRecord.traceCode}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
            <div>
              <div className="text-sm text-slate-500">续费月数</div>
              <div className="text-lg font-bold text-slate-900">{renewalRecord.renewalMonths} 个月</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">基础费用</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(renewalRecord.baseFee)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">临停抵扣</div>
              <div className="text-lg font-bold text-green-600">-{formatCurrency(renewalRecord.tempParkingDeduction)}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">实付金额</div>
              <div className="text-lg font-bold text-blue-600">{formatCurrency(renewalRecord.totalAmount)}</div>
            </div>
          </div>
        </div>

        <div className="flex border-b border-slate-200">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-64">
          {activeTab === 'cardStatus' && (
            <CardStatusTab
              monthlyCard={monthlyCard}
              licensePlate={licensePlate}
              bindingHistory={bindingHistory}
            />
          )}
          {activeTab === 'feeBreakdown' && (
            <FeeBreakdownTab
              renewalRecord={renewalRecord}
              tempParkingRecords={tempParkingRecords}
            />
          )}
          {activeTab === 'discountAudit' && (
            <DiscountAuditTab
              appliedDiscounts={appliedDiscounts}
              renewalRecord={renewalRecord}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

function CardStatusTab({ 
  monthlyCard, 
  licensePlate, 
  bindingHistory 
}: { 
  monthlyCard: MonthlyCard; 
  licensePlate: LicensePlate;
  bindingHistory: TraceData['bindingHistory'];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <CreditCard size={16} className="text-blue-600" />
            月卡信息
          </h3>
          <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">月卡类型</span>
              <span className="font-medium">{monthlyCard.cardType === 'standard' ? '标准月卡' : monthlyCard.cardType === 'vip' ? 'VIP月卡' : '员工月卡'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">月费标准</span>
              <span className="font-medium">{formatCurrency(monthlyCard.monthlyFee)}/月</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">当前状态</span>
              <StatusBadge status={monthlyCard.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">生效日期</span>
              <span className="font-medium">{formatDate(monthlyCard.effectiveDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">到期日期</span>
              <span className="font-medium text-red-600">{formatDate(monthlyCard.expiryDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">账户余额</span>
              <span className="font-medium text-green-600">{formatCurrency(monthlyCard.balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">临停抵扣余额</span>
              <span className="font-medium text-blue-600">{formatCurrency(monthlyCard.tempParkingDeduction)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <Car size={16} className="text-blue-600" />
            车牌档案
          </h3>
          <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">车牌号码</span>
              <span className="font-medium">{licensePlate.plateNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">车主姓名</span>
              <span className="font-medium">{licensePlate.ownerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">房屋信息</span>
              <span className="font-medium">{licensePlate.building}栋 {licensePlate.roomNumber}室</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">联系电话</span>
              <span className="font-medium">{licensePlate.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">档案状态</span>
              <StatusBadge status={licensePlate.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">建档时间</span>
              <span className="font-medium">{formatDate(licensePlate.createdAt)}</span>
            </div>
            {bindingHistory.length > 1 && (
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center gap-1 text-amber-600 text-sm">
                  <AlertTriangle size={14} />
                  <span>该车牌存在 {bindingHistory.length - 1} 次换绑记录</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {bindingHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
            <Clock size={16} className="text-blue-600" />
            绑定时序
          </h3>
          <div className="p-4 bg-white border border-slate-200 rounded-lg">
            <div className="space-y-3">
              {bindingHistory.map((binding, index) => (
                <div key={binding.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-green-500' : 'bg-slate-300'
                    }`}>
                      {index === 0 && <CheckCircle size={10} className="text-white" />}
                    </div>
                    {index < bindingHistory.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200 my-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{binding.ownerName}</span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">当前绑定</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {formatDate(binding.bindingDate)} 绑定
                      {binding.unbindingDate && ` → ${formatDate(binding.unbindingDate)} 解绑`}
                    </div>
                    {binding.reason && (
                      <div className="text-sm text-slate-600 mt-1">原因: {binding.reason}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeeBreakdownTab({ 
  renewalRecord, 
  tempParkingRecords 
}: { 
  renewalRecord: RenewalRecord;
  tempParkingRecords: TempParkingRecord[];
}) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
        <h3 className="text-sm font-medium text-blue-900 mb-3">费用计算过程</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-600">基础费用 ({renewalRecord.renewalMonths}个月 × {formatCurrency(renewalRecord.baseFee / renewalRecord.renewalMonths)})</span>
            <span className="font-medium">{formatCurrency(renewalRecord.baseFee)}</span>
          </div>
          {renewalRecord.tempParkingDeduction > 0 && (
            <div className="flex items-center justify-between py-2 text-green-600">
              <span>临停费用抵扣</span>
              <span className="font-medium">-{formatCurrency(renewalRecord.tempParkingDeduction)}</span>
            </div>
          )}
          {renewalRecord.discountAmount > 0 && (
            <div className="flex items-center justify-between py-2 text-amber-600">
              <span>优惠减免</span>
              <span className="font-medium">-{formatCurrency(renewalRecord.discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-3 border-t border-blue-300">
            <span className="font-medium text-blue-900">应付金额</span>
            <span className="text-xl font-bold text-blue-600">{formatCurrency(renewalRecord.totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
          <Calculator size={16} className="text-blue-600" />
          临停抵扣明细
          <span className="text-xs text-slate-500">({tempParkingRecords.length}条记录)</span>
        </h3>
        {tempParkingRecords.length > 0 ? (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">入场时间</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">出场时间</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">停车时长</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">应收费用</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">抵扣金额</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">来源</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tempParkingRecords.map((record) => (
                  <tr key={record.id} className="bg-white">
                    <td className="px-4 py-2 text-sm text-slate-900">{formatDate(record.entryTime)}</td>
                    <td className="px-4 py-2 text-sm text-slate-900">{formatDate(record.exitTime)}</td>
                    <td className="px-4 py-2 text-sm text-slate-600">{Math.floor(record.duration / 60)}小时{record.duration % 60}分</td>
                    <td className="px-4 py-2 text-sm text-slate-900">{formatCurrency(record.feeAmount)}</td>
                    <td className="px-4 py-2 text-sm text-green-600 font-medium">{formatCurrency(record.deductionAmount)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        record.source === 'system' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {record.source === 'system' ? '系统' : '手工'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            本次续费无临停抵扣记录
          </div>
        )}
      </div>
    </div>
  );
}

function DiscountAuditTab({ 
  appliedDiscounts,
  renewalRecord
}: { 
  appliedDiscounts: Discount[];
  renewalRecord: RenewalRecord;
}) {
  const isExpired = (discount: Discount) => {
    return new Date(discount.expiryDate) < new Date();
  };

  const isUsedUp = (discount: Discount) => {
    return discount.usedCount >= discount.maxUsage;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-slate-900">{appliedDiscounts.length}</div>
          <div className="text-sm text-slate-500">应用优惠数</div>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-amber-600">{formatCurrency(renewalRecord.discountAmount)}</div>
          <div className="text-sm text-amber-600">累计优惠金额</div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">
            {appliedDiscounts.filter(d => !isExpired(d) && !isUsedUp(d)).length}
          </div>
          <div className="text-sm text-green-600">有效优惠数</div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
          <Ticket size={16} className="text-blue-600" />
          优惠应用清单
        </h3>
        {appliedDiscounts.length > 0 ? (
          <div className="space-y-3">
            {appliedDiscounts.map((discount) => {
              const expired = isExpired(discount);
              const usedUp = isUsedUp(discount);
              const hasIssue = expired || usedUp;

              return (
                <div key={discount.id} className={`p-4 rounded-lg border ${
                  hasIssue 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        hasIssue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        <Ticket size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{discount.name}</span>
                          {hasIssue && (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <XCircle size={12} />
                              {expired ? '已过期' : '已用完'}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {discount.type === 'percentage' ? `${discount.value}%折扣` : 
                           discount.type === 'fixed' ? `立减${formatCurrency(discount.value)}` : 
                           `赠送${discount.value}个月`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-amber-600">
                        {discount.type === 'percentage' ? `${discount.value}%` : 
                         discount.type === 'fixed' ? formatCurrency(discount.value) : 
                         `${discount.value}个月`}
                      </div>
                      {hasIssue && (
                        <div className="text-xs text-red-500 mt-1">未生效</div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-slate-200">
                    <div>
                      <div className="text-xs text-slate-500">有效期</div>
                      <div className={`text-sm ${expired ? 'text-red-600' : 'text-slate-700'}`}>
                        {formatDate(discount.effectiveDate)} ~ {formatDate(discount.expiryDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">使用次数</div>
                      <div className={`text-sm ${usedUp ? 'text-red-600' : 'text-slate-700'}`}>
                        {discount.usedCount} / {discount.maxUsage}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">状态</div>
                      <div className="text-sm">
                        {hasIssue ? (
                          <span className="text-red-600">异常</span>
                        ) : discount.isActive ? (
                          <span className="text-green-600">正常</span>
                        ) : (
                          <span className="text-slate-500">未启用</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {discount.remarks && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="text-xs text-slate-500">备注</div>
                      <div className="text-sm text-slate-700">{discount.remarks}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            本次续费未应用任何优惠
          </div>
        )}
      </div>
    </div>
  );
}
