import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { parseFile, validateFile } from '@/utils/fileParser';
import { ParsedFileData } from '@/types/experiment';

interface FileUploadAreaProps {
  onFileParsed: (data: ParsedFileData) => void;
  disabled?: boolean;
}

export const FileUploadArea = ({ onFileParsed, disabled }: FileUploadAreaProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<{ name: string; rowCount: number } | null>(null);
  
  const handleFile = useCallback(async (file: File) => {
    setError(null);
    
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.message || '文件验证失败');
      return;
    }
    
    setIsParsing(true);
    
    try {
      const parsedData = await parseFile(file);
      setLastFile({
        name: file.name,
        rowCount: parsedData.rows.length,
      });
      onFileParsed(parsedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setIsParsing(false);
    }
  }, [onFileParsed]);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [disabled, handleFile]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);
  
  return (
    <div className="w-full">
      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer',
          isDragging ? 'border-[#0F3460] bg-[#0F3460]/5' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-300 bg-red-50'
        )}
        whileHover={!disabled ? { scale: 1.005 } : {}}
        whileTap={!disabled ? { scale: 0.995 } : {}}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={disabled || isParsing}
        />
        
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={isParsing ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: isParsing ? Infinity : 0, ease: 'linear' }}
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              isDragging ? 'bg-[#0F3460]/10' : 'bg-gray-100',
              error ? 'bg-red-100' : '',
              lastFile && !error ? 'bg-green-100' : ''
            )}
          >
            {error ? (
              <AlertCircle className="w-8 h-8 text-red-500" />
            ) : lastFile && !error ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : (
              isParsing ? (
                <FileSpreadsheet className="w-8 h-8 text-[#0F3460]" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )
            )}
          </motion.div>
          
          <div>
            {isParsing ? (
              <div>
                <p className="text-lg font-medium text-gray-900">正在解析文件...</p>
                <p className="text-sm text-gray-500 mt-1">请稍候，正在处理数据</p>
              </div>
            ) : error ? (
              <div>
                <p className="text-lg font-medium text-red-600">文件解析失败</p>
                <p className="text-sm text-red-500 mt-1">{error}</p>
              </div>
            ) : lastFile ? (
              <div>
                <p className="text-lg font-medium text-gray-900">文件已加载</p>
                <p className="text-sm text-gray-500 mt-1">
                  {lastFile.name} · {lastFile.rowCount} 条数据
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900">
                  拖拽文件到此处或点击上传
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  支持 .xlsx、.xls、.csv 格式，最大 10MB
                </p>
              </div>
            )}
          </div>
          
          {!isParsing && !error && (
            <div className="flex items-center gap-2">
              <StatusBadge status="info" size="sm">Excel</StatusBadge>
              <StatusBadge status="info" size="sm">CSV</StatusBadge>
              <span className="text-xs text-gray-400">字段名自动识别</span>
            </div>
          )}
        </div>
      </motion.div>
      
      {lastFile && !error && (
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700">
              成功解析 {lastFile.rowCount} 条数据记录
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setLastFile(null);
            }}
          >
            重新上传
          </Button>
        </div>
      )}
    </div>
  );
};
