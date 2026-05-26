import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Upload,
  FileJson,
  FileSpreadsheet,
  Sheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useMaterialStore } from '../store/materialStore';
import { parseJSONFile, parseExcelFile, parseCSVFile, getImportStrategyDescription } from '../services/importService';
import type { ImportStrategy, Material } from '../types';
import type { ImportResult } from '../services/importService';

export default function AdminImport() {
  const navigate = useNavigate();
  const { addMaterials } = useMaterialStore();
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importStrategy, setImportStrategy] = useState<ImportStrategy>('ignore');
  const [batchName, setBatchName] = useState(`批次_${new Date().toISOString().slice(0, 10)}`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<Material[] | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setImportResult(null);
    setPreviewData(null);

    let result: ImportResult;

    if (file.name.endsWith('.json')) {
      result = await parseJSONFile(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      result = await parseExcelFile(file);
    } else if (file.name.endsWith('.csv')) {
      result = await parseCSVFile(file);
    } else {
      result = {
        success: false,
        materials: [],
        errors: ['不支持的文件格式，请上传 JSON、CSV 或 Excel 文件'],
        warnings: [],
      };
    }

    setImportResult(result);
    if (result.materials.length > 0) {
      setPreviewData(result.materials.slice(0, 5));
    }
    setIsProcessing(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleConfirmImport = () => {
    if (!importResult || importResult.materials.length === 0) return;

    const result = addMaterials(importResult.materials, {
      strategy: importStrategy,
      batchName,
    });

    alert(
      `导入完成！\n新增: ${result.added} 条\n跳过: ${result.skipped} 条\n更新: ${result.updated} 条`
    );

    setImportResult(null);
    setPreviewData(null);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-black text-white">导入数据</h1>
        </div>

        <div className="glass-panel p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">支持的文件格式</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
              <FileJson className="w-8 h-8 text-primary-300" />
              <div>
                <p className="font-medium text-white">JSON</p>
                <p className="text-sm text-white/60">.json</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
              <FileSpreadsheet className="w-8 h-8 text-success-300" />
              <div>
                <p className="font-medium text-white">Excel</p>
                <p className="text-sm text-white/60">.xlsx, .xls</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
              <Sheet className="w-8 h-8 text-warning-300" />
              <div>
                <p className="font-medium text-white">CSV</p>
                <p className="text-sm text-white/60">.csv</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`glass-panel p-8 mb-6 border-2 border-dashed transition-all ${
            isDragging ? 'border-primary-400 bg-primary-500/10' : 'border-white/20'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".json,.csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload className={`w-16 h-16 mb-4 ${isDragging ? 'text-primary-400' : 'text-white/40'}`} />
            <p className="text-xl font-bold text-white mb-2">
              {isDragging ? '释放文件以上传' : '拖拽文件到此处'}
            </p>
            <p className="text-white/60 mb-4">或点击选择文件</p>
            <span className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors">
              选择文件
            </span>
          </label>
        </div>

        {isProcessing && (
          <div className="glass-panel p-8 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white/60">正在解析文件...</p>
          </div>
        )}

        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="glass-panel p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                {importResult.success ? (
                  <CheckCircle className="w-6 h-6 text-success-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-danger-400" />
                )}
                解析结果
              </h2>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-success-500/20 rounded-lg">
                  <p className="text-3xl font-bold text-success-400">
                    {importResult.materials.length}
                  </p>
                  <p className="text-sm text-white/60">解析成功</p>
                </div>
                <div className="text-center p-4 bg-danger-500/20 rounded-lg">
                  <p className="text-3xl font-bold text-danger-400">
                    {importResult.errors.length}
                  </p>
                  <p className="text-sm text-white/60">错误</p>
                </div>
                <div className="text-center p-4 bg-warning-500/20 rounded-lg">
                  <p className="text-3xl font-bold text-warning-400">
                    {importResult.warnings.length}
                  </p>
                  <p className="text-sm text-white/60">警告</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-danger-400 mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    错误信息
                  </h3>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, idx) => (
                      <p key={idx} className="text-sm text-danger-300 bg-danger-500/10 p-2 rounded">
                        {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {importResult.warnings.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-warning-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    警告信息
                  </h3>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.warnings.map((warning, idx) => (
                      <p key={idx} className="text-sm text-warning-300 bg-warning-500/10 p-2 rounded">
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {previewData && previewData.length > 0 && (
              <div className="glass-panel p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Info className="w-6 h-6 text-primary-300" />
                  数据预览（前5条）
                </h2>
                <div className="space-y-2">
                  {previewData.map((material, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white/5 rounded-lg flex items-center justify-between"
                    >
                      <span className="text-white/60 text-sm">
                        {material.type === 'container' && '集装箱'}
                        {material.type === 'license_plate' && '车牌'}
                        {material.type === 'booking_note' && '预约单'}
                        {material.type === 'dangerous_mark' && '危品标记'}
                      </span>
                      <span className="text-white font-mono text-sm">
                        {JSON.stringify(material.data).slice(0, 50)}...
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResult.materials.length > 0 && (
              <div className="glass-panel p-6">
                <h2 className="text-lg font-bold text-white mb-4">导入设置</h2>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    批次名称
                  </label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    重复数据处理策略
                  </label>
                  <div className="space-y-2">
                    {(['ignore', 'overwrite', 'append'] as ImportStrategy[]).map((strategy) => (
                      <label
                        key={strategy}
                        className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                          importStrategy === strategy
                            ? 'bg-primary-500/20 border border-primary-400/50'
                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="radio"
                          name="strategy"
                          value={strategy}
                          checked={importStrategy === strategy}
                          onChange={() => setImportStrategy(strategy)}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium text-white capitalize">
                            {strategy === 'ignore' && '忽略'}
                            {strategy === 'overwrite' && '覆盖'}
                            {strategy === 'append' && '追加'}
                          </p>
                          <p className="text-sm text-white/60">
                            {getImportStrategyDescription(strategy)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleConfirmImport}
                  className="w-full btn-success text-lg"
                >
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                  确认导入 {importResult.materials.length} 条数据
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
