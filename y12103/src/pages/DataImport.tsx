import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  Zap,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StepIndicator from '@/components/common/StepIndicator';
import {
  parseCSV,
  parseExcel,
  parseSalesHistoryRow,
  parseInventorySnapshotRow,
  parsePromotionCalendarRow,
  readFileAsText,
  readFileAsArrayBuffer,
  getFileTemplate,
} from '@/utils/import';
import type {
  SalesHistory,
  InventorySnapshot,
  PromotionCalendar,
  ValidationError,
  ImportResult,
} from '@/types';

type FileType = 'sales' | 'inventory' | 'promotion';

export default function DataImport() {
  const navigate = useNavigate();
  const {
    importState,
    importSalesData,
    importInventoryData,
    importPromotionData,
    runForecast,
    loadSampleData,
    loadPromotionData,
    isCalculating,
    lastCalculationHash,
    createVersion,
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<FileType>('sales');
  const [dragOver, setDragOver] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<any> | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  
  const tabs: { key: FileType; label: string; description: string }[] = [
    {
      key: 'sales',
      label: '销售历史',
      description: 'CSV/Excel格式，包含SKU、日期、销量',
    },
    {
      key: 'inventory',
      label: '库存快照',
      description: 'CSV/Excel格式，包含SKU、库存数量',
    },
    {
      key: 'promotion',
      label: '促销日历',
      description: 'CSV/Excel格式，包含促销日期、SKU',
    },
  ];
  
  const currentTab = tabs.find(t => t.key === activeTab)!;
  
  const handleFileUpload = useCallback(async (file: File, type: FileType) => {
    setErrors([]);
    setImportResult(null);
    
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    let result: ImportResult<any>;
    
    try {
      if (isCSV) {
        const content = await readFileAsText(file);
        if (type === 'sales') {
          result = parseCSV(content, parseSalesHistoryRow);
        } else if (type === 'inventory') {
          result = parseCSV(content, parseInventorySnapshotRow);
        } else {
          result = parseCSV(content, parsePromotionCalendarRow);
        }
      } else {
        const content = await readFileAsArrayBuffer(file);
        if (type === 'sales') {
          result = parseExcel(content, parseSalesHistoryRow);
        } else if (type === 'inventory') {
          result = parseExcel(content, parseInventorySnapshotRow);
        } else {
          result = parseExcel(content, parsePromotionCalendarRow);
        }
      }
      
      setImportResult(result);
      setErrors(result.errors);
      
      if (result.success) {
        if (type === 'sales') {
          importSalesData(result.data as SalesHistory[]);
        } else if (type === 'inventory') {
          importInventoryData(result.data as InventorySnapshot[]);
        } else {
          importPromotionData(result.data as PromotionCalendar[]);
        }
      }
    } catch (e: any) {
      setErrors([{
        row: 0,
        field: 'file',
        message: `文件解析失败: ${e.message}`,
        value: null,
      }]);
    }
  }, [importSalesData, importInventoryData, importPromotionData]);
  
  const handleDrop = useCallback((e: React.DragEvent, type: FileType) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file, type);
    }
  }, [handleFileUpload]);
  
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: FileType) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  }, [handleFileUpload]);
  
  const downloadTemplate = (type: FileType) => {
    const template = getFileTemplate(type);
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `模板_${type === 'sales' ? '销售历史' : type === 'inventory' ? '库存快照' : '促销日历'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleRunForecast = () => {
    runForecast();
    setTimeout(() => {
      navigate('/overview');
    }, 100);
  };
  
  const canRunForecast = importState.salesImported && importState.inventoryImported;
  
  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">数据导入</h1>
          <p className="text-neutral-500 mt-1">
            第一步：导入销售历史和库存快照数据，系统将自动计算安全库存和补货建议
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadSampleData}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
          >
            <Zap className="w-4 h-4" />
            加载示例数据
          </button>
          
          {importState.salesImported && importState.inventoryImported && (
            <button
              onClick={handleRunForecast}
              disabled={isCalculating}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shadow-lg shadow-primary-600/20 disabled:opacity-50"
            >
              <PlayCircle className="w-4 h-4" />
              {isCalculating ? '计算中...' : '运行预测'}
            </button>
          )}
        </div>
      </div>
      
      <StepIndicator
        currentStep={importState.step}
        salesImported={importState.salesImported}
        inventoryImported={importState.inventoryImported}
        promotionImported={importState.promotionImported}
      />
      
      {lastCalculationHash && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-success-800">数据已就绪</p>
            <p className="text-xs text-success-600">
              已导入 {importState.salesRowCount} 条销售记录，{importState.inventoryRowCount} 条库存记录
              {importState.promotionImported && `，${importState.promotionRowCount} 条促销记录`}
            </p>
          </div>
          <button
            onClick={() => navigate('/overview')}
            className="ml-auto flex items-center gap-1 text-sm font-medium text-success-700 hover:text-success-800"
          >
            查看库存概览 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="flex border-b border-neutral-200">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const isCompleted =
              (tab.key === 'sales' && importState.salesImported) ||
              (tab.key === 'inventory' && importState.inventoryImported) ||
              (tab.key === 'promotion' && importState.promotionImported);
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-6 py-4 text-left transition-all ${
                  isActive
                    ? 'bg-primary-50 border-b-2 border-primary-500'
                    : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tab.key === 'sales' ? (
                    <FileSpreadsheet className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-neutral-400'}`} />
                  ) : tab.key === 'inventory' ? (
                    <FileText className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-neutral-400'}`} />
                  ) : (
                    <FileText className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-neutral-400'}`} />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-primary-700' : 'text-neutral-700'}`}>
                      {tab.label}
                      {isCompleted && <CheckCircle2 className="inline w-4 h-4 ml-2 text-success-500" />}
                    </p>
                    <p className="text-xs text-neutral-500">{tab.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => handleDrop(e, activeTab)}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragOver
                ? 'border-primary-500 bg-primary-50'
                : 'border-neutral-300 hover:border-primary-300 hover:bg-neutral-50'
            }`}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-primary-500' : 'text-neutral-400'}`} />
            <p className="text-lg font-medium text-neutral-700 mb-2">
              拖拽文件到此处上传
            </p>
            <p className="text-sm text-neutral-500 mb-4">
              支持 CSV 或 Excel 格式，文件大小不超过 10MB
            </p>
            
            <div className="flex items-center justify-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileInput(e, activeTab)}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                  <Upload className="w-4 h-4" />
                  选择文件
                </span>
              </label>
              
              <button
                onClick={() => downloadTemplate(activeTab)}
                className="flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                下载模板
              </button>
            </div>
          </div>
          
          {errors.length > 0 && (
            <div className="mt-6 bg-danger-50 border border-danger-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-danger-600" />
                <p className="font-medium text-danger-800">
                  发现 {errors.length} 条错误
                </p>
              </div>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-danger-600">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">行号</th>
                      <th className="pb-2 pr-4 font-medium">字段</th>
                      <th className="pb-2 pr-4 font-medium">错误信息</th>
                      <th className="pb-2 font-medium">值</th>
                    </tr>
                  </thead>
                  <tbody className="text-danger-700">
                    {errors.slice(0, 10).map((err, idx) => (
                      <tr key={idx} className="border-t border-danger-100">
                        <td className="py-2 pr-4 font-mono">{err.row}</td>
                        <td className="py-2 pr-4 font-medium">{err.field}</td>
                        <td className="py-2 pr-4">{err.message}</td>
                        <td className="py-2 font-mono text-xs">{err.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {errors.length > 10 && (
                  <p className="mt-2 text-xs text-danger-600">
                    还有 {errors.length - 10} 条错误未显示
                  </p>
                )}
              </div>
            </div>
          )}
          
          {importResult && importResult.success && (
            <div className="mt-6 bg-success-50 border border-success-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-success-600" />
                <p className="font-medium text-success-800">
                  成功导入 {importResult.data.length} 条记录
                </p>
              </div>
              <div className="bg-white rounded border border-success-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-success-50/50 text-left text-success-700">
                    <tr>
                      {Object.keys(importResult.preview[0] || {}).slice(0, 5).map((key) => (
                        <th key={key} className="py-2 px-3 font-medium text-xs">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-neutral-700">
                    {importResult.preview.map((row, idx) => (
                      <tr key={idx} className="border-t border-success-100">
                        {Object.values(row).slice(0, 5).map((val, vIdx) => (
                          <td key={vIdx} className="py-2 px-3 font-mono text-xs">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {!importState.promotionImported && importState.salesImported && importState.inventoryImported && (
            <div className="mt-6 bg-info-50 border border-info-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-info-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-info-800 mb-1">
                    提示：可补充导入促销日历
                  </p>
                  <p className="text-sm text-info-700 mb-3">
                    如果有促销活动数据，补充导入后系统会自动调整安全库存计算，
                    并清晰标注促销日历对各SKU补货建议的影响。
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        loadPromotionData();
                        createVersion('版本2_含促销', '补充导入促销日历后重新计算');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-info-600 text-white rounded-lg hover:bg-info-700 transition-colors text-sm font-medium"
                    >
                      <Zap className="w-4 h-4" />
                      加载示例促销数据
                    </button>
                    <span className="text-sm text-info-600">
                      或在上方「促销日历」标签页导入您的促销数据
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {canRunForecast && (
        <div className="flex justify-end gap-3">
          {importState.salesImported && importState.inventoryImported && !importState.promotionImported && (
            <button
              onClick={() => {
                createVersion('版本1_无促销', '仅导入销售历史和库存快照');
                handleRunForecast();
              }}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all text-sm font-medium shadow-lg shadow-primary-600/20"
            >
              <PlayCircle className="w-4 h-4" />
              保存版本并运行预测
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {importState.promotionImported && (
            <button
              onClick={() => {
                createVersion('版本2_含促销', '补充导入促销日历后重新计算');
                handleRunForecast();
              }}
              className="flex items-center gap-2 px-6 py-3 bg-info-600 text-white rounded-lg hover:bg-info-700 transition-all text-sm font-medium shadow-lg shadow-info-600/20"
            >
              <PlayCircle className="w-4 h-4" />
              保存版本并重新计算
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
