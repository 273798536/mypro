import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import type { SafetyAlert } from '@/types';

function alertIcon(level: SafetyAlert['level']) {
  if (level === 'danger') return <ShieldAlert size={18} />;
  if (level === 'warning') return <AlertTriangle size={18} />;
  return <ShieldCheck size={18} />;
}

function alertClass(level: SafetyAlert['level']) {
  if (level === 'danger') return 'bg-fail-50 border-fail-500/40 text-fail-700';
  if (level === 'warning') return 'bg-warn-50 border-warn-500/40 text-warn-700';
  return 'bg-pass-50 border-pass-500/40 text-pass-700';
}

export default function SafetyAlertBanner() {
  const { safetyAlerts } = useVerificationStore();
  if (safetyAlerts.length === 0) {
    return (
      <div className="card p-4 border-dashed text-slate-400 text-sm text-center">
        暂无安全提示：请先录入添加剂检测数据
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {safetyAlerts.map((a) => (
        <div key={a.id} className={'card p-3 border-l-4 ' + alertClass(a.level)}>
          <div className="flex items-start gap-2">
            <div className="mt-0.5">{alertIcon(a.level)}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{a.additiveName} · {a.message}</div>
              <div className="text-xs mt-1 opacity-80">依据：{a.standardClause}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
