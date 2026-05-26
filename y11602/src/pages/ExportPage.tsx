import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, FileText, CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { exportCustomerList, exportRiskReport } from '../utils/export';
import { calculateDaysToExpiry } from '../utils/dateUtils';

export default function ExportPage() {
  const { state } = useApp();
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  
  const stats = useMemo(() => {
    const total = state.customers.length;
    const normal = state.customers.filter(c => c.status === 'normal').length;
    const warning = state.customers.filter(c => c.status === 'warning').length;
    const expiringSoon = state.customers.filter(c => c.status === 'expiring_soon').length;
    const expired = state.customers.filter(c => c.status === 'expired').length;
    const abnormal = state.customers.filter(c => c.status === 'abnormal').length;
    const withAnomalies = state.customers.filter(c => c.anomalies.length > 0).length;
    const thisWeekExpiring = state.customers.filter(c => {
      const days = calculateDaysToExpiry(c.expiryDate);
      return days > 0 && days <= 7;
    }).length;
    
    return { total, normal, warning, expiringSoon, expired, abnormal, withAnomalies, thisWeekExpiring };
  }, [state.customers]);
  
  const handleExportList = () => {
    exportCustomerList(state.customers);
    setExportSuccess('授信清单导出成功');
    setTimeout(() => setExportSuccess(null), 3000);
  };
  
  const handleExportRiskReport = () => {
    exportRiskReport(
      state.customers,
      state.repayments,
      state.guarantees,
      state.approvals
    );
    setExportSuccess('风险报告导出成功');
    setTimeout(() => setExportSuccess(null), 3000);
  };
  
  const handleExportAbnormalOnly = () => {
    const abnormalCustomers = state.customers.filter(c => c.anomalies.length > 0);
    exportCustomerList(abnormalCustomers, '异常客户清单');
    setExportSuccess('异常客户清单导出成功');
    setTimeout(() => setExportSuccess(null), 3000);
  };
  
  const handleExportThisWeek = () => {
    const thisWeekCustomers = state.customers.filter(c => {
      const days = calculateDaysToExpiry(c.expiryDate);
      return days > 0 && days <= 7;
    });
    exportCustomerList(thisWeekCustomers, '本周到期清单');
    setExportSuccess('本周到期清单导出成功');
    setTimeout(() => setExportSuccess(null), 3000);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">报告导出</h1>
        <p className="text-gray-500 mt-1">导出各类授信报告和清单</p>
      </div>
      
      {exportSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <span className="text-green-700 font-medium">{exportSuccess}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.normal}</p>
              <p className="text-sm text-gray-500">正常客户</p>
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.warning + stats.expiringSoon}</p>
              <p className="text-sm text-gray-500">预警客户</p>
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.expired + stats.abnormal}</p>
              <p className="text-sm text-gray-500">异常客户</p>
            </div>
          </div>
        </div>
        
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.thisWeekExpiring}</p>
              <p className="text-sm text-gray-500">本周到期</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <FileSpreadsheet size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">授信清单</h3>
              <p className="text-sm text-gray-500">
                导出完整的授信客户清单，包含客户基本信息、授信额度、到期日期、当前状态等
              </p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">客户总数</span>
              <span className="font-medium text-gray-900">{stats.total} 条</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">包含字段</span>
              <span className="font-medium text-gray-900">客户名称、身份证号、授信额度、到期日、状态等</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">导出格式</span>
              <span className="font-medium text-gray-900">Excel (.xlsx)</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={handleExportList} className="btn-primary flex-1 gap-2">
              <FileDown size={18} />
              导出全部清单
            </button>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
              <FileText size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">风险报告</h3>
              <p className="text-sm text-gray-500">
                导出风险分析报告，包含异常客户明细、担保异常、审批撤回等信息
              </p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">异常客户</span>
              <span className="font-medium text-red-600">{stats.withAnomalies} 条</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">报告内容</span>
              <span className="font-medium text-gray-900">异常客户、担保异常、审批撤回（多Sheet）</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">导出格式</span>
              <span className="font-medium text-gray-900">Excel (.xlsx)</span>
            </div>
          </div>
          
          <button onClick={handleExportRiskReport} className="btn-primary w-full gap-2">
            <FileDown size={18} />
            导出风险报告
          </button>
        </div>
        
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <AlertTriangle size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">异常客户清单</h3>
              <p className="text-sm text-gray-500">
                仅导出存在异常的客户，包括担保过期、流水缺月、审批撤回等情况
              </p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">异常客户数</span>
              <span className="font-medium text-red-600">{stats.withAnomalies} 条</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">包含内容</span>
              <span className="font-medium text-gray-900">客户信息、异常信息、风险等级</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">导出格式</span>
              <span className="font-medium text-gray-900">Excel (.xlsx)</span>
            </div>
          </div>
          
          <button 
            onClick={handleExportAbnormalOnly} 
            className="btn-primary w-full gap-2"
            disabled={stats.withAnomalies === 0}
          >
            <FileDown size={18} />
            导出异常清单
          </button>
        </div>
        
        <div className="card p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <Clock size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">本周到期清单</h3>
              <p className="text-sm text-gray-500">
                导出未来7天内即将到期的客户清单，供老板查看本周断档情况
              </p>
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">本周到期数</span>
              <span className="font-medium text-purple-600">{stats.thisWeekExpiring} 条</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">包含内容</span>
              <span className="font-medium text-gray-900">客户信息、到期日、剩余天数、当前状态</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">导出格式</span>
              <span className="font-medium text-gray-900">Excel (.xlsx)</span>
            </div>
          </div>
          
          <button 
            onClick={handleExportThisWeek} 
            className="btn-primary w-full gap-2"
            disabled={stats.thisWeekExpiring === 0}
          >
            <FileDown size={18} />
            导出本周到期
          </button>
        </div>
      </div>
    </div>
  );
}
