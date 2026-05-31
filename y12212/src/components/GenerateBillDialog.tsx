import { useState, useEffect } from 'react';
import { X, FilePlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBillStore } from '@/stores/billStore';
import { useImportStore } from '@/stores/importStore';
import { apiPost } from '@/utils/api';

interface GenerateBillDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function GenerateBillDialog({ open, onClose }: GenerateBillDialogProps) {
  const [billingMonth, setBillingMonth] = useState('');
  const [importTaskId, setImportTaskId] = useState('');
  const [generating, setGenerating] = useState(false);
  const { fetchBills } = useBillStore();
  const { tasks, fetchTasks } = useImportStore();

  useEffect(() => {
    if (open) {
      fetchTasks();
      setBillingMonth('');
      setImportTaskId('');
    }
  }, [open, fetchTasks]);

  const handleGenerate = async () => {
    if (!billingMonth) return;
    setGenerating(true);
    try {
      await apiPost('/bills/generate', {
        billing_month: billingMonth,
        import_task_id: importTaskId || undefined,
      });
      fetchBills();
      onClose();
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">生成账单</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">账单月份</label>
            <input
              type="month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">导入任务</label>
            <select
              value={importTaskId}
              onChange={(e) => setImportTaskId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            >
              <option value="">全部导入数据</option>
              {tasks
                .filter((t) => t.status === 'completed')
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.file_name} ({task.success_count}条)
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            disabled={!billingMonth || generating}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white',
              billingMonth && !generating
                ? 'bg-[#1e3a5f] hover:bg-[#2a4d7a]'
                : 'cursor-not-allowed bg-gray-300'
            )}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FilePlus className="h-4 w-4" />
            )}
            生成
          </button>
        </div>
      </div>
    </div>
  );
}
