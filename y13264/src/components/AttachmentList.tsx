import { Paperclip, FileImage, FileText, AlertTriangle, X } from 'lucide-react';
import { Attachment } from '../utils/types';
import { cn } from '../lib/utils';

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
  showDuplicateWarning?: boolean;
}

export function AttachmentList({ attachments, onRemove, showDuplicateWarning = true }: AttachmentListProps) {
  const validAttachments = attachments.filter(a => !a.isDuplicate);
  const duplicateAttachments = attachments.filter(a => a.isDuplicate);

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return FileImage;
    }
    return FileText;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Paperclip className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无附件</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showDuplicateWarning && duplicateAttachments.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm animate-pulse">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">检测到 {duplicateAttachments.length} 个重复附件</p>
            <p className="text-amber-600 text-xs mt-1">
              以下附件已存在，不会被重复统计：
            </p>
            <ul className="text-xs mt-1 space-y-0.5">
              {duplicateAttachments.map(a => (
                <li key={a.id}>• {a.name}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {validAttachments.length > 0 && (
        <div className="space-y-2">
          {validAttachments.map(attachment => {
            const Icon = getFileIcon(attachment.name);
            return (
              <div
                key={attachment.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all group',
                  'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate">{attachment.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatSize(attachment.size)} · {attachment.uploadTime}
                  </p>
                </div>
                {onRemove && (
                  <button
                    onClick={() => onRemove(attachment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-100 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4 text-rose-500" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
