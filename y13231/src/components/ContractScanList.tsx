import { useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { FileText, Upload, Eye, Download, X, Plus } from 'lucide-react';
import type { ContractScan } from '@/types';

interface ContractScanListProps {
  scans: ContractScan[];
  onAddScan: (file: File, remark: string) => void;
}

export function ContractScanList({ scans, onAddScan }: ContractScanListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [previewScan, setPreviewScan] = useState<ContractScan | null>(null);
  const [newRemark, setNewRemark] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onAddScan(selectedFile, newRemark);
      setSelectedFile(null);
      setNewRemark('');
      setIsAdding(false);
    }
  };

  const sortedScans = [...scans].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" />
          合同扫描件历史
          <span className="text-sm font-normal text-primary-500">({scans.length} 份)</span>
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="btn-secondary text-sm py-1 px-3 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          添加扫描件
        </button>
      </div>

      {isAdding && (
        <div className="card p-4 mb-4 animate-slide-up">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                选择文件
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="input-field"
              />
              {selectedFile && (
                <p className="text-sm text-primary-600 mt-1">
                  已选择：{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                备注说明
              </label>
              <input
                type="text"
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                placeholder="例如：合同修订版、含手写备注等"
                className="input-field"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setSelectedFile(null);
                  setNewRemark('');
                }}
                className="btn-secondary text-sm py-1"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedFile}
                className="btn-primary text-sm py-1 disabled:opacity-50"
              >
                上传
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sortedScans.map((scan, index) => (
          <div
            key={scan.id}
            className="card p-4 flex items-start gap-4 animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-accent-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-primary-900 truncate">
                  {scan.fileName}
                </span>
                <span className="badge bg-primary-100 text-primary-700 border-primary-200">
                  v{scan.version}
                </span>
              </div>
              
              {scan.remark && (
                <p className="text-sm text-primary-600 mt-1">
                  备注：{scan.remark}
                </p>
              )}
              
              <p className="text-xs text-primary-400 mt-1">
                {format(new Date(scan.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
              </p>
            </div>
            
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setPreviewScan(scan)}
                className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
                title="预览"
              >
                <Eye className="w-4 h-4 text-primary-600" />
              </button>
              <a
                href={scan.fileData}
                download={scan.fileName}
                className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
                title="下载"
              >
                <Download className="w-4 h-4 text-primary-600" />
              </a>
            </div>
          </div>
        ))}
        
        {sortedScans.length === 0 && (
          <div className="text-center py-8 text-primary-400 border-2 border-dashed border-primary-200 rounded-lg">
            <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无合同扫描件</p>
            <p className="text-sm mt-1">点击"添加扫描件"上传</p>
          </div>
        )}
      </div>

      {previewScan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-primary-200">
              <h3 className="font-display font-semibold text-lg">
                {previewScan.fileName} (v{previewScan.version})
              </h3>
              <button
                onClick={() => setPreviewScan(null)}
                className="p-2 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-primary-600" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)] bg-gray-100">
              {previewScan.fileData.startsWith('data:image/') ? (
                <img
                  src={previewScan.fileData}
                  alt={previewScan.fileName}
                  className="max-w-full mx-auto rounded shadow-lg"
                />
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                  <p className="text-primary-600 mb-4">PDF 文件预览</p>
                  <a
                    href={previewScan.fileData}
                    download={previewScan.fileName}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    下载文件
                  </a>
                </div>
              )}
              {previewScan.remark && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-primary-200">
                  <p className="text-sm text-primary-500 mb-1">备注</p>
                  <p className="text-primary-800">{previewScan.remark}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
