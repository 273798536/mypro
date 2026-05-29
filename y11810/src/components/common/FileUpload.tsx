import { useState, useRef } from "react";
import { Upload, X, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  description?: string;
}

export function FileUpload({
  onFileSelect,
  accept = ".json",
  maxSize = 10 * 1024 * 1024,
  label = "拖拽文件到此处，或点击选择",
  description = "支持 JSON 格式，大小不超过 10MB",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (maxSize && file.size > maxSize) {
      setError(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`);
      return false;
    }
    if (accept && !file.name.toLowerCase().endsWith(accept.replace(".", ""))) {
      setError(`只支持 ${accept} 格式文件`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : error
            ? "border-red-300 bg-red-50"
            : "border-gray-300 bg-gray-50 hover:border-primary/50 hover:bg-gray-100"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
        {selectedFile ? (
          <div className="flex items-center gap-3">
            <FileJson className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="text-[14px] font-medium text-gray-700">{selectedFile.name}</p>
              <p className="text-[12px] text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="ml-2 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload
              className={cn(
                "mb-2 h-10 w-10",
                isDragging ? "text-primary" : "text-gray-400"
              )}
            />
            <p
              className={cn(
                "text-[14px]",
                isDragging ? "text-primary" : "text-gray-600"
              )}
            >
              {label}
            </p>
            <p className="mt-1 text-[12px] text-gray-500">{description}</p>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
