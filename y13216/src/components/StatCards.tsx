import { useEffect, useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react';
import { useConflictStore } from '@/store/conflictStore';
import type { ConflictStatus } from '@/types';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: string;
  barColor: string;
  onClick?: () => void;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = display;
    const duration = 500;
    const startTime = performance.now();
    const animate = (t: number) => {
      const progress = Math.min(1, (t - startTime) / duration);
      setDisplay(Math.round(start + (value - start) * progress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span className="tabular-nums">{display}</span>;
}

function StatCard({ icon, label, value, total, color, barColor, onClick }: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      onClick={onClick}
      className={onClick ? 'stat-card cursor-pointer' : 'stat-card'}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
        <span className="text-xs font-medium text-gray-400 tracking-wider">
          {pct}%
        </span>
      </div>
      <div className="mt-4">
        <div className={`text-[46px] font-black leading-none animate-count-up ${barColor.replace('bg-', 'text-')}`}>
          <AnimatedNumber value={value} />
        </div>
        <div className="mt-2 text-sm font-semibold text-gray-600 tracking-wide">
          {label}
        </div>
      </div>
      <div className="mt-5 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function StatCards() {
  const { getStatistics, setActiveStatusTab } = useConflictStore();
  const stats = getStatistics();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<ClipboardList className="w-6 h-6 text-brand-700" />}
        label="筛选后总数"
        value={stats.total}
        total={stats.total}
        color="bg-brand-50"
        barColor="bg-brand-600"
      />
      <StatCard
        icon={<CheckCircle2 className="w-6 h-6 text-status-resolved" />}
        label="✅ 已处理"
        value={stats.resolved}
        total={stats.total}
        color="bg-status-resolvedBg"
        barColor="bg-status-resolved"
        onClick={() => setActiveStatusTab('resolved')}
      />
      <StatCard
        icon={<AlertTriangle className="w-6 h-6 text-status-evidence" />}
        label="⚠️ 需补证据"
        value={stats.pendingEvidence}
        total={stats.total}
        color="bg-status-evidenceBg"
        barColor="bg-status-evidence"
        onClick={() => setActiveStatusTab('pending_evidence')}
      />
      <StatCard
        icon={<AlertOctagon className="w-6 h-6 text-status-confirm" />}
        label="🔴 挂起待确认"
        value={stats.pendingConfirm}
        total={stats.total}
        color="bg-status-confirmBg"
        barColor="bg-status-confirm"
        onClick={() => setActiveStatusTab('pending_confirm')}
      />
    </div>
  );
}
