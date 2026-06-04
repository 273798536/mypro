import { useState, useCallback } from 'react';
import { Upload, X, AlertTriangle, CheckCircle, FileJson } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../common/Button';
import { useToast } from '../common/Toast';
import { parseFile, checkForDuplicates } from '../../services/importService';
import { useCanvasStore } from '../../stores/canvasStore';
import { ImportResult, Track, ImportError, ImportWarning } from '../../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicates, setDuplicates] = useState<{ newTrack: Track; existingTrack: Track }[]>([]);
  const [uniqueTracks, setUniqueTracks] = useState<Track[]>([]);
  
  const { tracks, importTracks } = useCanvasStore();
  const { addToast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    await processFiles(files);
  }, [tracks]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    await processFiles(files);
  }, [tracks]);

  const processFiles = async (files: File[]) => {
    setIsLoading(true);
    setResult(null);
    setDuplicates([]);
    setUniqueTracks([]);
    
    try {
      const allResults = await Promise.all(files.map(f => parseFile(f)));
      
      const combinedErrors: ImportError[] = [];
      const combinedWarnings: ImportWarning[] = [];
      const allTracks: Track[] = [];
      
      allResults.forEach(r => {
        if (r.errors) combinedErrors.push(...r.errors);
        if (r.warnings) combinedWarnings.push(...r.warnings);
        if (r.tracks) allTracks.push(...r.tracks);
      });
      
      const { duplicates: dup, uniqueTracks: unique } = checkForDuplicates(allTracks, tracks);
      setDuplicates(dup);
      setUniqueTracks(unique);
      
      setResult({
        success: combinedErrors.length === 0,
        tracks: allTracks,
        errors: combinedErrors.length > 0 ? combinedErrors : undefined,
        warnings: combinedWarnings.length > 0 ? combinedWarnings : undefined
      });
      
      if (dup.length > 0) {
        addToast({
          type: 'warning',
          message: `检测到 ${dup.length} 条重复轨迹，将自动跳过`
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        message: '文件处理失败'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (uniqueTracks.length > 0) {
      importTracks(uniqueTracks);
      addToast({
        type: 'success',
        message: `成功导入 ${uniqueTracks.length} 条轨迹`
      });
    }
    onClose();
  };

  const handleClose = () => {
    setResult(null);
    setDuplicates([]);
    setUniqueTracks([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">导入轨迹数据</h3>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-8 text-center transition-all
                  ${isDragging 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="file"
                  accept=".json"
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                
                {isLoading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <p className="mt-4 text-gray-600">正在处理文件...</p>
                  </div>
                ) : result ? (
                  <div className="flex flex-col items-center">
                    {result.success ? (
                      <CheckCircle size={48} className="text-status-normal" />
                    ) : (
                      <AlertTriangle size={48} className="text-status-error" />
                    )}
                    <p className="mt-4 font-medium text-gray-800">
                      {result.success ? '文件解析成功' : '文件解析失败'}
                    </p>
                    {result.tracks && (
                      <p className="text-sm text-gray-500 mt-1">
                        发现 {result.tracks.length} 条轨迹
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload size={48} className="mx-auto text-gray-400" />
                    <p className="mt-4 font-medium text-gray-700">
                      拖拽文件到此处，或点击选择
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      支持 JSON 格式文件
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <FileJson size={16} className="text-primary-500" />
                      <span className="text-sm text-primary-500">.json</span>
                    </div>
                  </>
                )}
              </div>
              
              {(result?.errors && result.errors.length > 0) && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl">
                  <h4 className="font-medium text-red-700 mb-2">错误信息</h4>
                  <ul className="space-y-2">
                    {result.errors.map((error, i) => (
                      <li key={i} className="text-sm">
                        <p className="text-red-600">{error.message}</p>
                        <p className="text-red-500 text-xs mt-0.5">{error.actionableHint}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {(result?.warnings && result.warnings.length > 0) && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
                  <h4 className="font-medium text-yellow-700 mb-2">警告信息</h4>
                  <ul className="space-y-1">
                    {result.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-yellow-600 flex items-center gap-2">
                        {warning.autoFixed && <CheckCircle size={14} />}
                        {warning.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {duplicates.length > 0 && (
                <div className="mt-4 p-4 bg-orange-50 rounded-xl">
                  <h4 className="font-medium text-orange-700 mb-2">
                    检测到 {duplicates.length} 条重复轨迹
                  </h4>
                  <p className="text-sm text-orange-600">
                    这些轨迹与现有数据重复，将自动跳过导入
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Button variant="secondary" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={handleImport}
                disabled={!result?.success || uniqueTracks.length === 0}
              >
                导入 ({uniqueTracks.length} 条)
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
