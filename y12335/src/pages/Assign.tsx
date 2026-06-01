import { Play } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { AssignConsole } from '@/components/AssignConsole';
import { AssignmentTable } from '@/components/AssignmentTable';
import { ConstraintDrawer } from '@/components/ConstraintDrawer';
import { AnomalyPanel } from '@/components/AnomalyPanel';

export default function Assign() {
  const currentResult = useStore((s) => s.currentResult);
  const runAssignmentAlgorithm = useStore((s) => s.runAssignmentAlgorithm);

  return (
    <div className="flex flex-col h-full bg-surface-900">
      <AssignConsole />

      {currentResult ? (
        <div className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 overflow-hidden">
            <AssignmentTable />
          </div>
          <AnomalyPanel />
          <ConstraintDrawer />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center">
              <Play className="h-7 w-7 text-brand-500" />
            </div>
            <div>
              <p className="text-gray-300 text-lg font-medium">尚未运行分配算法</p>
              <p className="text-gray-500 text-sm mt-1">请在上方选择算法模式并点击"运行分配"按钮</p>
            </div>
            <button
              onClick={runAssignmentAlgorithm}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              <Play className="h-4 w-4" />
              开始分配
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
