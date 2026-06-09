import React, { useRef } from 'react';
import { parseFile } from '../utils/parser';

interface FileImporterProps {
  onImport: (file: File) => void;
  onLoadDemo: () => void;
  sourceFileName?: string;
}

export const FileImporter: React.FC<FileImporterProps> = ({ onImport, onLoadDemo, sourceFileName }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await parseFile(file);
        onImport(file);
      } catch (err) {
        alert(`导入失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:block text-sm text-slate-500">
        {sourceFileName ? `数据源: ${sourceFileName}` : '未导入数据'}
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition"
      >
        <span>📥</span> 导入 CSV/Excel
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={onLoadDemo}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
      >
        <span>🧪</span> 载入示例数据
      </button>
    </div>
  );
};
