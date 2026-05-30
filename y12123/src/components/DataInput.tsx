import { useState, useRef } from 'react';
import { Upload, FileJson, FileSpreadsheet, Sparkles, Download, Database } from 'lucide-react';
import { parseCSV, parseJSON, generateTemplateCSV } from '../utils/csvParser';
import { generateMockData, generateDirtyMockData } from '../utils/mockData';
import type { MemberBehavior } from '../types';

interface DataInputProps {
  onDataLoaded: (data: MemberBehavior[]) => void;
  currentData: MemberBehavior[];
}

export function DataInput({ onDataLoaded, currentData }: DataInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError(null);
    await processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    try {
      let data: MemberBehavior[] = [];

      if (file.name.endsWith('.csv')) {
        data = await parseCSV(file);
      } else if (file.name.endsWith('.json')) {
        data = await parseJSON(file);
      } else {
        setError('不支持的文件格式，请上传CSV或JSON文件');
        return;
      }

      if (data.length === 0) {
        setError('文件中没有有效数据');
        return;
      }

      onDataLoaded(data);
    } catch (err) {
      setError(`解析文件失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const handleLoadMockData = () => {
    const data = generateMockData(35);
    onDataLoaded(data);
    setError(null);
  };

  const handleLoadDirtyData = () => {
    const data = generateDirtyMockData();
    onDataLoaded(data);
    setError(null);
  };

  const handleDownloadTemplate = () => {
    const csv = generateTemplateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'member_behavior_template.csv';
    link.click();
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const memberCount = new Set(currentData.map(d => d.memberId)).size;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800">数据输入</h3>
        {currentData.length > 0 && (
          <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
            {currentData.length} 条记录 · {memberCount} 个会员
          </span>
        )}
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-slate-400 hover:bg-gray-50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-600">
          拖拽文件到此处，或<span className="text-blue-600 font-medium">点击浏览</span>
        </p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <FileJson className="w-3.5 h-3.5" /> JSON
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={handleLoadMockData}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          加载示例数据
        </button>
        <button
          onClick={handleLoadDirtyData}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          加载含异常数据
        </button>
        <button
          onClick={handleDownloadTemplate}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          下载模板
        </button>
      </div>
    </div>
  );
}
