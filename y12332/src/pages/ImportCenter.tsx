import { useState, useRef, useCallback, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Database,
  Clock,
  User,
  FileText,
  Package,
  Thermometer,
  Wrench,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Trash2,
  Eye,
  Play,
  Download,
  Settings,
  Layers,
  GitBranch,
  Activity,
  ScanEye,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppStore } from '@/store';
import { ImportFileType, SourceFile } from '@/types';
import { formatDateTime, parseCSV, generateId } from '@/utils/helpers';
import { parseFileContent, mergeParsedData, generateSampleFile } from '@/utils/fileParser';
import { cn } from '@/lib/utils';

// 文件类型配置
const FILE_TYPE_CONFIG: Record<
  ImportFileType,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
    requiredFields: string[];
  }
> = {
  temperature: {
    label: '温度数据',
    icon: <Thermometer className="w-5 h-5" />,
    color: 'text-cold-400',
    bgColor: 'bg-cold-500/10',
    borderColor: 'border-cold-500/30',
    description: '包含传感器ID、时间戳、温度值的时序数据',
    requiredFields: ['sensorId', 'timestamp', 'temperature'],
  },
  cargo: {
    label: '货品批次',
    icon: <Package className="w-5 h-5" />,
    color: 'text-alert-orange',
    bgColor: 'bg-alert-orange/10',
    borderColor: 'border-alert-orange/30',
    description: '包含货品ID、批次信息、起止时间、温区要求',
    requiredFields: ['cargoId', 'productName', 'startTime', 'endTime'],
  },
  maintenance: {
    label: '维修备注',
    icon: <Wrench className="w-5 h-5" />,
    color: 'text-alert-yellow',
    bgColor: 'bg-alert-yellow/10',
    borderColor: 'border-alert-yellow/30',
    description: '包含传感器维护记录、故障处理、操作人信息',
    requiredFields: ['sensorId', 'eventTime', 'eventType', 'operator'],
  },
};

// 预览数据接口
interface PreviewData {
  fileId: string;
  fileName: string;
  fileType: ImportFileType;
  headers: string[];
  sampleData: Record<string, unknown>[];
  totalRows: number;
  fieldMapping: Record<string, string>;
  anomalies: PreviewAnomaly[];
}

interface PreviewAnomaly {
  row: number;
  field: string;
  value: string;
  issue: string;
  severity: 'warning' | 'error';
}

interface PendingFile {
  id: string;
  file: File;
  fileType: ImportFileType;
  preview?: PreviewData;
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  error?: string;
  parseResult?: Awaited<ReturnType<typeof parseFileContent>>;
}

