import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  FileSpreadsheet,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  ChevronLeft,
  RefreshCw,
  FileText,
} from 'lucide-react';
import OperationLog from '@/components/OperationLog';
import { useSplitStore } from '@/store/useSplitStore';
import { exportSplitReport } from '@/utils/excelHandler';
import type { ReportData, SplitResult, OperationLog as OperationLogType } from '@/types';

type TabType = 'overview' | 'unhandled' | 'adjusted' | 'confirm' | 'logs';

const tabLabels: Record<TabType, string> = {
  overview: '统计概览',
  unhandled: '未处理',
  adjusted: '已修正',
  confirm: '需人工确认',
  logs: '操作痕迹',
};

const tabIcons: Record<TabType, typeof FileText> = {
  overview: FileSpreadsheet,
  unhandled: Clock,
  adjusted: Edit3,
  confirm: AlertTriangle,
  logs: FileText,
};

export default function ReportPage() {
  const navigate = useNavigate();
  const {
    payments,
    splits,
    operationLogs,
    invoices,
  } = useSplitStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isExporting, setIsExporting] = useState(false);

  const reportData = useMemo<ReportData>(() => {
    const totalAmount = payments.reduce((sum, p) => sum + p.totalAmount, 0);
    const completedCount = payments.filter((p) => p.status === 'completed').length;
    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    const exceptionCount = payments.filter((p) => p.status === 'exception').length;

    const unhandledItems = splits.filter(
      (s) => s.status === 'normal' && !s.isDispute
    );

    const adjustedItemIds = new Set(
      operationLogs
        .filter((l) => l.action === 'adjust' && l.targetType === 'split')
        .map((l) => l.targetId)
    );

    const adjustedItems: { split: SplitResult; logs: OperationLogType[] }[] = [];
    adjustedItemIds.forEach((id) => {
      const split = splits.find((s) => s.id === id);
      if (split) {
        const logs = operationLogs.filter(
          (l) => l.targetId === id && l.targetType === 'split'
        );
        adjustedItems.push({ split, logs });
      }
    });

    const needConfirmItems = splits.filter(
      (s) => s.status === 'pending_confirm' || s.isDispute
    );

    return {
      summary: {
        totalPayments: payments.length,
        totalAmount,
        completedCount,
        pendingCount,
        exceptionCount,
        needConfirmCount: needConfirmItems.length,
        adjustedCount: adjustedItems.length,
        disputedCount: splits.filter((s) => s.isDispute).length,
      },
      unhandledItems,
      adjustedItems,
      needConfirmItems,
      operationLogs,
    };
  }, [payments, splits, operationLogs]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      exportSplitReport(reportData, splits, payments, operationLogs);
    } finally {
      setIsExporting(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">回款总数</span>
            <FileSpreadsheet className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {reportData.summary.totalPayments}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            总额 ¥{reportData.summary.totalAmount.toLocaleString('zh-CN')}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-green-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-green-600">已完成</span>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-700">
            {reportData.summary.completedCount}
          </p>
          <p className="text-xs text-green-500 mt-1">
            {reportData.summary.totalPayments > 0
              ? `${((reportData.summary.completedCount / reportData.summary.totalPayments) * 100).toFixed(1)}%`
              : '0%'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-amber-600">待处理</span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-700">
            {reportData.summary.pendingCount}
          </p>
          <p className="text-xs text-amber-500 mt-1">
            需人工确认 {reportData.summary.needConfirmCount} 项
          </p>
        </div>

        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-red-600">异常</span>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-700">
            {reportData.summary.exceptionCount}
          </p>
          <p className="text-xs text-red-500 mt-1">
            含争议 {reportData.summary.disputedCount} 项
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="font-semibold text-slate-800 mb-4">快速统计</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">已修正项</span>
              <span className="font-medium text-blue-600">
                {reportData.summary.adjustedCount} 项
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">争议发票</span>
              <span className="font-medium text-red-600">
                {reportData.summary.disputedCount} 张
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">操作记录</span>
              <span className="font-medium text-slate-700">
                {reportData.operationLogs.length} 条
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="font-semibold text-slate-800 mb-4">报告说明</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-1.5 flex-shrink-0" />
              <span>未处理：系统自动拆分完成，等待人工确认</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-1.5 flex-shrink-0" />
              <span>已修正：人工调整过的拆分项，保留完整修改痕迹</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-1.5 flex-shrink-0" />
              <span>需人工确认：争议发票或金额不匹配，需专员处理</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderSplitList = (items: SplitResult[], title: string) => (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h4 className="font-semibold text-slate-800">
          {title} ({items.length})
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-slate-500 font-medium">发票号</th>
              <th className="px-4 py-3 text-left text-slate-500 font-medium">卖方</th>
              <th className="px-4 py-3 text-right text-slate-500 font-medium">拆分金额</th>
              <th className="px-4 py-3 text-right text-slate-500 font-medium">手续费</th>
              <th className="px-4 py-3 text-right text-slate-500 font-medium">实际到账</th>
              <th className="px-4 py-3 text-center text-slate-500 font-medium">来源</th>
              <th className="px-4 py-3 text-center text-slate-500 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((split) => (
              <tr key={split.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-slate-700">{split.invoiceNo}</td>
                <td className="px-4 py-3 text-slate-700">{split.sellerName}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">
                  ¥{split.splitAmount.toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-right text-amber-600">
                  ¥{split.feeAmount.toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-right text-green-600 font-medium">
                  ¥{split.actualAmount.toLocaleString('zh-CN')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                    {split.source}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      split.isDispute
                        ? 'bg-red-100 text-red-700'
                        : split.status === 'adjusted'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {split.isDispute ? '争议' : split.status === 'adjusted' ? '已修正' : '正常'}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAdjustedList = () => (
    <div className="space-y-4">
      {reportData.adjustedItems.map(({ split, logs }) => (
        <div key={split.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-blue-50/50">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-sm font-medium text-slate-800">
                  {split.invoiceNo}
                </span>
                <span className="ml-3 text-sm text-slate-600">{split.sellerName}</span>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                已修正
              </span>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">拆分金额</p>
                <p className="text-lg font-semibold text-slate-800">
                  ¥{split.splitAmount.toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">手续费</p>
                <p className="text-lg font-semibold text-amber-600">
                  ¥{split.feeAmount.toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">实际到账</p>
                <p className="text-lg font-semibold text-green-600">
                  ¥{split.actualAmount.toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">修改记录</p>
              <OperationLog logs={logs} maxItems={5} />
            </div>
          </div>
        </div>
      ))}
      {reportData.adjustedItems.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
          <Edit3 className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">暂无已修正项</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/workspace')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  保理回款拆分系统
                </h1>
                <p className="text-sm text-slate-500">拆分报告</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">步骤 3/3</span>
                <div className="flex gap-1">
                  <div className="w-8 h-2 rounded-full bg-slate-700" />
                  <div className="w-8 h-2 rounded-full bg-slate-700" />
                  <div className="w-8 h-2 rounded-full bg-slate-700" />
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    导出报告
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
          {(Object.keys(tabLabels) as TabType[]).map((tab) => {
            const Icon = tabIcons[tab];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tabLabels[tab]}
              </button>
            );
          })}
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'unhandled' &&
            renderSplitList(reportData.unhandledItems, '未处理项')}
          {activeTab === 'adjusted' && renderAdjustedList()}
          {activeTab === 'confirm' &&
            renderSplitList(reportData.needConfirmItems, '需人工确认')}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-semibold text-slate-800 mb-4">操作痕迹</h4>
              <OperationLog logs={operationLogs} maxItems={50} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
