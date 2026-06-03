import * as React from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  X,
  Database,
  Zap,
  Thermometer,
  FileText,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import type {
  DataCaliberType,
  UploadValidationResult,
  FieldMapping,
  ConflictInfo,
  VoltageCurrentData,
  TemperatureData,
  EfficiencyReport,
} from '@/types';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { dataService } from '@/services/dataService';
import { caliberEngine } from '@/engines/CaliberConsistencyEngine';
import { generateId } from '@/utils/helpers';

interface TargetFieldDef {
  targetField: string;
  label: string;
  required: boolean;
  keywords: string[];
}

const TARGET_FIELDS: Record<DataCaliberType, TargetFieldDef[]> = {
  voltage_current: [
    { targetField: 'timestamp', label: '时间戳', required: true, keywords: ['时间', 'timestamp', 'time', '日期', 'date'] },
    { targetField: 'testBenchId', label: '测试台ID', required: true, keywords: ['测试台', 'testbench', 'test_bench', '台号', '设备'] },
    { targetField: 'materialId', label: '材料ID', required: true, keywords: ['材料', 'material', '材质', '料号'] },
    { targetField: 'voltage', label: '电压', required: true, keywords: ['电压', 'voltage', 'U', 'V'] },
    { targetField: 'current', label: '电流', required: true, keywords: ['电流', 'current', 'I', 'A'] },
    { targetField: 'power', label: '功率', required: true, keywords: ['功率', 'power', 'P', 'kW'] },
    { targetField: 'segmentId', label: '工况段', required: false, keywords: ['工况段', 'segment', '段号', '分段'] },
  ],
  temperature: [
    { targetField: 'timestamp', label: '时间戳', required: true, keywords: ['时间', 'timestamp', 'time', '日期', 'date'] },
    { targetField: 'testBenchId', label: '测试台ID', required: true, keywords: ['测试台', 'testbench', 'test_bench', '台号', '设备'] },
    { targetField: 'materialId', label: '材料ID', required: true, keywords: ['材料', 'material', '材质', '料号'] },
    { targetField: 'objectType', label: '对象类型', required: true, keywords: ['对象类型', 'objecttype', 'object_type', '部位', '测点类型'] },
    { targetField: 'temperature', label: '温度', required: true, keywords: ['温度', 'temperature', 'temp', 'T', '°C'] },
    { targetField: 'segmentId', label: '工况段', required: false, keywords: ['工况段', 'segment', '段号', '分段'] },
  ],
  efficiency: [
    { targetField: 'testBenchId', label: '测试台ID', required: true, keywords: ['测试台', 'testbench', 'test_bench', '台号', '设备'] },
    { targetField: 'materialId', label: '材料ID', required: true, keywords: ['材料', 'material', '材质', '料号'] },
    { targetField: 'segmentId', label: '工况段', required: false, keywords: ['工况段', 'segment', '段号', '分段'] },
    { targetField: 'startTime', label: '开始时间', required: true, keywords: ['开始时间', 'starttime', 'start_time', '起始'] },
    { targetField: 'endTime', label: '结束时间', required: true, keywords: ['结束时间', 'endtime', 'end_time', '终止'] },
    { targetField: 'inputPower', label: '输入功率', required: true, keywords: ['输入功率', 'inputpower', 'input_power', 'Pin'] },
    { targetField: 'outputPower', label: '输出功率', required: true, keywords: ['输出功率', 'outputpower', 'output_power', 'Pout'] },
    { targetField: 'efficiency', label: '效率', required: false, keywords: ['效率', 'efficiency', 'η', 'eta'] },
  ],
  all: [],
};

const RANGE_RULES: Record<string, { min: number; max: number; unit: string }> = {
  voltage: { min: 0, max: 1000, unit: 'V' },
  current: { min: 0, max: 500, unit: 'A' },
  power: { min: -500, max: 500, unit: 'kW' },
  temperature: { min: -50, max: 300, unit: '°C' },
  inputPower: { min: 0, max: 1000, unit: 'kW' },
  outputPower: { min: 0, max: 1000, unit: 'kW' },
  efficiency: { min: 0, max: 100, unit: '%' },
};

function getSegmentForValue(
  speed: number,
  torque: number,
  segments: { id: string; speedRange: [number, number]; torqueRange: [number, number] }[]
): string {
  for (const seg of segments) {
    if (
      speed >= seg.speedRange[0] && speed < seg.speedRange[1] &&
      torque >= seg.torqueRange[0] && torque < seg.torqueRange[1]
    ) {
      return seg.id;
    }
  }
  return segments.length > 0 ? segments[segments.length - 1].id : '';
}

