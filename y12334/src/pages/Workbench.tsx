import { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Settings,
  Play,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  X,
  Info,
  Trash2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppStore } from '../store';
import { importFile, generateSampleCSV } from '../utils/dataImport';
import type { DefectRecord } from '../types';
import { cn } from '../lib/utils';

export default function Workbench() {
  const {
    currentProjectId,
    getCurrentProject,
    getCurrentRecords,
    getCurrentResult,
    getCurrentAbnormalities,
    addDefectRecords,
    performAnalysis,
    updateProject,
    setRowField,
    setColField,
    rowField,
    colField
  } = useAppStore();
  
  const project = getCurrentProject();
  const records = getCurrentRecords();
  const result = getCurrentResult();
  const abnormalities = getCurrentAbnormalities();
  
  const [isDragging, setIsDragging] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [showImportResult, setShowImportResult] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deletedRecords, setDeletedRecords] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!currentProjectId) {
      setImportErrors(['请先选择或创建一个项目']);
      return;
    }

    const result = await importFile(file);
    
    if (result.errors.length > 0) {
      setImportErrors(result.errors);
    } else {
      setImportErrors([]);
    }
    
    if (result.warnings.length > 0) {
      setImportWarnings(result.warnings);
    } else {
      setImportWarnings([]);
    }

    if (result.success && currentProjectId) {
      const { added, duplicates } = addDefectRecords(currentProjectId, result.records);
      setImportWarnings(prev => [...prev, `成功导入 ${added} 条记录${duplicates > 0 ? `，跳过 ${duplicates} 条重复记录` : ''}`]);
    }
    
    setShowImportResult(true);
    setTimeout(() => setShowImportResult(false), 5000);
  };

  const handleAnalyze = () => {
    if (!currentProjectId || records.length === 0) return;
    
    setIsAnalyzing(true);
    setTimeout(() => {
      performAnalysis(currentProjectId);
      setIsAnalyzing(false);
    }, 800);
  };

  const handleSignificanceChange = (value: number) => {
    if (currentProjectId) {
      updateProject(currentProjectId, { significanceLevel: value });
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    setDeletedRecords(prev => new Set([...prev, recordId]));
  };

  const downloadSampleCSV = () => {
    const csv = generateSampleCSV();
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '缺陷记录示例.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const visibleRecords = records.filter(r => !deletedRecords.has(r.id));

  const residualChartData = result ? result.rowLabels.flatMap((rowLabel, rowIndex) =>
    result.colLabels.map((colLabel, colIndex) => ({
      name: `${rowLabel}-${colLabel}`,
      value: result.residuals[rowIndex][colIndex],
      observed: result.contingencyTable[rowIndex][colIndex],
      expected: result.expectedTable[rowIndex][colIndex].toFixed(2)
    }))
  ) : [];

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <FileSpreadsheet size={40} className="text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">请选择项目</h2>
        <p className="text-slate-500">点击顶部导航栏的项目选择器，选择或创建一个新项目</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">卡方检验工作台</h1>
          <p className="text-slate-500 mt-1">
            当前项目：<span className="font-medium text-slate-700">{project.name}</span>
            <span className="mx-2">|</span>
            班组：<span className="font-medium text-slate-700">{project.teamInfo.teamName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadSampleCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            下载示例
          </button>
          <button
            onClick={handleAnalyze}
            disabled={visibleRecords.length === 0 || isAnalyzing}
            className={cn(
              'flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-all',
              visibleRecords.length === 0 || isAnalyzing
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30'
            )}
          >
            {isAnalyzing ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Play size={16} />
            )}
            {isAnalyzing ? '分析中...' : '执行检验'}
          </button>
        </div>
      </div>

      {showImportResult && (importErrors.length > 0 || importWarnings.length > 0) && (
        <div className={cn(
          'p-4 rounded-xl border flex items-start justify-between',
          importErrors.length > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        )}>
          <div className="flex items-start gap-3">
            {importErrors.length > 0 ? (
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <Info size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              {importErrors.map((error, i) => (
                <p key={i} className="text-sm text-red-700">{error}</p>
              ))}
              {importWarnings.map((warning, i) => (
                <p key={i} className="text-sm text-amber-700">{warning}</p>
              ))}
            </div>
          </div>
          <button onClick={() => setShowImportResult(false)}>
            <X size={18} className="text-slate-400" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors',
              isDragging ? 'bg-blue-100' : 'bg-slate-100'
            )}>
              <Upload size={28} className={isDragging ? 'text-blue-600' : 'text-slate-400'} />
            </div>
            <p className="font-medium text-slate-800">
              {isDragging ? '释放文件以上传' : '拖拽文件到此处或点击上传'}
            </p>
            <p className="text-sm text-slate-500 mt-1">支持 CSV、Excel 格式</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                缺陷记录
                <span className="ml-2 text-sm font-normal text-slate-500">
                  共 {visibleRecords.length} 条
                </span>
              </h3>
            </div>
            
            {visibleRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FileSpreadsheet size={48} className="mx-auto mb-3 text-slate-300" />
                <p>暂无缺陷记录</p>
                <p className="text-sm mt-1">上传数据文件以开始分析</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">批次号</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">缺陷类型</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">类别</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">数量</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">材料来源</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRecords.slice(0, 50).map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">{record.batchId}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{record.defectType}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
                            {record.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{record.count}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{record.materialSource}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleRecords.length > 50 && (
                  <div className="px-4 py-3 text-center text-sm text-slate-500 bg-slate-50">
                    仅显示前 50 条记录，共 {visibleRecords.length} 条
                  </div>
                )}
              </div>
            )}
          </div>

          {result && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">残差分析图</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={residualChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number) => [value.toFixed(4), '标准化残差']}
                      labelFormatter={(label) => `组合: ${label}`}
                    />
                    <Bar dataKey="value">
                      {residualChartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={Math.abs(entry.value) > 1.96 ? '#ef4444' : '#3b82f6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                残差绝对值 &gt; 1.96 表示该组合对卡方值贡献显著（红色）
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="text-slate-500" />
              <h3 className="font-semibold text-slate-800">参数配置</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  显著性水平 α
                </label>
                <div className="flex gap-2">
                  {[0.01, 0.05, 0.10].map((level) => (
                    <button
                      key={level}
                      onClick={() => handleSignificanceChange(level)}
                      className={cn(
                        'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
                        project.significanceLevel === level
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  行变量
                </label>
                <select
                  value={rowField}
                  onChange={(e) => setRowField(e.target.value as keyof DefectRecord)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="defectType">缺陷类型</option>
                  <option value="category">类别</option>
                  <option value="materialSource">材料来源</option>
                  <option value="productionLine">生产线</option>
                  <option value="shift">班次</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  列变量
                </label>
                <select
                  value={colField}
                  onChange={(e) => setColField(e.target.value as keyof DefectRecord)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="category">类别</option>
                  <option value="defectType">缺陷类型</option>
                  <option value="materialSource">材料来源</option>
                  <option value="productionLine">生产线</option>
                  <option value="shift">班次</option>
                </select>
              </div>
            </div>
          </div>

          {result && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                {result.conclusion === 'accept' ? (
                  <CheckCircle size={18} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={18} className="text-amber-500" />
                )}
                <h3 className="font-semibold text-slate-800">检验结果</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">卡方值</span>
                  <span className="font-mono font-semibold text-slate-800">{result.chiSquareValue.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">自由度</span>
                  <span className="font-mono font-semibold text-slate-800">{result.degreesOfFreedom}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">p 值</span>
                  <span className={cn(
                    'font-mono font-semibold',
                    result.pValue < project.significanceLevel ? 'text-red-600' : 'text-emerald-600'
                  )}>
                    {result.pValue.toFixed(6)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">临界值</span>
                  <span className="font-mono font-semibold text-slate-800">{result.criticalValue.toFixed(4)}</span>
                </div>
                <div className="pt-2">
                  <div className={cn(
                    'p-3 rounded-lg text-center font-medium',
                    result.conclusion === 'accept'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  )}>
                    {result.conclusion === 'accept' ? '接受原假设' : '拒绝原假设'}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    {result.conclusion === 'accept' 
                      ? '各分类之间没有显著差异'
                      : '各分类之间存在显著差异'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {abnormalities.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={18} className="text-amber-600" />
                <h3 className="font-semibold text-amber-800">检测到异常</h3>
              </div>
              <div className="space-y-2">
                {abnormalities.slice(0, 3).map((abnormality) => (
                  <div key={abnormality.id} className="text-sm text-amber-700">
                    • {abnormality.triggerMaterial}
                  </div>
                ))}
                {abnormalities.length > 3 && (
                  <p className="text-xs text-amber-600">还有 {abnormalities.length - 3} 项异常...</p>
                )}
              </div>
              <p className="text-xs text-amber-600 mt-3">
                前往"异常诊断"查看详情和处理建议
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
