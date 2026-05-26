import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, Plus, AlertCircle, UserPlus } from 'lucide-react';
import { useApp } from '../store/AppContext';
import StatusBadge from '../components/common/StatusBadge';
import { calculateDaysToExpiry, formatDate } from '../utils/dateUtils';
import { exportCustomerList } from '../utils/export';
import type { LoanStatus } from '../types';
import CustomerForm from '../components/features/CustomerForm';

const statusOptions: { value: LoanStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'warning', label: '预警' },
  { value: 'expiring_soon', label: '即将到期' },
  { value: 'expired', label: '已过期' },
  { value: 'abnormal', label: '异常' },
];

export default function LoanList() {
  const { state, dispatch, isManager } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [showSingleForm, setShowSingleForm] = useState(false);
  const pageSize = 10;
  
  const filteredCustomers = useMemo(() => {
    let result = [...state.customers];
    
    if (state.filters.status !== 'all') {
      result = result.filter(c => c.status === state.filters.status);
    }
    
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.idCard.includes(search)
      );
    }
    
    result.sort((a, b) => {
      let comparison = 0;
      switch (state.filters.sortBy) {
        case 'expiryDate':
          comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN');
          break;
        case 'creditAmount':
          comparison = a.creditAmount - b.creditAmount;
          break;
      }
      return state.filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [state.customers, state.filters]);
  
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage]);
  
  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  
  const handleExport = () => {
    exportCustomerList(filteredCustomers);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">授信清单</h1>
          <p className="text-gray-500 mt-1">共 {filteredCustomers.length} 条记录</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-secondary gap-2">
            <Download size={18} />
            导出清单
          </button>
          {isManager() && (
            <button onClick={() => setShowSingleForm(true)} className="btn-secondary gap-2">
              <UserPlus size={18} />
              新增客户
            </button>
          )}
          {isManager() && (
            <Link to="/import" className="btn-primary gap-2">
              <Plus size={18} />
              导入数据
            </Link>
          )}
        </div>
      </div>
      
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户名称或身份证号..."
              value={state.filters.search}
              onChange={(e) => dispatch({ type: 'SET_FILTERS', payload: { search: e.target.value } })}
              className="input-field pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={state.filters.status}
              onChange={(e) => dispatch({ type: 'SET_FILTERS', payload: { status: e.target.value as LoanStatus | 'all' } })}
              className="input-field min-w-36"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <select
            value={state.filters.sortBy}
            onChange={(e) => dispatch({ type: 'SET_FILTERS', payload: { sortBy: e.target.value as 'expiryDate' | 'name' | 'creditAmount' } })}
            className="input-field min-w-36"
          >
            <option value="expiryDate">按到期日排序</option>
            <option value="name">按名称排序</option>
            <option value="creditAmount">按额度排序</option>
          </select>
          
          <button
            onClick={() => dispatch({ 
              type: 'SET_FILTERS', 
              payload: { sortOrder: state.filters.sortOrder === 'asc' ? 'desc' : 'asc' } 
            })}
            className="btn-secondary"
          >
            {state.filters.sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
          </button>
        </div>
      </div>
      
      {filteredCustomers.length === 0 ? (
        <div className="card p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">暂无符合条件的客户数据</p>
          <Link to="/import" className="btn-primary mt-4">
            导入样例数据
          </Link>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">客户名称</th>
                    <th className="table-header">身份证号</th>
                    <th className="table-header">授信额度</th>
                    <th className="table-header">到期日期</th>
                    <th className="table-header">剩余天数</th>
                    <th className="table-header">异常数量</th>
                    <th className="table-header">当前状态</th>
                    <th className="table-header">数据来源</th>
                    <th className="table-header">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedCustomers.map(customer => {
                    const days = calculateDaysToExpiry(customer.expiryDate);
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell font-medium">{customer.name}</td>
                        <td className="table-cell font-mono text-sm">{customer.idCard}</td>
                        <td className="table-cell">¥{customer.creditAmount.toLocaleString()}</td>
                        <td className="table-cell">{formatDate(customer.expiryDate)}</td>
                        <td className="table-cell">
                          <span className={`font-medium ${
                            days <= 0 ? 'text-red-600' :
                            days <= 7 ? 'text-orange-600' :
                            days <= 30 ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {days <= 0 ? `已过期 ${Math.abs(days)} 天` : `${days} 天`}
                          </span>
                        </td>
                        <td className="table-cell">
                          {customer.anomalies.length > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <AlertCircle size={12} />
                              {customer.anomalies.length}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <StatusBadge status={customer.status} />
                        </td>
                        <td className="table-cell text-gray-500 text-sm">{customer.source}</td>
                        <td className="table-cell">
                          <Link
                            to={`/loans/${customer.id}`}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            查看详情
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredCustomers.length)} 条，
                共 {filteredCustomers.length} 条
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary px-3 py-1"
                >
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary px-3 py-1"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {showSingleForm && (
        <CustomerForm onClose={() => setShowSingleForm(false)} />
      )}
    </div>
  );
}
