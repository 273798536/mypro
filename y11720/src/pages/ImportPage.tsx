import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { ImportService } from '../services/importService';
import { ReportService } from '../services/reportService';
import type { CalculationParams, ConflictStrategy, ImportResult } from '../types';

export default function ImportPage() {
  const { calculations, importCalculations } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importedData, setImportedData] = useState<CalculationParams[]>([]);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('append');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const conflictCount = ImportService.getConflictCount(calculations, importedData);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);
    setImportedData([]);
    setImportSuccess(false);

    try {
      if (file.name.endsWith('.csv')) {
        const result = await ImportService.parseCSV(file);
        setImportResult(result);
        setImportedData(result.data);
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        try {
          const { params } = ReportService.importFromJSON(text);
          setImportedData([params]);
          setImportResult({
            success: true,
            data: [params],
            errors: [],
            warnings: [],
          });
        } catch (err) {
          setImportResult({
            success: false,
            data: [],
            errors: [(err as Error).message],
            warnings: [],
          });
        }
      } else {
        setImportResult({
          success: false,
          data: [],
          errors: ['不支持的文件格式，请上传CSV或JSON文件'],
          warnings: [],
        });
      }
    } catch (err) {
      setImportResult({
        success: false,
        data: [],
        errors: ['文件解析失败：' + (err as Error).message],
        warnings: [],
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    if (importedData.length === 0) return;

    const resolved = ImportService.resolveConflicts(
      calculations,
      importedData,
      conflictStrategy
    );

    const toImport = resolved.filter(
      (r) => !calculations.some((c) => c.id === r.id)
    );

    importCalculations(toImport);
    setImportSuccess(true);
    setImportedData([]);
    setImportResult(null);

    setTimeout(() => setImportSuccess(false), 3000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.json'))) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = file.name.endsWith('.csv') ? fileInputRef : jsonInputRef;
      if (input.current) {
        input.current.files = dataTransfer.files;
        const event = { target: input.current } as React.ChangeEvent<HTMLInputElement>;
        handleFileSelect(event);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据导入</h1>
          <p className="text-gray-500 mt-1">批量导入计算方案数据</p>
        </div>
        <button
          onClick={() => ImportService.downloadTemplate()}
          className="btn btn-secondary"
        >
          <Download className="w-4 h-4" />
          下载CSV模板
        </button>
      </div>

      {importSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-fade-in-up">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">数据导入成功！</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="card"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="card-body">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">导入CSV文件</h3>
              <p className="text-sm text-gray-500 mb-4">
                支持批量导入多个计算方案
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="btn btn-primary w-full"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? '处理中...' : '选择CSV文件'}
              </button>
              <p className="text-xs text-gray-400 mt-3">
                或拖拽文件到此处
              </p>
            </div>
          </div>
        </div>

        <div
          className="card"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="card-body">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileJson className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">导入JSON文件</h3>
              <p className="text-sm text-gray-500 mb-4">
                导入之前导出的JSON计算数据
              </p>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => jsonInputRef.current?.click()}
                disabled={isImporting}
                className="btn btn-secondary w-full"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? '处理中...' : '选择JSON文件'}
              </button>
              <p className="text-xs text-gray-400 mt-3">
                或拖拽文件到此处
              </p>
            </div>
          </div>
        </div>
      </div>

      {importResult && (
        <div className="card animate-fade-in-up">
          <div className="card-header flex items-center gap-2">
            {importResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            解析结果
          </div>
          <div className="card-body">
            {importResult.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  错误 ({importResult.errors.length})
                </h4>
                <div className="space-y-1">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {importResult.warnings.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-warning-600 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  警告 ({importResult.warnings.length})
                </h4>
                <div className="space-y-1">
                  {importResult.warnings.map((warn, i) => (
                    <p key={i} className="text-sm text-warning-600 bg-warning-50 px-3 py-2 rounded">
                      {warn}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {importResult.success && importResult.data.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  成功解析 {importResult.data.length} 条数据
                </h4>
                <div className="overflow-x-auto max-h-60 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          方案名称
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          管径
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          流量
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          管长
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          来源
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importResult.data.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">
                            {item.name}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600">
                            {item.diameter} {item.diameterUnit}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600">
                            {item.flowRate} {item.flowRateUnit}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600">
                            {item.pipeLength} {item.pipeLengthUnit}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {item.source || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {importedData.length > 0 && (
        <div className="card animate-fade-in-up">
          <div className="card-header">冲突处理</div>
          <div className="card-body">
            {conflictCount > 0 ? (
              <div className="mb-4 p-4 bg-warning-50 border border-warning-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-800">
                      检测到 {conflictCount} 条重复数据
                    </p>
                    <p className="text-sm text-warning-600 mt-1">
                      以下ID的数据已存在，请选择处理策略
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-green-700">无冲突数据，可直接导入</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <label
                className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  conflictStrategy === 'skip'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value="skip"
                  checked={conflictStrategy === 'skip'}
                  onChange={() => setConflictStrategy('skip')}
                  className="absolute opacity-0"
                />
                <div className="font-medium text-gray-800">忽略重复</div>
                <p className="text-sm text-gray-500 mt-1">
                  跳过已存在的数据，只导入新增的
                </p>
              </label>

              <label
                className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  conflictStrategy === 'overwrite'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value="overwrite"
                  checked={conflictStrategy === 'overwrite'}
                  onChange={() => setConflictStrategy('overwrite')}
                  className="absolute opacity-0"
                />
                <div className="font-medium text-gray-800">覆盖更新</div>
                <p className="text-sm text-gray-500 mt-1">
                  用新数据覆盖已存在的数据
                </p>
              </label>

              <label
                className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  conflictStrategy === 'append'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value="append"
                  checked={conflictStrategy === 'append'}
                  onChange={() => setConflictStrategy('append')}
                  className="absolute opacity-0"
                />
                <div className="font-medium text-gray-800">追加导入</div>
                <p className="text-sm text-gray-500 mt-1">
                  重命名重复数据并全部导入
                </p>
              </label>
            </div>

            <button onClick={handleImport} className="btn btn-primary w-full">
              <FileText className="w-4 h-4" />
              确认导入 ({importedData.length} 条)
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">使用说明</div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">CSV格式说明</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• CSV文件需包含表头行</p>
                <p>• 必填字段：diameter, flowRate, pipeLength, roughness</p>
                <p>• 可选字段：id, name, diameterUnit, flowRateUnit, pipeLengthUnit, roughnessUnit, fluidId, valves, source</p>
                <p>• valves字段为JSON数组格式，例如：{'[{\"type\":\"闸阀\",\"count\":2,\"kValue\":0.17}]'}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-3">JSON格式说明</h4>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• 使用系统导出的JSON文件格式</p>
                <p>• 包含完整的计算参数和结果数据</p>
                <p>• 支持单个方案的导入导出</p>
                <p>• 保留完整的编辑历史记录</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
