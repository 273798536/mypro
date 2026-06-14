import React, { useRef } from 'react';

interface FileUploadProps {
  onFileLoad: (data: unknown[], filename: string) => void;
  onLoadSample: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileLoad, onLoadSample }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let data: unknown[] = [];
        
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            data = parsed;
          } else if (Array.isArray(parsed.records)) {
            data = parsed.records;
          } else if (Array.isArray(parsed.data)) {
            data = parsed.data;
          } else {
            data = [parsed];
          }
        } else if (file.name.endsWith('.csv')) {
          data = parseCSV(content);
        }
        
        onFileLoad(data, file.name);
      } catch (err) {
        console.error('文件解析失败:', err);
        alert('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseCSV = (content: string): Record<string, string>[] => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const result: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj: Record<string, string> = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx]?.trim() || '';
      });
      result.push(obj);
    }
    
    return result;
  };

  return (
    <div className="file-upload">
      <div className="upload-section">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileChange}
          id="file-input"
          className="file-input"
        />
        <label htmlFor="file-input" className="upload-btn">
          📁 上传传感器日志
        </label>
        <span className="upload-hint">支持 JSON / CSV 格式，字段名不一致也能识别</span>
      </div>
      <button onClick={onLoadSample} className="sample-btn">
          📊 加载示例数据
      </button>
    </div>
  );
};
