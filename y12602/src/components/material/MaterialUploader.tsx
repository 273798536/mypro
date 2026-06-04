import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useMaterials } from '@/hooks/useMaterials';

export const MaterialUploader: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { importMaterials } = useMaterials();
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showNotification('warning', '请选择图片文件');
      return;
    }

    const result = await importMaterials(imageFiles);
    
    if (result.imported.length > 0 && result.duplicates.length > 0) {
      showNotification('warning', `成功导入 ${result.imported.length} 份，跳过 ${result.duplicates.length} 份重复素材`);
    } else if (result.imported.length > 0) {
      showNotification('success', `成功导入 ${result.imported.length} 份素材`);
    } else if (result.duplicates.length > 0) {
      showNotification('warning', `${result.duplicates.length} 份素材已存在，已自动跳过`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative">
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragging 
            ? 'border-accent bg-accent/5' 
            : 'border-neutral-300 hover:border-primary hover:bg-primary/5'
        }`}
      >
        <Upload size={24} className={`mx-auto mb-2 ${isDragging ? 'text-accent' : 'text-neutral-400'}`} />
        <p className="text-sm text-neutral-600">点击或拖拽上传截图</p>
        <p className="text-xs text-neutral-400 mt-1">支持批量上传，自动去重</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {notification && (
        <div className={`absolute top-full left-0 right-0 mt-2 p-3 rounded-lg flex items-center gap-2 text-sm animate-fade-in-up ${
          notification.type === 'success' 
            ? 'bg-success/10 text-success-dark' 
            : 'bg-warning/10 text-warning-dark'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}
    </div>
  );
};
