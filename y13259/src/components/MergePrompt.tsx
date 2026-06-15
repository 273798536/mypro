import { AlertCircle, Merge, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { MergeableComplaintGroup, Complaint } from '@/types';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/services/traceService';

interface MergePromptProps {
  group: MergeableComplaintGroup | null;
  onConfirm: (explanation: string) => void;
  onCancel: () => void;
}

function ComplaintCard({ complaint, index }: { complaint: Complaint; index: number }) {
  return (
    <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center px-2 py-1 bg-municipal-100 text-municipal-700 text-xs font-medium rounded">
          投诉 #{index + 1}
        </span>
        <span className="text-xs text-gray-500">
          {formatDateShort(complaint.createdAt)}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-500">投诉人：</span>
          <span className="text-gray-900">{complaint.reporter}</span>
        </div>
        <div>
          <span className="text-gray-500">投诉内容：</span>
          <p className="text-gray-900 mt-1 leading-relaxed">{complaint.content}</p>
        </div>
      </div>
    </div>
  );
}

export default function MergePrompt({ group, onConfirm, onCancel }: MergePromptProps) {
  const isOpen = group !== null;
  const [explanation, setExplanation] = useState('');

  const handleConfirm = () => {
    onConfirm(explanation || '同街口投诉归并处理');
    setExplanation('');
  };

  return (
    <AnimatePresence>
      {isOpen && group && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden',
                'flex flex-col'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-amber-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">检测到同街口多条投诉</h3>
                    <p className="text-sm text-gray-600">
                      街口：{group.street} · 共 {group.complaints.length} 条投诉
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-center text-gray-700 font-medium">
                  是否将这些投诉归并处理？
                </p>

                <div className="flex gap-4">
                  {group.complaints.map((complaint, index) => (
                    <ComplaintCard key={complaint.id} complaint={complaint} index={index} />
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Merge className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm flex-1">
                      <p className="font-medium text-blue-800 mb-1">归并说明</p>
                      <p className="text-blue-700 mb-3">
                        原始投诉记录将保留，状态标记为「已归并」。归并后可统一处理，提高处理效率。
                      </p>
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          请填写归并说明 <span className="text-danger-500">*</span>
                        </label>
                        <textarea
                          value={explanation}
                          onChange={(e) => setExplanation(e.target.value)}
                          placeholder="例如：两条投诉均反映同一时段校门口接送拥堵问题..."
                          rows={3}
                          className={cn(
                            'w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors resize-none',
                            'border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            'bg-white text-gray-900 placeholder-gray-400'
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={onCancel}
                  className={cn(
                    'px-5 py-2.5 rounded-lg font-medium transition-colors',
                    'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  暂不归并
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={cn(
                    'px-5 py-2.5 rounded-lg font-medium transition-colors',
                    'bg-municipal-600 text-white hover:bg-municipal-700'
                  )}
                >
                  人工确认归并
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