export const DataImportPage: React.FC = () => {
  const { initialize, materials, testBenches, segments, recalculateAll } = useAnalysisStore();
  const [activeTab, setActiveTab] = React.useState('upload');
  const [fileType, setFileType] = React.useState<DataCaliberType>('voltage_current');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<UploadValidationResult | null>(null);
  const [fieldMappings, setFieldMappings] = React.useState<FieldMapping[]>([]);
  const [conflicts, setConflicts] = React.useState<ConflictInfo[]>([]);
  const [previewData, setPreviewData] = React.useState<Record<string, unknown>[]>([]);
  const [importSuccess, setImportSuccess] = React.useState(false);
  const [parsedRows, setParsedRows] = React.useState<Record<string, unknown>[]>([]);
  const [rawRows, setRawRows] = React.useState<Record<string, unknown>[]>([]);
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [importHistory, setImportHistory] = React.useState<
    { date: string; type: string; fileName: string; rows: number; status: string; operator: string }[]
  >([]);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    setImportHistory(dataService.getImportHistory());
  }, [importSuccess]);

  const fileTypeOptions = [
    { value: 'voltage_current', label: '电压电流数据' },
    { value: 'temperature', label: '温度序列数据' },
    { value: 'efficiency', label: '效率报告数据' },
  ];

  const detectFieldMapping = (headers: string[], type: DataCaliberType): FieldMapping[] => {
    const targetFields = TARGET_FIELDS[type] ?? [];
    return targetFields.map((tf) => {
      const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
      let matchedSource = '';
      for (const kw of tf.keywords) {
        const idx = lowerHeaders.findIndex((h) => h.includes(kw.toLowerCase()));
        if (idx !== -1) {
          matchedSource = headers[idx];
          break;
        }
      }
      return {
        sourceField: matchedSource,
        targetField: tf.targetField,
        required: tf.required,
        detected: matchedSource !== '',
      };
    });
  };

  const mapRow = (
    row: Record<string, unknown>,
    mappings: FieldMapping[]
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const m of mappings) {
      if (m.sourceField && m.sourceField in row) {
        result[m.targetField] = row[m.sourceField];
      }
    }
    return result;
  };

  const resolveTestBenchId = (raw: unknown): string => {
    const code = String(raw).trim();
    const tb = testBenches.find((t) => t.code === code);
    return tb ? tb.id : code;
  };

  const resolveMaterialId = (raw: unknown): string => {
    const code = String(raw).trim();
    const mat = materials.find((m) => m.code === code);
    return mat ? mat.id : code;
  };

  const remapAndValidate = React.useCallback(
    (mappings: FieldMapping[], rawData: Record<string, unknown>[]) => {
      if (rawData.length === 0) return;

      const targetFieldCount: Record<string, number> = {};
      const sourceFieldSet = new Set<string>();
      for (const m of mappings) {
        if (m.sourceField && m.sourceField.trim() !== '') {
          targetFieldCount[m.targetField] = (targetFieldCount[m.targetField] || 0) + 1;
          sourceFieldSet.add(m.sourceField);
        }
      }

      const errors: UploadValidationResult['errors'] = [];
      const warnings: UploadValidationResult['warnings'] = [];

      for (const [targetField, count] of Object.entries(targetFieldCount)) {
        if (count > 1) {
          const sourceFields = mappings
            .filter((m) => m.targetField === targetField && m.sourceField)
            .map((m) => `'${m.sourceField}'`)
            .join('、');
          errors.push({
            row: 0,
            field: targetField,
            message: `字段映射冲突：${count} 个源字段(${sourceFields})同时映射到目标字段'${targetField}'，请调整映射关系后再导入`,
          });
        }
      }

      const unusedHeaders = csvHeaders.filter((h) => !sourceFieldSet.has(h));
      if (unusedHeaders.length > 0) {
        warnings.push({
          row: 0,
          field: 'mapping',
          message: `存在 ${unusedHeaders.length} 个未映射的源字段：${unusedHeaders.map((h) => `'${h}'`).join('、')}，这些数据将被忽略`,
        });
      }

      const mappedRows = rawData.map((row) => mapRow(row, mappings));
      setParsedRows(mappedRows);
      setPreviewData(mappedRows.slice(0, 5));

      mappedRows.forEach((row, idx) => {
        const rowNum = idx + 2;
        const fieldDefs = TARGET_FIELDS[fileType] ?? [];

        for (const fd of fieldDefs) {
          const val = row[fd.targetField];
          if (fd.required && (val === undefined || val === null || String(val).trim() === '')) {
            errors.push({ row: rowNum, field: fd.targetField, message: `必填字段 ${fd.label} 缺失` });
          }
        }

        for (const [field, rule] of Object.entries(RANGE_RULES)) {
          const val = row[field];
          if (val !== undefined && val !== null && String(val).trim() !== '' && !isNaN(Number(val))) {
            const num = Number(val);
            if (num < rule.min || num > rule.max) {
              warnings.push({
                row: rowNum,
                field,
                message: `${field}值 ${num} 超出正常范围(${rule.min}~${rule.max}${rule.unit})`,
              });
            }
          }
        }
      });

      const validRows = mappedRows.length - errors.length;
      setValidationResult({
        valid: errors.length === 0,
        errors,
        warnings,
        totalRows: mappedRows.length,
        validRows,
      });

      if (fileType === 'voltage_current' && mappedRows.length > 0) {
        const existingVoltageData = dataService.getVoltageData();
        const existingEfficiency = dataService.getEfficiencyReports();
        if (existingVoltageData.length > 0 && existingEfficiency.length > 0) {
          const avgImportPower = mappedRows
            .filter((r) => r.power !== undefined && !isNaN(Number(r.power)))
            .reduce((s, r) => s + Math.abs(Number(r.power)), 0) / Math.max(1, mappedRows.length);
          const avgExistingPower = existingVoltageData
            .slice(-mappedRows.length)
            .reduce((s, r) => s + Math.abs(r.power), 0) / Math.max(1, existingVoltageData.length);
          const avgEffPower = existingEfficiency
            .reduce((s, r) => s + r.inputPower, 0) / Math.max(1, existingEfficiency.length);

          const conflictResults = caliberEngine.detectConflict([
            { name: '导入数据口径', data: { voltage: 380, current: 25, power: avgImportPower }, type: 'power' },
            { name: '现有数据口径', data: { voltage: 380, current: 25, power: avgExistingPower }, type: 'power' },
            { name: '效率报告口径', data: { inputPower: avgEffPower, outputPower: avgEffPower * 0.9 }, type: 'efficiency' },
          ]);
          setConflicts(conflictResults);
        } else {
          setConflicts([]);
        }
      } else {
        setConflicts([]);
      }
    },
    [fileType, csvHeaders]
  );

  const parseFile = async (file: File) => {
    const ab = await file.arrayBuffer();
    const workbook = XLSX.read(ab);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawData.length === 0) {
      setValidationResult({
        valid: false,
        errors: [{ row: 0, field: '', message: '文件为空或无法解析' }],
        warnings: [],
        totalRows: 0,
        validRows: 0,
      });
      setRawRows([]);
      setParsedRows([]);
      setPreviewData([]);
      setFieldMappings([]);
      return;
    }

    setRawRows(rawData);
    const headers = Object.keys(rawData[0]);
    setCsvHeaders(headers);
    const mappings = detectFieldMapping(headers, fileType);
    setFieldMappings(mappings);
    remapAndValidate(mappings, rawData);
  };

  const handleSourceChange = (index: number, newSourceField: string) => {
    const newMappings = [...fieldMappings];
    newMappings[index] = {
      ...newMappings[index],
      sourceField: newSourceField,
      detected: false,
    };
    setFieldMappings(newMappings);
    remapAndValidate(newMappings, rawRows);
  };

  const handleTargetChange = (index: number, newTargetField: string) => {
    const newMappings = [...fieldMappings];
    newMappings[index] = {
      ...newMappings[index],
      targetField: newTargetField,
      detected: false,
    };
    setFieldMappings(newMappings);
    remapAndValidate(newMappings, rawRows);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResult(null);
      setConflicts([]);
      setPreviewData([]);
      setImportSuccess(false);
      setParsedRows([]);
      setRawRows([]);
      setCsvHeaders([]);
      setFieldMappings([]);
      parseFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !validationResult) return;

    setIsUploading(true);
    setUploadProgress(0);
    setImportSuccess(false);

    const fieldDefs = TARGET_FIELDS[fileType] ?? [];
    const mappingMap: Record<string, string> = {};
    for (const fd of fieldDefs) {
      mappingMap[fd.targetField] = fd.targetField;
    }

    const total = parsedRows.length;
    const batchSize = Math.max(1, Math.ceil(total / 10));

    try {
      for (let i = 0; i < total; i += batchSize) {
        const batch = parsedRows.slice(i, i + batchSize);
        const end = Math.min(i + batchSize, total);

        if (fileType === 'voltage_current') {
          const data: VoltageCurrentData[] = batch.map((row) => ({
            id: generateId(),
            testBenchId: resolveTestBenchId(row.testBenchId),
            materialId: resolveMaterialId(row.materialId),
            timestamp: row.timestamp ? new Date(String(row.timestamp)) : new Date(),
            voltage: Number(row.voltage) || 0,
            current: Number(row.current) || 0,
            power: Number(row.power) || 0,
            segmentId: row.segmentId ? String(row.segmentId) : getSegmentForValue(0, 0, segments),
          }));
          dataService.importVoltageData(data);
        } else if (fileType === 'temperature') {
          const data: TemperatureData[] = batch.map((row) => ({
            id: generateId(),
            testBenchId: resolveTestBenchId(row.testBenchId),
            materialId: resolveMaterialId(row.materialId),
            timestamp: row.timestamp ? new Date(String(row.timestamp)) : new Date(),
            objectType: (String(row.objectType || 'winding') as TemperatureData['objectType']),
            temperature: Number(row.temperature) || 0,
            segmentId: row.segmentId ? String(row.segmentId) : getSegmentForValue(0, 0, segments),
          }));
          dataService.importTemperatureData(data);
        } else if (fileType === 'efficiency') {
          const data: EfficiencyReport[] = batch.map((row) => ({
            id: generateId(),
            testBenchId: resolveTestBenchId(row.testBenchId),
            materialId: resolveMaterialId(row.materialId),
            segmentId: row.segmentId ? String(row.segmentId) : getSegmentForValue(0, 0, segments),
            startTime: row.startTime ? new Date(String(row.startTime)) : new Date(),
            endTime: row.endTime ? new Date(String(row.endTime)) : new Date(),
            inputPower: Number(row.inputPower) || 0,
            outputPower: Number(row.outputPower) || 0,
            efficiency: Number(row.efficiency) || (Number(row.inputPower) > 0
              ? (Number(row.outputPower) / Number(row.inputPower)) * 100
              : 0),
            isCorrected: false,
          }));
          dataService.importEfficiencyReports(data);
        }

        setUploadProgress(Math.round((end / total) * 100));
      }

      await recalculateAll();

      dataService.addImportHistory({
        date: new Date().toISOString().replace('T', ' ').slice(0, 19),
        type: fileTypeOptions.find((o) => o.value === fileType)?.label ?? fileType,
        fileName: selectedFile.name,
        rows: validationResult.validRows,
        status: validationResult.errors.length > 0
          ? 'warning'
          : validationResult.warnings.length > 0
            ? 'warning'
            : 'success',
        operator: '当前用户',
      });

      setIsUploading(false);
      setImportSuccess(true);
      setSelectedFile(null);
      setUploadProgress(0);
      setParsedRows([]);
    } catch {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResult(null);
      setConflicts([]);
      setPreviewData([]);
      setImportSuccess(false);
      setParsedRows([]);
      setRawRows([]);
      setCsvHeaders([]);
      setFieldMappings([]);
      parseFile(file);
    }
  };

  const resolveConflict = (index: number, _choice: 'source1' | 'source2') => {
    const newConflicts = [...conflicts];
    newConflicts.splice(index, 1);
    setConflicts(newConflicts);
  };

  const dynamicTargetOptions = React.useMemo(() => {
    const fields = TARGET_FIELDS[fileType] ?? [];
    return fields.map((f) => ({ value: f.targetField, label: f.label }));
  }, [fileType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-industrial-text">数据导入</h1>
          <p className="text-industrial-text-muted mt-1">
            支持电压电流、温度序列、效率报告三类数据导入
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>
            下载模板
          </Button>
        </div>
      </div>

      {importSuccess && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Alert variant="success" title="数据导入成功">
            已成功导入 {validationResult?.validRows || 0} 条数据，系统将自动重算效率和异常检测。
          </Alert>
        </motion.div>
      )}

      {conflicts.length > 0 && (
        <Alert variant="warning" title={`检测到 ${conflicts.length} 处口径冲突`}>
          <p className="mb-3">材料数据存在口径差异，请手动选择采用哪个口径（系统不会自动修改）：</p>
          {conflicts.map((conflict, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-industrial-bg-dark rounded mb-2"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-industrial-text">{conflict.description}</p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-blue-400">
                    {conflict.source1.name}: <span className="font-mono">{conflict.source1.value}</span>
                  </span>
                  <span className="text-orange-400">
                    {conflict.source2.name}: <span className="font-mono">{conflict.source2.value}</span>
                  </span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="primary" onClick={() => resolveConflict(index, 'source1')}>
                  采用{conflict.source1.name}
                </Button>
                <Button size="sm" variant="success" onClick={() => resolveConflict(index, 'source2')}>
                  采用{conflict.source2.name}
                </Button>
              </div>
            </div>
          ))}
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="px-4 pt-4">
              <TabsTrigger value="upload">上传数据</TabsTrigger>
              <TabsTrigger value="mapping">字段映射</TabsTrigger>
              <TabsTrigger value="history">导入历史</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <Select
                      label="数据类型"
                      value={fileType}
                      onChange={(e) => {
                        setFileType(e.target.value as DataCaliberType);
                        setSelectedFile(null);
                        setValidationResult(null);
                        setConflicts([]);
                        setPreviewData([]);
                        setParsedRows([]);
                        setRawRows([]);
                        setCsvHeaders([]);
                        setFieldMappings([]);
                      }}
                      options={fileTypeOptions}
                    />
                  </div>

                  <div
                    className="border-2 border-dashed border-industrial-border rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-4">
                        <FileSpreadsheet className="w-12 h-12 text-green-400" />
                        <div className="text-left">
                          <p className="font-medium text-industrial-text">{selectedFile.name}</p>
                          <p className="text-sm text-industrial-text-muted">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setValidationResult(null);
                            setConflicts([]);
                            setPreviewData([]);
                            setParsedRows([]);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-industrial-text-muted mx-auto mb-4" />
                        <p className="text-industrial-text font-medium">拖拽文件到此处或点击上传</p>
                        <p className="text-sm text-industrial-text-muted mt-1">
                          支持 .xlsx, .xls, .csv 格式
                        </p>
                      </>
                    )}
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-industrial-text-muted">
                        <span>正在导入...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} max={100} />
                    </div>
                  )}

                  {validationResult && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {validationResult.valid ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          )}
                          <span className="font-medium text-industrial-text">校验结果</span>
                        </div>
                        <Badge variant={validationResult.valid ? 'green' : 'red'}>
                          {validationResult.valid ? '通过' : '失败'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-industrial-bg-dark rounded">
                          <p className="text-2xl font-bold text-industrial-text font-mono">
                            {validationResult.totalRows}
                          </p>
                          <p className="text-xs text-industrial-text-muted">总行数</p>
                        </div>
                        <div className="p-3 bg-industrial-bg-dark rounded">
                          <p className="text-2xl font-bold text-green-400 font-mono">
                            {validationResult.validRows}
                          </p>
                          <p className="text-xs text-industrial-text-muted">有效行数</p>
                        </div>
                        <div className="p-3 bg-industrial-bg-dark rounded">
                          <p className="text-2xl font-bold text-orange-400 font-mono">
                            {validationResult.warnings.length}
                          </p>
                          <p className="text-xs text-industrial-text-muted">警告数</p>
                        </div>
                      </div>
                      {validationResult.errors.length > 0 && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                          <p className="text-sm font-medium text-red-400 mb-2">错误详情：</p>
                          {validationResult.errors.slice(0, 3).map((e, i) => (
                            <p key={i} className="text-xs text-red-400/80">
                              第 {e.row} 行 {e.field}: {e.message}
                            </p>
                          ))}
                          {validationResult.errors.length > 3 && (
                            <p className="text-xs text-red-400/60 mt-1">
                              ...还有 {validationResult.errors.length - 3} 条错误
                            </p>
                          )}
                        </div>
                      )}
                      {validationResult.warnings.length > 0 && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                          <p className="text-sm font-medium text-yellow-400 mb-2">警告详情：</p>
                          {validationResult.warnings.slice(0, 3).map((w, i) => (
                            <p key={i} className="text-xs text-yellow-400/80">
                              第 {w.row} 行 {w.field}: {w.message}
                            </p>
                          ))}
                          {validationResult.warnings.length > 3 && (
                            <p className="text-xs text-yellow-400/60 mt-1">
                              ...还有 {validationResult.warnings.length - 3} 条警告
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedFile && !isUploading && (
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="default"
                        icon={<RefreshCw className="w-4 h-4" />}
                        onClick={() => {
                          setSelectedFile(null);
                          setValidationResult(null);
                          setConflicts([]);
                          setPreviewData([]);
                          setParsedRows([]);
                          setRawRows([]);
                          setCsvHeaders([]);
                          setFieldMappings([]);
                        }}
                      >
                        重新选择
                      </Button>
                      <Button
                        variant="primary"
                        icon={<Upload className="w-4 h-4" />}
                        onClick={handleUpload}
                        disabled={!validationResult?.valid || conflicts.length > 0}
                      >
                        确认导入
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Card borderColor="blue">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-400" />
                        电压电流格式
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-industrial-text-muted space-y-1">
                      <p>• 时间: YYYY-MM-DD HH:mm:ss</p>
                      <p>• 测试台: TB-001 ~ TB-006</p>
                      <p>• 电压: V (360-400)</p>
                      <p>• 电流: A (0-100)</p>
                      <p>• 功率: kW (自动计算)</p>
                    </CardContent>
                  </Card>

                  <Card borderColor="orange">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-orange-400" />
                        温度序列格式
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-industrial-text-muted space-y-1">
                      <p>• 时间: YYYY-MM-DD HH:mm:ss</p>
                      <p>• 测试台: TB-001 ~ TB-006</p>
                      <p>• 对象类型: winding/bearing/housing</p>
                      <p>• 温度: °C (0-150)</p>
                    </CardContent>
                  </Card>

                  <Card borderColor="green">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-400" />
                        效率报告格式
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-industrial-text-muted space-y-1">
                      <p>• 开始/结束时间</p>
                      <p>• 输入功率: kW</p>
                      <p>• 输出功率: kW</p>
                      <p>• 效率: % (自动计算)</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {previewData.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-industrial-text mb-4">数据预览</h3>
                  <Table compact>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(previewData[0]).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((val, j) => (
                            <TableCell key={j}>{String(val ?? '')}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="mapping" className="p-6">
              <div className="space-y-6">
                <Alert variant="info" title="口径一致性说明">
                  系统将严格按照配置的口径进行计算，不会自动修正业务口径。如存在冲突，将在上传时提示并由您决定。
                </Alert>

                {fieldMappings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>源字段 (CSV/XLSX列名)</TableHead>
                        <TableHead>目标字段 (系统字段)</TableHead>
                        <TableHead>必填</TableHead>
                        <TableHead>检测状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fieldMappings.map((mapping, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select
                              value={mapping.sourceField}
                              options={[
                                { value: '', label: '-- 请选择源字段 --' },
                                ...csvHeaders.map((h) => ({ value: h, label: h })),
                              ]}
                              className="w-48"
                              onChange={(e) => handleSourceChange(i, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={mapping.targetField}
                              options={dynamicTargetOptions}
                              className="w-48"
                              onChange={(e) => handleTargetChange(i, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={mapping.required ? 'red' : 'default'}>
                              {mapping.required ? '是' : '否'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {mapping.detected ? (
                              <Badge variant="green">自动检测</Badge>
                            ) : (
                              <Badge variant="orange">需手动映射</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-industrial-text-muted">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>请先上传文件以查看字段映射</p>
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">口径配置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Checkbox label="启用电压电流口径校验" defaultChecked />
                      <Checkbox label="启用温度序列口径校验" defaultChecked />
                      <Checkbox label="启用效率报告口径校验" defaultChecked />
                    </div>
                    <p className="text-xs text-industrial-text-muted">
                      启用后，导入数据将与系统配置的口径进行比对，存在差异时将提示冲突。
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6">
              <div className="space-y-4">
                {importHistory.length > 0 ? (
                  importHistory.map((record, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-industrial-bg-dark rounded"
                    >
                      <div className="flex items-center gap-4">
                        {record.type === '电压电流数据' ? (
                          <Zap className="w-5 h-5 text-blue-400" />
                        ) : record.type === '温度序列数据' ? (
                          <Thermometer className="w-5 h-5 text-orange-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-green-400" />
                        )}
                        <div>
                          <p className="font-medium text-industrial-text">{record.fileName}</p>
                          <p className="text-xs text-industrial-text-muted">
                            {record.date} · {record.operator} · {record.rows} 行
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            record.status === 'success'
                              ? 'green'
                              : record.status === 'warning'
                                ? 'orange'
                                : 'red'
                          }
                        >
                          {record.status === 'success'
                            ? '成功'
                            : record.status === 'warning'
                              ? '有警告'
                              : '失败'}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          详情
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-industrial-text-muted">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无导入历史</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
