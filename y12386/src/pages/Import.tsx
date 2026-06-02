import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Download, Music, Truck, MapPin, Check, AlertCircle, Upload, FileSpreadsheet, RefreshCw } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { downloadTemplate, parseExcelFile, validateImportData } from '@/utils/importer';
import type { ImportResult, InstrumentImport, TransportImport, ScheduleImport } from '@/utils/importer';

type Step = 'upload' | 'preview' | 'result';
type DataType = 'instrument' | 'transport' | 'schedule';

const Import = () => {
  const { batchImportInstruments, batchImportTransports, batchImportSchedules, loadMockData, instruments, transports, citySchedules } = useAppStore();
  const [step, setStep] = useState<Step>('upload');
  const [dataType, setDataType] = useState<DataType>('instrument');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dataTypes = [
    { key: 'instrument', label: '乐器清单', icon: Music, desc: '乐器主信息，包含名称、演奏员、价值等' },
    { key: 'transport', label: '运输单', icon: Truck, desc: '运输物流信息，包含箱号、保单、跟踪号等' },
    { key: 'schedule', label: '城市日程', icon: MapPin, desc: '演出日程安排，包含城市、地点、时间等' },
  ];

  const currentStats = {
    instrument: instruments.length,
    transport: transports.length,
    schedule: citySchedules.length,
  };

  const handleTemplateDownload = () => {
    downloadTemplate(dataType);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileUpload(file);
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await parseExcelFile(file, dataType);
      const result = validateImportData(dataType, data, instruments);
      setImportResult(result);
      setPreviewData(data);
      setStep('preview');
    } catch (error: any) {
      alert(`文件解析失败：${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileUpload(file);
    } else {
      alert('请上传 Excel 文件（.xlsx 或 .xls 格式）');
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.errors.length > 0) {
      alert('存在数据错误，请修正后再导入');
      return;
    }

    let importCount = 0;
    switch (dataType) {
      case 'instrument':
        batchImportInstruments(previewData as InstrumentImport[]);
        importCount = previewData.length;
        break;
      case 'transport':
        batchImportTransports(previewData as TransportImport[]);
        importCount = previewData.length;
        break;
      case 'schedule':
        batchImportSchedules(previewData as ScheduleImport[]);
        importCount = previewData.length;
        break;
    }

    setStep('result');
  };

  const handleLoadSample = () => {
    if (confirm('确定要加载系统样例数据吗？这将追加到现有数据中。')) {
      loadMockData();
      alert('样例数据加载成功！');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setImportResult(null);
    setPreviewData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-midnight-100 flex items-center gap-3">
          <div className="w-10 h-10 gold-gradient rounded-btn flex items-center justify-center">
            <FileUp className="w-5 h-5 text-white" />
          </div>
          样例导入
        </h1>
        <p className="text-midnight-400 mt-1">
          下载模板、填写数据、上传导入，三步完成数据录入
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center gap-4 mb-8"
      >
        {['选择数据类型', '上传预览', '导入完成'].map((label, index) => {
          const stepIndex = ['upload', 'preview', 'result'].indexOf(step);
          const isActive = index <= stepIndex;
          const isCurrent = index === stepIndex;
          return (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCurrent
                    ? 'gold-gradient text-white'
                    : isActive
                    ? 'bg-success-green text-white'
                    : 'bg-midnight-700 text-midnight-400'
                }`}>
                  {isActive && index < stepIndex ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className={isActive ? 'text-midnight-100' : 'text-midnight-500'}>
                  {label}
                </span>
              </div>
              {index < 2 && (
                <div className={`w-16 h-0.5 mx-4 ${isActive && index < stepIndex ? 'bg-success-green' : 'bg-midnight-700'}`} />
              )}
            </div>
          );
        })}
      </motion.div>

      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-3 gap-4">
            {dataTypes.map((type) => {
              const Icon = type.icon;
              const isActive = dataType === type.key;
              return (
                <button
                  key={type.key}
                  onClick={() => setDataType(type.key as DataType)}
                  className={`card p-5 text-left transition-all ${
                    isActive
                      ? 'ring-2 ring-amber-gold-500 bg-midnight-700'
                      : 'card-hover'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-btn flex items-center justify-center mb-3 ${
                    isActive ? 'gold-gradient' : 'bg-midnight-700'
                  }`}>
                    <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-midnight-400'}`} />
                  </div>
                  <h4 className="font-medium text-midnight-100 mb-1">{type.label}</h4>
                  <p className="text-xs text-midnight-400 mb-2">{type.desc}</p>
                  <p className="text-xs text-midnight-500">
                    当前：{currentStats[type.key as keyof typeof currentStats]} 条记录
                  </p>
                </button>
              );
            })}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="title-section mb-0">导入方式</h3>
              <button
                onClick={handleTemplateDownload}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                下载导入模板
              </button>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-btn p-12 text-center cursor-pointer transition-all ${
                isLoading
                  ? 'border-amber-gold-500 bg-amber-gold-500/10'
                  : 'border-midnight-600 hover:border-amber-gold-500 hover:bg-midnight-800'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              {isLoading ? (
                <div className="animate-spin w-12 h-12 border-4 border-amber-gold-500 border-t-transparent rounded-full mx-auto mb-4" />
              ) : (
                <Upload className="w-12 h-12 text-midnight-400 mx-auto mb-4" />
              )}
              <p className="text-midnight-200 mb-1">
                {isLoading ? '正在解析文件...' : '点击或拖拽上传 Excel 文件'}
              </p>
              <p className="text-sm text-midnight-500">支持 .xlsx 和 .xls 格式</p>
            </div>

            <div className="mt-6 pt-6 border-t border-midnight-700">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-midnight-100 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-gold-400" />
                    快速加载样例数据
                  </h4>
                  <p className="text-sm text-midnight-400 mt-1">
                    一键加载系统预置的完整样例数据，包含8件乐器、运输单、日程和冲突记录
                  </p>
                </div>
                <button
                  onClick={handleLoadSample}
                  className="btn-primary flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  加载样例
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {step === 'preview' && importResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-midnight-100">{previewData.length}</p>
              <p className="text-sm text-midnight-400">总记录数</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-success-green">{importResult.valid}</p>
              <p className="text-sm text-midnight-400">有效数据</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-3xl font-bold text-alert-red">{importResult.errors.length}</p>
              <p className="text-sm text-midnight-400">错误数</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="card p-4 bg-alert-red/5 border border-alert-red/30">
              <h4 className="font-medium text-alert-red mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                数据错误（请修正后重新上传）
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {importResult.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-alert-red font-mono">行{error.row}:</span>
                    <span className="text-midnight-300">{error.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4">
            <h4 className="font-medium text-midnight-100 mb-4">数据预览</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-midnight-600">
                    {previewData[0] && Object.keys(previewData[0]).slice(0, 6).map((key) => (
                      <th key={key} className="text-left py-2 px-3 text-midnight-400 font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-midnight-700">
                      {Object.values(row).slice(0, 6).map((value: any, colIndex) => (
                        <td key={colIndex} className="py-2 px-3 text-midnight-200">
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 5 && (
                <p className="text-center text-midnight-500 mt-3 text-sm">
                  ... 还有 {previewData.length - 5} 条记录
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={handleReset} className="btn-secondary flex-1">
              重新上传
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importResult.errors.length > 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认导入 {previewData.length} 条数据
            </button>
          </div>
        </motion.div>
      )}

      {step === 'result' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card p-12 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-success-green/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-success-green" />
          </div>
          <h3 className="text-2xl font-bold text-midnight-100 mb-2">导入成功！</h3>
          <p className="text-midnight-400 mb-8">
            已成功导入 {previewData.length} 条 {dataTypes.find(d => d.key === dataType)?.label} 数据
          </p>
          <div className="flex gap-4 max-w-md mx-auto">
            <button onClick={handleReset} className="btn-secondary flex-1">
              继续导入
            </button>
            <button
              onClick={() => window.location.href = '/check'}
              className="btn-primary flex-1"
            >
              前往核对
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Import;
