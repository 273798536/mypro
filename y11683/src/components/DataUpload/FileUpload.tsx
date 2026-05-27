import { useState } from 'react';
import FieldMapping from './FieldMapping';

export default function FileUpload({ onClose }: { onClose: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  if (selectedFile) {
    return <FieldMapping file={selectedFile} onClose={() => { setSelectedFile(null); onClose(); }} />;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`bg-slate-900 border-2 border-dashed rounded-lg w-full max-w-lg p-8 transition-colors ${
          dragging ? 'border-blue-500 bg-blue-900/10' : 'border-slate-700'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
            setSelectedFile(file);
          }
        }}
      >
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">上传数据文件</h3>
          <p className="text-sm text-slate-400 mb-4">
            支持 CSV 格式，包含合约月份、价格、时间窗口等字段
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded cursor-pointer transition-colors">
            选择文件
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedFile(file);
              }}
            />
          </label>
          <p className="text-xs text-slate-500 mt-4">或将文件拖放至此处</p>
        </div>
      </div>
    </div>
  );
}