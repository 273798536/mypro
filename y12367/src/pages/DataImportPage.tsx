import * as React from 'react';
import { motion } from 'framer-motion';
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
import type { DataCaliberType, UploadValidationResult, FieldMapping, ConflictInfo } from '@/types';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { caliberEngine } from '@/engines/CaliberConsistencyEngine';

export const DataImportPage: React.FC = () => {
  const { initialize, materials, testBenches, segments } = useAnalysisStore();
  const [activeTab, setActiveTab] = React.useState('upload');
  const [fileType, setFileType] = React.useState<DataCaliberType>('voltage_current');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<UploadValidationResult | null>(null);
  const [fieldMappings, setFieldMappings] = React.useState<FieldMapping[]>([]);
  const [conflicts, setConflicts] = React.useState<ConflictInfo[]>([]);
  const [previewData, setPreviewData] = React.useState<any[]>([]);
  const [importSuccess, setImportSuccess] = React.useState(false);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  const fileTypeOptions = [
    { value: 'voltage_current', label: '电压电流数据' },
    { value: 'temperature', label: '温度序列数据' },
    { value: 'efficiency', label: '效率报告数据' },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResult(null);
      setConflicts([]);
      setPreviewData([]);
      setImportSuccess(false);
      simulatePreview(file);
    }
  };

  const simulatePreview = async (file: File) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockMappings: FieldMapping[] = [
      { sourceField: '时间', targetField: 'timestamp', required: true, detected: true },
      { sourceField: '测试台', targetField: 'testBenchId', required: true, detected: true },
      { sourceField: '材料', targetField: 'materialId', required: true, detected: true },
      { sourceField: '电压(V)', targetField: 'voltage', required: true, detected: true },
      { sourceField: '电流(A)', targetField: 'current', required: true, detected: true },
      { sourceField: '功率(kW)', targetField: 'power', required: true, detected: true },
    ];
    setFieldMappings(mockMappings);

    const mockPreview = Array.from({ length: 5 }, (_, i) => ({
      timestamp: `2024-01-${15 + i} 14:30:${i * 10}`,
      testBenchId: 'TB-001',
      materialId: 'CU-001',
      voltage: (380 + i * 0.5).toFixed(1),
      current: (25.5 + i * 0.3).toFixed(2),
      power: (9.69 + i * 0.1).toFixed(2),
    }));
    setPreviewData(mockPreview);

    const mockResult: UploadValidationResult = {
      valid: true,
      errors: [],
      warnings: [
        { row: 23, field: 'voltage', message: '电压值超出正常范围(360-400V)' },
        { row: 156, field: 'current', message: '电流值缺失，将使用插值填充' },
      ],
      totalRows: 1000,
      validRows: 998,
    };
    setValidationResult(mockResult);

    const mockConflicts: ConflictInfo[] = [
      {
        type: 'caliber',
        field: 'power',
        source1: { name: '电压电流口径', value: 9.69 },
        source2: { name: '效率报告口径', value: 9.72 },
        description: '功率计算口径存在差异，相差0.03 kW (0.31%)',
      },
    ];
    setConflicts(mockConflicts);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setImportSuccess(false);

    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    setIsUploading(false);
    setImportSuccess(true);
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      simulatePreview(file);
    }
  };

  const resolveConflict = (index: number, choice: 'source1' | 'source2') => {
    const newConflicts = [...conflicts];
    newConflicts.splice(index, 1);
    setConflicts(newConflicts);
  };

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
                      onChange={(e) => setFileType(e.target.value as DataCaliberType)}
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
                        <span>正在上传...</span>
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
                            <TableCell key={j}>{String(val)}</TableCell>
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
                        <TableHead>源字段</TableHead>
                        <TableHead>目标字段</TableHead>
                        <TableHead>必填</TableHead>
                        <TableHead>检测状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fieldMappings.map((mapping, i) => (
                        <TableRow key={i}>
                          <TableCell>{mapping.sourceField}</TableCell>
                          <TableCell>
                            <Select
                              value={mapping.targetField}
                              options={[
                                { value: 'timestamp', label: '时间戳' },
                                { value: 'testBenchId', label: '测试台ID' },
                                { value: 'materialId', label: '材料ID' },
                                { value: 'voltage', label: '电压' },
                                { value: 'current', label: '电流' },
                                { value: 'power', label: '功率' },
                                { value: 'temperature', label: '温度' },
                                { value: 'speed', label: '转速' },
                                { value: 'torque', label: '扭矩' },
                              ]}
                              className="w-48"
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
                {[
                  {
                    date: '2024-01-15 14:30:00',
                    type: '电压电流',
                    fileName: 'voltage_data_0115.xlsx',
                    rows: 1000,
                    status: 'success',
                    operator: '张工',
                  },
                  {
                    date: '2024-01-15 10:15:00',
                    type: '温度序列',
                    fileName: 'temp_data_0115.csv',
                    rows: 3000,
                    status: 'success',
                    operator: '李工',
                  },
                  {
                    date: '2024-01-14 16:45:00',
                    type: '效率报告',
                    fileName: 'efficiency_report_0114.xlsx',
                    rows: 48,
                    status: 'warning',
                    operator: '王工',
                  },
                  {
                    date: '2024-01-14 09:00:00',
                    type: '电压电流',
                    fileName: 'voltage_data_0114.xlsx',
                    rows: 0,
                    status: 'error',
                    operator: '赵工',
                  },
                ].map((record, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-industrial-bg-dark rounded"
                  >
                    <div className="flex items-center gap-4">
                      {record.type === '电压电流' ? (
                        <Zap className="w-5 h-5 text-blue-400" />
                      ) : record.type === '温度序列' ? (
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
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
