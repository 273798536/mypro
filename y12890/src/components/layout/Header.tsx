import React from 'react';
import { User, Bell, Search, Clock, Calendar } from 'lucide-react';
import { formatDateTime } from '../../utils/format';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const now = new Date();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span className="font-mono">{formatDateTime(now)}</span>
        </div>

        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索任务、点位、记录..."
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-transparent w-64 transition-all"
          />
        </div>

        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-status-recollect rounded-full" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700">陈场长</p>
            <p className="text-xs text-slate-500">明珠海珍品养殖场</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ocean-500 to-tide-400 flex items-center justify-center text-white font-medium">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};
