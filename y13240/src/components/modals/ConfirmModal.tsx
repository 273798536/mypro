import { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  type: 'confirm' | 'withdraw';
  onConfirm: (comment: string, author: string) => void;
  onCancel: () => void;
}

export default function ConfirmModal({ type, onConfirm, onCancel }: ConfirmModalProps) {
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState('林姐');
  const [step, setStep] = useState(1);

  const isConfirm = type === 'confirm';
  const title = isConfirm ? '确认复核通过' : '撤回确认';
  const placeholder = isConfirm
    ? '请填写复核意见（必填）'
    : '请填写撤回原因（必填）';

  const handleNext = () => {
    if (comment.trim()) {
      setStep(2);
    }
  };

  const handleFinalConfirm = () => {
    onConfirm(comment, author);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-content">
        <div className={`p-6 border-b ${
          isConfirm ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                isConfirm ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                {isConfirm ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <h3 className={`text-lg font-serif font-bold ${
                  isConfirm ? 'text-emerald-900' : 'text-red-900'
                }`}>
                  {title}
                </h3>
                <p className="text-sm text-gray-500">
                  {isConfirm ? '确认后状态将更新为"已确认"' : '撤回后原记录将保留，状态更新为"已撤回"'}
                </p>
              </div>
            </div>
            <button onClick={onCancel} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {step === 1 ? (
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isConfirm ? '复核意见' : '撤回原因'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className="input-field resize-none"
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                操作人
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
                onClick={handleNext}
                className={`flex-1 ${isConfirm ? 'btn-primary' : 'btn-danger'}`}
                disabled={!comment.trim() || !author.trim()}
              >
                下一步
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className={`p-4 rounded-xl mb-6 ${
              isConfirm ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className="text-sm font-medium text-gray-700 mb-2">请确认以下信息：</p>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• 操作：<span className={isConfirm ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>{title}</span></p>
                <p>• 操作人：<span className="font-medium">{author}</span></p>
                <p>• {isConfirm ? '复核意见' : '撤回原因'}：</p>
                <p className="bg-white/80 p-3 rounded-lg mt-1">{comment}</p>
              </div>
            </div>
            {!isConfirm && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">重要提示</p>
                    <p className="mt-1">撤回操作不会删除原记录，仅更新状态。所有历史版本和批注将保留以供追溯。</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 btn-secondary">
                返回修改
              </button>
              <button
                onClick={handleFinalConfirm}
                className={`flex-1 ${isConfirm ? 'btn-primary' : 'btn-danger'}`}
              >
                确认{isConfirm ? '通过' : '撤回'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
