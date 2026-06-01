import { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Upload, Database, Camera, RotateCcw, Eye, EyeOff, Layers, ChevronDown, FileJson, Table } from 'lucide-react';
import type { ExampleType } from '../types';
import { EXAMPLE_METADATA } from '../data/exampleData';
import { useStarmapStore } from '../store/useStarmapStore';
import { generateExample } from '../data/exampleData';
import { analyzeDataQuality } from '../utils/dataQuality';
import { detectOverlaps } from '../utils/overlapDetection';
import { parseCSV, parseJSON, convertToDataPoints, autoDetectFields, downloadScreenshot, takeScreenshot, type ImportConfig } from '../utils/dataImport';

interface TopToolbarProps {
  onTakeScreenshot?: () => string | null;
}

export function TopToolbar({ onTakeScreenshot }: TopToolbarProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importConfig, setImportConfig] = useState<Partial<ImportConfig>>({});
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const setDataPoints = useStarmapStore(s => s.setDataPoints);
  const setQualityReport = useStarmapStore(s => s.setQualityReport);
  const setOverlapRegions = useStarmapStore(s => s.setOverlapRegions);
  const showOverlapHulls = useStarmapStore(s => s.showOverlapHulls);
  const setShowOverlapHulls = useStarmapStore(s => s.setShowOverlapHulls);
  const datasetName = useStarmapStore(s => s.datasetName);
  const selectedPointIds = useStarmapStore(s => s.selectedPointIds);
  const addScreenshot = useStarmapStore(s => s.addScreenshot);
  const dataPoints = useStarmapStore(s => s.dataPoints);
  
  const loadExample = async (type: ExampleType) => {
    const { name, points } = generateExample(type);
    setDataPoints(points, name);
    
    const qualityReport = analyzeDataQuality(points);
    setQualityReport(qualityReport);
    
    const { regions } = detectOverlaps(points);
    setOverlapRegions(regions);
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    
    let rawData: any[];
    if (file.name.endsWith('.csv')) {
      rawData = await parseCSV(file);
    } else if (file.name.endsWith('.json')) {
      rawData = await parseJSON(file);
    } else {
      alert('请上传CSV或JSON文件');
      return;
    }
    
    setPreviewData(rawData.slice(0, 5));
    
    if (rawData.length > 0) {
      const headers = Object.keys(rawData[0]);
      const detected = autoDetectFields(headers);
      setImportConfig(detected);
    }
  };
  
  const handleImport = () => {
    if (!importFile || !previewData || !importConfig.vectorFields || !importConfig.labelField || !importConfig.groupField) {
      alert('请完善导入配置');
      return;
    }
    
    const config: ImportConfig = {
      vectorFields: importConfig.vectorFields,
      labelField: importConfig.labelField,
      groupField: importConfig.groupField,
      confidenceField: importConfig.confidenceField,
      predictedLabelField: importConfig.predictedLabelField,
    };
    
    let allData: any[];
    if (importFile.name.endsWith('.csv')) {
      parseCSV(importFile).then(data => {
        processImportData(data, config, importFile.name);
      });
    } else {
      parseJSON(importFile).then(data => {
        processImportData(data, config, importFile.name);
      });
    }
    
    setShowImportDialog(false);
    setImportFile(null);
    setPreviewData(null);
  };
  
  const processImportData = (data: any[], config: ImportConfig, filename: string) => {
    const points = convertToDataPoints(data, config);
    const datasetName = filename.replace(/\.(csv|json)$/i, '');
    
    setDataPoints(points, datasetName);
    
    const qualityReport = analyzeDataQuality(points);
    setQualityReport(qualityReport);
    
    const { regions } = detectOverlaps(points);
    setOverlapRegions(regions);
  };
  
  const handleExportScreenshot = () => {
    let dataUrl: string | null = null;
    
    if (onTakeScreenshot) {
      dataUrl = onTakeScreenshot();
    } else if (typeof (window as any).__takeStarmapScreenshot === 'function') {
      (window as any).__takeStarmapScreenshot();
      return;
    }
    
    if (!dataUrl) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        dataUrl = canvas.toDataURL('image/png');
      }
    }
    
    if (dataUrl) {
      const timestamp = new Date().toISOString();
      const screenshot = {
        id: `shot-${Date.now()}`,
        timestamp,
        thumbnail: dataUrl,
        dataPoints: selectedPointIds,
        viewState: {
          position: [0, 0, 0] as [number, number, number],
          target: [0, 0, 0] as [number, number, number],
        },
      };
      
      addScreenshot(screenshot);
      
      const filename = `starmap-${datasetName || 'export'}-${Date.now()}`;
      downloadScreenshot(dataUrl, filename);
    }
  };
  
  const handleResetView = () => {
    window.location.reload();
  };
  
  return (
    <>
      <div className="h-14 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">★</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm tracking-wide">AI特征误判星图</h1>
              {datasetName && (
                <p className="text-gray-500 text-[10px]">{datasetName}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-md border border-gray-700 transition-colors">
                <Database className="w-4 h-4" />
                <span>加载示例</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-1 z-50">
                {(Object.keys(EXAMPLE_METADATA) as ExampleType[]).map(type => (
                  <DropdownMenu.Item
                    key={type}
                    onClick={() => loadExample(type)}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center flex-shrink-0 border border-gray-700">
                      {type === 'overlap' && <Layers className="w-5 h-5 text-purple-400" />}
                      {type === 'occlusion' && <EyeOff className="w-5 h-5 text-orange-400" />}
                      {type === 'instability' && <div className="text-xl">〰️</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium">{EXAMPLE_METADATA[type].name}</div>
                      <div className="text-gray-500 text-xs line-clamp-2">{EXAMPLE_METADATA[type].description}</div>
                    </div>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          
          <button
            onClick={() => setShowImportDialog(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-md transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>导入数据</span>
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="w-px h-6 bg-gray-700 mx-1" />
          
          <button
            onClick={() => setShowOverlapHulls(!showOverlapHulls)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors ${
              showOverlapHulls
                ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {showOverlapHulls ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>重叠区域</span>
          </button>
          
          <button
            onClick={handleExportScreenshot}
            disabled={dataPoints.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-md border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            <span>导出截图</span>
          </button>
          
          <button
            onClick={handleResetView}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-md border border-gray-700 transition-colors"
            title="重置视图"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <Dialog.Root open={showImportDialog} onOpenChange={setShowImportDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] max-h-[80vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
            <Dialog.Title className="px-6 py-4 border-b border-gray-700 text-white font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-400" />
              导入数据
            </Dialog.Title>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {!importFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl p-12 text-center cursor-pointer transition-colors"
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-300 mb-2">点击或拖拽上传CSV或JSON文件</p>
                  <p className="text-gray-500 text-sm">支持包含样本向量、真实标签、分组字段的数据</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    {importFile.name.endsWith('.csv') ? (
                      <Table className="w-8 h-8 text-green-400" />
                    ) : (
                      <FileJson className="w-8 h-8 text-yellow-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{importFile.name}</p>
                      <p className="text-gray-500 text-xs">{previewData?.length || 0} 行数据</p>
                    </div>
                    <button
                      onClick={() => { setImportFile(null); setPreviewData(null); }}
                      className="text-gray-500 hover:text-white text-xs"
                    >
                      更换文件
                    </button>
                  </div>
                  
                  {previewData && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">向量字段</label>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys(previewData[0] || {}).map(field => (
                          <button
                            key={field}
                            onClick={() => {
                              const current = importConfig.vectorFields || [];
                              const newFields = current.includes(field)
                                ? current.filter(f => f !== field)
                                : [...current, field];
                              setImportConfig({ ...importConfig, vectorFields: newFields });
                            }}
                            className={`px-2 py-1 text-xs rounded border transition-all ${
                              importConfig.vectorFields?.includes(field)
                                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                          >
                            {field}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">真实标签字段</label>
                      <select
                        value={importConfig.labelField || ''}
                        onChange={(e) => setImportConfig({ ...importConfig, labelField: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                      >
                        <option value="">选择字段...</option>
                        {previewData && Object.keys(previewData[0] || {}).map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">分组字段</label>
                      <select
                        value={importConfig.groupField || ''}
                        onChange={(e) => setImportConfig({ ...importConfig, groupField: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                      >
                        <option value="">选择字段...</option>
                        {previewData && Object.keys(previewData[0] || {}).map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">置信度字段 (可选)</label>
                      <select
                        value={importConfig.confidenceField || ''}
                        onChange={(e) => setImportConfig({ ...importConfig, confidenceField: e.target.value || undefined })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                      >
                        <option value="">无</option>
                        {previewData && Object.keys(previewData[0] || {}).map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">预测标签字段 (可选)</label>
                      <select
                        value={importConfig.predictedLabelField || ''}
                        onChange={(e) => setImportConfig({ ...importConfig, predictedLabelField: e.target.value || undefined })}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm"
                      >
                        <option value="">无</option>
                        {previewData && Object.keys(previewData[0] || {}).map(field => (
                          <option key={field} value={field}>{field}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {previewData && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">数据预览 (前5行)</label>
                      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-800">
                            <tr>
                              {Object.keys(previewData[0]).map(field => (
                                <th key={field} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">
                                  {field}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row, i) => (
                              <tr key={i} className="border-t border-gray-700/50">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="px-3 py-2 text-gray-300 whitespace-nowrap font-mono">
                                    {String(val).slice(0, 20)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
              <Dialog.Close className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-md transition-colors">
                取消
              </Dialog.Close>
              <button
                onClick={handleImport}
                disabled={!importFile || !importConfig.vectorFields?.length || !importConfig.labelField || !importConfig.groupField}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                导入
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
