import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Download,
  Filter,
  Music,
  DollarSign,
  Wrench,
  XCircle,
  Check,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { DiscrepancyAlert } from '../../shared/types';

const alertTypeMap = {
  DEPOSIT_MISMATCH: { label: '押金误扣', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: DollarSign },
  INSTRUMENT_CHANGE: { label: '乐器换号', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Music },
  REPAIR_DISPUTE: { label: '维修争议', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Wrench },
  DATA_MISMATCH: { label: '数据不符', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: AlertCircle }
};

const severityMap = {
  ERROR: { label: '错误', color: 'text-rose-600', icon: XCircle },
  WARNING: { label: '警告', color: 'text-amber-600', icon: AlertTriangle }
};

const Reconciliation = () => {
  const {
    alerts,
    loading,
    filters,
    setFilters,
    fetchReconciliation,
    resolveAlert,
    fetchExportData,
    summaryStats,
    showToast
  } = useStore();

  const [typeFilter, setTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [resolvedFilter, setResolvedFilter] = useState<string>('unresolved');

  useEffect(() => {
    fetchReconciliation();
  }, []);

  const handleResolve = (alert: DiscrepancyAlert) => {
    if (confirm(`确定标记「${alert.message}」为已处理吗？`)) {
      resolveAlert(alert.id);
    }
  };

  const handleExport = async () => {
    const data = await fetchExportData();
    if (!data) return;

    try {
      const wb = XLSX.utils.book_new();

      if (data.contracts?.length) {
        const ws1 = XLSX.utils.json_to_sheet(data.contracts.map((c: any) => ({
          '合同编号': c.contractNo,
          '乐器编号': c.instrumentNo,
          '客户名称': c.customerName,
          '起租日期': c.startDate,
          '退租日期': c.endDate || '-',
          '押金金额': c.depositAmount,
          '月租金': c.monthlyRent,
          '实收押金': c.actualDepositReceived ?? '-',
          '状态': statusMap[c.status as keyof typeof statusMap]?.label || c.status
        })));
        XLSX.utils.book_append_sheet(wb, ws1, '租赁合同');
      }

      if (data.workOrders?.length) {
        const ws2 = XLSX.utils.json_to_sheet(data.workOrders.map((wo: any) => ({
          '工单号': wo.workOrderNo,
          '合同编号': wo.contractNo,
          '乐器编号': wo.instrumentNo,
          '维修项目': wo.repairItems?.map((i: any) => i.name).join('、') || '',
          '维修总费用': wo.totalCost,
          '有无争议': wo.hasDispute ? '有' : '无',
          '争议备注': wo.disputeNote || '-',
          '确认人': wo.confirmedBy || '-',
          '确认时间': wo.confirmedAt || '-'
        })));
        XLSX.utils.book_append_sheet(wb, ws2, '维修工单');
      }

      if (data.statements?.length) {
        const ws3 = XLSX.utils.json_to_sheet(data.statements.map((s: any) => ({
          '账期': s.period,
          '合同编号': s.contractNo,
          '乐器编号': s.instrumentNo,
          '租金': s.rentAmount,
          '维修费': s.repairCost,
          '押金扣款': s.depositDeduction,
          '实收金额': s.actualReceived
        })));
        XLSX.utils.book_append_sheet(wb, ws3, '对账表');
      }

      if (data.alerts?.length) {
        const ws4 = XLSX.utils.json_to_sheet(data.alerts.map((a: any) => ({
          '类型': alertTypeMap[a.type as keyof typeof alertTypeMap]?.label || a.type,
          '严重程度': severityMap[a.severity as keyof typeof severityMap]?.label || a.severity,
          '提示信息': a.message,
          '关联合同号': a.relatedContractNo,
          '关联工单号': a.relatedWorkOrderNo || '-',
          '合同值': a.contractValue ?? '-',
          '对账表值': a.statementValue ?? '-',
          '是否已处理': a.resolved ? '是' : '否',
          '创建时间': a.createdAt
        })));
        XLSX.utils.book_append_sheet(wb, ws4, '差异提示');
      }

      XLSX.writeFile(wb, `乐器租赁维修账_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('success', '导出成功');
    } catch (error) {
      showToast('error', '导出失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (typeFilter && alert.type !== typeFilter) return false;
    if (severityFilter && alert.severity !== severityFilter) return false;
    if (resolvedFilter === 'resolved' && !alert.resolved) return false;
    if (resolvedFilter === 'unresolved' && alert.resolved) return false;
    if (filters.contractNo && !alert.relatedContractNo.includes(filters.contractNo)) return false;
    return true;
  });

  const unresolvedCount = alerts.filter(a => !a.resolved).length;
  const errorCount = alerts.filter(a => a.severity === 'ERROR' && !a.resolved).length;
  const depositCount = alerts.filter(a => a.type === 'DEPOSIT_MISMATCH' && !a.resolved).length;
  const instrumentCount = alerts.filter(a => a.type === 'INSTRUMENT_CHANGE' && !a.resolved).length;
  const disputeCount = alerts.filter(a => a.type === 'REPAIR_DISPUTE' && !a.resolved).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-md flex items-center justify-center">
              <XCircle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">待处理错误</div>
              <div className="text-2xl font-bold text-rose-600">{errorCount}</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-md flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">待处理总数</div>
              <div className="text-2xl font-bold text-amber-600">{unresolvedCount}</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-md flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">押金误扣</div>
              <div className="text-2xl font-bold text-rose-600">{depositCount}</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-md flex items-center justify-center">
              <Music className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">乐器换号</div>
              <div className="text-2xl font-bold text-amber-600">{instrumentCount}</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-md flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">维修争议</div>
              <div className="text-2xl font-bold text-orange-600">{disputeCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索合同编号..."
              className="input-field pl-10 w-56"
              value={filters.contractNo || ''}
              onChange={(e) => setFilters({ contractNo: e.target.value })}
            />
          </div>
          <select
            className="select-field w-40"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">全部类型</option>
            <option value="DEPOSIT_MISMATCH">押金误扣</option>
            <option value="INSTRUMENT_CHANGE">乐器换号</option>
            <option value="REPAIR_DISPUTE">维修争议</option>
            <option value="DATA_MISMATCH">数据不符</option>
          </select>
          <select
            className="select-field w-40"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">全部级别</option>
            <option value="ERROR">错误</option>
            <option value="WARNING">警告</option>
          </select>
          <select
            className="select-field w-40"
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value)}
          >
            <option value="unresolved">未处理</option>
            <option value="resolved">已处理</option>
            <option value="">全部</option>
          </select>
          <div className="flex-1" />
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => fetchReconciliation()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            重新比对
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
            导出Excel
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-gray-800">差异提示清单</span>
            <span className="text-sm text-gray-500">（共 {filteredAlerts.length} 条）</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filteredAlerts.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <div className="text-lg">暂无差异提示</div>
              <div className="text-sm mt-1">数据核对一致，继续保持</div>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const typeInfo = alertTypeMap[alert.type as keyof typeof alertTypeMap];
              const severityInfo = severityMap[alert.severity as keyof typeof severityMap];
              const TypeIcon = typeInfo?.icon || AlertCircle;
              const SeverityIcon = severityInfo?.icon || AlertTriangle;

              return (
                <div
                  key={alert.id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${alert.resolved ? 'opacity-60 bg-gray-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${typeInfo?.color.split(' ')[0] || 'bg-gray-100'}`}>
                      <TypeIcon className={`w-5 h-5 ${typeInfo?.color.split(' ')[1] || 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityIcon className={`w-4 h-4 ${severityInfo?.color}`} />
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${typeInfo?.color}`}>
                          {typeInfo?.label}
                        </span>
                        <span className="text-xs text-gray-500">合同号：{alert.relatedContractNo}</span>
                        {alert.relatedWorkOrderNo && (
                          <span className="text-xs text-gray-500">工单号：{alert.relatedWorkOrderNo}</span>
                        )}
                        {alert.resolved && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            已处理
                          </span>
                        )}
                      </div>
                      <div className="text-gray-800 mb-2">{alert.message}</div>
                      {(alert.contractValue !== undefined || alert.statementValue !== undefined) && (
                        <div className="flex items-center gap-4 text-sm">
                          {alert.contractValue !== undefined && (
                            <span className="text-gray-500">
                              合同记录：<span className="font-medium text-gray-700">{alert.contractValue}</span>
                            </span>
                          )}
                          {alert.statementValue !== undefined && (
                            <span className="text-gray-500">
                              对账记录：<span className="font-medium text-gray-700">{alert.statementValue}</span>
                            </span>
                          )}
                          {alert.contractValue !== undefined && alert.statementValue !== undefined && (
                            <span className="text-rose-600 font-medium">
                              差异：{Number(alert.contractValue) - Number(alert.statementValue)}
                            </span>
                          )}
                        </div>
                      )}
                      {alert.relatedField && (
                        <div className="text-xs text-gray-500 mt-1">
                          涉及字段：{alert.relatedField}
                        </div>
                      )}
                    </div>
                    {!alert.resolved && (
                      <button
                        className="btn-primary flex items-center gap-1 text-sm px-3 py-1.5 flex-shrink-0"
                        onClick={() => handleResolve(alert)}
                      >
                        <Check className="w-4 h-4" />
                        标记已处理
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary-600" />
          数据统计概览
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">合同总数</div>
            <div className="text-2xl font-bold text-gray-800">{summaryStats.totalContracts}</div>
            <div className="text-xs text-emerald-600 mt-1">其中在租 {summaryStats.activeContracts} 份</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">工单总数</div>
            <div className="text-2xl font-bold text-gray-800">{summaryStats.totalWorkOrders}</div>
            <div className="text-xs text-orange-600 mt-1">其中争议 {summaryStats.disputedWorkOrders} 笔</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">错误提示</div>
            <div className="text-2xl font-bold text-rose-600">{summaryStats.errorAlerts}</div>
            <div className="text-xs text-gray-500 mt-1">需立即处理</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">警告提示</div>
            <div className="text-2xl font-bold text-amber-600">{summaryStats.warningAlerts}</div>
            <div className="text-xs text-gray-500 mt-1">需关注核实</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const statusMap = {
  PENDING: { label: '待起租' },
  ACTIVE: { label: '租赁中' },
  ENDED: { label: '已退租' }
};

export default Reconciliation;
