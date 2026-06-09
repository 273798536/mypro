import { User, GraduationCap, FlaskConical } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { UserRole } from '../../types';

const roleLabels: Record<UserRole, string> = {
  monitor: '监测员视角',
  student: '学生视角',
  teacher: '教师视角',
};

const roleIcons: Record<UserRole, typeof User> = {
  monitor: FlaskConical,
  student: GraduationCap,
  teacher: User,
};

export default function Header() {
  const { currentRole, setCurrentRole } = useAppStore();

  const roles: UserRole[] = ['monitor', 'student', 'teacher'];

  return (
    <header className="bg-lab-blue text-white px-8 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <FlaskConical size={28} className="text-lab-green-light" />
        <h1 className="font-display text-2xl tracking-wide">酸碱滴定终点复核工作台</h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-sm text-gray-300 opacity-80">
          当前用户：<span className="text-white font-medium">陈监测员</span>
        </div>

        <div className="flex rounded-full bg-lab-blue-light overflow-hidden border border-white/20">
          {roles.map((role) => {
            const Icon = roleIcons[role];
            const isActive = currentRole === role;
            return (
              <button
                key={role}
                onClick={() => setCurrentRole(role)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm transition-all btn-press ${
                  isActive
                    ? 'bg-white text-lab-blue font-semibold'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Icon size={16} />
                {roleLabels[role]}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
