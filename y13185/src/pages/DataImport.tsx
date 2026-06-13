import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { FileUploadArea } from '@/components/import/FileUploadArea';
import { FieldMappingEditor } from '@/components/import/FieldMappingEditor';
import { useExperimentStore } from '@/store/useExperimentStore';
import { useFieldMapping } from '@/hooks/useFieldMapping';
import { ParsedFileData, FieldMapping } from '@/types/experiment';
import { useNavigate } from 'react-router-dom';

export default function DataImport() {
  const [step, setStep] = useState<'upload' | 'mapping' | 'complete'>('upload');
  const [parsedData, setParsedData] = useState<ParsedFileData | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const navigate = useNavigate();

  const importParsedData = useExperimentStore(state => state.importParsedData);
  const selectRecord = useExperimentStore(state => state.selectRecord);
  const experiments = useExperimentStore(state => state.experiments);

  const {
    mappings,
    updateMapping,
    lockMapping,
    autoMatchAll,
    getMappingsByStatus,
  } = useFieldMapping(parsedData);

  const handleFileParsed = (data: ParsedFileData) => {
    setParsedData(data);
    setStep('mapping');
  };

  const handleConfirmImport = () => {
    if (!parsedData || !mappings) return;

    const imported = importParsedData(parsedData, mappings);
    setImportedCount(imported.length);
    setStep('complete');

    if (imported.length > 0) {
      selectRecord(imported[0].id);
    }
  };

  const handleGoToCalculator = () => {
    navigate('/calculator');
  };

  const { processed, pending } = getMappingsByStatus();
  const allMapped = pending === 0 && mappings && mappings.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据导入</h1>
          <p className="text-gray-500 mt-1">上传实验数据文件，配置字段映射关系</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={step === 'upload' ? 'pending' : 'success'}>
            上传文件
          </StatusBadge>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <StatusBadge status={step === 'mapping' ? 'processing' : step === 'complete' ? 'success' : 'pending'}>
            字段映射
          </StatusBadge>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <StatusBadge status={step === 'complete' ? 'success' : 'pending'}>
            导入完成
          </StatusBadge>
        </div>
      </div>

      {step === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">上传实验数据文件</h2>
                <p className="text-gray-500">支持 Excel (.xlsx, .xls) 和 CSV 格式文件</p>
              </div>
              <FileUploadArea onFileParsed={handleFileParsed} />
            </div>
          </Card>

          {experiments.length > 0 && (
            <Card className="mt-6">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">已有实验数据</h3>
                    <p className="text-sm text-gray-500">当前系统中已存储 {experiments.length} 条实验记录</p>
                  </div>
                  <Button variant="outline" onClick={handleGoToCalculator}>
                    前往复算工作台
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {step === 'mapping' && parsedData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">字段映射配置</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {parsedData.fileName} · {parsedData.rows.length} 条记录 · {parsedData.headers.length} 个字段
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">{processed} 个已映射</span>
                  </div>
                  {pending > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-amber-600">{pending} 个待处理</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              <FieldMappingEditor
                headers={parsedData.headers}
                mappings={mappings}
                onUpdateMapping={updateMapping}
                onLockMapping={lockMapping}
                onAutoMatch={autoMatchAll}
                sampleData={parsedData.rows[0] || {}}
              />
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                返回上传
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={autoMatchAll}>
                  自动匹配全部
                </Button>
                <Button onClick={handleConfirmImport} disabled={!allMapped}>
                  确认导入
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {step === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">导入成功</h2>
              <p className="text-gray-500 mb-8">
                成功导入 {importedCount} 条实验记录，字段来源和处理状态已完整保留
              </p>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  继续上传
                </Button>
                <Button onClick={handleGoToCalculator}>
                  前往复算工作台
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
