import { Info } from 'lucide-react';

export default function QuickGuide() {
  return (
    <div className="flex items-start gap-3 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-400 my-2">
      <Info size={16} className="shrink-0 mt-0.5 text-[#00E5A0]" />
      <ol className="space-y-1 list-none">
        <li>📌 <strong className="text-gray-300">放样例</strong>：在异常记录中放置截图和补充材料</li>
        <li>🔄 <strong className="text-gray-300">重跑</strong>：从截图或异常记录跳转回时序回放，重新运行筛选</li>
        <li>📋 <strong className="text-gray-300">查看异常队列</strong>：在异常队列页查看所有待处理异常</li>
      </ol>
    </div>
  );
}
