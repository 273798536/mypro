import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Check,
  X,
  Edit3,
  Eye,
  AlertCircle,
  AlertTriangle,
  Info,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  formatCurrency,
  formatDate,
  getSeverityText,
} from '../utils/calculationEngine';
import { exportRefundExcel } from '../utils/exportUtils';
import type { FeePayer, AnomalySeverity } from '../types';

const PIE_COLORS = ['#165DFF', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

const FEE_PAYER_OPTIONS: { value: FeePayer; label: string }[] = [
  { value: 'customer', label: '客户' },
  { value: 'store', label: '门店' },
  { value: 'institution', label: '机构' },
  { value: 'shared', label: '双方分摊' },
];

function getSeverityBadgeClass(severity: AnomalySeverity): string {
  const map: Record<AnomalySeverity, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-orange-100 text-orange-700 border-orange-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return map[severity] || map.info;
}

function getSeverityIcon(severity: AnomalySeverity) {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    default:
      return <Info className="w-5 h-5 text-blue-500" />;
  }
}

export default function Calculator() {
  const contracts = useStore((s) => s.contracts);
  const installmentBills = useStore((s) => s.installmentBills);
  const treatmentRecords = useStore((s) => s.treatmentRecords);
  const gifts = useStore((s) => s.gifts);
  const selectedContractId = useStore((s) => s.selectedContractId);
  const currentCalculation = useStore((s) => s.currentCalculation);
  const anomalies = useStore((s) => s.anomalies);
  const refundRequests = useStore((s) => s.refundRequests);
  const selectContract = useStore((s) => s.selectContract);
  const toggleTreatmentVerification = useStore((s) => s.toggleTreatmentVerification);
  const toggleGiftReturn = useStore((s) => s.toggleGiftReturn);
  const updateFeePayer = useStore((s) => s.updateFeePayer);
  const calculateRefund = useStore((s) => s.calculateRefund);
  const createRefundRequest = useStore((s) => s.createRefundRequest);
  const submitForApproval = useStore((s) => s.submitForApproval);

  const [contractDropdownOpen, setContractDropdownOpen] = useState(false);
  const [showTreatments, setShowTreatments] = useState(true);
  const [showGifts, setShowGifts] = useState(true);

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId) || null,
    [contracts, selectedContractId]
  );

  const currentInstallment = useMemo(
    () => installmentBills.find((b) => b.contractId === selectedContractId),
    [installmentBills, selectedContractId]
  );

  const contractTreatments = useMemo(
    () => treatmentRecords.filter((t) => t.contractId === selectedContractId),
    [treatmentRecords, selectedContractId]
  );

  const contractGifts = useMemo(
    () => gifts.filter((g) => g.contractId === selectedContractId),
    [gifts, selectedContractId]
  );

  const pieData = useMemo(() => {
    if (!currentCalculation) return [];
    return [
      { name: '已核销金额', value: currentCalculation.verifiedTotal },
      { name: '手续费', value: currentCalculation.customerFeeShare },
      { name: '赠品扣回', value: currentCalculation.giftDeduction },
      { name: '基础退款', value: Math.max(0, currentCalculation.baseRefund) },
      { name: '实际退款', value: currentCalculation.actualRefund },
    ].filter((item) => item.value > 0);
  }, [currentCalculation]);

  const handleSelectContract = (contractId: string) => {
    selectContract(contractId);
    setContractDropdownOpen(false);
  };

  const handleFeePayerChange = (payer: FeePayer) => {
    if (selectedContractId && currentInstallment) {
      const ratio = payer === 'shared' ? (currentInstallment.feePayerRatio ?? 0.5) : undefined;
      updateFeePayer(selectedContractId, payer, ratio);
    }
  };

  const handleRatioChange = (ratio: number) => {
    if (selectedContractId && currentInstallment) {
      updateFeePayer(selectedContractId, 'shared', ratio);
    }
  };

  const handleRecalculate = () => {
    if (selectedContractId) {
      calculateRefund(selectedContractId);
    }
  };

  const handleSaveForApproval = () => {
    if (!selectedContractId || !currentCalculation) return;
    const existing = refundRequests.find((r) => r.contractId === selectedContractId);
    if (existing) {
      submitForApproval(existing.id, '提交审批');
    } else {
      const req = createRefundRequest(selectedContractId);
      submitForApproval(req.id, '提交审批');
    }
  };

  const handleExport = () => {
    if (!selectedContractId || !currentCalculation || !selectedContract) return;
    const existing = refundRequests.find((r) => r.contractId === selectedContractId);
    if (existing) {
      exportRefundExcel(existing);
    } else {
      const req = createRefundRequest(selectedContractId);
      exportRefundExcel(req);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">退款计算器</h1>
          <p className="text-sm text-gray-500 mt-1">医疗美容退款精准核算</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择合同</label>
        <div className="relative max-w-md">
          <button
            onClick={() => setContractDropdownOpen(!contractDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg bg-white hover:border-[#165DFF] transition-colors"
          >
            <span className={selectedContract ? 'text-gray-900' : 'text-gray-400'}>
              {selectedContract
                ? `${selectedContract.contractNo} - ${selectedContract.customerName} (${formatCurrency(selectedContract.totalAmount)})`
                : '请选择合同'}
            </span>
            {contractDropdownOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {contractDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {contracts.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">暂无合同数据</div>
              ) : (
                contracts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectContract(c.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      c.id === selectedContractId ? 'bg-[#165DFF]/5 text-[#165DFF]' : 'text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{c.contractNo} - {c.customerName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatCurrency(c.totalAmount)} · 签订于 {c.signDate}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {!selectedContract || !currentCalculation ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">请先选择一份合同以开始计算</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <button
                onClick={() => setShowTreatments(!showTreatments)}
                className="w-full flex items-center justify-between"
              >
                <h2 className="text-lg font-semibold text-gray-900">治疗记录</h2>
                {showTreatments ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {showTreatments && (
                <div className="mt-4 divide-y divide-gray-100">
                  {contractTreatments.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">暂无治疗记录</div>
                  ) : (
                    contractTreatments.map((t) => (
                      <div
                        key={t.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{t.treatmentName}</span>
                            {t.isVerified ? (
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                <Check className="w-3 h-3" /> 已核销
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                <X className="w-3 h-3" /> 未核销
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatDate(new Date(t.treatmentDate).getTime())} · {t.quantity} 次 · {formatCurrency(t.unitPrice)}/次
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">
                            小计 {formatCurrency(t.unitPrice * t.quantity)}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleTreatmentVerification(t.id)}
                          className={`shrink-0 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            t.isVerified
                              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {t.isVerified ? '取消核销' : '标记已核销'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">分期账单</h2>
              {currentInstallment ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">账单金额</div>
                      <div className="font-semibold text-gray-900 mt-0.5">{formatCurrency(currentInstallment.totalAmount)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">手续费</div>
                      <div className="font-semibold text-gray-900 mt-0.5">{formatCurrency(currentInstallment.feeAmount)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">期数</div>
                      <div className="font-semibold text-gray-900 mt-0.5">{currentInstallment.periods} 期</div>
                    </div>
                    <div>
                      <div className="text-gray-500">已还款</div>
                      <div className="font-semibold text-gray-900 mt-0.5">{formatCurrency(currentInstallment.paidAmount)}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">手续费承担方</label>
                    <div className="grid grid-cols-4 gap-2">
                      {FEE_PAYER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleFeePayerChange(opt.value)}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            currentInstallment.feePayer === opt.value
                              ? 'bg-[#165DFF] text-white border-[#165DFF]'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-[#165DFF]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {currentInstallment.feePayer === 'shared' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        客户分摊比例 ({((currentInstallment.feePayerRatio ?? 0.5) * 100).toFixed(0)}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={((currentInstallment.feePayerRatio ?? 0.5) * 100)}
                        onChange={(e) => handleRatioChange(Number(e.target.value) / 100)}
                        className="w-full accent-[#165DFF]"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>门店承担</span>
                        <span>客户承担</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 text-sm">暂无分期账单</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <button
              onClick={() => setShowGifts(!showGifts)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-semibold text-gray-900">赠品列表</h2>
              {showGifts ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {showGifts && (
              <div className="mt-4 divide-y divide-gray-100">
                {contractGifts.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">暂无赠品记录</div>
                ) : (
                  contractGifts.map((g) => (
                    <div
                      key={g.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{g.giftName}</span>
                          {g.isReturned ? (
                            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              <Check className="w-3 h-3" /> 已归还
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                              <X className="w-3 h-3" /> 未归还
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          数量 {g.quantity} · 单价 {formatCurrency(g.value)} · 总价值 {formatCurrency(g.value * g.quantity)}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleGiftReturn(g.id)}
                        className={`shrink-0 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          g.isReturned
                            ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {g.isReturned ? '取消归还' : '标记已归还'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-sm text-gray-500">合同总金额</div>
              <div className="text-xl font-bold text-gray-900 mt-2">{formatCurrency(currentCalculation.contractTotal)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-sm text-gray-500">已核销金额</div>
              <div className="text-xl font-bold text-green-600 mt-2">{formatCurrency(currentCalculation.verifiedTotal)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-sm text-gray-500">未核销金额</div>
              <div className="text-xl font-bold text-orange-600 mt-2">{formatCurrency(currentCalculation.unverifiedTotal)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-sm text-gray-500">手续费总额</div>
              <div className="text-xl font-bold text-gray-900 mt-2">{formatCurrency(currentCalculation.totalFee)}</div>
              <div className="text-xs text-gray-500 mt-1">
                客户 {formatCurrency(currentCalculation.customerFeeShare)} / 门店 {formatCurrency(currentCalculation.storeFeeShare)}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-sm text-gray-500">赠品总价值</div>
              <div className="text-xl font-bold text-gray-900 mt-2">{formatCurrency(currentCalculation.giftTotalValue)}</div>
              <div className="text-xs text-red-600 mt-1">扣回 {formatCurrency(currentCalculation.giftDeduction)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-sm text-gray-500">基础退款</div>
              <div className="text-xl font-bold text-[#165DFF] mt-2">{formatCurrency(currentCalculation.baseRefund)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-sm text-gray-500">最终退款金额</div>
              <div className="text-xl font-bold text-[#165DFF] mt-2">{formatCurrency(currentCalculation.finalRefund)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-2 border-[#165DFF] p-5">
              <div className="text-sm text-[#165DFF] font-medium">实际退款</div>
              <div className="text-2xl font-bold text-[#165DFF] mt-2">{formatCurrency(currentCalculation.actualRefund)}</div>
              <div className="text-xs text-gray-500 mt-1">已付款 {formatCurrency(currentCalculation.paidAmount)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">退款构成</h2>
              <div className="h-72">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={2}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    暂无数据
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">异常检测</h2>
                {anomalies.filter((a) => !a.isResolved).length > 0 && (
                  <span className="text-xs font-medium text-white bg-red-500 px-2 py-0.5 rounded-full">
                    {anomalies.filter((a) => !a.isResolved).length} 项
                  </span>
                )}
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {anomalies.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">暂无异常</div>
                ) : (
                  anomalies.map((a) => (
                    <div
                      key={a.id}
                      className={`p-3 rounded-lg border ${getSeverityBadgeClass(a.severity)} bg-opacity-20 transition-all ${
                        a.isResolved ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="shrink-0 mt-0.5">{getSeverityIcon(a.severity)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${getSeverityBadgeClass(a.severity)}`}>
                              {getSeverityText(a.severity)}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{a.title}</span>
                            {a.isResolved && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">
                                已处理
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{a.description}</p>
                          <p className="text-xs text-gray-500 mt-1">建议：{a.suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                onClick={handleRecalculate}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重新计算
              </button>
              <button
                onClick={handleSaveForApproval}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                保存审批
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[#165DFF] text-white hover:bg-[#0E42CC] transition-colors"
              >
                <Download className="w-4 h-4" />
                导出计算明细
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
