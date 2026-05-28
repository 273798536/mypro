import { useState } from 'react';
import { FileSpreadsheet, Download, BarChart3, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useCouponStore } from '../store/useCouponStore';
import { ArrivalRateChart } from '../components/charts/ArrivalRateChart';
import { formatAmount, formatAmountYi, formatPercent } from '../utils/amountUtils';
import { formatDateDisplay, getCurrentDate } from '../utils/dateUtils';
import * as XLSX from 'xlsx';

export const ExportPage = () => {
  const { getDashboardStats, couponPlans, verificationResults, positions, receipts } = useCouponStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const stats = getDashboardStats();

  const handleExportExcel = () => {
    setIsGenerating(true);
    setGenerateSuccess(false);

    setTimeout(() => {
      const wb = XLSX.utils.book_new();

      const summaryData = [
        ['债券票息核验报告'],
        [`生成日期: ${formatDateDisplay(getCurrentDate())}`],
        [],
        ['统计摘要'],
        ['指标', '数值'],
        ['应付息笔数', stats.totalPlans],
        ['应付息总金额', formatAmount(stats.totalAmount)],
        ['已到账笔数', stats.receivedCount],
        ['已到账金额', formatAmount(stats.receivedAmount)],
        ['待核验笔数', stats.pendingCount],
        ['异常笔数', stats.exceptionCount],
        ['到账率', formatPercent(stats.arrivalRate)],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, '摘要');

      const detailsData = [
        ['计划编号', '债券代码', '债券名称', '付息日', '计划金额', '实际金额', '差异', '状态', '原因'],
        ...verificationResults.map((r) => {
          const plan = couponPlans.find((p) => p.planId === r.planId);
          return [
            r.planId,
            plan?.bondCode || '',
            plan?.bondName || '',
            plan?.paymentDate || '',
            r.expectedAmount,
            r.actualAmount,
            r.diffAmount,
            r.statusLabel,
            r.reason,
          ];
        }),
      ];
      const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
      XLSX.utils.book_append_sheet(wb, wsDetails, '核验明细');

      const positionsData = [
        ['债券代码', '债券名称', '持仓面额', '账户'],
        ...positions.map((p) => [p.bondCode, p.bondName, p.positionAmount, p.account]),
      ];
      const wsPositions = XLSX.utils.aoa_to_sheet(positionsData);
      XLSX.utils.book_append_sheet(wb, wsPositions, '持仓明细');

      const receiptsData = [
        ['回单编号', '计划编号', '到账日期', '到账金额', '托管行'],
        ...receipts.map((r) => [r.receiptId, r.planId, r.actualDate, r.actualAmount, r.bankName]),
      ];
      const wsReceipts = XLSX.utils.aoa_to_sheet(receiptsData);
      XLSX.utils.book_append_sheet(wb, wsReceipts, '回单明细');

      XLSX.writeFile(wb, `债券票息核验报告_${getCurrentDate()}.xlsx`);

      setIsGenerating(false);
      setGenerateSuccess(true);
      setTimeout(() => setGenerateSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">报告导出</h1>
          <p className="text-gray-500">
            生成包含统计摘要、核验明细、持仓明细和回单明细的完整Excel报告。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">报告预览</h3>

              <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <FileSpreadsheet className="w-8 h-8" />
                    <div>
                      <h2 className="text-xl font-bold">债券票息核验报告</h2>
                      <p className="text-slate-400 text-sm">
                        Coupon Verification Report
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">
                    报告生成日期: {formatDateDisplay(getCurrentDate())}
                  </p>
                </div>

                <div className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">统计摘要</h4>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">应付息笔数</p>
                      <p className="text-lg font-bold text-gray-900">{stats.totalPlans} 笔</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">应付息总额</p>
                      <p className="text-lg font-bold text-gray-900">
                        ¥{formatAmountYi(stats.totalAmount)}
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-xs text-emerald-600">已到账</p>
                      <p className="text-lg font-bold text-emerald-700">
                        {stats.receivedCount} 笔 ({formatPercent(stats.arrivalRate)})
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-red-600">异常项</p>
                      <p className="text-lg font-bold text-red-700">{stats.exceptionCount} 笔</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">报告包含以下工作表</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BarChart3 className="w-4 h-4 text-blue-500" />
                        <span>摘要 - 核心指标统计概览</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <span>核验明细 - 每笔票息的详细核验结果</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span>持仓明细 - 债券持仓数据</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span>回单明细 - 托管行到账记录</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <ArrivalRateChart stats={stats} />

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">导出操作</h3>

              <button
                onClick={handleExportExcel}
                disabled={isGenerating || couponPlans.length === 0}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在生成报告...
                  </>
                ) : generateSuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    报告已下载
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    导出Excel报告
                  </>
                )}
              </button>

              {couponPlans.length === 0 && (
                <p className="text-xs text-amber-600 text-center">
                  请先导入数据后再导出报告
                </p>
              )}

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">图表说明</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>
                    <strong>到账率:</strong> 已到账笔数 / 当期所有票息计划总数
                  </li>
                  <li>
                    <strong>金额差异柱状图:</strong> 柱子高度与持仓面额正相关，越高表示持仓面额越大
                  </li>
                  <li>
                    <strong>时间分布:</strong> 辅助识别付息高峰时段，合理安排复核人力
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
