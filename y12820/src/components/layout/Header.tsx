import { Bell, User } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { currentView, setCurrentView } = useUIStore();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>

      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setCurrentView('student')}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
              currentView === 'student'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            学生视图
          </button>
          <button
            onClick={() => setCurrentView('standard')}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
              currentView === 'standard'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            标准视图
          </button>
        </div>

        <button className="relative rounded-lg p-2 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100">
            <User className="h-5 w-5 text-primary-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">张研究员</span>
        </div>
      </div>
    </header>
  );
}
