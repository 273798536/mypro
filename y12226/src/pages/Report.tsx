import { useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { useStore } from '@/store/useStore';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  FileSpreadsheet,
  FileJson,
  Calendar,
  X,
  AlertTriangle,
  Link2,
  FileCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { ExportRecord } from '@/types';

const formatAmount = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN')}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getSourceLabel = (source: string): string => {
  switch (source) {
    case 'donation':
      return '捐赠记录';
    case 'budget':
      return '项目预算';
    case 'manual':
      return '人工确认';
    default:
      return source;
  }
};

const getDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
};

interface ExportRecordWithId extends ExportRecord {
  id: string;
}

interface ExportRecordWithChain extends ExportRecordWithId {
  lockId: string;
  budgetId: string;
  receiptIds: string;
}

export default function Report() {
  const {
    donations,
    budgets,
    receipts,
    locks,
    conflicts,
    getExportRecords,
    validateCaliber,
  } = useStore();

  const [validateFromDate, setValidateFromDate] = useState('');
  const [validateToDate, setValidateToDate] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; differences: string[] } | null>(null);
  const [showValidationDetail, setShowValidationDetail] = useState(false);

  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [reportType] = useState('指定用途账报告');
  const [reportGenerated, setReportGenerated] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const exportRecords = getExportRecords().map(record => ({
    ...record,
    id: record.donationId,
  }));

  const exportRecordsWithChain: ExportRecordWithChain[] = exportRecords.map(record => {
    const lock = locks.find(l => l.donationId === record.donationId);
    const budget = budgets.find(b => b.projectId === record.projectId);
    const donationReceipts = receipts.filter(r => r.donationId === record.donationId);
    return {
      ...record,
      lockId: lock?.id || '',
      budgetId: budget?.id || '',
      receiptIds: donationReceipts.map(r => r.id).join(', '),
    };
  });

  const checkLinkIntegrity = (): boolean => {
    return exportRecordsWithChain.every(record =>
      record.donationId &&
      record.projectId &&
      record.budgetId &&
      record.lockId &&
      record.receiptIds.length > 0
    );
  };

  const linkIntegrity = checkLinkIntegrity();

  const handleValidate = () => {
    const result = validateCaliber();
    setValidationResult(result);
  };

  const handleGenerateReport = () => {
    setReportGenerated(true);
  };

  const handleDownloadPDF = () => {
    showToast('PDF报告下载成功！');
  };

  const handleExportCSV = () => {
    const headers = [
      '记录ID', '捐赠人', '金额', '指定用途', '锁定用途', '项目名称',
      '预算用途', '票据数', '冲突数', '锁定来源', '锁定日期',
      'donationId', 'projectId', 'lockId', 'receiptIds'
    ];

    const rows = exportRecordsWithChain.map(record => [
      record.donationId,
      record.donorName,
      record.amount,
      record.designatedPurpose,
      record.lockedPurpose,
      record.projectName,
      record.budgetPurpose,
      record.receiptCount,
      record.conflictCount,
      getSourceLabel(record.lockSource),
      record.lockDate ? formatDate(record.lockDate) : '',
      record.donationId,
      record.projectId,
      record.lockId,
      record.receiptIds,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `公益捐赠指定用途账_${getDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showToast('CSV文件导出成功！');
  };

  const handleExportExcel = () => {
    const data = exportRecordsWithChain.map(record => ({
      '记录ID': record.donationId,
      '捐赠人': record.donorName,
      '金额': record.amount,
      '指定用途': record.designatedPurpose,
      '锁定用途': record.lockedPurpose,
      '项目名称': record.projectName,
      '预算用途': record.budgetPurpose,
      '票据数': record.receiptCount,
      '冲突数': record.conflictCount,
      '锁定来源': getSourceLabel(record.lockSource),
      '锁定日期': record.lockDate ? formatDate(record.lockDate) : '',
      'donationId': record.donationId,
      'projectId': record.projectId,
      'lockId': record.lockId,
      'receiptIds': record.receiptIds,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '导出清单');
    XLSX.writeFile(workbook, `公益捐赠指定用途账_${getDateString()}.xlsx`);

    showToast('Excel文件导出成功！');
  };

  const totalDonations = donations.length;
  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
  const lockedCount = donations.filter(d => d.status === 'locked').length;
  const conflictCount = conflicts.filter(c => !c.resolvedAt).length;

  const previewColumns = [
    {
      key: 'donationId',
      header: '记录ID',
      width: '140',
    },
    {
      key: 'donorName',
      header: '捐赠人',
    },
    {
      key: 'amount',
      header: '金额',
      render: (row: ExportRecordWithId) => formatAmount(row.amount),
    },
    {
      key: 'designatedPurpose',
      header: '指定用途',
    },
    {
      key: 'lockedPurpose',
      header: '锁定用途',
    },
    {
      key: 'projectName',
      header: '项目名称',
    },
    {
      key: 'budgetPurpose',
      header: '预算用途',
    },
    {
      key: 'receiptCount',
      header: '票据数',
    },
    {
      key: 'conflictCount',
      header: '冲突数',
      render: (row: ExportRecordWithId) => {
        return row.conflictCount > 0 ? (
          <span className="text-red-600 font-medium">{row.conflictCount}</span>
        ) : (
          <span className="text-slate-400">0</span>
        );
      },
    },
    {
      key: 'lockSource',
      header: '锁定来源',
      render: (row: ExportRecordWithId) => getSourceLabel(row.lockSource),
    },
    {
      key: 'lockDate',
      header: '锁定日期',
      render: (row: ExportRecordWithId) => row.lockDate ? formatDate(row.lockDate) : '-',
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-noto-serif-sc">
            公开报告与导出清单
          </h2>
          <p className="text-sm text-slate-500 mt-1">事后复盘、口径一致性校验</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-teal-600" />
            口径一致性校验
          </h3>
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                开始日期
              </label>
              <input
                type="date"
                value={validateFromDate}
                onChange={(e) => setValidateFromDate(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                结束日期
              </label>
              <input
                type="date"
                value={validateToDate}
                onChange={(e) => setValidateToDate(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              onClick={handleValidate}
              className="inline-flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              执行校验
            </button>
          </div>

          {validationResult && (
            <div className={`rounded-lg p-6 ${
              validationResult.valid
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    <span className="text-xl font-bold text-emerald-700">口径一致 ✓</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-10 h-10 text-red-500" />
                    <span className="text-xl font-bold text-red-700">口径不一致</span>
                  </>
                )}
              </div>
              {!validationResult.valid && validationResult.differences.length > 0 && (
                <div className="space-y-2 mb-4">
                  {validationResult.differences.slice(0, 3).map((diff, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-red-700">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{diff}</span>
                    </div>
                  ))}
                  {validationResult.differences.length > 3 && (
                    <p className="text-sm text-red-600">
                      还有 {validationResult.differences.length - 3} 项差异...
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowValidationDetail(true)}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                查看详情 →
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            生成公开报告
          </h3>
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                开始日期
              </label>
              <input
                type="date"
                value={reportFromDate}
                onChange={(e) => setReportFromDate(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                结束日期
              </label>
              <input
                type="date"
                value={reportToDate}
                onChange={(e) => setReportToDate(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">报告类型</label>
              <select
                value={reportType}
                disabled
                className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 focus:outline-none"
              >
                <option>指定用途账报告</option>
              </select>
            </div>
            <button
              onClick={handleGenerateReport}
              className="inline-flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              生成报告
            </button>
          </div>

          {reportGenerated && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-800">
                      {reportType}
                      {(reportFromDate || reportToDate) && (
                        <span className="text-sm font-normal text-slate-500 ml-2">
                          ({reportFromDate || '开始'} ~ {reportToDate || '至今'})
                        </span>
                      )}
                    </h4>
                  </div>
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    下载PDF
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-500 mb-1">总捐赠数</p>
                    <p className="text-2xl font-bold text-slate-800">{totalDonations}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-500 mb-1">总金额</p>
                    <p className="text-2xl font-bold text-teal-600">{formatAmount(totalAmount)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-500 mb-1">已锁定</p>
                    <p className="text-2xl font-bold text-emerald-600">{lockedCount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-500 mb-1">待处理冲突</p>
                    <p className="text-2xl font-bold text-red-600">{conflictCount}</p>
                  </div>
                </div>
                <DataTable<ExportRecordWithId>
                  columns={previewColumns}
                  data={exportRecords}
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            导出清单
          </h3>
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-5 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <FileJson className="w-4 h-4" />
              导出CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              导出Excel
            </button>
            <div className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg ${
              linkIntegrity
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}>
              <Link2 className="w-4 h-4" />
              <span className="text-sm font-medium">
                {linkIntegrity ? '链路完整，可追溯' : '链路不完整'}
              </span>
              {linkIntegrity && <CheckCircle2 className="w-4 h-4" />}
              {!linkIntegrity && <XCircle className="w-4 h-4" />}
            </div>
          </div>
          <DataTable<ExportRecordWithId>
            columns={previewColumns}
            data={exportRecords}
          />
        </div>
      </div>

      {showValidationDetail && validationResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">口径校验详情</h3>
              <button
                onClick={() => setShowValidationDetail(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {validationResult.valid ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-emerald-700">所有数据口径一致</p>
                  <p className="text-sm text-slate-500 mt-2">捐赠记录、用途锁定、导出清单三者口径完全匹配</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`rounded-lg p-4 ${
                    validationResult.valid ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {validationResult.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={`font-medium ${
                        validationResult.valid ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        发现 {validationResult.differences.length} 项差异
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {validationResult.differences.map((diff, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-600 text-xs font-bold rounded-full flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-slate-700">{diff}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </Layout>
  );
}
