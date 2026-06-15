import { useState } from 'react';
import { X, MessageSquare, AlertCircle } from 'lucide-react';
import { CommentType } from '@/types';

interface CommentModalProps {
  onConfirm: (content: string, author: string, type: CommentType) => void;
  onCancel: () => void;
  hasExistingConfirmation?: boolean;
}

export default function CommentModal({ onConfirm, onCancel, hasExistingConfirmation }: CommentModalProps) {
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('林姐');
  const [type, setType] = useState<CommentType>('normal');

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-content">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-gray-900">添加批注</h3>
              <p className="text-sm text-gray-500">批注将永久保留，可用于覆盖之前的判断</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {hasExistingConfirmation && (
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-800">
                  <p className="font-medium">该记录已有确认意见</p>
                  <p className="mt-1">选择"覆盖旧判断"将把状态更新为"有批注"，但原确认记录仍会保留在历史中。</p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              批注类型
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setType('normal')}
                className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                  type === 'normal'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <p className="font-medium">正常批注</p>
                <p className="text-xs mt-0.5 opacity-75">补充说明，不改变状态</p>
              </button>
              <button
                onClick={() => setType('override')}
                className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                  type === 'override'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <p className="font-medium">覆盖旧判断</p>
                <p className="text-xs mt-0.5 opacity-75">更新状态为"有批注"</p>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              批注内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入批注内容..."
              rows={4}
              className="input-field resize-none"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              批注人
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="input-field"
              placeholder="请输入您的姓名"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 btn-secondary">
              取消
            </button>
            <button
              onClick={() => onConfirm(content, author, type)}
              className="flex-1 btn-primary"
              disabled={!content.trim() || !author.trim()}
            >
              添加批注
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
