import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, Database, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { parseFile, validateCustomerData } from '../utils/import';
import type { Customer } from '../types';

export default function ImportPage() {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [importedData, setImportedData] = useState<Customer[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  
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
    setImportedData([]);
    
    try {
      const rows = await parseFile(file);
      const result = validateCustomerData(rows);
      
      if (!result.success) {
        setErrors(result.errors);
      }
      
      if (result.warnings.length > 0) {
        setWarnings(result.warnings);
      }
      
      setImportedData(result.data);
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
    if (importedData.length > 0) {
      dispatch({ type: 'SET_CUSTOMERS', payload: importedData });
      setImportSuccess(true);
      setTimeout(() => {
        navigate('/loans');
      }, 1500);
    }
  };
  
  const handleClearData = () => {
    if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
      dispatch({ type: 'CLEAR_ALL_DATA' });
      setImportedData([]);
      setErrors([]);
      setWarnings([]);
    }
  };
  
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <Upload size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">批量导入</h3>
                  <p className="text-sm text-gray-500">支持 CSV、Excel 格式</p>
                </div>
              </div>
              
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 mb-2">拖拽文件到此处，或</p>
                <label className="inline-block">
                  <span className="btn-primary cursor-pointer">选择文件</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-3">
                  支持 .csv, .xlsx, .xls 格式，文件大小不超过 10MB
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
          
          {importedData.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  数据预览 ({importedData.length} 条)
                </h3>
                <button onClick={handleConfirmImport} className="btn-primary gap-2">
                  确认导入
                  <ArrowRight size={16} />
                </button>
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
                    {importedData.slice(0, 5).map((customer, i) => (
                      <tr key={i}>
                        <td className="table-cell font-medium">{customer.name}</td>
                        <td className="table-cell font-mono text-sm">{customer.idCard}</td>
                        <td className="table-cell">¥{customer.creditAmount.toLocaleString()}</td>
                        <td className="table-cell">{customer.expiryDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {importedData.length > 5 && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  仅显示前 5 条，共 {importedData.length} 条数据
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
