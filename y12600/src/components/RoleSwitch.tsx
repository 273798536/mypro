import { GraduationCap, Users } from 'lucide-react';
import { useRole } from '../context/RoleContext';
import type { UserRole } from '../types';

export function RoleSwitch() {
  const { role, setRole, isTeacher } = useRole();

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
  };

  return (
    <div className="flex items-center gap-2 bg-slate-700/50 p-1 rounded-lg">
      <button
        onClick={() => handleRoleChange('student')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
          role === 'student'
            ? 'bg-white text-slate-800 shadow-md'
            : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
        }`}
      >
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">学生视图</span>
      </button>
      <button
        onClick={() => handleRoleChange('teacher')}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
          role === 'teacher'
            ? 'bg-white text-slate-800 shadow-md'
            : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
        }`}
      >
        <GraduationCap className="w-4 h-4" />
        <span className="text-sm font-medium">教研老师</span>
      </button>
      {isTeacher && (
        <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded">
          教研模式
        </span>
      )}
    </div>
  );
}
