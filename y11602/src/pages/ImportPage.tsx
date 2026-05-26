import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, Database, CheckCircle, AlertCircle, ArrowRight, UserPlus, FileText } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { parseFile, validateMultiSourceData } from '../utils/import';
import type { MultiSourceImportData } from '../types';
import CustomerForm from '../components/features/CustomerForm';

export default function ImportPage() {
  const navigate = useNavigate();
  const { dispatch, isManager } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [importedData, setImportedData] = useState<MultiSourceImportData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [showSingleForm, setShowSingleForm] = useState(false);
  
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrors([]);
    setWarnings([]);
    setImportedData(null);
    
    try {
      const result = await parseFile(file);
      
      let customerRows: Record<string, unknown>[] = [];
      let repaymentRows: Record<string, unknown>[] = [];
      let guaranteeRows: Record<string, unknown>[] = [];
      let approvalRows: Record<string, unknown>[] = [];
      
      if (Array.isArray(result[0]) && result.length > 1) {
        const sheets = result as Record<string, unknown>[][];
        customerRows = sheets[0] || [];
        repaymentRows = sheets[1] || [];
        guaranteeRows = sheets[2] || [];
        approvalRows = sheets[3] || [];
      } else {
        customerRows = result as Record<string, unknown>[];
      }
      
      const validationResult = validateMultiSourceData(
        customerRows,
        repaymentRows,
        guaranteeRows,
        approvalRows
      );
      
      if (!validationResult.success) {
        setErrors(validationResult.errors);
      }
      
      if (validationResult.warnings.length > 0) {
        setWarnings(validationResult.warnings);
      }
      
      setImportedData(validationResult.data);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : '文件解析失败']);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };
  
  const handleLoadSampleData = () => {
    dispatch({ type: 'LOAD_SAMPLE_DATA' });
    setImportSuccess(true);
    setTimeout(() => {
      navigate('/loans');
    }, 1500);
  };
  
  const handleConfirmImport = () => {
    if (importedData) {
      dispatch({ type: 'IMPORT_MULTI_SOURCE', payload: importedData });
      setImportSuccess(true);
      setTimeout(() => {
        navigate('/loans');
      }, 1500);
    }
  };
  
  const handleClearData = () => {
    if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
      dispatch({ type: 'CLEAR_ALL_DATA' });
      setImportedData(null);
      setErrors([]);
      setWarnings([]);
    }
  };
  
  if (!isManager()) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据导入</h1>
          <p className="text-gray-500 mt-1">管理层角色无数据录入权限</p>
        </div>
        <div className="card p-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">权限受限</h3>
          <p className="text-gray-500">您当前以管理层身份登录，无法导入或录入数据</p>
          <p className="text-gray-500 mt-1">请以客户经理身份登录后操作</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据导入</h1>
        <p className="text-gray-500 mt-1">导入客户数据或加载样例数据体验完整功能</p>
      </div>
      
      {importSuccess ? (
        <div className="card p-12 text-center">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">数据导入成功</h3>
          <p className="text-gray-500">正在跳转到授信清单...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">快速体验</h3>
                  <p className="text-sm text-gray-500">一键加载样例数据</p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">样例数据包含：</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" />
                    <strong>正常记录</strong>：张伟 - 还款正常、担保有效、审批通过
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-500" />
                    <strong>边界记录</strong>：李娜 - 3天后到期、缺1个月流水、担保即将到期
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" />
                    <strong>异常记录</strong>：王强 - 担保过期60天、缺3个月流水、审批已撤回
                  </li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button onClick={handleLoadSampleData} className="btn-primary flex-1 gap-2">
                  <FileSpreadsheet size={18} />
                  加载样例数据
                </button>
                <button onClick={handleClearData} className="btn-danger gap-2">
                  清空数据
                </button>
              </div>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">单条录入</h3>
                  <p className="text-sm text-gray-500">手动录入单个客户</p>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <h4 className="font-medium text-green-900 mb-2">录入内容包括：</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    客户基本信息
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    担保信息（抵押/质押/保证）
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    审批记录
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    还款流水模板
                  </li>
                </ul>
              </div>
              
              <button 
                onClick={() => setShowSingleForm(true)}
                className="btn-primary w-full gap-2"
              >
                <UserPlus size={18} />
                新增客户
              </button>
            </div>
            
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">批量导入</h3>
                  <p className="text-sm text-gray-500">支持多源数据Excel</p>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <h4 className="font-medium text-amber-900 mb-2">支持导入：</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    Sheet1 - 客户基本信息
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    Sheet2 - 还款流水
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    Sheet3 - 担保信息
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    Sheet4 - 审批记录
                  </li>
                </ul>
              </div>
              
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600 mb-2">拖拽文件到此处，或</p>
                <label className="inline-block">
                  <span className="btn-secondary cursor-pointer">选择文件</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-3">
                  支持 .csv, .xlsx, .xls 格式
                </p>
              </div>
              
              {isLoading && (
                <div className="mt-4 text-center text-gray-500">
                  正在解析文件...
                </div>
              )}
            </div>
          </div>
          
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <AlertCircle size={20} />
                导入错误 ({errors.length} 项)
              </div>
              <ul className="text-sm text-red-600 space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                <AlertCircle size={20} />
                导入警告 ({warnings.length} 项)
              </div>
              <ul className="text-sm text-amber-600 space-y-1">
                {warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          {importedData && importedData.customers.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  数据预览
                </h3>
                <button onClick={handleConfirmImport} className="btn-primary gap-2">
                  确认导入
                  <ArrowRight size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{importedData.customers.length}</p>
                  <p className="text-sm text-blue-800">客户记录</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{importedData.repayments.length}</p>
                  <p className="text-sm text-green-800">还款流水</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{importedData.guarantees.length}</p>
                  <p className="text-sm text-amber-800">担保信息</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">{importedData.approvals.length}</p>
                  <p className="text-sm text-purple-800">审批记录</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header">客户名称</th>
                      <th className="table-header">身份证号</th>
                      <th className="table-header">授信额度</th>
                      <th className="table-header">到期日期</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {importedData.customers.slice(0, 5).map((customer) => (
                      <tr key={customer.id}>
                        <td className="table-cell font-medium">{customer.name}</td>
                        <td className="table-cell font-mono text-sm">{customer.idCard}</td>
                        <td className="table-cell">¥{customer.creditAmount.toLocaleString()}</td>
                        <td className="table-cell">{customer.expiryDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {importedData.customers.length > 5 && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  仅显示前 5 条，共 {importedData.customers.length} 条数据
                </p>
              )}
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
