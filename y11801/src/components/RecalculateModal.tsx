import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Modal } from './Modal';
import { calculationService } from '../services';

interface RecalculateModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
}

export function RecalculateModal({ isOpen, onClose, recordId }: RecalculateModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: (reason: string) =>
      calculationService.recalculate(recordId, {
        recordId,
        reason,
        operator: 'current_user',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculationResult', recordId] });
      onClose();
      setReason('');
    },
  });

  const handleConfirm = () => {
    mutation.mutate(reason);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="确认余额重算">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          余额重算将重新计算所有关联数据，此操作不可撤销。请输入重算原因：
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="请输入重算原因..."
          className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          rows={3}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', mutation.isPending && 'animate-spin')} />
            确认重算
          </button>
        </div>
      </div>
    </Modal>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