const ImportCenter = () => {
  const { batches, processingLogs, importFiles, isLoading } = useAppStore();
  const [selectedFileType, setSelectedFileType] = useState<ImportFileType>('temperature');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成预览数据
  const generatePreview = useCallback(
    async (file: File, fileType: ImportFileType): Promise<PreviewData> => {
      const text = await file.text();
      let headers: string[] = [];
      let rows: string[][] = [];

      if (file.name.endsWith('.csv')) {
        const parsed = parseCSV(text);
        headers = parsed[0] || [];
        rows = parsed.slice(1);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        headers = jsonData[0] || [];
        rows = jsonData.slice(1);
      }

      // 字段映射（简单匹配）
      const fieldMapping: Record<string, string> = {};
      const requiredFields = FILE_TYPE_CONFIG[fileType].requiredFields;
      headers.forEach((header) => {
        const lowerHeader = header.toLowerCase();
        for (const field of requiredFields) {
          if (
            lowerHeader.includes(field.toLowerCase()) ||
            lowerHeader.includes(field.replace(/([A-Z])/g, '_$1').toLowerCase())
          ) {
            fieldMapping[header] = field;
            break;
          }
        }
        if (!fieldMapping[header]) {
          fieldMapping[header] = header;
        }
      });

      // 采样数据（前10行）
      const sampleData = rows.slice(0, 10).map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((header, idx) => {
          obj[fieldMapping[header] || header] = row[idx] || '';
        });
        return obj;
      });

      // 检测异常值
      const anomalies: PreviewAnomaly[] = [];
      rows.forEach((row, rowIdx) => {
        headers.forEach((header, colIdx) => {
          const value = row[colIdx] || '';
          const mappedField = fieldMapping[header];

          // 检查必填字段为空
          if (requiredFields.includes(mappedField) && !value.trim()) {
            anomalies.push({
              row: rowIdx + 2,
              field: header,
              value,
              issue: '必填字段为空',
              severity: 'error',
            });
          }

          // 温度值范围检查
          if (mappedField === 'temperature' && value) {
            const temp = parseFloat(value);
            if (isNaN(temp)) {
              anomalies.push({
                row: rowIdx + 2,
                field: header,
                value,
                issue: '温度值格式错误',
                severity: 'error',
              });
            } else if (temp < -40 || temp > 50) {
              anomalies.push({
                row: rowIdx + 2,
                field: header,
                value,
                issue: '温度值超出合理范围（-40°C ~ 50°C）',
                severity: 'warning',
              });
            }
          }

          // 时间格式检查
          if (
            (mappedField === 'timestamp' ||
              mappedField === 'eventTime' ||
              mappedField === 'startTime' ||
              mappedField === 'endTime') &&
            value
          ) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              anomalies.push({
                row: rowIdx + 2,
                field: header,
                value,
                issue: '时间格式无法解析',
                severity: 'error',
              });
            }
          }
        });
      });

      return {
        fileId: generateId(),
        fileName: file.name,
        fileType,
        headers,
        sampleData,
        totalRows: rows.length,
        fieldMapping,
        anomalies: anomalies.slice(0, 50),
      };
    },
    []
  );

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const validExtensions = ['.csv', '.xlsx', '.xls'];

      const tempBatchId = `TEMP-${generateId()}`;

      const newPendingFiles: PendingFile[] = fileArray
        .filter((file) => {
          const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
          return validExtensions.includes(ext);
        })
        .map((file) => ({
          id: generateId(),
          file,
          fileType: selectedFileType,
          status: 'analyzing' as const,
        }));

      setPendingFiles((prev) => [...prev, ...newPendingFiles]);

      // 异步分析每个文件（同时生成预览和解析真实数据）
      for (const pendingFile of newPendingFiles) {
        try {
          const [preview, parseResult] = await Promise.all([
            generatePreview(pendingFile.file, pendingFile.fileType),
            parseFileContent(pendingFile.file, pendingFile.fileType, tempBatchId),
          ]);
          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === pendingFile.id
                ? { ...f, preview, parseResult, status: 'ready' as const }
                : f
            )
          );
        } catch (err) {
          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === pendingFile.id
                ? {
                    ...f,
                    status: 'error' as const,
                    error: err instanceof Error ? err.message : '文件解析失败',
                  }
                : f
            )
          );
        }
      }
    },
    [selectedFileType, generatePreview]
  );

  // 拖拽事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  // 移除待处理文件
  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedPreviewFile === id) {
      setSelectedPreviewFile(null);
    }
  }, [selectedPreviewFile]);

  // 更新文件类型
  const updatePendingFileType = useCallback((id: string, fileType: ImportFileType) => {
    setPendingFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, fileType, status: 'analyzing' as const } : f
      )
    );

    const tempBatchId = `TEMP-${generateId()}`;
    
    // 重新生成预览和解析
    const file = pendingFiles.find((f) => f.id === id);
    if (file) {
      Promise.all([
        generatePreview(file.file, fileType),
        parseFileContent(file.file, fileType, tempBatchId),
      ]).then(([preview, parseResult]) => {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, preview, parseResult, status: 'ready' as const } : f
          )
        );
      });
    }
  }, [pendingFiles, generatePreview]);

  // 执行导入
  const handleImport = useCallback(async () => {
    const readyFiles = pendingFiles.filter(
      (f) => f.status === 'ready' && f.preview && f.parseResult
    );
    
    if (readyFiles.length === 0) return;

    const sourceFiles: SourceFile[] = readyFiles.map((f) => ({
      id: f.preview!.fileId,
      fileName: f.file.name,
      fileType: f.fileType,
      uploadTime: new Date(),
      uploadedBy: '当前用户',
      recordCount: f.preview!.totalRows,
    }));

    const parseResults = readyFiles.map((f) => f.parseResult!);
    const finalBatchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
    const mergedData = mergeParsedData(parseResults, finalBatchId);

    await importFiles(sourceFiles, mergedData);
    setPendingFiles([]);
    setSelectedPreviewFile(null);
  }, [pendingFiles, importFiles]);

  // 统计数据
  const stats = useMemo(() => {
    const totalBatches = batches.length;
    const totalFiles = batches.reduce((sum, b) => sum + b.sourceFiles.length, 0);
    const totalRecords = batches.reduce(
      (sum, b) => sum + b.sourceFiles.reduce((s, f) => s + f.recordCount, 0),
      0
    );
    const recentLogs = processingLogs.slice(-5);

    return { totalBatches, totalFiles, totalRecords, recentLogs };
  }, [batches, processingLogs]);

  // 当前选中的预览文件
  const currentPreview = pendingFiles.find((f) => f.id === selectedPreviewFile)?.preview;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Database className="w-7 h-7 text-cold-400" />
            数据导入中心
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            支持CSV/Excel文件批量导入，实现多源数据融合与质量检测
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => pendingFiles.length > 0 && setPendingFiles([])}
            className="btn-secondary flex items-center gap-2"
            disabled={pendingFiles.length === 0}
          >
            <Trash2 className="w-4 h-4" />
            清空列表
          </button>
          <button
            onClick={handleImport}
            disabled={
              pendingFiles.filter((f) => f.status === 'ready').length === 0 || isLoading
            }
            className="btn-primary flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isLoading ? '导入中...' : '开始导入'}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 bg-gradient-to-br from-cold-500/10 to-transparent border-cold-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-400">导入批次</p>
              <p className="text-3xl font-mono font-bold text-cold-400 mt-1 glow-text">
                {stats.totalBatches}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-cold-500/20">
              <GitBranch className="w-6 h-6 text-cold-400" />
            </div>
          </div>
        </div>
        <div className="card p-5 bg-gradient-to-br from-alert-orange/10 to-transparent border-alert-orange/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-400">文件总数</p>
              <p className="text-3xl font-mono font-bold text-alert-orange mt-1">
                {stats.totalFiles}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-alert-orange/20">
              <FileSpreadsheet className="w-6 h-6 text-alert-orange" />
            </div>
          </div>
        </div>
        <div className="card p-5 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-400">记录总数</p>
              <p className="text-3xl font-mono font-bold text-green-400 mt-1">
                {stats.totalRecords.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/20">
              <Database className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：文件上传区 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 文件上传区域 */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-cold-400" />
              文件上传
            </h3>

            {/* 文件类型选择 */}
            <div className="mb-4">
              <p className="text-sm text-dark-400 mb-2">选择导入数据类型</p>
              <div className="flex gap-3">
                {(Object.keys(FILE_TYPE_CONFIG) as ImportFileType[]).map((type) => {
                  const config = FILE_TYPE_CONFIG[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setSelectedFileType(type)}
                      className={cn(
                        'flex-1 p-4 rounded-lg border transition-all text-left',
                        selectedFileType === type
                          ? `${config.bgColor} ${config.borderColor}`
                          : 'bg-dark-800/50 border-dark-700 hover:border-dark-600'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={selectedFileType === type ? config.color : 'text-dark-400'}>
                          {config.icon}
                        </span>
                        <span
                          className={cn(
                            'font-medium',
                            selectedFileType === type ? 'text-white' : 'text-dark-300'
                          )}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-dark-500">{config.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 拖拽上传区 */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                isDragging
                  ? 'border-cold-400 bg-cold-500/10'
                  : 'border-dark-600 hover:border-cold-500/50 hover:bg-dark-800/50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
              <div
                className={cn(
                  'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center',
                  isDragging ? 'bg-cold-500/20' : 'bg-dark-700/50'
                )}
              >
                <Upload
                  className={cn('w-8 h-8', isDragging ? 'text-cold-400' : 'text-dark-400')}
                />
              </div>
              <p className="text-white font-medium mb-1">
                {isDragging ? '释放文件开始上传' : '拖拽文件到此处，或点击选择文件'}
              </p>
              <p className="text-sm text-dark-500">支持 CSV、XLSX、XLS 格式，单文件最大 50MB</p>
            </div>
          </div>

          {/* 待处理文件列表 */}
          {pendingFiles.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cold-400" />
                  待导入文件
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-cold-500/20 text-cold-400">
                    {pendingFiles.length}
                  </span>
                </span>
              </h3>

              <div className="space-y-3">
                {pendingFiles.map((pendingFile) => {
                  const config = FILE_TYPE_CONFIG[pendingFile.fileType];
                  const anomalyCount = pendingFile.preview?.anomalies.length || 0;
                  const errorCount =
                    pendingFile.preview?.anomalies.filter((a) => a.severity === 'error').length || 0;

                  return (
                    <div
                      key={pendingFile.id}
                      className={cn(
                        'p-4 rounded-lg border transition-all',
                        selectedPreviewFile === pendingFile.id
                          ? 'bg-cold-500/10 border-cold-500/50'
                          : 'bg-dark-800/50 border-dark-700 hover:border-dark-600'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={cn(
                              'p-2.5 rounded-lg',
                              config.bgColor,
                              config.borderColor,
                              'border'
                            )}
                          >
                            <span className={config.color}>
                              {pendingFile.fileType === 'temperature' ? (
                                <Thermometer className="w-5 h-5" />
                              ) : pendingFile.fileType === 'cargo' ? (
                                <Package className="w-5 h-5" />
                              ) : (
                                <Wrench className="w-5 h-5" />
                              )}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium truncate">
                                {pendingFile.file.name}
                              </p>
                              {pendingFile.status === 'ready' && (
                                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                              )}
                              {pendingFile.status === 'error' && (
                                <XCircle className="w-4 h-4 text-alert-red flex-shrink-0" />
                              )}
                              {pendingFile.status === 'analyzing' && (
                                <Activity className="w-4 h-4 text-cold-400 animate-pulse flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
                              <span>
                                {(pendingFile.file.size / 1024).toFixed(1)} KB
                              </span>
                              {pendingFile.preview && (
                                <>
                                  <span>·</span>
                                  <span>{pendingFile.preview.totalRows} 条记录</span>
                                  {anomalyCount > 0 && (
                                    <>
                                      <span>·</span>
                                      <span
                                        className={
                                          errorCount > 0 ? 'text-alert-red' : 'text-alert-yellow'
                                        }
                                      >
                                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                                        {anomalyCount} 个异常
                                      </span>
                                    </>
                                  )}
                                </>
                              )}
                              {pendingFile.status === 'error' && pendingFile.error && (
                                <span className="text-alert-red">{pendingFile.error}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {/* 类型切换 */}
                          <select
                            value={pendingFile.fileType}
                            onChange={(e) =>
                              updatePendingFileType(
                                pendingFile.id,
                                e.target.value as ImportFileType
                              )
                            }
                            className="px-3 py-1.5 text-sm bg-dark-900/50 border border-dark-600 rounded-lg text-dark-300 focus:outline-none focus:ring-2 focus:ring-cold-500/50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="temperature">温度数据</option>
                            <option value="cargo">货品批次</option>
                            <option value="maintenance">维修备注</option>
                          </select>

                          {/* 预览按钮 */}
                          {pendingFile.status === 'ready' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPreviewFile(
                                  selectedPreviewFile === pendingFile.id
                                    ? null
                                    : pendingFile.id
                                );
                              }}
                              className={cn(
                                'p-2 rounded-lg transition-colors',
                                selectedPreviewFile === pendingFile.id
                                  ? 'bg-cold-500/20 text-cold-400'
                                  : 'hover:bg-dark-700 text-dark-400 hover:text-white'
                              )}
                              title="预览数据"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* 删除按钮 */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removePendingFile(pendingFile.id);
                            }}
                            className="p-2 rounded-lg hover:bg-alert-red/20 text-dark-400 hover:text-alert-red transition-colors"
                            title="移除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 数据预览区 */}
          {currentPreview && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ScanEye className="w-5 h-5 text-cold-400" />
                  数据预览 - {currentPreview.fileName}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-dark-400">
                    共 {currentPreview.totalRows} 条记录，显示前 10 条
                  </span>
                </div>
              </div>

              {/* 字段映射 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-dark-300 mb-2 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-alert-yellow" />
                  字段映射关系
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(currentPreview.fieldMapping).map(([source, target]) => (
                    <div
                      key={source}
                      className="flex items-center gap-2 p-2 bg-dark-800/50 rounded-lg text-xs"
                    >
                      <span className="text-dark-400 truncate">{source}</span>
                      <ArrowRightLeft className="w-3 h-3 text-cold-400 flex-shrink-0" />
                      <span className="text-cold-400 font-medium truncate">{target}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 异常提示 */}
              {currentPreview.anomalies.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-dark-300 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-alert-orange" />
                    数据质量检测
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-alert-orange/20 text-alert-orange">
                      {currentPreview.anomalies.length} 个问题
                    </span>
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {currentPreview.anomalies.map((anomaly, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg text-xs',
                          anomaly.severity === 'error'
                            ? 'bg-alert-red/10 border border-alert-red/30'
                            : 'bg-alert-yellow/10 border border-alert-yellow/30'
                        )}
                      >
                        {anomaly.severity === 'error' ? (
                          <XCircle className="w-4 h-4 text-alert-red flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-alert-yellow flex-shrink-0" />
                        )}
                        <span className="font-mono text-dark-300">第 {anomaly.row} 行</span>
                        <span className="text-dark-400">·</span>
                        <span className="text-dark-300">{anomaly.field}</span>
                        <span className="text-dark-400">·</span>
                        <span
                          className={
                            anomaly.severity === 'error' ? 'text-alert-red' : 'text-alert-yellow'
                          }
                        >
                          {anomaly.issue}
                        </span>
                        <span className="ml-auto font-mono text-dark-500">
                          "{anomaly.value}"
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 数据表格 */}
              <div className="overflow-x-auto rounded-lg border border-dark-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dark-800/80">
                      {currentPreview.headers.map((header, idx) => (
                        <th
                          key={idx}
                          className="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider border-b border-dark-700"
                        >
                          <div className="flex items-center gap-1">
                            <span>{header}</span>
                            {currentPreview.fieldMapping[header] !== header && (
                              <span className="text-cold-400 text-[10px]">
                                → {currentPreview.fieldMapping[header]}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700/50">
                    {currentPreview.sampleData.map((row, rowIdx) => {
                      const rowAnomalies = currentPreview.anomalies.filter(
                        (a) => a.row === rowIdx + 2
                      );
                      return (
                        <tr
                          key={rowIdx}
                          className={cn(
                            'hover:bg-dark-700/30 transition-colors',
                            rowAnomalies.some((a) => a.severity === 'error')
                              ? 'bg-alert-red/5'
                              : rowAnomalies.length > 0
                              ? 'bg-alert-yellow/5'
                              : ''
                          )}
                        >
                          {currentPreview.headers.map((header, colIdx) => {
                            const cellValue = row[currentPreview.fieldMapping[header] || header];
                            const cellAnomaly = rowAnomalies.find((a) => a.field === header);
                            return (
                              <td
                                key={colIdx}
                                className={cn(
                                  'px-4 py-2.5 font-mono text-xs',
                                  cellAnomaly?.severity === 'error'
                                    ? 'text-alert-red'
                                    : cellAnomaly?.severity === 'warning'
                                    ? 'text-alert-yellow'
                                    : 'text-dark-300'
                                )}
                                title={cellAnomaly?.issue}
                              >
                                {String(cellValue ?? '')}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 右侧：数据源管理 */}
        <div className="space-y-6">
          {/* 导入批次列表 */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-cold-400" />
              数据源管理
            </h3>

            {batches.length === 0 ? (
              <div className="text-center py-12 text-dark-500">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无导入批次</p>
                <p className="text-xs mt-1">上传文件后将自动创建批次</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {batches
                  .sort(
                    (a, b) =>
                      new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
                  )
                  .map((batch) => (
                    <div
                      key={batch.batchId}
                      className="rounded-lg border border-dark-700 overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setExpandedBatch(
                            expandedBatch === batch.batchId ? null : batch.batchId
                          )
                        }
                        className="w-full p-4 text-left hover:bg-dark-700/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expandedBatch === batch.batchId ? (
                              <ChevronDown className="w-4 h-4 text-cold-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-dark-400" />
                            )}
                            <div>
                              <p className="font-mono text-sm text-white">{batch.name}</p>
                              <p className="text-xs text-dark-500 mt-0.5">
                                {batch.batchId}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs rounded-full',
                              batch.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : batch.status === 'processing'
                                ? 'bg-cold-500/20 text-cold-400'
                                : 'bg-alert-red/20 text-alert-red'
                            )}
                          >
                            {batch.status === 'completed'
                              ? '已完成'
                              : batch.status === 'processing'
                              ? '处理中'
                              : '错误'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-dark-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {batch.importedBy}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(batch.importedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-dark-500">
                            {batch.sourceFiles.length} 个文件
                          </span>
                          <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                batch.completeness >= 95
                                  ? 'bg-green-500'
                                  : batch.completeness >= 80
                                  ? 'bg-alert-yellow'
                                  : 'bg-alert-red'
                              )}
                              style={{ width: `${batch.completeness}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              'text-xs font-mono',
                              batch.completeness >= 95
                                ? 'text-green-400'
                                : batch.completeness >= 80
                                ? 'text-alert-yellow'
                                : 'text-alert-red'
                            )}
                          >
                            {batch.completeness.toFixed(1)}%
                          </span>
                        </div>
                      </button>

                      {expandedBatch === batch.batchId && (
                        <div className="border-t border-dark-700 p-4 bg-dark-800/50">
                          <p className="text-xs text-dark-400 mb-2 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            原始文件清单
                          </p>
                          <div className="space-y-2">
                            {batch.sourceFiles.map((file) => {
                              const config = FILE_TYPE_CONFIG[file.fileType];
                              return (
                                <div
                                  key={file.id}
                                  className="flex items-center gap-3 p-2 bg-dark-900/50 rounded-lg"
                                >
                                  <div
                                    className={cn(
                                      'p-1.5 rounded',
                                      config.bgColor
                                    )}
                                  >
                                    <span className={config.color}>
                                      {file.fileType === 'temperature' ? (
                                        <Thermometer className="w-3.5 h-3.5" />
                                      ) : file.fileType === 'cargo' ? (
                                        <Package className="w-3.5 h-3.5" />
                                      ) : (
                                        <Wrench className="w-3.5 h-3.5" />
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white truncate">
                                      {file.fileName}
                                    </p>
                                    <p className="text-[10px] text-dark-500">
                                      {file.recordCount} 条 · {formatDateTime(file.uploadTime)}
                                    </p>
                                  </div>
                                  <button
                                    className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                                    title="下载原始文件"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 处理日志 */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cold-400" />
              处理日志
            </h3>

            {processingLogs.length === 0 ? (
              <div className="text-center py-8 text-dark-500">
                <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无处理记录</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {stats.recentLogs
                  .slice()
                  .reverse()
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-dark-800/30 rounded-lg border border-dark-700/50"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-white">{log.action}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.operator}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 p-2 bg-dark-900/50 rounded text-[10px] font-mono text-dark-500">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportCenter;
