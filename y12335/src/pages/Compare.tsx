import { useState } from 'react';
import { SlidersHorizontal, History, ChevronDown, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { SkillEditor } from '@/components/SkillEditor';
import { CompareView } from '@/components/CompareView';
import { CorrectionHistory } from '@/components/CorrectionHistory';

export default function Compare() {
  const currentResult = useStore(s => s.currentResult);
  const volunteers = useStore(s => s.volunteers);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!currentResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="rounded-xl bg-surface-800 border border-surface-700 p-8 text-center max-w-md">
          <AlertCircle size={40} className="text-warn mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-200 mb-2">尚未运行排班算法</h2>
          <p className="text-sm text-gray-500">请先在首页运行排班算法，再进行手动修正</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={18} className="text-brand-400" />
          <h2 className="text-base font-semibold text-gray-200">技能修正</h2>
          <span className="text-xs text-gray-500">修改后将自动重新排班</span>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
          {volunteers.map(v => (
            <SkillEditor key={v.id} volunteerId={v.id} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-200 mb-4">排班对比</h2>
        <CompareView />
      </div>

      <div>
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-brand-400 transition-colors mb-3"
        >
          <History size={16} />
          <span>修正历史</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${historyOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {historyOpen && <CorrectionHistory />}
      </div>
    </div>
  );
}
