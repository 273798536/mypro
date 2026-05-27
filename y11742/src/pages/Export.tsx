import { useMemo, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  CheckCircle,
  FileCheck,
  Receipt,
  ChevronDown,
  ChevronUp,
  X,
  FileDown,
  History,
  Filter,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/calculationEngine';
import {
  exportRefundExcel,
  exportSettlementExcel,
  exportCalculationBreakdown,
  generateRefundDocument,
  generateSettlementDocument,
} from '../utils/exportUtils';
import * as XLSX from 'xlsx';
import type { RefundRequest } from '../types';

type ExportType = 'refund' | 'settlement' | 'breakdown';

interface ExportHistoryItem {
  id: string;
  type: ExportType;
  requestId: string;
  exportTime: number;
  fileName: string;
}

const EXPORT_TYPE_LABEL: Record<ExportType, string> = {
  refund: '退款单',
  settlement: '结算单',
  breakdown: '计算明细',
};

const EXPORT_TYPE_ICON: Record<ExportType, React.ReactNode> = {
  refund: <FileText className="w-5 h-5" />,
  settlement: <FileCheck className="w-5 h-5" />,
  breakdown: <FileSpreadsheet className="w-5 h-5" />,
};

const EXPORT_TYPE_COLOR: Record<ExportType, string> = {
  refund: 'text-[#165DFF] bg-[#165DFF]/10',
  settlement: 'text-green-600 bg-green-100',
  breakdown: 'text-orange-500 bg-orange-100',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  calculating: '计算中',
  pending_approval: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  completed: '已完成',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  calculating: 'bg-blue-100 text-blue-700',
  pending_approval: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

export default function Export() {
  const refundRequests = useStore((s) => s.refundRequests);
  const settlements = useStore((s) => s.settlements);
  const contracts = useStore((s) => s.contracts);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    refundRequests.length > 0 ? refundRequests[0].id : null
  );
  const [requestDropdownOpen, setRequestDropdownOpen] = useState(false);
  const [previewType, setPreviewType] = useState<ExportType | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);

  const selectedRequest = useMemo(
    () => refundRequests.find((r) => r.id === selectedRequestId) || null,
    [refundRequests, selectedRequestId]
  );

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedRequest?.contractId) || selectedRequest?.contract || null,
    [contracts, selectedRequest]
  );

  const relatedSettlement = useMemo(
    () => settlements.find((s) => s.refundRequestId === selectedRequestId) || null,
    [settlements, selectedRequestId]
  );

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRequestDropdownOpen(false);
  };

  const handlePreview = (type: ExportType) => {
    setPreviewType(type);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewType(null);
  };

  const addToHistory = (type: ExportType, fileName: string) => {
    const item: ExportHistoryItem = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      requestId: selectedRequestId || '',
      exportTime: Date.now(),
      fileName,
    };
    setExportHistory((prev) => [item, ...prev]);
  };

  const handleExport = (type: ExportType) => {
    if (!selectedRequest || !selectedContract) return;

    if (type === 'refund') {
      exportRefundExcel(selectedRequest);
      addToHistory('refund', `退款单_${selectedRequest.id}.xlsx`);
    } else if (type === 'settlement') {
      const settlementNo = relatedSettlement?.settlementNo || `JS${Date.now()}`;
      exportSettlementExcel(selectedRequest, settlementNo);
      addToHistory('settlement', `结算单_${settlementNo}.xlsx`);
    } else {
      exportCalculationBreakdown(selectedContract, selectedRequest.calculation);
      addToHistory('breakdown', `计算明细_${selectedContract.contractNo}.xlsx`);
    }
  };

  const handleQuickExport = (type: ExportType) => {
    handleExport(type);
  };

  const handleDownloadHistory = (item: ExportHistoryItem) => {
    const request = refundRequests.find((r) => r.id === item.requestId);
    if (!request) return;
    const contract = contracts.find((c) => c.id === request.contractId) || request.contract;
    if (!contract) return;

    if (item.type === 'refund') {
      exportRefundExcel(request);
    } else if (item.type === 'settlement') {
      const settlementNo = settlements.find((s) => s.refundRequestId === request.id)?.settlementNo || `JS${Date.now()}`;
      exportSettlementExcel(request, settlementNo);
    } else {
      exportCalculationBreakdown(contract, request.calculation);
    }
  };

  const getPreviewData = (): Record<string, unknown>[] => {
    if (!selectedRequest || !selectedContract || !previewType) return [];

    if (previewType === 'refund') {
      return generateRefundDocument(selectedRequest);
    }
    if (previewType === 'settlement') {
      const settlementNo = relatedSettlement?.settlementNo || `JS${Date.now()}`;
      return generateSettlementDocument(selectedRequest, settlementNo);
    }
    const calc = selectedRequest.calculation;
    return [
      { '项目': '合同总金额', '金额': calc.contractTotal, '说明': '合同约定的总金额' },
      { '项目': '已核销项目', '金额': calc.verifiedTotal, '说明': '客户已完成并确认的项目' },
      { '项目': '未核销项目', '金额': calc.unverifiedTotal, '说明': '待确认的项目' },
      { '项目': '手续费总额', '金额': calc.totalFee, '说明': '分期产生的全部手续费' },
      { '项目': '客户承担手续费', '金额': calc.customerFeeShare, '说明': '按约定客户需承担的部分' },
      { '项目': '门店承担手续费', '金额': calc.storeFeeShare, '说明': '按约定门店需承担的部分' },
      { '项目': '赠品总价值', '金额': calc.giftTotalValue, '说明': '赠送项目的总价值' },
      { '项目': '已归还赠品价值', '金额': calc.giftReturnedValue, '说明': '客户已退回的赠品' },
      { '项目': '赠品扣回金额', '金额': calc.giftDeduction, '说明': '未归还赠品需扣回的金额' },
      { '项目': '基础退款', '金额': calc.baseRefund, '说明': '合同金额 - 已核销金额' },
      { '项目': '手续费扣减', '金额': calc.feeDeduction, '说明': '客户需承担的手续费' },
      { '项目': '最终应退金额', '金额': calc.finalRefund, '说明': '计算得出的退款金额' },
      { '项目': '客户已付款', '金额': calc.paidAmount, '说明': '客户实际已支付的金额' },
      { '项目': '实际退款金额', '金额': calc.actualRefund, '说明': '最终应退与已付款的较小值' },
    ];
  };

  const previewColumns = useMemo(() => {
    if (!previewType) return [];
    if (previewType === 'breakdown') return ['项目', '金额', '说明'];
    return ['项目', '内容', '金额'];
  }, [previewType]);

  const totalExportCount = refundRequests.length;
  const completedExportCount = refundRequests.filter((r) => r.status === 'completed').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">单据导出</h1>
          <p className="text-sm text-gray-500 mt-1">医疗美容退款单据导出与历史记录</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{totalExportCount}</p>
            <p className="text-xs text-gray-500">可导出申请</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">{completedExportCount}</p>
            <p className="text-xs text-gray-500">已完成退款</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择退款申请</label>
        <div className="relative max-w-lg">
          <button
            onClick={() => setRequestDropdownOpen(!requestDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg bg-white hover:border-[#165DFF] transition-colors"
          >
            <span className={selectedRequest ? 'text-gray-900' : 'text-gray-400'}>
              {selectedRequest
                ? `${selectedRequest.id} - ${selectedContract?.customerName || '未知客户'} (${selectedContract?.contractNo || ''})`
                : '请选择退款申请'}
            </span>
            {requestDropdownOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {requestDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {refundRequests.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">暂无退款申请</div>
              ) : (
                refundRequests.map((r) => {
                  const contract = contracts.find((c) => c.id === r.contractId) || r.contract;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleSelectRequest(r.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                        r.id === selectedRequestId ? 'bg-[#165DFF]/5 text-[#165DFF]' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {contract?.customerName} · {contract?.contractNo} · {formatCurrency(r.calculation.actualRefund)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {!selectedRequest || !selectedContract ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">请先选择一份退款申请以开始导出</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">合同信息摘要</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">合同编号</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{selectedContract.contractNo}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">客户姓名</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{selectedContract.customerName}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">合同金额</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(selectedContract.totalAmount)}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">申请状态</p>
                <p className="text-sm font-semibold mt-1">
                  <span className={`px-2 py-0.5 rounded ${STATUS_COLOR[selectedRequest.status]}`}>
                    {STATUS_LABEL[selectedRequest.status]}
                  </span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="p-3 rounded-lg bg-[#165DFF]/5">
                <p className="text-xs text-gray-500">已核销金额</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(selectedRequest.calculation.verifiedTotal)}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50">
                <p className="text-xs text-gray-500">赠品扣回</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(selectedRequest.calculation.giftDeduction)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <p className="text-xs text-gray-500">最终应退</p>
                <p className="text-sm font-semibold text-[#165DFF] mt-1">{formatCurrency(selectedRequest.calculation.finalRefund)}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#165DFF]/10 border border-[#165DFF]/20">
                <p className="text-xs text-[#165DFF] font-medium">实际退款</p>
                <p className="text-sm font-bold text-[#165DFF] mt-1">{formatCurrency(selectedRequest.calculation.actualRefund)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-[#165DFF] transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-lg ${EXPORT_TYPE_COLOR.refund}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">退款单</h3>
                  <p className="text-xs text-gray-500">退款明细与金额汇总</p>
                </div>
              </div>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">退款单号</span>
                  <span className="font-medium text-gray-900">{selectedRequest.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">最终退款</span>
                  <span className="font-semibold text-[#165DFF]">{formatCurrency(selectedRequest.calculation.finalRefund)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">实际退款</span>
                  <span className="font-bold text-[#165DFF]">{formatCurrency(selectedRequest.calculation.actualRefund)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview('refund')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  预览
                </button>
                <button
                  onClick={() => handleQuickExport('refund')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#165DFF] text-white hover:bg-[#0E42CC] transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-green-400 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-lg ${EXPORT_TYPE_COLOR.settlement}`}>
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">结算单</h3>
                  <p className="text-xs text-gray-500">退款结算凭证</p>
                </div>
              </div>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">结算单号</span>
                  <span className="font-medium text-gray-900">{relatedSettlement?.settlementNo || '待生成'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">已消费金额</span>
                  <span className="font-semibold text-green-600">{formatCurrency(selectedRequest.calculation.verifiedTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">实际退款</span>
                  <span className="font-bold text-green-600">{formatCurrency(selectedRequest.calculation.actualRefund)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview('settlement')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  预览
                </button>
                <button
                  onClick={() => handleQuickExport('settlement')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-orange-400 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-lg ${EXPORT_TYPE_COLOR.breakdown}`}>
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">计算明细</h3>
                  <p className="text-xs text-gray-500">完整计算过程明细</p>
                </div>
              </div>
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">项目数</span>
                  <span className="font-medium text-gray-900">14 项明细</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">基础退款</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(selectedRequest.calculation.baseRefund)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">含手续费</span>
                  <span className="font-medium text-gray-900">{formatCurrency(selectedRequest.calculation.customerFeeShare)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview('breakdown')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  预览
                </button>
                <button
                  onClick={() => handleQuickExport('breakdown')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport('refund')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg bg-[#165DFF] text-white hover:bg-[#0E42CC] transition-colors shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              导出退款单
            </button>
            <button
              onClick={() => handleExport('settlement')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
            >
              <Receipt className="w-4 h-4" />
              导出结算单
            </button>
            <button
              onClick={() => handleExport('breakdown')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              导出计算明细
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">导出历史</h2>
              <span className="text-xs text-gray-400">({exportHistory.length} 条记录)</span>
            </div>
            {exportHistory.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无导出记录</p>
                <p className="text-xs mt-1">完成导出后，记录将显示在这里</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 font-medium text-gray-500">单据类型</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500">申请编号</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500">导出时间</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-500">文件名</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportHistory.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${EXPORT_TYPE_COLOR[item.type]}`}>
                            {EXPORT_TYPE_ICON[item.type]}
                            {EXPORT_TYPE_LABEL[item.type]}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-gray-900">{item.requestId}</td>
                        <td className="py-3 px-3 text-gray-600">{formatDate(item.exportTime)}</td>
                        <td className="py-3 px-3 text-gray-600">{item.fileName}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleDownloadHistory(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            下载
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showPreview && previewType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClosePreview} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${EXPORT_TYPE_COLOR[previewType]}`}>
                  {EXPORT_TYPE_ICON[previewType]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {EXPORT_TYPE_LABEL[previewType]}预览
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedRequest?.id} · {selectedContract?.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClosePreview}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    {previewColumns.map((col) => (
                      <th key={col} className="text-left py-3 px-4 font-semibold text-gray-700 border-b border-gray-200">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getPreviewData().map((row, idx) => (
                    <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-[#165DFF]/5 transition-colors`}>
                      {previewColumns.map((col) => (
                        <td key={col} className="py-2.5 px-4 text-gray-700 border-b border-gray-100">
                          {col === '金额' && typeof row[col] === 'number' && row[col] !== 0
                            ? formatCurrency(row[col] as number)
                            : String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={handleClosePreview}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  if (previewType) {
                    handleExport(previewType);
                    handleClosePreview();
                  }
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white transition-colors ${
                  previewType === 'refund'
                    ? 'bg-[#165DFF] hover:bg-[#0E42CC]'
                    : previewType === 'settlement'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
