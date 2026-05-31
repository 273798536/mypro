import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, BarChart3, PieChart, Calendar, Download, Filter, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/calculator';
import StatusBadge from '../components/StatusBadge';

const ReportsCenter: React.FC = () => {
  const { rebookRecords, loadRebookRecords, tickets, loadTickets } = useStore();
  const [reportType, setReportType] = useState<'summary' | 'detail' | 'anomaly'>('summary');
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD'),
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadRebookRecords();
    loadTickets();
  }, [loadRebookRecords, loadTickets]);

  const filteredRecords = rebookRecords.filter(r => {
    const created = dayjs(r.createdAt);
    return created.isAfter(dayjs(dateRange.start).subtract(1, 'day')) &&
           created.isBefore(dayjs(dateRange.end).add(1, 'day'));
  });

  const approvedRecords = filteredRecords.filter(r => r.status === 'approved' || r.status === 'settled');
  const totalAmount = approvedRecords.reduce((sum, r) => sum + r.totalDifference, 0);
  const totalAnomalies = filteredRecords.reduce((sum, r) => sum + r.anomalies.length, 0);

  const anomalyStats = {
    cabinChange: filteredRecords.reduce((sum, r) => sum + r.anomalies.filter(a => a.type === 'cabin_change').length, 0),
    crossCountry: filteredRecords.reduce((sum, r) => sum + r.anomalies.filter(a => a.type === 'cross_country_tax').length, 0),
    mileage: filteredRecords.reduce((sum, r) => sum + r.anomalies.filter(a => a.type === 'mileage_refund').length, 0),
  };

  const exportToExcel = async () => {
    setIsExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = '航司联程改签差价系统';
      workbook.created = new Date();

      if (reportType === 'summary' || reportType === 'detail') {
        const summarySheet = workbook.addWorksheet('差价汇总');
        summarySheet.columns = [
          { header: '订单号', key: 'orderNo', width: 18 },
          { header: '创建人', key: 'createdBy', width: 12 },
          { header: '状态', key: 'status', width: 10 },
          { header: '舱位差价', key: 'fareDiff', width: 14 },
          { header: '税费差价', key: 'taxDiff', width: 14 },
          { header: '里程调整', key: 'mileageDiff', width: 14 },
          { header: '总差价', key: 'totalDiff', width: 14 },
          { header: '异常数', key: 'anomalyCount', width: 8 },
          { header: '创建时间', key: 'createdAt', width: 20 },
        ];

        summarySheet.getRow(1).font = { bold: true, size: 12 };
        summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };

        filteredRecords.forEach(record => {
          summarySheet.addRow({
            orderNo: record.orderNo,
            createdBy: record.createdBy,
            status: getStatusText(record.status),
            fareDiff: record.fareDifference,
            taxDiff: record.taxDifference,
            mileageDiff: record.mileageRefund,
            totalDiff: record.totalDifference,
            anomalyCount: record.anomalies.length,
            createdAt: dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          });
        });
      }

      if (reportType === 'detail' || reportType === 'anomaly') {
        const detailSheet = workbook.addWorksheet('计算明细');
        detailSheet.columns = [
          { header: '订单号', key: 'orderNo', width: 18 },
          { header: '项目', key: 'item', width: 30 },
          { header: '原金额', key: 'originalAmount', width: 14 },
          { header: '新金额', key: 'newAmount', width: 14 },
          { header: '差额', key: 'difference', width: 14 },
          { header: '备注', key: 'remark', width: 30 },
        ];

        detailSheet.getRow(1).font = { bold: true, size: 12 };
        detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };

        filteredRecords.forEach(record => {
          record.calculationDetails.forEach(detail => {
            detailSheet.addRow({
              orderNo: record.orderNo,
              item: detail.item,
              originalAmount: detail.originalAmount,
              newAmount: detail.newAmount,
              difference: detail.difference,
              remark: detail.remark,
            });
          });
        });
      }

      if (reportType === 'anomaly') {
        const anomalySheet = workbook.addWorksheet('异常分析');
        anomalySheet.columns = [
          { header: '订单号', key: 'orderNo', width: 18 },
          { header: '异常类型', key: 'type', width: 15 },
          { header: '严重程度', key: 'severity', width: 10 },
          { header: '描述', key: 'description', width: 40 },
          { header: '影响结果', key: 'affected', width: 25 },
          { header: '金额影响', key: 'amountImpact', width: 14 },
          { header: '规则依据', key: 'ruleBasis', width: 25 },
        ];

        anomalySheet.getRow(1).font = { bold: true, size: 12 };
        anomalySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8A8' } };

        filteredRecords.forEach(record => {
          record.anomalies.forEach(anomaly => {
            anomalySheet.addRow({
              orderNo: record.orderNo,
              type: getAnomalyTypeText(anomaly.type),
              severity: anomaly.severity === 'error' ? '错误' : '警告',
              description: anomaly.description,
              affected: anomaly.affectedResults.join('、'),
              amountImpact: anomaly.amountImpact,
              ruleBasis: anomaly.ruleBasis,
            });
          });
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `改签差价报表_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      link.click();
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusText = (status: string): string => {
    const map: Record<string, string> = {
      draft: '草稿',
      pending: '待复核',
      approved: '已通过',
      rejected: '已驳回',
      settled: '已结算',
    };
    return map[status] || status;
  };

  const getAnomalyTypeText = (type: string): string => {
    const map: Record<string, string> = {
      cabin_change: '舱位变更',
      cross_country_tax: '跨国税费',
      mileage_refund: '里程调整',
    };
    return map[type] || type;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary-600" />
            报表中心
          </h1>
          <p className="text-slate-500 mt-1">生成和导出改签差价相关的各类报表</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">记录总数</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{filteredRecords.length}</div>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">已通过/已结算</div>
                <div className="text-2xl font-bold text-accent-green-600 mt-1">{approvedRecords.length}</div>
              </div>
              <div className="w-12 h-12 bg-accent-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent-green-600" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">差价总金额</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalAmount)}</div>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <PieChart className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">异常项总数</div>
                <div className="text-2xl font-bold text-accent-amber-600 mt-1">{totalAnomalies}</div>
              </div>
              <div className="w-12 h-12 bg-accent-amber-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-accent-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                报表配置
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="label">报表类型</label>
                  <div className="space-y-2">
                    {[
                      { value: 'summary', label: '差价汇总表', icon: FileSpreadsheet },
                      { value: 'detail', label: '计算明细表', icon: FileText },
                      { value: 'anomaly', label: '异常分析表', icon: AlertTriangle },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setReportType(opt.value as any)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          reportType === opt.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <opt.icon className="w-5 h-5" />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">日期范围</label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="input"
                    />
                    <div className="text-center text-slate-400 text-sm">至</div>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>

                <button
                  onClick={exportToExcel}
                  disabled={isExporting || filteredRecords.length === 0}
                  className="w-full btn btn-primary gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? '导出中...' : '导出 Excel 报表'}
                </button>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-4">异常类型分布</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">舱位变更</span>
                    <span className="text-slate-800 font-medium">{anomalyStats.cabinChange}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalAnomalies > 0 ? (anomalyStats.cabinChange / totalAnomalies) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">跨国税费</span>
                    <span className="text-slate-800 font-medium">{anomalyStats.crossCountry}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalAnomalies > 0 ? (anomalyStats.crossCountry / totalAnomalies) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">里程调整</span>
                    <span className="text-slate-800 font-medium">{anomalyStats.mileage}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${totalAnomalies > 0 ? (anomalyStats.mileage / totalAnomalies) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-4">报表预览 - 最近记录</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-3 py-2 font-medium text-slate-600">订单号</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">状态</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">舱位差价</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">税费差价</th>
                      <th className="text-right px-3 py-2 font-medium text-slate-600">总差价</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">异常</th>
                      <th className="text-left px-3 py-2 font-medium text-slate-600">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.slice(0, 10).map(record => (
                      <tr key={record.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-3 font-medium text-slate-800">{record.orderNo}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={record.status} size="sm" />
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {record.fareDifference >= 0 ? '+' : ''}{formatCurrency(record.fareDifference)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {record.taxDifference >= 0 ? '+' : ''}{formatCurrency(record.taxDifference)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-medium">
                          {record.totalDifference >= 0 ? '+' : ''}{formatCurrency(record.totalDifference)}
                        </td>
                        <td className="px-3 py-3">
                          {record.anomalies.length > 0 ? (
                            <span className="px-2 py-1 text-xs bg-accent-amber-100 text-accent-amber-700 rounded-full">
                              {record.anomalies.length} 项
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {dayjs(record.createdAt).format('MM-DD HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRecords.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  该时间段内没有改签记录
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsCenter;
