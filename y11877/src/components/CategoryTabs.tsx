import type { Verdict } from '@/utils/types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  activeTab: Verdict | 'all';
  onChange: (tab: Verdict | 'all') => void;
  counts: { pass: number; error: number; pending: number; all: number };
}

const tabs: { key: Verdict | 'all'; label: string; icon: typeof CheckCircle; color: string; activeColor: string }[] = [
  { key: 'all', label: '全部', icon: CheckCircle, color: 'text-gray-400', activeColor: 'bg-gray-500/20 text-gray-200 border-gray-400/40' },
  { key: 'pass', label: '通过', icon: CheckCircle, color: 'text-emerald-400', activeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40' },
  { key: 'error', label: '错误', icon: XCircle, color: 'text-red-400', activeColor: 'bg-red-500/20 text-red-400 border-red-400/40' },
  { key: 'pending', label: '待确认', icon: Clock, color: 'text-amber-400', activeColor: 'bg-amber-500/20 text-amber-400 border-amber-400/40' },
];

export default function CategoryTabs({ activeTab, onChange, counts }: Props) {
  return (
    <div className="flex gap-2">
      {tabs.map(({ key, label, icon: Icon, activeColor }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
            activeTab === key ? activeColor : 'bg-transparent text-gray-500 border-transparent hover:border-[#2d2d44] hover:text-gray-300'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
          <span className="ml-1 text-xs opacity-70">({counts[key]})</span>
        </button>
      ))}
    </div>
  );
}
