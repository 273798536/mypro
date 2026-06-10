import { ClipboardCheck } from 'lucide-react';

export default function ReviewCenter() {
  return (
    <div className="flex flex-col items-center justify-center min-h-96">
      <div className="glass-card p-12 rounded-2xl text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-teal-400/10 flex items-center justify-center mx-auto mb-6">
          <ClipboardCheck className="w-8 h-8 text-teal-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">复核中心</h2>
        <p className="text-lab-400">数据复核审批功能正在开发中...</p>
      </div>
    </div>
  );
}
