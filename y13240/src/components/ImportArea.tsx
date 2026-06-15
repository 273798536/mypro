import { useState, useCallback } from 'react';
import { Upload, FileAudio, AlertCircle, CheckCircle } from 'lucide-react';
import { useStore } from '@/store';
import { parseAudioFile } from '@/utils/fileParser';
import { ParsedAudioFile } from '@/types';
import ImportConfirmModal from './modals/ImportConfirmModal';

interface ImportResult {
  newRecords: number;
  updatedRecords: number;
  warnings: string[];
}

export default function ImportArea() {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedAudioFile[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const importAudioFiles = useStore((state) => state.importAudioFiles);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setIsParsing(true);
    const audioFiles = Array.from(files).filter((file) =>
      file.type.startsWith('audio/') ||
      /\.(mp3|wav|flac|aac|ogg|m4a)$/i.test(file.name)
    );

    if (audioFiles.length === 0) {
      setImportResult({
        newRecords: 0,
        updatedRecords: 0,
        warnings: ['未找到音频文件，请选择 .mp3, .wav, .flac 等音频格式文件'],
      });
      setIsParsing(false);
      return;
    }

    const parsed = await Promise.all(audioFiles.map(parseAudioFile));
    setParsedFiles(parsed);
    setShowConfirmModal(true);
    setIsParsing(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleConfirmImport = useCallback((importedBy: string) => {
    const result = importAudioFiles(parsedFiles, importedBy);
    const warnings: string[] = [];
    
    parsedFiles.forEach((file) => {
      if (!file.stallNumber) {
        warnings.push(`文件 "${file.fileName}" 无法识别摊位编号，已自动生成`);
      }
      if (!file.authorizationDate) {
        warnings.push(`文件 "${file.fileName}" 未找到授权期限，请手动补充`);
      }
    });

    setImportResult({
      newRecords: result.newRecords.length,
      updatedRecords: result.updatedRecords.length,
      warnings,
    });
    setShowConfirmModal(false);
    setParsedFiles([]);
  }, [importAudioFiles, parsedFiles]);

  return (
    <div className="mb-8">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
          ${isDragging
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.flac,.aac,.ogg,.m4a"
          className="hidden"
          onChange={handleFileInput}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 rounded-full transition-all duration-300 ${isDragging ? 'bg-primary/10' : 'bg-gray-100'}`}>
            {isParsing ? (
              <FileAudio className="w-12 h-12 text-primary animate-pulse" />
            ) : (
              <Upload className={`w-12 h-12 ${isDragging ? 'text-primary' : 'text-gray-400'}`} />
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">
              {isParsing ? '正在解析音频文件...' : '拖拽音频文件到此处'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              或点击选择文件，支持 .mp3, .wav, .flac 等格式
            </p>
            <p className="text-xs text-gray-400 mt-2">
              提示：文件名含"摊位XX"可自动识别，备注中可提取授权期限
            </p>
          </div>
        </div>
      </div>

      {importResult && (
        <div className={`mt-4 p-4 rounded-xl ${
          importResult.warnings.length > 0
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-emerald-50 border border-emerald-200'
        }`}>
          <div className="flex items-start gap-3">
            {importResult.warnings.length > 0 ? (
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-800">
                导入完成：新增 {importResult.newRecords} 条，更新 {importResult.updatedRecords} 条
              </p>
              {importResult.warnings.length > 0 && (
                <ul className="mt-2 text-sm text-amber-700 space-y-1">
                  {importResult.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <ImportConfirmModal
          files={parsedFiles}
          onConfirm={handleConfirmImport}
          onCancel={() => {
            setShowConfirmModal(false);
            setParsedFiles([]);
          }}
        />
      )}
    </div>
  );
}
