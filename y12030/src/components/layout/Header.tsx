import { Download, Bell, User } from 'lucide-react';
import { api } from '../../utils/api';

export function Header() {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-primary-800 font-mono">
          员工期权归属台账
        </h1>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
          v1.0
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={api.downloadCSV}
          className="btn btn-secondary text-sm gap-2"
        >
          <Download size={16} />
          导出全部台账
        </button>
        <button className="p-2 text-slate-500 hover:text-primary-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
            财
          </div>
          <span className="text-sm text-slate-700">财务管理员</span>
        </div>
      </div>
    </header>
  );
}
