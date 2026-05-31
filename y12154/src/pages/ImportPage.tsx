import React, { useState, useCallback, useMemo } from 'react';
import { FileUp, Upload, CheckCircle, AlertCircle, FileSpreadsheet, X, ChevronRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../stores/dataStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { ColumnMapping, CleaningResult } from '../types';
import { detectColumns, validateMapping } from '../engines/dataCleaningEngine';

const REQUIRED_FIELDS: Array<{ key: keyof ColumnMapping; label: string }> = [
  { key: 'elevatorNo', label: '电梯编号' },
  { key: 'ratedSpeed', label: '额定速度' },
  { key: 'actualLoad', label: '实际载荷' },
  { key: 'brakeTime', label: '制动时间' },
];

const OPTIONAL_FIELDS: Array<{ key: keyof ColumnMapping; label: string }> = [
  { key: 'ratedLoad', label: '额定载荷' },
  { key: 'actualSpeed', label: '实际速度' },
  { key: 'speedCurve', label: '速度曲线' },
  { key: 'inspectionDate', label: '检验日期' },
  { key: 'inspector', label: '检验员' },
  { key: 'remark', label: '备注' },
];

const SUPPORTED_FORMATS = ['.xlsx', '.xls', '.csv'];

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { importAndCleanData, isLoading } = useDataStore();

  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({} as ColumnMapping);
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);
  const [cleanResult, setCleanResult] = useState<CleaningResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(fileExt)) {
      setMappingErrors(['不支持的文件格式，请上传 Excel (.xlsx, .xls) 或 CSV (.csv) 文件']);
      return;
    }

    setFile(selectedFile);
    setCleanResult(null);
    setShowPreview(false);
    setMappingErrors([]);

    try {
      const text = await selectedFile.text();
      let data: any[];
      let cols: string[];

      if (fileExt === '.csv') {
        const Papa = await import('papaparse');
        const result = Papa.parse(text, { header: true, skipEmptyLines: false });
        data = result.data;
        cols = result.meta.fields || [];
      } else {
        const XLSX = await import('xlsx');
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (jsonData.length > 0) {
          const headerRow = jsonData[0] as string[];
          cols = headerRow.map(String);
          data = jsonData.slice(1).map((row: any[]) => {
            const obj: any = {};
            headerRow.forEach((header, idx) => {
              obj[String(header)] = row[idx] ?? '';
            });
            return obj;
          });
        } else {
          data = [];
          cols = [];
        }
      }

      setRawData(data);
      setColumns(cols);

      if (cols.length > 0) {
        const detected = detectColumns(cols);
        setMapping(detected);
      }
    } catch (error) {
      console.error('File parsing error:', error);
      setMappingErrors(['文件解析失败，请检查文件格式是否正确']);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleMappingChange = useCallback((field: keyof ColumnMapping, columnName: string) => {
    setMapping(prev => ({
      ...prev,
      [field]: columnName || undefined,
    }));
  }, []);

  const mappingValidation = useMemo(() => {
    if (!Object.keys(mapping).length) return { valid: false, missing: [] };
    return validateMapping(mapping);
  }, [mapping]);

  const handlePreview = useCallback(() => {
    const validation = validateMapping(mapping);
    if (!validation.valid) {
      setMappingErrors(validation.missing);
      return;
    }
    setMappingErrors([]);
    setShowPreview(true);
  }, [mapping]);

  const handleImport = useCallback(async () => {
    if (!file || !rawData.length) return;

    try {
      const result = await importAndCleanData(rawData, mapping, file.name);
      setCleanResult(result);
    } catch (error) {
      console.error('Import error:', error);
      setMappingErrors(['数据导入失败，请重试']);
    }
  }, [file, rawData, mapping, importAndCleanData]);

  const clearFile = useCallback(() => {
    setFile(null);
    setRawData([]);
    setColumns([]);
    setMapping({} as ColumnMapping);
    setMappingErrors([]);
    setCleanResult(null);
    setShowPreview(false);
  }, []);

  const canProceed = mappingValidation.valid && rawData.length > 0 && !isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileUp className="w-7 h-7 text-blue-900" />
            数据导入
          </h1>
          <p className="text-slate-500 mt-1">上传电梯检验数据，自动识别列名并清洗数据</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!file ? (
            <div
              className={`border-2 border-dashed cursor-pointer transition-all bg-white rounded-lg shadow-card ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-blue-700" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">拖拽文件到此处</h3>
                <p className="text-slate-500 mb-4">或点击选择文件</p>
                <p className="text-xs text-slate-400">支持格式: {SUPPORTED_FORMATS.join(', ')}</p>
                <input
                  id="fileInput"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>
            </div>
          ) : (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{file.name}</h3>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB · {rawData.length} 行数据 · {columns.length} 列
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile} leftIcon={<X className="w-4 h-4" />}>
                  更换
                </Button>
              </div>

              {mappingErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 mb-1">请修正以下问题：</p>
                      <ul className="text-sm text-red-700 space-y-1">
                        {mappingErrors.map((error, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <span className="text-red-400">•</span> {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    必填字段
                    <Badge variant="danger" size="sm">必须映射</Badge>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {REQUIRED_FIELDS.map(field => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {field.label} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={mapping[field.key] || ''}
                          onChange={e => handleMappingChange(field.key, e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                        >
                          <option value="">请选择列...</option>
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    可选字段
                    <Badge variant="info" size="sm">可选</Badge>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {OPTIONAL_FIELDS.map(field => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {field.label}
                        </label>
                        <select
                          value={mapping[field.key] || ''}
                          onChange={e => handleMappingChange(field.key, e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                        >
                          <option value="">（不使用）</option>
                          {columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {showPreview && rawData.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <h5 className="text-sm font-medium text-slate-700">数据预览（前5行）</h5>
                    </div>
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">#</th>
                            {Object.keys(mapping).filter(k => mapping[k as keyof ColumnMapping]).map(key => (
                              <th key={key} className="px-3 py-2 text-left font-semibold text-slate-600">
                                {REQUIRED_FIELDS.find(f => f.key === key)?.label || OPTIONAL_FIELDS.find(f => f.key === key)?.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rawData.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                              {Object.keys(mapping).filter(k => mapping[k as keyof ColumnMapping]).map(key => (
                                <td key={key} className="px-3 py-2 text-slate-600 font-mono">
                                  {String(row[mapping[key as keyof ColumnMapping]!] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  {!showPreview ? (
                    <Button
                      variant="primary"
                      onClick={handlePreview}
                      disabled={!canProceed}
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      预览数据
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setShowPreview(false)}>
                        返回修改
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleImport}
                        isLoading={isLoading}
                        rightIcon={<CheckCircle className="w-4 h-4" />}
                      >
                        开始导入
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900">导入说明</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>系统支持自动识别常见列名，如：</p>
              <ul className="space-y-1 text-xs">
                <li>• 电梯编号、设备编号、梯号</li>
                <li>• 额定速度、速度、V</li>
                <li>• 实际载荷、载重、载荷</li>
                <li>• 制动时间、制动时长、t</li>
              </ul>
              <p className="pt-2 border-t border-slate-100">
                导入过程中会自动检测：
              </p>
              <ul className="space-y-1 text-xs">
                <li>• 空行 → 自动过滤</li>
                <li>• 备注行 → 单独归档</li>
                <li>• 缺列数据 → 标记为坏行</li>
                <li>• 无效值 → 标记为坏行</li>
              </ul>
            </div>
          </Card>

          {cleanResult && (
            <Card className="border-emerald-300 bg-emerald-50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-emerald-900">导入完成</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-700">正常数据</span>
                  <span className="font-medium text-emerald-900">{cleanResult.normalRecords.length} 条</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">坏行数量</span>
                  <span className="font-medium text-amber-700">{cleanResult.badRows.length} 条</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-emerald-200">
                  <span className="text-emerald-700">数据质量</span>
                  <span className="font-medium text-emerald-900">
                    {cleanResult.normalRecords.length + cleanResult.badRows.length > 0
                      ? ((cleanResult.normalRecords.length / (cleanResult.normalRecords.length + cleanResult.badRows.length)) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate('/cleaning')}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  查看清洗结果
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/calculation')}
                >
                  立即验算
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
