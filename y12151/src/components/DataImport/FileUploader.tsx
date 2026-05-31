import { useState, useCallback } from 'react';
import { Upload, FileText, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCalibrationStore } from '../../store/useCalibrationStore';
import { Phase } from '../../types';
import { phase1SampleCSV, phase2SampleCSV } from '../../utils/sampleData';

interface FileUploaderProps {
  phase: Phase;
}

export const FileUploader = ({ phase }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { importPhase1Data, importPhase2Data, importErrors, importWarnings, loadSampleData, loadBoundaryTestData } = useCalibrationStore();
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (phase === 'phase1') {
        importPhase1Data(file);
      } else {
        importPhase2Data(file);
      }
    }
  }, [phase, importPhase1Data, importPhase2Data]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (phase === 'phase1') {
        importPhase1Data(file);
      } else {
        importPhase2Data(file);
      }
    }
  }, [phase, importPhase1Data, importPhase2Data]);

  const handlePasteSample = useCallback(() => {
    if (phase === 'phase1') {
      importPhase1Data(phase1SampleCSV);
    } else {
      importPhase2Data(phase2SampleCSV);
    }
  }, [phase, importPhase1Data, importPhase2Data]);

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragging
            ? 'border-[#3E92CC] bg-[#3E92CC]/10'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center space-y-3">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-[#3E92CC]/20' : 'bg-gray-100'}`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-[#3E92CC]' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="font-medium text-gray-700">
              {phase === 'phase1' ? '拖放CSV文件或点击上传' : '拖放材质数据CSV文件或点击上传'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {phase === 'phase1' 
                ? '需包含: 测距值、环境温度、发射频率' 
                : '需包含: 记录ID、反射面材质'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handlePasteSample}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          粘贴示例数据
        </button>
        {phase === 'phase1' && (
          <>
            <button
              onClick={loadSampleData}
              className="flex items-center gap-2 px-4 py-2 bg-[#3E92CC]/10 hover:bg-[#3E92CC]/20 rounded-lg text-sm font-medium text-[#0A2463] transition-colors"
            >
              <Database className="w-4 h-4" />
              生成模拟数据
            </button>
            <button
              onClick={loadBoundaryTestData}
              className="flex items-center gap-2 px-4 py-2 bg-[#D8315B]/10 hover:bg-[#D8315B]/20 rounded-lg text-sm font-medium text-[#D8315B] transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              边界测试数据
            </button>
          </>
        )}
      </div>

      {importErrors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">导入错误 ({importErrors.length})</p>
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                {importErrors.slice(0, 5).map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
                {importErrors.length > 5 && (
                  <li>... 还有 {importErrors.length - 5} 条错误</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {importWarnings.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">导入警告 ({importWarnings.length})</p>
              <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                {importWarnings.slice(0, 5).map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {importErrors.length === 0 && importWarnings.length === 0 && phase === 'phase1' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <CheckCircle className="w-4 h-4" />
            <span>提示: 可先导入测距和温度数据，后续再补录材质信息</span>
          </div>
        </div>
      )}
    </div>
  );
};
