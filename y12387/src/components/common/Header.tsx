import { Bell, User, Search } from 'lucide-react';
import { useAlertStore } from '@/store/useAlertStore';

export const Header = ({ title }: { title: string }) => {
  const { alerts } = useAlertStore();
  const unreadCount = alerts.length;

  return (
    <header className="bg-secondary/50 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-white">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索素材、曲目、授权..."
            className="bg-primary/50 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 w-64 transition-colors"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
          <Bell className="w-5 h-5 text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
          <User className="w-5 h-5 text-gray-300" />
          <span className="text-sm text-gray-300">音乐制作人</span>
        </button>
      </div>
    </header>
  );
};
