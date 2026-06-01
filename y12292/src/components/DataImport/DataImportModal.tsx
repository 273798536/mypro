
import { useState, useRef } from 'react';
import { X, Upload, File, Check, AlertCircle, FolderOpen } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import type { FileRecord } from '../../types';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FileCategory = 'floorModels' | 'trajectoryFiles' | 'logFiles';

export function DataImportModal({ isOpen, onClose }: DataImportModalProps) {
  const [activeTab, setActiveTab] = useState<FileCategory>('floorModels');
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addRawFile = useDataStore(state => state.addRawFile);
  const rawFiles = useDataStore(state => state.rawFiles);
  
  if (!isOpen) return null;
  
  const tabs: { id: FileCategory; label: string; icon: React.ReactNode; description: string }[] = [
    { id: 'floorModels', label: '楼层模型', icon: <FolderOpen className="w-4 h-4" />, description: 'JSON/GLTF 格式' },
    { id: 'trajectoryFiles', label: '定位轨迹', icon: <File className="w-4 h-4" />, description: 'CSV/JSON 格式' },
    { id: 'logFiles', label: '设备日志', icon: <File className="w-4 h-4" />, description: 'CSV/LOG 格式' },
  ];
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  };
  
  const handleFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const record: FileRecord = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: Date.now(),
        status: 'success'
      };
      addRawFile(activeTab, record);
    });
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">数据导入</h2>
                <p className="text-gray-500 text-sm">上传楼层模型、定位轨迹和设备日志</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex gap-2 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 p-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                    : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
                }`}
              >
                <div className={`${activeTab === tab.id ? 'text-cyan-400' : 'text-gray-400'} mb-1`}>
                  {tab.icon}
                </div>
                <div className={`text-sm font-medium ${activeTab === tab.id ? 'text-cyan-400' : 'text-gray-400'}`}>
                  {tab.label}
                </div>
                <div className="text-[10px] text-gray-500">{tab.description}</div>
              </button>
            ))}
          </div>
          
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragging ? 'text-cyan-400' : 'text-gray-500'}`} />
            <p className="text-white font-medium mb-1">
              {dragging ? '释放文件以上传' : '拖拽文件到此处或点击选择'}
            </p>
            <p className="text-gray-500 text-sm">支持 JSON、CSV、GLTF 格式</p>
          </div>
          
          {rawFiles[activeTab].length > 0 && (
            <div className="mt-6">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <span className="text-cyan-400">已上传文件</span>
                <span className="text-gray-500 text-sm">({rawFiles[activeTab].length})</span>
              </h3>
              <div className="space-y-2">
                {rawFiles[activeTab].map(file => (
                  <FileItem key={file.id} file={file} />
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-700/50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            原始材料与处理结果将分开保存
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-gray-400 hover:bg-slate-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium hover:opacity-90 transition-opacity"
            >
              开始处理
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileItem({ file }: { file: FileRecord }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
        <File className="w-5 h-5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{file.name}</div>
        <div className="text-gray-500 text-xs">{(file.size / 1024).toFixed(1)} KB</div>
      </div>
      {file.status === 'success' && (
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-4 h-4 text-green-400" />
        </div>
      )}
      {file.status === 'error' && (
        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-red-400" />
        </div>
      )}
    </div>
  );
}

