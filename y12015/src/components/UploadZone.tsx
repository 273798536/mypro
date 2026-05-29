import { useCallback, useState } from "react";
import { Upload, FileCheck, AlertCircle, Loader2 } from "lucide-react";

interface UploadZoneProps {
  title: string;
  onUpload: (file: File) => Promise<void>;
  loading: boolean;
  result?: { success: boolean; count?: number; error?: string } | null;
}

export default function UploadZone({
  title,
  onUpload,
  loading,
  result,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      onUpload(file);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? "border-accent bg-accent/5"
            : "border-gray-300 hover:border-primary/50"
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm text-gray-500">上传中...</p>
          </div>
        ) : result?.success ? (
          <div className="flex flex-col items-center gap-2">
            <FileCheck size={32} className="text-green-500" />
            <p className="text-sm text-green-600">
              上传成功，共 {result.count} 条记录
            </p>
          </div>
        ) : result?.error ? (
          <div className="flex flex-col items-center gap-2">
            <AlertCircle size={32} className="text-danger" />
            <p className="text-sm text-danger">{result.error}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className="text-gray-400" />
            <p className="text-sm text-gray-500">
              拖拽文件至此处，或点击选择文件
            </p>
            <p className="text-xs text-gray-400">支持 .csv, .xlsx 格式</p>
          </div>
        )}
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleChange}
          className="hidden"
          id={`upload-${title}`}
        />
        <label
          htmlFor={`upload-${title}`}
          className="mt-3 inline-block cursor-pointer text-sm text-primary hover:text-primary/80 underline"
        >
          选择文件
        </label>
      </div>
    </div>
  );
}
