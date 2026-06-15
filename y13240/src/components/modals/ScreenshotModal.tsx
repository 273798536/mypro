import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

interface ScreenshotUpload {
  dataUrl: string;
  description: string;
}

interface ScreenshotModalProps {
  onConfirm: (uploads: ScreenshotUpload[]) => void;
  onCancel: () => void;
}

export default function ScreenshotModal({ onConfirm, onCancel }: ScreenshotModalProps) {
  const [uploads, setUploads] = useState<ScreenshotUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUploads((prev) => [
          ...prev,
          { dataUrl, description: '' },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDescriptionChange = (index: number, description: string) => {
    setUploads((prev) =>
      prev.map((u, i) => (i === index ? { ...u, description } : u))
    );
  };

  const handleRemove = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-content max-w-2xl">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ImageIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-gray-900">上传截图说明</h3>
              <p className="text-sm text-gray-500">支持多张图片，每张可添加文字说明</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-gray-50 transition-all mb-6"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="font-medium text-gray-700">点击或拖拽上传截图</p>
            <p className="text-sm text-gray-500 mt-1">支持 JPG、PNG、GIF 格式</p>
          </div>

          {uploads.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">
                已上传 {uploads.length} 张图片
              </p>
              {uploads.map((upload, index) => (
                <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <img
                    src={upload.dataUrl}
                    alt={`截图 ${index + 1}`}
                    className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1">
                    <textarea
                      value={upload.description}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      placeholder="为这张截图添加说明..."
                      className="input-field resize-none h-20 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleRemove(index)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-fit transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button onClick={onCancel} className="flex-1 btn-secondary">
            取消
          </button>
          <button
            onClick={() => onConfirm(uploads)}
            className="flex-1 btn-primary"
            disabled={uploads.length === 0}
          >
            保存 {uploads.length > 0 ? `(${uploads.length} 张)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
