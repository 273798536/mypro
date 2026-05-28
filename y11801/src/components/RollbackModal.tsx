import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { Modal } from './Modal';
import { contractService } from '../services';

interface RollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
}

export function RollbackModal({ isOpen, onClose, contractId }: RollbackModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      contractService.rollbackSubsidy(contractId, {
        contractId,
        rollbackAmount: parseFloat(amount),
        reason,
        operator: 'current_user',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculationResult'] });
      onClose();
      setReason('');
      setAmount('');
    },
  });

  const handleConfirm = () => {
    mutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="确认补贴回滚">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          补贴回滚将调整补贴金额，请输入回滚金额和原因：
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">回滚金额（元）</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="请输入回滚金额"
            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">回滚原因</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="请输入回滚原因..."
            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!amount || !reason.trim() || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded hover:bg-amber-600 disabled:opacity-50"
          >
            <RotateCcw className={cn('h-4 w-4', mutation.isPending && 'animate-spin')} />
            确认回滚
          </button>
        </div>
      </div>
    </Modal>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
