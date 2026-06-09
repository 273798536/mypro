import { UserCog, GraduationCap } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import type { Role } from '@/types';

export default function RoleSwitcher() {
  const { role, setRole } = useVerificationStore();

  const options: { value: Role; label: string; icon: JSX.Element; hint: string }[] = [
    { value: 'engineer', label: '配方工程师', icon: <UserCog size={16} />, hint: '完整复盘 + 最终判定' },
    { value: 'student', label: '学生', icon: <GraduationCap size={16} />, hint: '查看分级结果' },
  ];

  return (
    <div className="flex items-center gap-2">
      {options.map((o) => {
        const active = role === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setRole(o.value)}
            className={
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ' +
              (active
                ? 'bg-brand-700 text-white shadow-soft'
                : 'text-slate-600 hover:bg-slate-100')
            }
            title={o.hint}
          >
            {o.icon}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
