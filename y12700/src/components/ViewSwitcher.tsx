import { Bot, GraduationCap } from 'lucide-react';
import { useStore } from '@/store';

export default function ViewSwitcher() {
  const viewMode = useStore(s => s.viewMode);
  const setViewMode = useStore(s => s.setViewMode);

  return (
    <div className="inline-flex items-center bg-ink-100/70 rounded-xl p-1 border border-ink-200">
      <button
        onClick={() => setViewMode('analyst')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
          viewMode === 'analyst'
            ? 'bg-white text-ink-800 shadow-card'
            : 'text-ink-500 hover:text-ink-700'
        }`}
      >
        <Bot className="w-4 h-4" />
        投研助理
      </button>
      <button
        onClick={() => setViewMode('student')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
          viewMode === 'student'
            ? 'bg-white text-ink-800 shadow-card'
            : 'text-ink-500 hover:text-ink-700'
        }`}
      >
        <GraduationCap className="w-4 h-4" />
        学生视图
      </button>
    </div>
  );
}
